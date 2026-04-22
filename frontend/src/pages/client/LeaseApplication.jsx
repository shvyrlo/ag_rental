import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';

const TRAILER_TYPES = ['Step deck', 'Flatbed', 'Reefer', 'Conestoga'];

const EMPTY = {
  full_name: '',
  company: '',
  dot_number: '',
  mc_number: '',
  trailer_type: '',
  quantity: '',
  phone: '',
  email: '',
  drivers_license_name: '',
  drivers_license_data: '',
  articles_name: '',
  articles_data: '',
  ein_name: '',
  ein_data: '',
  agreed_to_terms: false,
};

// Read a File as base64 data URI.
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Max 8 MB per file — leaves headroom under the 20 MB body limit.
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export default function LeaseApplication() {
  const [form, setForm] = useState(EMPTY);
  const [mine, setMine] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [busy, setBusy] = useState(false);

  const dlRef = useRef(null);
  const articlesRef = useRef(null);
  const einRef = useRef(null);

  async function loadMine() {
    try {
      setMine(await api('/lease-applications'));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { loadMine(); }, []);

  async function pickFile(field, nameField, fileInputRef) {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError(`${file.name} is too large (max 8 MB).`);
      fileInputRef.current.value = '';
      return;
    }
    setError(null);
    try {
      const data = await readFileAsDataURL(file);
      setForm((f) => ({ ...f, [field]: data, [nameField]: file.name }));
    } catch (err) {
      setError('Could not read file: ' + err.message);
    }
  }

  function clearFile(field, nameField, fileInputRef) {
    setForm((f) => ({ ...f, [field]: '', [nameField]: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.agreed_to_terms) {
      setError('You must agree to the terms of service.');
      return;
    }

    setBusy(true);
    try {
      await api('/lease-applications', {
        method: 'POST',
        body: {
          ...form,
          quantity: form.quantity === '' ? null : Number(form.quantity),
        },
      });
      setSuccess('Your application has been submitted.');
      setForm(EMPTY);
      if (dlRef.current) dlRef.current.value = '';
      if (articlesRef.current) articlesRef.current.value = '';
      if (einRef.current) einRef.current.value = '';
      await loadMine();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Lease application</h1>
        <p className="text-slate-600">
          Fill out the form below. We'll review your application and get back to you.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Lease contact form</h2>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label>Full name</label>
            <input
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Company</label>
            <input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>

          <div className="field">
            <label>DOT number</label>
            <input
              value={form.dot_number}
              onChange={(e) => setForm({ ...form, dot_number: e.target.value })}
            />
          </div>
          <div className="field">
            <label>MC number</label>
            <input
              value={form.mc_number}
              onChange={(e) => setForm({ ...form, mc_number: e.target.value })}
            />
          </div>

          <div className="field">
            <label>Trailer type</label>
            <select
              value={form.trailer_type}
              onChange={(e) => setForm({ ...form, trailer_type: e.target.value })}
            >
              <option value="">Choose trailer type…</option>
              {TRAILER_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Quantity</label>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>

          <div className="field">
            <label>Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="sm:col-span-2 pt-2 border-t border-slate-200 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-3">
              Upload supporting documents (PDF or image, max 8 MB each)
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <FileField
                label="Driver's license"
                fileName={form.drivers_license_name}
                inputRef={dlRef}
                onChange={() => pickFile('drivers_license_data', 'drivers_license_name', dlRef)}
                onClear={() => clearFile('drivers_license_data', 'drivers_license_name', dlRef)}
              />
              <FileField
                label="Articles of incorporation"
                fileName={form.articles_name}
                inputRef={articlesRef}
                onChange={() => pickFile('articles_data', 'articles_name', articlesRef)}
                onClear={() => clearFile('articles_data', 'articles_name', articlesRef)}
              />
              <FileField
                label="EIN number"
                fileName={form.ein_name}
                inputRef={einRef}
                onChange={() => pickFile('ein_data', 'ein_name', einRef)}
                onClear={() => clearFile('ein_data', 'ein_name', einRef)}
              />
            </div>
          </div>

          <div className="sm:col-span-2 flex items-start gap-2 pt-2">
            <input
              id="agree"
              type="checkbox"
              className="mt-1"
              checked={form.agreed_to_terms}
              onChange={(e) => setForm({ ...form, agreed_to_terms: e.target.checked })}
            />
            <label htmlFor="agree" className="text-sm text-slate-700">
              I agree to the terms of service and confirm the information provided is accurate.
            </label>
          </div>

          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          {success && <p className="sm:col-span-2 text-sm text-emerald-600">{success}</p>}

          <div className="sm:col-span-2">
            <button className="btn-primary" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit application'}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Your applications</h2>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700 text-left">
              <tr>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2">Trailer type</th>
                <th className="px-4 py-2">Quantity</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Admin notes</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((a) => (
                <tr key={a.id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-2">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{a.trailer_type || '—'}</td>
                  <td className="px-4 py-2">{a.quantity ?? '—'}</td>
                  <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-2 text-slate-600">{a.admin_notes || '—'}</td>
                </tr>
              ))}
              {mine.length === 0 && (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={5}>No applications yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FileField({ label, fileName, inputRef, onChange, onClear }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/*"
        onChange={onChange}
        className="block w-full text-xs text-slate-600
                   file:mr-2 file:py-1 file:px-2 file:text-xs
                   file:rounded file:border-0
                   file:bg-slate-800 file:text-white
                   hover:file:bg-slate-700"
      />
      {fileName && (
        <div className="flex items-center justify-between text-xs">
          <span className="truncate text-slate-700" title={fileName}>{fileName}</span>
          <button type="button" onClick={onClear} className="text-red-600 hover:underline">
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
