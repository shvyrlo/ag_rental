import { useEffect, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import QRCode from 'qrcode';
import { api } from '../../lib/api.js';

// Print sizes the admin can choose from for downloadable PNGs.
// 150 DPI gives sharp large-format output without blowing past
// browser canvas limits (40 in × 150 = 6000 px square).
const DPI = 150;
const SIZES = [
  { label: '10 × 10 in', inches: 10 },
  { label: '20 × 20 in', inches: 20 },
  { label: '40 × 40 in', inches: 40 },
];
const DEFAULT_INCHES = 10;

// Render the QR at the requested pixel size via the `qrcode` package and
// trigger a browser download. This runs entirely off-screen so the on-page
// preview stays compact.
async function downloadQrAtSize(text, baseFilename, inches) {
  const px = inches * DPI;
  const dataUrl = await QRCode.toDataURL(text, {
    width: px,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${baseFilename}-${inches}x${inches}in.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function SizePicker({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="text-xs rounded-md border border-slate-300 bg-white px-2 py-1"
    >
      {SIZES.map((s) => (
        <option key={s.inches} value={s.inches}>{s.label}</option>
      ))}
    </select>
  );
}

export default function AdminQrCodes() {
  const [codes, setCodes] = useState([]);
  const [equipment, setEquipment] = useState([]);
  // destination is one of: '' (home), 'phone', or the equipment id as a string.
  const [form, setForm] = useState({ label: '', destination: '', phone_number: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // The public-facing home URL — used for the "general" QR code.
  const homeUrl = useMemo(
    () => (typeof window !== 'undefined' ? window.location.origin + '/' : '/'),
    [],
  );

  async function load() {
    try {
      const [c, e] = await Promise.all([
        api('/qr-codes'),
        api('/equipment'),
      ]);
      setCodes(c);
      setEquipment(e);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);

    const body = { label: form.label || null };
    if (form.destination === 'phone') {
      const trimmed = form.phone_number.trim();
      if (!trimmed) {
        setError('Please enter a phone number.');
        return;
      }
      body.phone_number = trimmed;
    } else if (form.destination) {
      body.equipment_id = Number(form.destination);
    }

    setBusy(true);
    try {
      await api('/qr-codes', { method: 'POST', body });
      setForm({ label: '', destination: '', phone_number: '' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this QR code? The printed/published code will stop tracking scans.')) return;
    try {
      await api(`/qr-codes/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">QR codes</h1>
        <p className="text-slate-600">
          Generate QR codes for flyers, trucks, and online ads. Use a general
          QR to point at the home page, or a tracked QR to count scans.
          Pick a print size before downloading — we render the PNG at {DPI} DPI
          for the selected physical size.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <GeneralQrSection homeUrl={homeUrl} onError={setError} />

      <TrackedQrSection
        codes={codes}
        equipment={equipment}
        form={form}
        setForm={setForm}
        busy={busy}
        onCreate={handleCreate}
        onRemove={remove}
        onError={setError}
      />
    </div>
  );
}

function GeneralQrSection({ homeUrl, onError }) {
  const [inches, setInches] = useState(DEFAULT_INCHES);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadQrAtSize(homeUrl, 'ag-rental-home-qr', inches);
    } catch (err) {
      onError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-6">
        <div className="shrink-0 rounded-lg border border-slate-200 p-3 bg-white">
          <QRCodeCanvas value={homeUrl} size={192} includeMargin />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h2 className="text-lg font-semibold">General QR code</h2>
            <p className="text-sm text-slate-600">
              Always points to the website home page. Not tracked — scans are
              anonymous. Use this on generic marketing material.
            </p>
          </div>
          <div className="text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Target</p>
            <p className="font-mono text-slate-800 break-all">{homeUrl}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs uppercase tracking-wide text-slate-500">Size</label>
            <SizePicker value={inches} onChange={setInches} />
            <button
              className="btn-secondary"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? 'Rendering…' : 'Download PNG'}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            PNG output: {inches * DPI} × {inches * DPI} px at {DPI} DPI.
          </p>
        </div>
      </div>
    </section>
  );
}

function TrackedQrSection({ codes, equipment, form, setForm, busy, onCreate, onRemove, onError }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Tracked QR codes</h2>
        <p className="text-sm text-slate-600">
          Each tracked code has a unique slug. When someone scans it, the
          scan is counted and they're redirected to the public page.
        </p>
      </div>

      <form onSubmit={onCreate} className="rounded-xl border border-slate-200 bg-white p-6 grid gap-4 sm:grid-cols-3">
        <div className="field sm:col-span-2">
          <label>Label (optional)</label>
          <input
            placeholder="e.g. Spring billboard, truck #42 tailgate"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Link to</label>
          <select
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
          >
            <option value="">Home page</option>
            <option value="phone">Phone number (click-to-call)</option>
            {equipment.length > 0 && (
              <optgroup label="Equipment">
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.unit_number ? `[${eq.unit_number}] ` : ''}{eq.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        {form.destination === 'phone' && (
          <div className="field sm:col-span-3">
            <label>Phone number</label>
            <input
              type="tel"
              placeholder="+1 555-123-4567"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">
              Scanning this QR will record the scan, then open the scanner's
              phone dialer pre-filled with this number.
            </p>
          </div>
        )}
        <div className="sm:col-span-3">
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Generating…' : 'Generate tracked QR code'}
          </button>
        </div>
      </form>

      {codes.length === 0 ? (
        <p className="text-sm text-slate-500">No tracked QR codes yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {codes.map((c) => (
            <TrackedQrCard key={c.id} code={c} onRemove={onRemove} onError={onError} />
          ))}
        </div>
      )}
    </section>
  );
}

function TrackedQrCard({ code, onRemove, onError }) {
  const [inches, setInches] = useState(DEFAULT_INCHES);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const baseName = `qr-${code.slug}${code.label ? '-' + code.label.replace(/\s+/g, '_') : ''}`;
      await downloadQrAtSize(code.scan_url, baseName, inches);
    } catch (err) {
      onError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 flex gap-4">
      <div className="shrink-0 rounded-lg border border-slate-200 p-2 bg-white h-fit">
        <QRCodeCanvas value={code.scan_url} size={128} includeMargin />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">
              {code.label || <span className="italic text-slate-500">Untitled</span>}
            </p>
            <p className="text-xs text-slate-500 font-mono">slug: {code.slug}</p>
          </div>
          <button
            className="btn-danger text-xs"
            onClick={() => onRemove(code.id)}
          >
            Delete
          </button>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Destination</p>
          <p className="text-xs text-slate-700 break-all">
            {code.phone_number
              ? <>📞 Call {code.phone_number}</>
              : code.equipment_name
                ? <>Equipment: {code.equipment_unit_number ? `[${code.equipment_unit_number}] ` : ''}{code.equipment_name}</>
                : 'Home page'}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Scan URL</p>
          <p className="text-xs font-mono text-slate-700 break-all">{code.scan_url}</p>
        </div>

        <div className="pt-1 space-y-2">
          <div className="text-sm">
            <span className="text-2xl font-bold text-slate-900">{code.scan_count}</span>
            <span className="text-slate-500 ml-1">
              scan{code.scan_count === 1 ? '' : 's'}
            </span>
            {code.last_scanned_at && (
              <p className="text-xs text-slate-500">
                last: {new Date(code.last_scanned_at).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SizePicker value={inches} onChange={setInches} />
            <button
              className="btn-secondary text-xs"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? 'Rendering…' : 'Download PNG'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
