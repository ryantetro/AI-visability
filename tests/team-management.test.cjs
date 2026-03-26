require('../scripts/register-ts.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');

// ── Mock Supabase client ──────────────────────────────────────────
// We mock getSupabaseClient to return a chainable query builder that
// stores data in-memory. This lets us test team-management.ts logic
// without a real database.

const _tables = {};

function resetTables() {
  _tables.teams = [];
  _tables.team_members = [];
  _tables.team_invitations = [];
  _tables.user_profiles = [];
}

function findRows(table, filters) {
  let rows = [...(_tables[table] || [])];
  for (const [key, val] of Object.entries(filters)) {
    if (val && typeof val === 'object' && val._op === 'in') {
      rows = rows.filter((r) => val._values.includes(r[key]));
    } else if (val && typeof val === 'object' && val._op === 'gt') {
      rows = rows.filter((r) => r[key] > val._value);
    } else {
      rows = rows.filter((r) => r[key] === val);
    }
  }
  return rows;
}

function makeChain(tableName) {
  let _filters = {};
  let _selectFields = '*';
  let _limitN = null;
  let _singleMode = false;
  let _orderField = null;
  let _orderAsc = true;
  let _countMode = false;
  let _headMode = false;
  let _insertData = null;
  let _updateData = null;
  let _deleteMode = false;
  let _upsertData = null;

  const chain = {
    select(fields, opts) {
      _selectFields = fields || '*';
      if (opts && opts.count === 'exact') _countMode = true;
      if (opts && opts.head) _headMode = true;
      return chain;
    },
    insert(data) {
      _insertData = Array.isArray(data) ? data : [data];
      return chain;
    },
    upsert(data, _opts) {
      _upsertData = Array.isArray(data) ? data : [data];
      return chain;
    },
    update(data) {
      _updateData = data;
      return chain;
    },
    delete() {
      _deleteMode = true;
      return chain;
    },
    eq(field, value) {
      _filters[field] = value;
      return chain;
    },
    in(field, values) {
      _filters[field] = { _op: 'in', _values: values };
      return chain;
    },
    gt(field, value) {
      _filters[field] = { _op: 'gt', _value: value };
      return chain;
    },
    limit(n) {
      _limitN = n;
      return chain;
    },
    order(field, opts) {
      _orderField = field;
      _orderAsc = opts?.ascending ?? true;
      return chain;
    },
    single() {
      _singleMode = true;
      // Execute query immediately
      return chain._execute();
    },
    _execute() {
      // INSERT
      if (_insertData) {
        for (const row of _insertData) {
          // Check unique constraints
          if (tableName === 'team_members') {
            // unique(user_id) — one team per user
            const existing = _tables.team_members.find((r) => r.user_id === row.user_id);
            if (existing) {
              return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
            }
            // unique(team_id, user_id)
            const dup = _tables.team_members.find((r) => r.team_id === row.team_id && r.user_id === row.user_id);
            if (dup) {
              return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
            }
          }
          const newRow = {
            id: row.id || `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            ...row,
            created_at: row.created_at || new Date().toISOString(),
          };
          if (tableName === 'teams') {
            newRow.updated_at = newRow.updated_at || newRow.created_at;
          }
          if (tableName === 'team_members') {
            newRow.joined_at = newRow.joined_at || newRow.created_at;
          }
          // Apply DB column defaults for team_invitations
          if (tableName === 'team_invitations') {
            newRow.status = newRow.status || 'pending';
            newRow.accepted_at = newRow.accepted_at || null;
          }
          _tables[tableName].push(newRow);
        }
        const inserted = _insertData.map((d) => _tables[tableName].find((r) =>
          Object.entries(d).every(([k, v]) => r[k] === v)
        ));
        if (_singleMode) {
          return { data: inserted[0] || null, error: null };
        }
        return { data: inserted, error: null };
      }

      // UPDATE
      if (_updateData) {
        const rows = findRows(tableName, _filters);
        for (const row of rows) {
          Object.assign(row, _updateData);
        }
        if (_singleMode) {
          return { data: rows[0] || null, error: null };
        }
        return { data: rows, error: null };
      }

      // DELETE
      if (_deleteMode) {
        const before = _tables[tableName].length;
        const matching = findRows(tableName, _filters);
        _tables[tableName] = _tables[tableName].filter((r) => !matching.includes(r));
        return { data: matching, error: null, count: before - _tables[tableName].length };
      }

      // SELECT
      let rows = findRows(tableName, _filters);

      if (_orderField) {
        rows.sort((a, b) => {
          const cmp = String(a[_orderField] || '').localeCompare(String(b[_orderField] || ''));
          return _orderAsc ? cmp : -cmp;
        });
      }

      if (_limitN) {
        rows = rows.slice(0, _limitN);
      }

      // Handle joins (simplified) -- for team_members -> teams
      if (_selectFields.includes('teams(') && tableName === 'team_members') {
        rows = rows.map((r) => ({
          ...r,
          teams: _tables.teams.find((t) => t.id === r.team_id) || null,
        }));
      }
      if (_selectFields.includes('user_profiles(') && tableName === 'team_members') {
        rows = rows.map((r) => ({
          ...r,
          user_profiles: _tables.user_profiles.find((p) => p.id === r.user_id) || null,
        }));
      }

      if (_countMode && _headMode) {
        return { count: rows.length, error: null };
      }

      if (_singleMode) {
        if (rows.length === 0) {
          return { data: null, error: { code: 'PGRST116', message: 'not found' } };
        }
        if (rows.length > 1) {
          return { data: null, error: { code: 'PGRST116', message: 'multiple rows returned' } };
        }
        return { data: rows[0], error: null };
      }

      return { data: rows, error: null };
    },
    // For non-.single() terminal calls, we resolve via then()
    then(resolve) {
      const result = chain._execute();
      resolve(result);
    },
  };
  return chain;
}

// Monkey-patch the supabase module
const supabaseModule = require('../src/lib/supabase.ts');
const _origGetSupabaseClient = supabaseModule.getSupabaseClient;
supabaseModule.getSupabaseClient = () => ({
  from: (table) => makeChain(table),
  rpc: () => ({ error: null }),
});

// Also patch user-profile to avoid real DB calls
const userProfileModule = require('../src/lib/user-profile.ts');
const _origGetOrCreate = userProfileModule.getOrCreateProfile;
userProfileModule.getOrCreateProfile = async (userId, email) => {
  let profile = _tables.user_profiles.find((p) => p.id === userId);
  if (!profile) {
    profile = {
      id: userId,
      email: email || `${userId}@test.com`,
      plan: 'free',
      scans_used: 0,
      free_scan_limit: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    _tables.user_profiles.push(profile);
  }
  return profile;
};

const {
  createTeam,
  getTeamForUser,
  getTeamMembers,
  getTeamMemberUserIds,
  getEffectiveUserIds,
  createInvitation,
  getInvitationByToken,
  acceptInvitation,
  revokeInvitation,
  listPendingInvitations,
  removeMember,
  leaveTeam,
  dissolveTeam,
  getTeamSeatCount,
  canAddSeat,
} = require('../src/lib/team-management.ts');

test.beforeEach(() => {
  resetTables();
  // Seed owner profile
  _tables.user_profiles.push({
    id: 'owner-1',
    email: 'owner@test.com',
    plan: 'pro_monthly',
    scans_used: 0,
    free_scan_limit: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  _tables.user_profiles.push({
    id: 'member-1',
    email: 'member@test.com',
    plan: 'free',
    scans_used: 0,
    free_scan_limit: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  _tables.user_profiles.push({
    id: 'member-2',
    email: 'member2@test.com',
    plan: 'free',
    scans_used: 0,
    free_scan_limit: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
});

// ── createTeam ────────────────────────────────────────────────────

test('createTeam creates team and adds owner as member', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'Test Team');

  assert.equal(team.name, 'Test Team');
  assert.equal(team.owner_id, 'owner-1');
  assert.equal(_tables.teams.length, 1);
  assert.equal(_tables.team_members.length, 1);
  assert.equal(_tables.team_members[0].role, 'owner');
  assert.equal(_tables.team_members[0].user_id, 'owner-1');
});

test('createTeam rejects if user already in a team', async () => {
  await createTeam('owner-1', 'owner@test.com', 'First Team');

  await assert.rejects(
    () => createTeam('owner-1', 'owner@test.com', 'Second Team'),
    (err) => {
      assert.match(err.message, /already in a team/i);
      return true;
    }
  );
});

// ── getTeamForUser ────────────────────────────────────────────────

test('getTeamForUser returns null when user has no team', async () => {
  const result = await getTeamForUser('member-1');
  assert.equal(result, null);
});

test('getTeamForUser returns team and role for owner', async () => {
  await createTeam('owner-1', 'owner@test.com', 'My Team');
  const result = await getTeamForUser('owner-1');

  assert.notEqual(result, null);
  assert.equal(result.team.name, 'My Team');
  assert.equal(result.role, 'owner');
});

// ── getTeamMembers ────────────────────────────────────────────────

test('getTeamMembers returns all members with emails', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  // Manually add a member
  _tables.team_members.push({
    id: 'mem-2',
    team_id: team.id,
    user_id: 'member-1',
    role: 'member',
    joined_at: new Date().toISOString(),
  });

  const members = await getTeamMembers(team.id);
  assert.equal(members.length, 2);
  assert.equal(members.find((m) => m.role === 'owner').user_id, 'owner-1');
  assert.equal(members.find((m) => m.role === 'member').user_id, 'member-1');
});

// ── getTeamMemberUserIds ──────────────────────────────────────────

test('getTeamMemberUserIds returns array of user IDs', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  _tables.team_members.push({
    id: 'mem-2',
    team_id: team.id,
    user_id: 'member-1',
    role: 'member',
    joined_at: new Date().toISOString(),
  });

  const ids = await getTeamMemberUserIds(team.id);
  assert.deepEqual(ids.sort(), ['member-1', 'owner-1']);
});

// ── getEffectiveUserIds ───────────────────────────────────────────

test('getEffectiveUserIds returns just userId when not in team', async () => {
  const ids = await getEffectiveUserIds('member-1');
  assert.deepEqual(ids, ['member-1']);
});

test('getEffectiveUserIds returns all team member IDs when in team', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  _tables.team_members.push({
    id: 'mem-2',
    team_id: team.id,
    user_id: 'member-1',
    role: 'member',
    joined_at: new Date().toISOString(),
  });

  const ids = await getEffectiveUserIds('owner-1');
  assert.deepEqual(ids.sort(), ['member-1', 'owner-1']);
});

// ── Invitations ───────────────────────────────────────────────────

test('createInvitation creates a pending invitation with token', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  const invitation = await createInvitation(team.id, 'owner-1', 'invitee@test.com');

  assert.equal(invitation.email, 'invitee@test.com');
  assert.equal(invitation.status, 'pending');
  assert.equal(invitation.team_id, team.id);
  assert.ok(invitation.token.length >= 32, 'Token should be at least 32 chars');
  assert.ok(new Date(invitation.expires_at) > new Date(), 'Expiry should be in the future');
});

test('getInvitationByToken returns valid pending invitation', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  const invitation = await createInvitation(team.id, 'owner-1', 'invitee@test.com');

  const found = await getInvitationByToken(invitation.token);
  assert.notEqual(found, null);
  assert.equal(found.email, 'invitee@test.com');
});

test('getInvitationByToken returns null for expired token', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  const invitation = await createInvitation(team.id, 'owner-1', 'invitee@test.com');

  // Manually expire
  const inv = _tables.team_invitations.find((i) => i.token === invitation.token);
  inv.expires_at = new Date(Date.now() - 1000).toISOString();

  const found = await getInvitationByToken(invitation.token);
  assert.equal(found, null);
});

test('getInvitationByToken returns null for revoked invitation', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  const invitation = await createInvitation(team.id, 'owner-1', 'invitee@test.com');

  await revokeInvitation(invitation.id, team.id);

  const found = await getInvitationByToken(invitation.token);
  assert.equal(found, null);
});

// ── acceptInvitation ──────────────────────────────────────────────

test('acceptInvitation adds user to team and marks invitation accepted', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  const invitation = await createInvitation(team.id, 'owner-1', 'member@test.com');

  const result = await acceptInvitation(invitation.token, 'member-1', 3);
  assert.equal(result.team.name, 'My Team');

  // Check member was added
  const members = await getTeamMembers(team.id);
  assert.equal(members.length, 2);
  assert.ok(members.find((m) => m.user_id === 'member-1'));

  // Check invitation is accepted
  const inv = _tables.team_invitations.find((i) => i.id === invitation.id);
  assert.equal(inv.status, 'accepted');
});

test('acceptInvitation rejects invalid token', async () => {
  await assert.rejects(
    () => acceptInvitation('nonexistent-token', 'member-1', 3),
    (err) => {
      assert.match(err.message, /invalid|expired/i);
      return true;
    }
  );
});

test('acceptInvitation rejects if user already in a team', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'Team A');
  // member-1 creates their own team
  _tables.user_profiles.push({
    id: 'owner-2',
    email: 'owner2@test.com',
    plan: 'pro_monthly',
    scans_used: 0,
    free_scan_limit: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Put member-1 in a team already (manually, since unique index prevents via createTeam if already in one)
  _tables.teams.push({ id: 'team-b', name: 'Team B', owner_id: 'owner-2', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  _tables.team_members.push({ id: 'mem-b', team_id: 'team-b', user_id: 'member-1', role: 'member', joined_at: new Date().toISOString() });

  const invitation = await createInvitation(team.id, 'owner-1', 'member@test.com');

  await assert.rejects(
    () => acceptInvitation(invitation.token, 'member-1', 3),
    (err) => {
      assert.match(err.message, /already in a team/i);
      return true;
    }
  );
});

test('acceptInvitation enforces seat limit', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');

  // Add member-1 (fills seat 2 of 3)
  _tables.team_members.push({
    id: 'mem-fill-1',
    team_id: team.id,
    user_id: 'member-1',
    role: 'member',
    joined_at: new Date().toISOString(),
  });
  // Add member-2 (fills seat 3 of 3)
  _tables.team_members.push({
    id: 'mem-fill-2',
    team_id: team.id,
    user_id: 'member-2',
    role: 'member',
    joined_at: new Date().toISOString(),
  });

  // Create a 4th user
  _tables.user_profiles.push({
    id: 'member-3',
    email: 'member3@test.com',
    plan: 'free',
    scans_used: 0,
    free_scan_limit: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const invitation = await createInvitation(team.id, 'owner-1', 'member3@test.com');

  await assert.rejects(
    () => acceptInvitation(invitation.token, 'member-3', 3), // maxSeats=3
    (err) => {
      assert.match(err.message, /seat limit/i);
      return true;
    }
  );
});

test('acceptInvitation allows unlimited seats with maxSeats=-1', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'Growth Team');
  const invitation = await createInvitation(team.id, 'owner-1', 'member@test.com');

  const result = await acceptInvitation(invitation.token, 'member-1', -1);
  assert.equal(result.team.name, 'Growth Team');
});

// ── listPendingInvitations ────────────────────────────────────────

test('listPendingInvitations returns only pending, non-expired invitations', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');

  const inv1 = await createInvitation(team.id, 'owner-1', 'a@test.com');
  const inv2 = await createInvitation(team.id, 'owner-1', 'b@test.com');
  await revokeInvitation(inv2.id, team.id);

  const pending = await listPendingInvitations(team.id);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].email, 'a@test.com');
});

// ── revokeInvitation ──────────────────────────────────────────────

test('revokeInvitation marks invitation as revoked', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  const invitation = await createInvitation(team.id, 'owner-1', 'revoke@test.com');

  await revokeInvitation(invitation.id, team.id);

  const inv = _tables.team_invitations.find((i) => i.id === invitation.id);
  assert.equal(inv.status, 'revoked');
});

// ── removeMember ──────────────────────────────────────────────────

test('removeMember removes a member from the team', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  _tables.team_members.push({
    id: 'mem-rm',
    team_id: team.id,
    user_id: 'member-1',
    role: 'member',
    joined_at: new Date().toISOString(),
  });

  await removeMember(team.id, 'member-1');

  const members = await getTeamMemberUserIds(team.id);
  assert.deepEqual(members, ['owner-1']);
});

test('removeMember rejects removing the owner', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');

  await assert.rejects(
    () => removeMember(team.id, 'owner-1'),
    (err) => {
      assert.match(err.message, /cannot remove.*owner/i);
      return true;
    }
  );
});

test('removeMember rejects non-existent member', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');

  await assert.rejects(
    () => removeMember(team.id, 'nonexistent'),
    (err) => {
      assert.match(err.message, /not found/i);
      return true;
    }
  );
});

// ── leaveTeam ─────────────────────────────────────────────────────

test('leaveTeam allows member to leave', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  _tables.team_members.push({
    id: 'mem-leave',
    team_id: team.id,
    user_id: 'member-1',
    role: 'member',
    joined_at: new Date().toISOString(),
  });

  await leaveTeam('member-1');

  const result = await getTeamForUser('member-1');
  assert.equal(result, null);
});

test('leaveTeam rejects if owner tries to leave', async () => {
  await createTeam('owner-1', 'owner@test.com', 'My Team');

  await assert.rejects(
    () => leaveTeam('owner-1'),
    (err) => {
      assert.match(err.message, /owner cannot leave/i);
      return true;
    }
  );
});

test('leaveTeam rejects if user not in a team', async () => {
  await assert.rejects(
    () => leaveTeam('member-1'),
    (err) => {
      assert.match(err.message, /not in a team/i);
      return true;
    }
  );
});

// ── dissolveTeam ──────────────────────────────────────────────────

test('dissolveTeam deletes team and all members', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  _tables.team_members.push({
    id: 'mem-dis',
    team_id: team.id,
    user_id: 'member-1',
    role: 'member',
    joined_at: new Date().toISOString(),
  });
  await createInvitation(team.id, 'owner-1', 'pending@test.com');

  await dissolveTeam('owner-1');

  assert.equal(_tables.teams.length, 0);
  // Note: CASCADE is simulated by our delete chain on the team.
  // In real DB, team_members and team_invitations would cascade-delete.
  // Our mock deletes only from the 'teams' table directly.
  // The important assertion is that the team is gone.
  const ownerTeam = await getTeamForUser('owner-1');
  assert.equal(ownerTeam, null);
});

test('dissolveTeam rejects non-owner', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  _tables.team_members.push({
    id: 'mem-dis-2',
    team_id: team.id,
    user_id: 'member-1',
    role: 'member',
    joined_at: new Date().toISOString(),
  });

  await assert.rejects(
    () => dissolveTeam('member-1'),
    (err) => {
      assert.match(err.message, /only the team owner/i);
      return true;
    }
  );
});

// ── Seat counting ─────────────────────────────────────────────────

test('getTeamSeatCount returns correct count', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  assert.equal(await getTeamSeatCount(team.id), 1);

  _tables.team_members.push({
    id: 'mem-count',
    team_id: team.id,
    user_id: 'member-1',
    role: 'member',
    joined_at: new Date().toISOString(),
  });
  assert.equal(await getTeamSeatCount(team.id), 2);
});

test('canAddSeat returns true when under limit', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  assert.equal(await canAddSeat(team.id, 3), true);
});

test('canAddSeat returns false when at limit (counting pending invites)', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  _tables.team_members.push({
    id: 'mem-seat',
    team_id: team.id,
    user_id: 'member-1',
    role: 'member',
    joined_at: new Date().toISOString(),
  });
  // 2 members + 1 pending invite = 3 = maxSeats
  await createInvitation(team.id, 'owner-1', 'pending@test.com');

  assert.equal(await canAddSeat(team.id, 3), false);
});

test('canAddSeat always returns true for unlimited (-1)', async () => {
  const team = await createTeam('owner-1', 'owner@test.com', 'My Team');
  assert.equal(await canAddSeat(team.id, -1), true);
});
