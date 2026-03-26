'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { invalidatePlanCache } from '@/hooks/use-plan';

type AcceptState = 'loading' | 'no_token' | 'not_authenticated' | 'accepting' | 'success' | 'error';

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#18181b] p-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
          <p className="mt-4 text-[14px] text-zinc-400">Loading...</p>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AcceptState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [teamName, setTeamName] = useState('');
  const hasAttempted = useRef(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setState('no_token');
      return;
    }

    if (authLoading) return;

    if (!user) {
      setState('not_authenticated');
      return;
    }

    // Prevent double-submission if user reference changes
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    // Accept the invitation
    let active = true;
    async function accept() {
      setState('accepting');
      try {
        const res = await fetch('/api/teams/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!active) return;

        if (!res.ok) {
          setState('error');
          setErrorMessage(data.error || 'Failed to accept invitation');
          return;
        }

        setState('success');
        setTeamName(data.team?.name || 'the team');
        invalidatePlanCache();

        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } catch {
        if (!active) return;
        setState('error');
        setErrorMessage('Something went wrong. Please try again.');
      }
    }
    void accept();
    return () => { active = false; };
  }, [token, user, authLoading, router]);

  const loginUrl = `/login?next=${encodeURIComponent(`/teams/accept?token=${token || ''}`)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#18181b] p-8 text-center">
        {state === 'loading' && (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
            <p className="mt-4 text-[14px] text-zinc-400">Loading...</p>
          </>
        )}

        {state === 'no_token' && (
          <>
            <h1 className="text-[20px] font-semibold text-white">Invalid Link</h1>
            <p className="mt-2 text-[14px] text-zinc-400">
              This invitation link is missing or invalid. Please ask the team owner for a new invite.
            </p>
          </>
        )}

        {state === 'not_authenticated' && (
          <>
            <h1 className="text-[20px] font-semibold text-white">Sign in to join</h1>
            <p className="mt-2 text-[14px] text-zinc-400">
              You need to sign in or create an account to accept this team invitation.
            </p>
            <a
              href={loginUrl}
              className="mt-6 inline-block rounded-lg bg-[#6c63ff] px-6 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Sign in to continue
            </a>
          </>
        )}

        {state === 'accepting' && (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-[#6c63ff]" />
            <p className="mt-4 text-[14px] text-zinc-400">Joining team...</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#25c972]/20">
              <svg className="h-6 w-6 text-[#25c972]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-4 text-[20px] font-semibold text-white">Welcome to {teamName}!</h1>
            <p className="mt-2 text-[14px] text-zinc-400">
              You've joined the team. Redirecting to your dashboard...
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="mt-4 text-[20px] font-semibold text-white">Unable to join</h1>
            <p className="mt-2 text-[14px] text-zinc-400">{errorMessage}</p>
            <a
              href="/dashboard"
              className="mt-6 inline-block rounded-lg bg-white/[0.08] px-6 py-3 text-[14px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.12]"
            >
              Go to Dashboard
            </a>
          </>
        )}
      </div>
    </div>
  );
}
