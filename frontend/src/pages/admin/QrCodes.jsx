import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../../lib/api.js';
import agMarkUrl from '../../assets/brand/ag-mark.png';
import equipmentRentalUrl from '../../assets/brand/equipment-rental.png';

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

// Cache each brand asset as a loaded Image — reused across every render.
const imageCache = new Map();
function loadImage(src) {
  if (!imageCache.has(src)) {
    imageCache.set(src, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    }));
  }
  return imageCache.get(src);
}

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Render the branded QR (QR + centered AG card + red EQUIPMENT RENTAL banner)
// onto a <canvas> at the requested pixel size. Uses error-correction level H
// so the central ~22% obstruction is still scannable.
async function renderBrandedQr(canvas, text, px) {
  // Load brand art first so we can compute the caption band height from its
  // aspect ratio (makes it look balanced at every size).
  const [agImg, erImg] = await Promise.all([
    loadImage(agMarkUrl),
    loadImage(equipmentRentalUrl),
  ]);

  // Band height = banner PNG natural height scaled to the QR width,
  // with a small top/bottom gap. Keeps the text visually proportional.
  const bannerW = px * 0.86;
  const bannerH = bannerW * (erImg.naturalHeight / erImg.naturalWidth);
  const captionH = Math.round(bannerH + px * 0.05);

  canvas.width = px;
  canvas.height = px + captionH;
  const ctx = canvas.getContext('2d');

  // White bg for the whole poster (QR area + caption area).
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render QR to an off-screen canvas, then blit onto our poster canvas.
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, text, {
    width: px,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#ffffff' },
  });
  ctx.drawImage(qrCanvas, 0, 0, px, px);

  // Centered white rounded card that will hold the AG mark (fits the mark's
  // aspect ratio instead of being a hard square — gives tighter composition).
  const agAspect = agImg.naturalWidth / agImg.naturalHeight;
  const cardH = Math.round(px * 0.18);
  const cardW = Math.round(cardH * agAspect * 1.22); // a little breathing room
  const cardX = Math.round((px - cardW) / 2);
  const cardY = Math.round((px - cardH) / 2);
  const cardR = Math.round(Math.min(cardW, cardH) * 0.18);
  roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // AG mark inside the card — fit by height, keep aspect.
  const logoH = Math.round(cardH * 0.78);
  const logoW = Math.round(logoH * agAspect);
  const logoX = Math.round(cardX + (cardW - logoW) / 2);
  const logoY = Math.round(cardY + (cardH - logoH) / 2);
  ctx.drawImage(agImg, logoX, logoY, logoW, logoH);

  // EQUIPMENT RENTAL banner underneath — centered, width-capped at 86%.
  const bannerX = (canvas.width - bannerW) / 2;
  const bannerY = px + (captionH - bannerH) / 2;
  ctx.drawImage(erImg, bannerX, bannerY, bannerW, bannerH);
}

// Render the branded QR at print size and trigger a browser download.
async function downloadQrAtSize(text, baseFilename, inches) {
  const px = inches * DPI;
  const canvas = document.createElement('canvas');
  await renderBrandedQr(canvas, text, px);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${baseFilename}-${inches}x${inches}in.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// On-page branded preview. Re-renders whenever `text` changes.
function BrandedQrPreview({ text, size = 192 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!text || !canvasRef.current) return;
    let cancelled = false;
    renderBrandedQr(canvasRef.current, text, size).catch(() => {});
    return () => { cancelled = true; };
  }, [text, size]);
  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: 'auto', display: 'block' }}
    />
  );
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
          <BrandedQrPreview text={homeUrl} size={192} />
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
        <BrandedQrPreview text={code.scan_url} size={128} />
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
