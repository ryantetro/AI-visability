-- 021: Billing plan-change state and team seat priority
-- Adds pending paid-plan change state to user_profiles and a seat-priority rank to team_members.

alter table user_profiles
  add column if not exists stripe_subscription_schedule_id text,
  add column if not exists pending_plan text,
  add column if not exists pending_plan_effective_at timestamptz;

alter table team_members
  add column if not exists plan_access_rank integer;

update team_members
set plan_access_rank = 0
where role = 'owner' and plan_access_rank is null;

with ranked_members as (
  select
    id,
    row_number() over (
      partition by team_id
      order by joined_at asc, id asc
    ) as next_rank
  from team_members
  where role <> 'owner'
)
update team_members
set plan_access_rank = ranked_members.next_rank
from ranked_members
where team_members.id = ranked_members.id
  and team_members.plan_access_rank is null;
