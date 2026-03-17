import { Suspense } from 'react';
import { LoginPageContent } from './login-client';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--surface-page)]">
          <div className="text-lg font-medium text-white">Loading...</div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
