'use client';

import { useMemo, useState } from 'react';
import type { AttendanceRecord, Teen } from '@prisma/client';
import { TeenRegistrationForm } from '@/components/TeenRegistrationForm';

type Props = {
  teens: Teen[];
  attendance: AttendanceRecord[];
};

function formatTime(value?: Date | string | null) {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function shouldShowTimes(record?: AttendanceRecord | null) {
  if (!record) return false;
  if (!record.checkOutAt) return true;
  const checkOut = new Date(record.checkOutAt);
  const now = new Date();
  const minutesSince = (now.getTime() - checkOut.getTime()) / 60000;
  return minutesSince <= 10;
}

// Touch-friendly kiosk for checking teens in/out.
export function KioskClient({ teens, attendance }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  const attendanceByTeen = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const record of attendance) {
      const existing = map.get(record.teenId);
      if (!existing || new Date(record.checkInAt) > new Date(existing.checkInAt)) {
        map.set(record.teenId, record);
      }
    }
    return map;
  }, [attendance]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teens;
    return teens.filter((teen) => `${teen.firstName} ${teen.lastName}`.toLowerCase().includes(q));
  }, [query, teens]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const clearSelection = () => setSelectedIds([]);

  const submit = async (action: 'checkin' | 'checkout') => {
    if (!selectedIds.length) return;
    setBusy(true);
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, teenIds: selectedIds })
      });
      clearSelection();
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="card" style={{ display: 'grid', gap: 16 }}>
        <div>
          <h1>Attendance Kiosk</h1>
          <p className="muted">Tap to select teens, then check them in or out.</p>
        </div>
        <div className="grid two">
          <div>
            <label>Search</label>
            <input
              placeholder="Search by name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" disabled={busy || !selectedIds.length} onClick={() => submit('checkin')}>
              Check In
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy || !selectedIds.length}
              onClick={() => submit('checkout')}
            >
              Check Out
            </button>
            <button type="button" className="secondary" onClick={() => setShowRegistration(true)}>
              New Teen Registration
            </button>
          </div>
        </div>
        <div className="muted">Selected: {selectedIds.length}</div>
        <div style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th></th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>Date</th>
                <th>Time In</th>
                <th>Time Out</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((teen) => {
              const record = attendanceByTeen.get(teen.id);
              const selected = selectedIds.includes(teen.id);
              const showTimes = shouldShowTimes(record);
              return (
                <tr
                  key={teen.id}
                  onClick={() => toggleSelect(teen.id)}
                  style={{
                  cursor: 'pointer',
                  background: selected ? 'var(--accent-soft)' : 'transparent'
                }}
              >
                  <td>
                    <input type="checkbox" checked={selected} readOnly />
                  </td>
                  <td>{teen.lastName}</td>
                  <td>{teen.firstName}</td>
                  <td>{showTimes ? new Date(record.checkInAt).toLocaleDateString() : '-'}</td>
                  <td>{showTimes ? formatTime(record.checkInAt) : '-'}</td>
                  <td>{showTimes ? formatTime(record.checkOutAt) : '-'}</td>
                </tr>
              );
            })}
              {!filtered.length && (
                <tr>
                <td colSpan={6} className="muted">
                  No teens found.
                </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showRegistration && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: 16
          }}
        >
          <div className="card" style={{ maxWidth: 720, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <h2>New Teen Registration</h2>
                <p className="muted">Use this for first-time visitors.</p>
              </div>
              <button type="button" className="secondary" onClick={() => setShowRegistration(false)}>
                Close
              </button>
            </div>
            <TeenRegistrationForm
              onSuccess={() => {
                setShowRegistration(false);
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
