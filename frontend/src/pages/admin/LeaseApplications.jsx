import { Fragment, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

// Turn a `data:` URI into a Blob so we can trigger a real download.
function dataURItoBlob(dataURI) {
  const [meta, b64] = dataURI.split(',');
  const mime = (meta.match(/data:(.*?);base64/) || [])[1] || 'application/octet-stream';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export default function AdminLeaseApplications() {
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null); // id being saved
  const [draftNotes, setDraftNotes] = useState({}); // id -> notes string

  async function load() {
    try {
      setItems(await api('/lease-applications'));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    setError(null);
    setSaving(id);
    try {
      await api(`/lease-applications/${id}`, {
        method: 'PUT',
        body: { status, admin_notes: draftNotes[id] ?? undefined },
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  async function saveNotes(id) {
    setError(null);
    setSaving(id);
    try {
      await api(`/lease-applications/${id}`, {
        method: 'PUT',
        body: { admin_notes: draftNotes[id] ?? '' },
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  async function downloadFile(appId, kind, fallbackName) {
    setError(null);
    try {
      const { name, data } = await api(`/lease-applications/${appId}/files/${kind}`);
      const blob = dataURItoBlob(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name || fallbackName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  function toggle(id) {
    setExpandedId((cur) => (cur === id ? null : id));
    if (!(id in draftNotes)) {
      const app = items.find((x) => x.id === id);
      setDraftNotes((d) => ({ ...d, [id]: app?.admin_notes || '' }));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lease applications</h1>
        <p className="text-slate-600">Review submissions, download documents, update status.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-700 text-left">
            <tr>
              <th className="px-4 py-2">Submitted</th>
              <th className="px-4 py-2">Applicant</th>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Trailer</th>
              <th className="px-4 py-2">Qty</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <Fragment key={a.id}>
                <tr
                  className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer"
                  onClick={() => toggle(a.id)}
                >
                  <td className="px-4 py-2">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 font-medium">{a.full_name}</td>
                  <td className="px-4 py-2 text-slate-600">{a.company || '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{a.trailer_type || '—'}</td>
                  <td className="px-4 py-2">{a.quantity ?? '—'}</td>
                  <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-2 text-right text-slate-400">
                    {expandedId === a.id ? '▾' : '▸'}
                  </td>
                </tr>
                {expandedId === a.id && (
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td colSpan={7} className="px-4 py-4 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                        <Detail label="Full name" value={a.full_name} />
                        <Detail label="Company" value={a.company} />
                        <Detail label="Account email" value={a.client_email} />
                        <Detail label="DOT number" value={a.dot_number} />
                        <Detail label="MC number" value={a.mc_number} />
                        <Detail label="Trailer type" value={a.trailer_type} />
                        <Detail label="Quantity" value={a.quantity} />
                        <Detail label="Contact phone" value={a.phone} />
                        <Detail label="Contact email" value={a.email} />
                        <Detail
                          label="Agreed to terms"
                          value={a.agreed_to_terms ? 'Yes' : 'No'}
                        />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">Documents</p>
                        <div className="flex flex-wrap gap-2">
                          <DocButton
                            label="Driver's license"
                            present={a.has_drivers_license}
                            name={a.drivers_license_name}
                            onClick={() => downloadFile(a.id, 'drivers_license', 'drivers_license')}
                          />
                          <DocButton
                            label="Articles of incorporation"
                            present={a.has_articles}
                            name={a.articles_name}
                            onClick={() => downloadFile(a.id, 'articles', 'articles')}
                          />
                          <DocButton
                            label="EIN number"
                            present={a.has_ein}
                            name={a.ein_name}
                            onClick={() => downloadFile(a.id, 'ein', 'ein')}
                          />
                        </div>
                      </div>

                      <div className="field">
                        <label>Admin notes</label>
                        <textarea
                          rows={3}
                          value={draftNotes[a.id] ?? ''}
                          onChange={(e) =>
                            setDraftNotes((d) => ({ ...d, [a.id]: e.target.value }))
                          }
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn-secondary"
                          disabled={saving === a.id}
                          onClick={() => saveNotes(a.id)}
                        >
                          Save notes
                        </button>
                        <button
                          className="btn-primary"
                          disabled={saving === a.id || a.status === 'approved'}
                          onClick={() => setStatus(a.id, 'approved')}
                        >
                          Approve
                        </button>
                        <button
                          className="btn-danger"
                          disabled={saving === a.id || a.status === 'rejected'}
                          onClick={() => setStatus(a.id, 'rejected')}
                        >
                          Reject
                        </button>
                        <button
                          className="btn-secondary"
                          disabled={saving === a.id || a.status === 'pending'}
                          onClick={() => setStatus(a.id, 'pending')}
                        >
                          Mark pending
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {items.length === 0 && (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>No applications yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-slate-800">{value || value === 0 ? value : '—'}</p>
    </div>
  );
}

function DocButton({ label, present, name, onClick }) {
  if (!present) {
    return (
      <span className="inline-flex items-center px-3 py-1.5 rounded-md border border-slate-200 bg-slate-100 text-slate-400 text-xs">
        {label}: not provided
      </span>
    );
  }
  return (
    <button type="button" className="btn-secondary text-xs" onClick={onClick} title={name || ''}>
      Download {label}
    </button>
  );
}
