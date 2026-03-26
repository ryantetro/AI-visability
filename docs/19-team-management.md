# Team Management

Multi-seat team management for Pro (3 seats) and Growth (unlimited seats) plans. Team members share access to tracked domains and AI visibility data using the team owner's plan.

## Key Files

| File | Role |
|------|------|
| `supabase/migrations/018_team_management.sql` | Database migration: teams, team_members, team_invitations |
| `src/lib/team-management.ts` | Core team logic: CRUD, invitations, seat management |
| `src/lib/access.ts` | Extended with `teamId`, `teamRole`, `teamName`; resolves owner plan for members |
| `src/app/api/teams/route.ts` | `GET` team info, `POST` create team |
| `src/app/api/teams/invite/route.ts` | `POST` invite by email |
| `src/app/api/teams/invite/[id]/route.ts` | `DELETE` revoke invitation |
| `src/app/api/teams/accept/route.ts` | `POST` accept invitation by token |
| `src/app/api/teams/members/[userId]/route.ts` | `DELETE` remove member |
| `src/app/api/teams/leave/route.ts` | `POST` member leaves |
| `src/app/api/teams/dissolve/route.ts` | `POST` owner dissolves team |
| `src/lib/services/resend-alerts.ts` | `sendTeamInvitationEmail()` added |
| `src/app/teams/accept/page.tsx` | Client-side accept invite page |
| `src/hooks/use-team.ts` | Client hook for full team state |
| `src/hooks/use-plan.ts` | Exposes `teamId`, `teamRole`, `teamName` |
| `src/lib/plan-cache.ts` | Caches team fields from `/api/auth/me` |
| `src/app/api/auth/me/route.ts` | Returns team fields |
| `src/app/api/user/domains/route.ts` | Team-wide domain queries via `getEffectiveUserIds` |
| `src/app/advanced/settings/settings-section.tsx` | Team management UI section |

## How It Works

### Team Creation
1. User on Pro/Growth goes to Settings > Team
2. Enters team name, clicks Create
3. `POST /api/teams` creates the team + adds user as owner member
4. Feature gate: `multi_seat` (Pro+)

### Invitations
1. Owner enters email, clicks Send Invite
2. `POST /api/teams/invite` validates seat limit, creates invitation with 7-day expiry, sends Resend email
3. Recipient clicks link in email -> `/teams/accept?token=...`
4. If not authenticated: shows sign-in prompt with redirect back
5. If authenticated: `POST /api/teams/accept` validates token, creates team_member, redirects to dashboard

### Plan Resolution for Members
When a team member (not owner) calls `getUserAccess()`:
1. `getTeamForUser()` returns their team and role
2. Since role is `member`, the owner's profile is fetched
3. The owner's plan is used for all limits (domains, prompts, platforms, etc.)
4. This means all team members share the owner's subscription tier

### Domain Sharing
`getEffectiveUserIds(userId)` returns all team member IDs if user is in a team, or `[userId]` if solo. The domains API uses `.in('user_id', userIds)` instead of `.eq('user_id', user.id)`.

### Member Management
- **Remove**: Owner can remove any member (not self) via `DELETE /api/teams/members/[userId]`
- **Leave**: Member can leave via `POST /api/teams/leave` (owner cannot leave)
- **Dissolve**: Owner dissolves via `POST /api/teams/dissolve` — deletes invitations, members, team

## API Contracts

### GET /api/teams
Returns team info, members, pending invitations, or null if no team.
```json
{
  "team": { "id": "uuid", "name": "string", "owner_id": "string", ... },
  "role": "owner" | "member",
  "members": [{ "user_id": "string", "email": "string", "role": "owner" | "member", ... }],
  "invitations": [{ "id": "uuid", "email": "string", "status": "pending", ... }],
  "seatCount": 2
}
```

### POST /api/teams
Create team. Body: `{ "name": "string" }`. Returns `{ team, role }`.

### POST /api/teams/invite
Invite member. Body: `{ "email": "string" }`. Returns `{ invitation }`.

### DELETE /api/teams/invite/[id]
Revoke pending invitation. Returns `{ ok: true }`.

### POST /api/teams/accept
Accept invitation. Body: `{ "token": "string" }`. Returns `{ ok: true, team }`.

### DELETE /api/teams/members/[userId]
Remove member. Returns `{ ok: true }`.

### POST /api/teams/leave
Member leaves team. Returns `{ ok: true }`.

### POST /api/teams/dissolve
Owner dissolves team. Returns `{ ok: true }`.

## Error Handling

- All routes return `{ error: "message" }` with appropriate HTTP status
- 401: Not authenticated
- 403: Not authorized (not owner, seat limit reached, feature not available)
- 400: Invalid input, already in team, invitation expired
- Email send failures are logged but don't block invitation creation

## Configuration

- **Feature gate**: `multi_seat` in `FEATURE_GATES` requires `pro` tier
- **Seat limits**: Pro = 3, Growth = unlimited (-1)
- **Invitation expiry**: 7 days
- **Env vars**: `RESEND_API_KEY` (for invitation emails), `NEXT_PUBLIC_APP_URL` (for accept link)
