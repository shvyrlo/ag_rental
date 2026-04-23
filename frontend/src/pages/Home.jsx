import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useT } from '../i18n/i18n.jsx';
import { useInView } from '../lib/useInView.js';
import stepDeckImg from '../assets/trailers/step-deck.png';
import conestogaImg from '../assets/trailers/conestoga.png';
import flatbedImg from '../assets/trailers/flatbed.png';
import reeferImg from '../assets/trailers/reefer.png';
import peterbiltImg from '../assets/trucks/peterbilt-579.png';
import cascadiaImg from '../assets/trucks/freightliner-cascadia.png';

// All fleet data lives here so the page stays pure-presentation.
const FLEET = {
  trucks: [
    {
      name: 'Peterbilt 579',
      years: '2025–2026',
      price: '$985 – $1,200',
      unit: '/ week',
      deposit: '$5,000 deposit',
      image: peterbiltImg,
      bullets: [
        'Maintenance 0.15 cpm',
        'Physical damage not included',
        'Short term / long term',
      ],
    },
    {
      name: 'Freightliner Cascadia',
      years: '2025–2026',
      price: '$985 – $1,200',
      unit: '/ week',
      deposit: '$5,000 deposit',
      image: cascadiaImg,
      bullets: [
        'Maintenance 0.15 cpm',
        'Physical damage not included',
        'Short term / long term',
      ],
    },
  ],
  trailers: [
    {
      name: 'Step deck',
      years: '2024–2026',
      price: '$1,600',
      unit: '/ month',
      deposit: '$2,000 security deposit',
      image: stepDeckImg,
      bullets: [
        'Benson, Wabash, Reitnouer',
        'Ramps and two toolboxes included',
        'Tire and brake maintenance included (normal wear)',
        'Tire service included, spare provided',
        'Physical damage not included',
      ],
    },
    {
      name: 'Conestoga',
      years: '2026',
      price: '$1,800',
      unit: '/ month',
      deposit: '$2,000 security deposit',
      image: conestogaImg,
      bullets: [
        'Reitnouer 53 ft',
        'Tire and brake maintenance included (normal wear)',
        'Tire service included, spare provided',
        'Physical damage not included',
      ],
    },
    {
      name: 'Flatbed',
      years: '2024–2026',
      price: '$1,300',
      unit: '/ month',
      deposit: '$1,500 security deposit',
      image: flatbedImg,
      bullets: [
        'Benson, Wabash, Reitnouer, MAC',
        'Two toolboxes included',
        'Tire and brake maintenance included (normal wear)',
        'Tire service included, spare provided',
        'Physical damage not included',
      ],
    },
    {
      name: 'Reefer',
      years: '2011–2026',
      price: 'Priority waitlist',
      unit: '',
      deposit: null,
      image: reeferImg,
      bullets: [
        'Reefer trailers are scheduled to arrive at our Channahon yard.',
        'Contact us now to join the priority waitlist.',
      ],
    },
  ],
};

const PROCESS = [
  { n: '01', title: 'Application', body: 'Fill out our rental application.' },
  { n: '02', title: 'Call',
    body: 'Upon approval, our team will contact you by phone or email. You can choose a trailer on our website or select the right unit with our manager. Security deposit for new customers starts at $1,500.' },
  { n: '03', title: 'Insurance',
    body: 'As soon as we get the information about your arrival date, we will provide you with a VIN number so you can add the unit to your physical insurance (value $25,000–$170,000).' },
  { n: '04', title: 'Inspection',
    body: 'While your insurance is pending approval, your unit enters our repair shop for a multi-point inspection ensuring you\'re road ready and addressing any concerns.' },
  { n: '05', title: 'Ready for pickup',
    body: 'Once your insurance is verified and the multi-point inspection is completed, you\'ll be notified that your unit is ready for pickup.' },
  { n: '06', title: 'Rental',
    body: 'Finally, you\'re ready to sign the Lease Agreement and conduct a final inspection noting any issues. The security deposit and first month\'s rent (or proration) is due (card payments are not accepted).' },
];

