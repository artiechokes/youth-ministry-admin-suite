'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useRef, useState } from 'react';
import {
  PERMISSION_MODULES,
  PERMISSION_MODULE_DETAILS,
  type Permission,
  type PermissionLevel,
  type PermissionModule
} from '@/lib/permissions';

type StaffUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  firstName: string;
  lastName: string;
  title: string;
  phone: string;
  permissions: Permission[];
};

type Props = {
  users: StaffUser[];
};

// Admin UI for managing staff accounts and permissions.
export function StaffManager({ users }: Props) {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(users);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkSelections, setBulkSelections] = useState<
    Partial<Record<PermissionModule, PermissionLevel | 'off'>>
  >({});
  const [openStaffId, setOpenStaffId] = useState<string | null>(null);
  const [showCreatePermissions, setShowCreatePermissions] = useState(false);
  const [createSelections, setCreateSelections] = useState<
    Partial<Record<PermissionModule, PermissionLevel | 'off'>>
  >({});
  const [permissionsConfirmed, setPermissionsConfirmed] = useState(false);
  const [createStatus, setCreateStatus] = useState<'idle' | 'saving' | 'error' | 'success'>('idle');
  const [createMessage, setCreateMessage] = useState('');
  const createFormRef = useRef<HTMLFormElement | null>(null);

  const sorted = useMemo(() => {
    return [...staffUsers].sort((a, b) => a.email.localeCompare(b.email));
  }, [staffUsers]);

  const adminUsers = useMemo(() => sorted.filter((user) => user.role === 'ADMIN'), [sorted]);
  const staffOnly = useMemo(() => sorted.filter((user) => user.role !== 'ADMIN'), [sorted]);
  const staffOnlySorted = useMemo(() => {
    return [...staffOnly].sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase() || a.email.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase() || b.email.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [staffOnly]);

  const allStaffIds = useMemo(() => staffOnlySorted.map((user) => user.id), [staffOnlySorted]);
  const allSelected = selectedIds.length > 0 && selectedIds.length === allStaffIds.length;

  const getDisplayName = (user: StaffUser) => {
    const name = `${user.firstName} ${user.lastName}`.trim();
    return name || user.email || user.username;
  };

  const getSubLabel = (user: StaffUser) => {
    if (user.title && user.email) return `${user.title} · ${user.email}`;
    return user.title || user.email || user.username;
  };

  const moduleList = useMemo(
    () =>
      PERMISSION_MODULES.map((module) => ({
        id: module,
        label: PERMISSION_MODULE_DETAILS[module]?.label ?? module,
        description: PERMISSION_MODULE_DETAILS[module]?.description ?? ''
      })),
    []
  );

  const getCurrentLevel = (user: StaffUser, module: PermissionModule): PermissionLevel | 'none' => {
    const manage = `${module}_manage` as Permission;
    const edit = `${module}_edit` as Permission;
    const view = `${module}_view` as Permission;
    if (user.permissions.includes(manage)) return 'manage';
    if (user.permissions.includes(edit)) return 'edit';
    if (user.permissions.includes(view)) return 'view';
    return 'none';
  };

  const setUserLevel = async (user: StaffUser, module: PermissionModule, level: PermissionLevel | 'none') => {
    const next = user.permissions.filter((permission) => !permission.startsWith(`${module}_`));
    if (level !== 'none') {
      next.push(`${module}_${level}` as Permission);
    }
    await updateUserPermissions(user.id, next);
  };

  const buildPermissionsFromSelections = (selections: Partial<Record<PermissionModule, PermissionLevel | 'off'>>) => {
    return Object.entries(selections)
      .filter(([, level]) => level && level !== 'off')
      .map(([module, level]) => `${module}_${level}` as Permission);
  };

  const updateUserPermissions = async (userId: string, next: Permission[]) => {
    setBusyId(userId);
    try {
      const response = await fetch(`/api/staff/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: next })
      });

      if (!response.ok) {
        return false;
      }

      setStaffUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, permissions: next } : user))
      );
      return true;
    } finally {
      setBusyId(null);
    }
  };

  const refreshStaffUsers = async () => {
    const response = await fetch('/api/staff');
    if (!response.ok) return;
    const data = await response.json().catch(() => null);
    if (!Array.isArray(data)) return;
    setStaffUsers(
      data.map((user) => ({
        id: user.id,
        email: user.email ?? '',
        username: user.username ?? '',
        role: user.role,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        title: user.title ?? '',
        phone: user.phone ?? '',
        permissions: Array.isArray(user.permissionsJson) ? user.permissionsJson : []
      }))
    );
  };

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!permissionsConfirmed) {
      setShowCreatePermissions(true);
      setCreateStatus('idle');
      setCreateMessage('');
      return;
    }

    setCreateStatus('saving');
    setCreateMessage('');

    const formEl = event.currentTarget;
    const formData = new FormData(formEl);
    const permissions = buildPermissionsFromSelections(createSelections);
    const payload = {
      email: String(formData.get('email') ?? '').trim(),
      username: String(formData.get('username') ?? '').trim(),
      firstName: String(formData.get('firstName') ?? '').trim(),
      lastName: String(formData.get('lastName') ?? '').trim(),
      password: String(formData.get('password') ?? '').trim(),
      role: String(formData.get('role') ?? 'STAFF'),
      permissions
    };

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCreateStatus('error');
        setCreateMessage(data?.error ?? 'Unable to create staff user.');
        return;
      }

      setCreateStatus('success');
      setCreateMessage('Staff account created. Refresh to see it.');
      formEl.reset();
      setCreateSelections({});
      setPermissionsConfirmed(false);
      setShowCreatePermissions(false);
      await refreshStaffUsers();
    } catch (error) {
      console.error(error);
      setCreateStatus('error');
      setCreateMessage('Unable to create staff user.');
      setPermissionsConfirmed(false);
    }
  };

  const toggleSelected = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleAllSelected = () => {
    setSelectedIds(allSelected ? [] : allStaffIds);
  };

  const applyBulkSelections = async () => {
    if (!selectedIds.length) {
      setBulkMessage('Select at least one staff member to update.');
      return;
    }

    const modulesToApply = Object.entries(bulkSelections).filter(([, level]) => level);
    if (!modulesToApply.length) {
      setBulkMessage('Choose at least one permission to apply.');
      return;
    }

    setBulkBusy(true);
    setBulkMessage('');
    let failures = 0;

    await Promise.all(
      selectedIds.map(async (userId) => {
        const user = staffOnly.find((entry) => entry.id === userId);
        if (!user) return;

        let next = [...user.permissions];
        modulesToApply.forEach(([module, level]) => {
          next = next.filter((permission) => !permission.startsWith(`${module}_`));
          if (level && level !== 'off') {
            next.push(`${module}_${level}` as Permission);
          }
        });

        const ok = await updateUserPermissions(userId, Array.from(new Set(next)));
        if (!ok) failures += 1;
      })
    );

    setBulkMessage(failures ? `${failures} staff update(s) failed. Try again.` : 'Permissions updated.');
    setBulkBusy(false);
    if (!failures) {
      setBulkSelections({});
    }
  };

  const setBulkLevel = (module: PermissionModule, level: PermissionLevel | 'off') => {
    setBulkSelections((prev) => ({ ...prev, [module]: level }));
  };

  const setCreateLevel = (module: PermissionModule, level: PermissionLevel | 'off') => {
    setCreateSelections((prev) => ({ ...prev, [module]: level }));
  };

  const createPermissionCount = buildPermissionsFromSelections(createSelections).length;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="card">
        <h1>Staff Accounts</h1>
        <p className="muted">Admins always have full access. Choose View, Edit, Manage, or None for each staff module.</p>
        <p className="muted">
          Staff can update their own contact info on the <Link href="/admin/profile">My Profile</Link> page.
        </p>
        <Link href="/admin/staff/roster">
          <button className="secondary" style={{ marginTop: 12 }}>
            View Staff Roster
          </button>
        </Link>
      </section>

      <section className="card">
        <h2>Create Staff</h2>
        <form ref={createFormRef} onSubmit={onCreate} className="grid" style={{ gap: 12, marginTop: 12 }}>
          <div className="grid two">
            <div>
              <label>First Name</label>
              <input name="firstName" required />
            </div>
            <div>
              <label>Last Name</label>
              <input name="lastName" required />
            </div>
          </div>
          <div className="grid two">
            <div>
              <label>Email</label>
              <input name="email" type="email" required />
            </div>
            <div>
              <label>Username</label>
              <input name="username" required />
            </div>
          </div>
          <div className="grid two">
            <div>
              <label>Password</label>
              <input name="password" type="password" required />
            </div>
            <div>
              <label>Role</label>
              <select name="role" defaultValue="STAFF">
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={createStatus === 'saving'}>
            {createStatus === 'saving' ? 'Creating...' : 'Create Staff'}
          </button>
          {createStatus === 'success' && <p style={{ color: 'var(--success)' }}>{createMessage}</p>}
          {createStatus === 'error' && <p style={{ color: 'var(--danger)' }}>{createMessage}</p>}
        </form>
        {showCreatePermissions && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50
            }}
          >
            <div className="card" style={{ maxWidth: 720, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h3>Set Staff Permissions</h3>
                  <p className="muted">Pick View, Edit, Manage, or Off for each module.</p>
                </div>
                <button type="button" className="secondary" onClick={() => setCreateSelections({})}>
                  Clear Picks
                </button>
              </div>
              <div className="permission-list" style={{ marginTop: 12 }}>
                {moduleList.map((module) => {
                  const current = createSelections[module.id] ?? 'off';
                  return (
                    <div key={module.id} className="permission-row">
                      <div>
                        <strong>{module.label}</strong>
                        <p className="muted">{module.description}</p>
                      </div>
                      <div className="permission-segment">
                        {(['view', 'edit', 'manage', 'off'] as const).map((level) => (
                          <button
                            key={level}
                            type="button"
                            className={`secondary${current === level ? ' active' : ''}`}
                            onClick={() => setCreateLevel(module.id, level)}
                          >
                            {level === 'off' ? 'Off' : level.charAt(0).toUpperCase() + level.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button type="button" className="secondary" onClick={() => setShowCreatePermissions(false)}>
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPermissionsConfirmed(true);
                    createFormRef.current?.requestSubmit();
                  }}
                >
                  Create Staff
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Admin Accounts</h2>
        {adminUsers.length ? (
          <div className="permission-grid">
            {adminUsers.map((user) => (
              <article key={user.id} className="permission-card staff-admin">
                <div className="permission-card__header">
                  <div>
                    <h3>{getDisplayName(user)}</h3>
                    <p className="muted">{getSubLabel(user) || 'Admin account (full access)'}</p>
                  </div>
                  <span className="badge-archived">All permissions</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No admin accounts yet.</p>
        )}

        <hr className="section-break" />

        <h2>Staff Permissions</h2>
        {staffOnly.length ? (
          <>
            <div className="permission-bulk">
              <div>
                <div className="permission-bulk__header">
                  <h3>Bulk Edit</h3>
                  <div className="permission-bulk__header-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={toggleAllSelected}
                      disabled={bulkBusy}
                    >
                      {allSelected ? 'Clear Selection' : 'Select All Staff'}
                    </button>
                  </div>
                </div>
                <p className="muted">Choose staff, pick access levels, then click Apply.</p>
                <div className="permission-bulk__list">
                  {staffOnlySorted.map((user) => (
                    <label key={user.id} className="permission-select">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(user.id)}
                        onChange={() => toggleSelected(user.id)}
                        disabled={bulkBusy}
                      />
                      <span>{getDisplayName(user)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="permission-bulk__actions">
                {moduleList.map((module) => (
                  <div key={module.id} className="permission-bulk__row">
                    <div>
                      <strong>{module.label}</strong>
                      <p className="muted">{module.description}</p>
                    </div>
                    <div className="permission-bulk__buttons">
                      {(['view', 'edit', 'manage', 'off'] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          className={`secondary${
                            bulkSelections[module.id] === level ? ' active' : ''
                          }`}
                          onClick={() => setBulkLevel(module.id, level)}
                          disabled={bulkBusy}
                        >
                          {level === 'off' ? 'Off' : level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <button type="button" className="permission-apply" onClick={applyBulkSelections} disabled={bulkBusy}>
                  {bulkBusy ? 'Applying...' : 'Apply to Selected Staff'}
                </button>
                      <button
                      type="button"
                      className="secondary clear-selection"
                      onClick={() => setBulkSelections({})}
                      disabled={bulkBusy || !Object.keys(bulkSelections).length}
                    >
                      Clear Permission Picks
                    </button>
                {bulkMessage && <p className="muted">{bulkMessage}</p>}
              </div>
            </div>

            <div className="permission-grid">
              {staffOnlySorted.map((user) => (
                <details key={user.id} className="permission-card" open={openStaffId === user.id}>
                  <summary
                    className="permission-summary"
                    onClick={(event) => {
                      event.preventDefault();
                      setOpenStaffId(openStaffId === user.id ? null : user.id);
                    }}
                  >
                    <div>
                      <h3>{getDisplayName(user)}</h3>
                      <p className="muted">{getSubLabel(user) || 'Staff account'}</p>
                    </div>
                    <span className="muted">Edit permissions</span>
                  </summary>
                  <div className="permission-panel">
                    <div className="permission-list">
                      {moduleList.map((module) => {
                        const current = getCurrentLevel(user, module.id);
                        const displayLevel = current === 'none' ? 'off' : current;
                        return (
                          <div key={module.id} className="permission-row">
                            <div>
                              <strong>{module.label}</strong>
                              <p className="muted">{module.description}</p>
                            </div>
                            <div className="permission-segment">
                              {(['view', 'edit', 'manage', 'off'] as const).map((level) => (
                                <button
                                  key={level}
                                  type="button"
                                  className={`secondary${displayLevel === level ? ' active' : ''}`}
                                  onClick={() => setUserLevel(user, module.id, level === 'off' ? 'none' : level)}
                                  disabled={busyId === user.id || bulkBusy}
                                >
                                  {level === 'off' ? 'Off' : level.charAt(0).toUpperCase() + level.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </>
        ) : (
          <p className="muted">No staff users yet.</p>
        )}
      </section>
    </div>
  );
}
