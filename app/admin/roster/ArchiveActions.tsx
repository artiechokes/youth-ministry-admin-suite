'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  teenId: string;
  teenName: string;
  archived: boolean;
};

// Buttons that call archive/restore/delete endpoints and refresh the page.
export function ArchiveActions({ teenId, teenName, archived }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');

  const sendRequest = async (method: 'POST' | 'DELETE', url: string, body?: unknown) => {
    setBusy(true);
    try {
      await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (archived) {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="btn-success"
          disabled={busy}
          onClick={() => sendRequest('DELETE', `/api/teens/${teenId}/archive`)}
        >
          Restore
        </button>
        <button
          type="button"
          className="btn-danger"
          disabled={busy}
          onClick={() => {
            if (window.confirm('Delete this archived teen permanently?')) {
              sendRequest('DELETE', `/api/teens/${teenId}`);
            }
          }}
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <>
      <button type="button" className="btn-archive-secondary" disabled={busy} onClick={() => setShowModal(true)}>
        Archive
      </button>
      {showModal && (
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
          <div className="card" style={{ maxWidth: 420, width: '100%' }}>
            <h3>Archive {teenName}</h3>
            <p className="muted">Add a reason so staff know why this record was archived.</p>
            <div style={{ marginTop: 12 }}>
              <label>Reason</label>
              <input value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="btn-archive"
                disabled={busy}
                onClick={() => {
                  sendRequest('POST', `/api/teens/${teenId}/archive`, {
                    reason: reason.trim() || 'Manual archive'
                  });
                  setShowModal(false);
                  setReason('');
                }}
              >
                Archive
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setShowModal(false);
                  setReason('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