export default function Home() {
  const t = useT();
  const { user } = useAuth();
  const [tab, setTab] = useState('trailers');

  // Cursor-tracking spotlight for the hero. We write CSS vars directly on
  // the overlay element so React doesn't re-render on every mousemove.
  const spotlightRef = useRef(null);
  function handleHeroMouseMove(e) {
    const el = spotlightRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
    el.style.setProperty('--my', (e.clientY - rect.top) + 'px');
    if (!el.classList.contains('is-active')) el.classList.add('is-active');
  }
  function handleHeroMouseLeave() {
    spotlightRef.current?.classList.remove('is-active');
  }

  const applyHref = user ? '/client/lease-application' : '/register';
  const dashboardHref = user
    ? user.role === 'admin' ? '/admin'
      : user.role === 'mechanic' ? '/mechanic'
        : '/client'
    : null;

  return (
    <div className="font-sans">
      {/* ─── Hero ──────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden bg-slate-950 text-white"
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
      >
        {/* Soft radial glows in brand colors for depth, gently breathing. */}
        <div
          className="pointer-events-none absolute inset-0 animate-slow-pulse"
          style={{
            background:
              'radial-gradient(600px at 18% 20%, rgba(208,36,54,0.22), transparent 60%),' +
              'radial-gradient(700px at 82% 80%, rgba(26,107,136,0.22), transparent 60%)',
          }}
          aria-hidden="true"
        />
        {/* Floating brand-color orbs for added depth. */}
        <div className="hero-orb hero-orb--a" aria-hidden="true" />
        <div className="hero-orb hero-orb--b" aria-hidden="true" />
        {/* Fine grid line texture, drifting diagonally. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08] animate-grid-drift"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px),' +
              'linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
          aria-hidden="true"
        />
        {/* Cursor-tracking spotlight that wakes up on hover. */}
        <div ref={spotlightRef} className="hero-spotlight" aria-hidden="true" />

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32 lg:py-40">
          <p className="eyebrow text-accent-300 animate-enter-up">
            {t('Truck & Trailer Rental')}
          </p>

          <h1 className="mt-8 font-display text-5xl sm:text-7xl lg:text-[88px] font-semibold leading-[1.02]">
            <span className="block animate-enter-up stagger-1">{t('Honest rates.')}</span>
            <span className="block animate-enter-up stagger-2">{t('Flexible plans.')}</span>
            <span className="block animate-enter-up stagger-3">
              <span className="font-display-italic text-brand-400 shimmer-text">{t('Real trucks,')}</span>{' '}
              <span className="font-display-italic text-brand-400 shimmer-text">{t('ready today.')}</span>
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-lg text-slate-300 leading-relaxed animate-enter-up stagger-4">
            {t('A DOT-ready fleet of late-model trucks and trailers waiting in Channahon, Illinois — backed by a repair shop and a team that answers the phone.')}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3 animate-enter-up stagger-5">
            <a href="tel:+16308539348" className="btn-primary btn-shine text-base px-5 py-2.5">
              {t('Call (630) 853-9348')}
            </a>
            <Link to={applyHref} className="btn-secondary btn-shine text-base px-5 py-2.5 link-arrow">
              {t('Get a quote')} <span className="arrow">→</span>
            </Link>
            {user && (
              <Link
                to={dashboardHref}
                className="ml-2 text-sm text-slate-300 hover:text-white underline-offset-4 hover:underline"
              >
                {t('Go to dashboard')}
              </Link>
            )}
          </div>

          {/* Credibility strip */}
          <dl className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl border-t border-white/10 pt-8 animate-enter-fade stagger-6">
            <Stat kicker={t('Fleet')} value="2024–2026" />
            <Stat kicker={t('Based')} value="Channahon, IL" />
            <Stat kicker={t('Deposit from')} value="$1,500" />
            <Stat kicker={t('Plans')} value={t('Weekly / monthly')} />
          </dl>
        </div>

        {/* Bouncing scroll cue */}
        <a
          href="#fleet"
          aria-label="Scroll to fleet"
          className="hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 hover:text-white scroll-cue"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </a>
      </section>

      {/* ─── Rental Fleet ──────────────────────────────────── */}
      <section id="fleet" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-24 lg:py-28">
          <Reveal>
            <div>
              <p className="eyebrow text-brand-700">{t('Our')}</p>
              <div className="mt-5 flex flex-wrap items-end gap-6">
                <h2 className="font-display text-5xl sm:text-6xl font-semibold text-slate-900 leading-[1.02]">
                  {t('Rental Fleet.')}
                </h2>
                <div className="inline-flex rounded-full border border-slate-300 bg-white p-2 shadow-sm">
                  <TabButton active={tab === 'trucks'} onClick={() => setTab('trucks')}>
                    {t('Trucks')}
                  </TabButton>
                  <TabButton active={tab === 'trailers'} onClick={() => setTab('trailers')}>
                    {t('Trailers')}
                  </TabButton>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="mt-12 mx-auto max-w-7xl flex flex-col gap-6">
            {FLEET[tab].map((unit, i) => (
              <Reveal key={unit.name} delay={80 + i * 120}>
                <FleetCard unit={unit} applyHref={applyHref} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── The AG Difference ─────────────────────────────── */}
      <section id="difference" className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-24 lg:py-28 grid gap-14 lg:gap-20 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="eyebrow text-brand-700">{t('The AG')}</p>
            <h2 className="mt-5 font-display text-5xl sm:text-6xl font-semibold text-slate-900 leading-[1.02]">
              {t('Difference.')}
            </h2>
            <p className="mt-8 text-lg text-slate-600 leading-relaxed">
              {t('We built our rental service to be the partner we always wanted — focused on what matters:')}{' '}
              <em className="font-display-italic text-slate-900">{t('quality')}</em>,{' '}
              <em className="font-display-italic text-slate-900">{t('flexibility')}</em>, {t('and')}{' '}
              <em className="font-display-italic text-slate-900">{t('simplicity')}</em>.
            </p>
            <p className="mt-5 text-slate-600 leading-relaxed">
              {t('We\'re here to make your life on the road easier. That\'s why we focus on impeccable quality with our serviced 2024–2026 fleet, offer custom plans at fair rates, and keep the process fast and friendly from our yard in Channahon, Illinois.')}
            </p>
            <Link to={applyHref} className="mt-10 inline-flex btn-primary text-base px-5 py-2.5 link-arrow">
              {t('Get a quote')} <span className="arrow">→</span>
            </Link>
          </Reveal>

          <Reveal delay={120} className="lg:col-span-7 self-start">
            <div className="grid sm:grid-cols-2 gap-px bg-slate-200 rounded-2xl overflow-hidden ring-1 ring-slate-200">
              <DifferenceCard n="01" title={t('Quality')}
                body={t('Impeccable, serviced 2024–2026 equipment — in and out of our own shop.')} />
              <DifferenceCard n="02" title={t('Flexibility')}
                body={t('Custom plans. Weekly and monthly terms. Honest, straightforward rates.')} />
              <DifferenceCard n="03" title={t('Simplicity')}
                body={t('Fast, friendly from day one. A team that answers the phone.')} />
              <DifferenceCard n="04" title={t('Local')}
                body={t('Channahon, IL — a DOT-ready yard ten minutes from I-55 and I-80.')} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Pricing & Process ─────────────────────────────── */}
      <section id="process" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-24 lg:py-28">
          <Reveal>
            <div className="max-w-3xl">
              <p className="eyebrow text-brand-700">{t('Rental')}</p>
              <h2 className="mt-5 font-display text-5xl sm:text-6xl font-semibold text-slate-900 leading-[1.02]">
                {t('Pricing &')}{' '}
                <span className="font-display-italic text-brand-600">{t('Process.')}</span>
              </h2>
              <p className="mt-6 text-lg text-slate-600 leading-relaxed">
                {t('Six steps from application to keys-in-hand. Most customers finish the process inside a week.')}
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-y-10 gap-x-8 md:grid-cols-2 lg:grid-cols-3">
            {PROCESS.map((step, i) => (
              <Reveal key={step.n} delay={80 + (i % 3) * 120}>
                <div className="relative">
                  <div className="num-display text-7xl text-brand-500/20 leading-none select-none">
                    {step.n}
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-semibold text-slate-900">
                    {t(step.title)}
                  </h3>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    {step.title === 'Application' ? (
                      <>
                        {t('Fill out our')}{' '}
                        <Link to={applyHref}
                          className="text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-700">
                          {t('rental application')}
                        </Link>
                        .
                      </>
                    ) : t(step.body)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="mt-16 rounded-2xl border border-accent-200 bg-accent-50/60 p-8">
              <p className="eyebrow text-accent-700">{t('Insurance')}</p>
              <p className="mt-4 font-display text-2xl font-semibold text-slate-900 max-w-3xl leading-snug">
                {t('Auto Liability: $1 Million; Physical Damage required.')}
              </p>
              <p className="mt-4 text-slate-700 leading-relaxed max-w-3xl">
                {t('Under Description of Vehicles, the year, make & model, VIN, and value must be added. List AG Truck & Trailer Rental, 24307 Riverside Dr, Channahon, IL 60410 as loss payee / certificate holder and additional insured.')}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Lease contact CTA ────────────────────────────── */}
      <section id="lease" className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-24 lg:py-28 text-center">
          <Reveal>
            <p className="eyebrow text-brand-700">{t('Lease')}</p>
            <h2 className="mt-6 font-display text-5xl sm:text-6xl font-semibold text-slate-900 leading-[1.02]">
              {t('Ready to')} <span className="font-display-italic text-brand-600">{t('roll?')}</span>
            </h2>
            <p className="mt-8 text-lg text-slate-600 leading-relaxed">
              {t('Submit a lease application online — pick a trailer type, upload your EIN, Articles of Incorporation, and driver\'s license, and we\'ll take it from there.')}
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link to={applyHref} className="btn-primary text-base px-5 py-2.5 link-arrow">
                {t('Submit application')} <span className="arrow">→</span>
              </Link>
              <a href="tel:+16308539348" className="btn-secondary text-base px-5 py-2.5">
                {t('Call (630) 853-9348')}
              </a>
            </div>
            <p className="mt-8 text-xs text-slate-500">
              {t('By submitting this application, you acknowledge and agree to our Terms of Service and Privacy Policy.')}
            </p>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

// ─── Small presentational bits ────────────────────────────

function Stat({ kicker, value }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
        {kicker}
      </dt>
      <dd className="mt-1 font-display text-xl text-white">{value}</dd>
    </div>
  );
}

function DifferenceCard({ n, title, body }) {
  return (
    <div className="card-lift bg-white p-8 flex flex-col hover:bg-brand-50/40">
      <div className="flex items-baseline gap-3">
        <span className="num-display text-3xl text-brand-500/80 leading-none">
          {n}
        </span>
        <h3 className="font-display text-xl font-semibold text-slate-900">
          {title}
        </h3>
      </div>
      <p className="mt-4 text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-10 py-3 text-lg font-medium rounded-full transition ' +
        (active
          ? 'bg-brand-600 text-white shadow-sm'
          : 'text-slate-600 hover:text-slate-900')
      }
    >
      {children}
    </button>
  );
}

function FleetCard({ unit, applyHref }) {
  const t = useT();
  // Big trailer image stays visible; click anywhere on the card to reveal
  // the bulleted description, which slides up from the bottom edge.
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`card-lift rounded-2xl border bg-white overflow-hidden
                  transition-[border-color,box-shadow] duration-200
                  ${open
                    ? 'border-brand-300 shadow-md'
                    : 'border-slate-200 hover:border-brand-300 hover:shadow-md'}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full text-left focus:outline-none focus-visible:ring-2
                   focus-visible:ring-brand-300 rounded-2xl"
      >
        <div className="flex flex-col sm:flex-row items-stretch">
          {/* Trailer image — big and prominent, left side on desktop, top on mobile */}
          {unit.image && (
            <div className="relative shrink-0 w-full sm:w-[52rem] h-96 sm:h-[34rem]
                            bg-gradient-to-br from-slate-50 to-slate-100
                            flex items-center justify-center overflow-hidden">
              <img
                src={unit.image}
                alt={`${t(unit.name)} trailer`}
                className="h-full w-full object-contain p-6 transition-transform
                           duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
            </div>
          )}

          {/* Summary — name, years, price, deposit */}
          <div className="flex-1 min-w-0 p-6 sm:p-7 flex flex-col justify-center">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900">
                {t(unit.name)}
              </h3>
              <span className="text-xs uppercase tracking-wider text-slate-500 whitespace-nowrap">
                {unit.years}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-2">
                <div className="font-display text-3xl sm:text-4xl font-semibold text-slate-900 leading-none">
                  {t(unit.price)}
                </div>
                {unit.unit && (
                  <div className="text-sm text-slate-500">{t(unit.unit)}</div>
                )}
              </div>
              {/* Chevron — rotates 180° when expanded */}
              <svg
                className={`shrink-0 h-6 w-6 text-slate-400 transition-transform duration-300
                            ${open ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            {unit.deposit && (
              <div className="mt-1 text-xs text-slate-500">{t(unit.deposit)}</div>
            )}
            <div className="mt-3 text-xs text-slate-400 italic">
              {open ? t('Click to close') : t('Click for details →')}
            </div>
          </div>
        </div>
      </button>

      {/* Description slides up from the bottom when opened */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-400 ease-out
                    ${open
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className={`px-6 sm:px-7 pb-7 pt-5 border-t border-slate-100
                           transition-transform duration-400 ease-out
                           ${open ? 'translate-y-0' : 'translate-y-4'}`}>
            <ul className="space-y-2 text-sm text-slate-600">
              {unit.bullets.map((b) => (
                <li key={b} className="flex gap-2.5">
                  <span className="text-brand-500 mt-1 select-none">—</span>
                  <span className="leading-relaxed">{t(b)}</span>
                </li>
              ))}
            </ul>

            <Link
              to={applyHref}
              className="link-arrow mt-6 inline-block text-sm font-medium
                         text-brand-700 hover:text-brand-800 underline-offset-4 hover:underline"
            >
              {t('Apply now')} <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal ${inView ? 'is-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
