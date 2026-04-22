import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useInView } from '../lib/useInView.js';

// All fleet data lives here so the page stays pure-presentation.
const FLEET = {
  trucks: [
    {
      name: 'Peterbilt 579',
      years: '2025–2026',
      price: '$985 – $1,200',
      unit: '/ week',
      deposit: '$5,000 deposit',
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

const TRAILER_GALLERY = [
  { name: 'Reefer',    blurb: 'For temperature-sensitive goods. New 2024–2026 units.' },
  { name: 'Conestoga', blurb: 'For weather-sensitive cargo. Brand new 2026 Reitnouer 53.' },
  { name: 'Step Deck', blurb: 'For taller loads. Also new 2024–2026 & DOT-ready.' },
  { name: 'Flatbed',   blurb: 'New 2024–2026 models. Fully serviced and DOT-ready.' },
];

export default function Home() {
  const { user } = useAuth();
  const [tab, setTab] = useState('trailers');

  const applyHref = user ? '/client/lease-application' : '/register';
  const dashboardHref = user
    ? user.role === 'admin' ? '/admin'
      : user.role === 'mechanic' ? '/mechanic'
        : '/client'
    : null;

  return (
    <div className="font-sans">
      {/* ─── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
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

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32 lg:py-40">
          <p className="eyebrow text-accent-300 animate-enter-up">
            Truck &amp; Trailer Rental
          </p>

          <h1 className="mt-8 font-display text-5xl sm:text-7xl lg:text-[88px] font-semibold leading-[1.02]">
            <span className="block animate-enter-up stagger-1">Honest rates.</span>
            <span className="block animate-enter-up stagger-2">Flexible plans.</span>
            <span className="block animate-enter-up stagger-3">
              <span className="font-display-italic text-brand-400">Real trucks,</span>{' '}
              <span className="font-display-italic text-brand-400">ready&nbsp;today.</span>
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-lg text-slate-300 leading-relaxed animate-enter-up stagger-4">
            A DOT-ready fleet of late-model trucks and trailers waiting in
            Channahon, Illinois — backed by a repair shop and a team that
            answers the phone.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3 animate-enter-up stagger-5">
            <a href="tel:+16308539348" className="btn-primary text-base px-5 py-2.5">
              Call (630) 853-9348
            </a>
            <Link to={applyHref} className="btn-secondary text-base px-5 py-2.5 link-arrow">
              Get a quote <span className="arrow">→</span>
            </Link>
            {user && (
              <Link
                to={dashboardHref}
                className="ml-2 text-sm text-slate-300 hover:text-white underline-offset-4 hover:underline"
              >
                Go to dashboard
              </Link>
            )}
          </div>

          {/* Credibility strip */}
          <dl className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl border-t border-white/10 pt-8 animate-enter-fade stagger-6">
            <Stat kicker="Fleet" value="2024–2026" />
            <Stat kicker="Based" value="Channahon, IL" />
            <Stat kicker="Deposit from" value="$1,500" />
            <Stat kicker="Plans" value="Weekly / monthly" />
          </dl>
        </div>
      </section>

      {/* ─── The AG Difference ─────────────────────────────── */}
      <section id="difference" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-24 lg:py-28 grid gap-14 lg:gap-20 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="eyebrow text-brand-700">The AG</p>
            <h2 className="mt-5 font-display text-5xl sm:text-6xl font-semibold text-slate-900 leading-[1.02]">
              Difference.
            </h2>
            <p className="mt-8 text-lg text-slate-600 leading-relaxed">
              We built our rental service to be the partner we always wanted —
              focused on what matters: <em className="font-display-italic text-slate-900">quality</em>,{' '}
              <em className="font-display-italic text-slate-900">flexibility</em>, and{' '}
              <em className="font-display-italic text-slate-900">simplicity</em>.
            </p>
            <p className="mt-5 text-slate-600 leading-relaxed">
              We're here to make your life on the road easier. That's why we
              focus on impeccable quality with our serviced 2024–2026 fleet,
              offer custom plans at fair rates, and keep the process fast and
              friendly from our yard in Channahon, Illinois.
            </p>
            <Link to={applyHref} className="mt-10 inline-flex btn-primary text-base px-5 py-2.5 link-arrow">
              Get a quote <span className="arrow">→</span>
            </Link>
          </Reveal>

          <Reveal delay={120} className="lg:col-span-7 self-start">
            <div className="grid sm:grid-cols-2 gap-px bg-slate-200 rounded-2xl overflow-hidden ring-1 ring-slate-200">
              <DifferenceCard n="01" title="Quality"
                body="Impeccable, serviced 2024–2026 equipment — in and out of our own shop." />
              <DifferenceCard n="02" title="Flexibility"
                body="Custom plans. Weekly and monthly terms. Honest, straightforward rates." />
              <DifferenceCard n="03" title="Simplicity"
                body="Fast, friendly from day one. A team that answers the phone." />
              <DifferenceCard n="04" title="Local"
                body="Channahon, IL — a DOT-ready yard ten minutes from I-55 and I-80." />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Rental Fleet ──────────────────────────────────── */}
      <section id="fleet" className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-24 lg:py-28">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow text-brand-700">Our</p>
                <h2 className="mt-5 font-display text-5xl sm:text-6xl font-semibold text-slate-900 leading-[1.02]">
                  Rental Fleet.
                </h2>
              </div>
              <div className="inline-flex rounded-full border border-slate-300 bg-white p-1 shadow-sm">
                <TabButton active={tab === 'trucks'} onClick={() => setTab('trucks')}>
                  Trucks
                </TabButton>
                <TabButton active={tab === 'trailers'} onClick={() => setTab('trailers')}>
                  Trailers
                </TabButton>
              </div>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {FLEET[tab].map((unit, i) => (
              <Reveal key={unit.name} delay={80 + i * 120}>
                <FleetCard unit={unit} applyHref={applyHref} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing & Process ─────────────────────────────── */}
      <section id="process" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-24 lg:py-28">
          <Reveal>
            <div className="max-w-3xl">
              <p className="eyebrow text-brand-700">Rental</p>
              <h2 className="mt-5 font-display text-5xl sm:text-6xl font-semibold text-slate-900 leading-[1.02]">
                Pricing &amp;{' '}
                <span className="font-display-italic text-brand-600">Process.</span>
              </h2>
              <p className="mt-6 text-lg text-slate-600 leading-relaxed">
                Six steps from application to keys-in-hand. Most customers
                finish the process inside a week.
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
                    {step.title}
                  </h3>
                  <p className="mt-3 text-slate-600 leading-relaxed">
                    {step.title === 'Application' ? (
                      <>
                        Fill out our{' '}
                        <Link to={applyHref}
                          className="text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-700">
                          rental application
                        </Link>
                        .
                      </>
                    ) : step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="mt-16 rounded-2xl border border-accent-200 bg-accent-50/60 p-8">
              <p className="eyebrow text-accent-700">Insurance</p>
              <p className="mt-4 font-display text-2xl font-semibold text-slate-900 max-w-3xl leading-snug">
                Auto Liability: $1 Million; Physical Damage required.
              </p>
              <p className="mt-4 text-slate-700 leading-relaxed max-w-3xl">
                Under <em>Description of Vehicles</em>, the year, make &amp; model,
                VIN, and value must be added. List{' '}
                <strong className="text-slate-900">
                  AG Truck &amp; Trailer Rental, 24307 Riverside Dr, Channahon, IL 60410
                </strong>{' '}
                as <span className="font-medium">loss payee</span> /{' '}
                <span className="font-medium">certificate holder</span> and additional insured.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Available Trailer Fleet gallery ──────────────── */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 animate-slow-pulse"
          style={{
            background:
              'radial-gradient(500px at 80% 20%, rgba(26,107,136,0.22), transparent 60%),' +
              'radial-gradient(500px at 10% 90%, rgba(208,36,54,0.15), transparent 60%)',
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] animate-grid-drift"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px),' +
              'linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-24 lg:py-28">
          <Reveal>
            <p className="eyebrow text-accent-300">Available</p>
            <h2 className="mt-5 font-display text-5xl sm:text-6xl font-semibold leading-[1.02]">
              Trailer Fleet.
            </h2>
            <p className="mt-6 max-w-2xl text-slate-300 leading-relaxed">
              Four workhorses, each in late-model condition and DOT-ready
              the day you take delivery.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TRAILER_GALLERY.map((t, i) => (
              <Reveal key={t.name} delay={80 + i * 100}>
                <div
                  className="card-lift group relative rounded-2xl bg-slate-900/60 backdrop-blur
                             border border-white/10 p-7 flex flex-col h-full
                             hover:border-accent-400/60 hover:bg-slate-900"
                >
                  <span className="num-display text-sm text-accent-300/70">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 font-display text-3xl font-semibold">{t.name}</h3>
                  <p className="mt-4 text-sm text-slate-300 flex-1 leading-relaxed">
                    {t.blurb}
                  </p>
                  <Link
                    to={applyHref}
                    className="link-arrow mt-6 text-sm text-accent-300 group-hover:text-accent-100
                               transition underline-offset-4 hover:underline"
                  >
                    See availability <span className="arrow">→</span>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div className="mt-12">
              <Link to={applyHref} className="btn-primary text-base px-5 py-2.5 link-arrow">
                Get a quote <span className="arrow">→</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Lease contact CTA ────────────────────────────── */}
      <section id="lease" className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-24 lg:py-28 text-center">
          <Reveal>
            <p className="eyebrow text-brand-700">Lease</p>
            <h2 className="mt-6 font-display text-5xl sm:text-6xl font-semibold text-slate-900 leading-[1.02]">
              Ready to <span className="font-display-italic text-brand-600">roll?</span>
            </h2>
            <p className="mt-8 text-lg text-slate-600 leading-relaxed">
              Submit a lease application online — pick a trailer type, upload
              your EIN, Articles of Incorporation, and driver's license, and
              we'll take it from there.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link to={applyHref} className="btn-primary text-base px-5 py-2.5 link-arrow">
                Submit application <span className="arrow">→</span>
              </Link>
              <a href="tel:+16308539348" className="btn-secondary text-base px-5 py-2.5">
                Call (630) 853-9348
              </a>
            </div>
            <p className="mt-8 text-xs text-slate-500">
              By submitting this application, you acknowledge and agree to our
              Terms of Service and Privacy Policy.
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
        'px-5 py-1.5 text-sm font-medium rounded-full transition ' +
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
  return (
    <div className="card-lift group rounded-2xl border border-slate-200 bg-white p-7 flex flex-col h-full
                    hover:border-brand-300 hover:shadow-md">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-2xl font-semibold text-slate-900">
          {unit.name}
        </h3>
        <span className="text-xs uppercase tracking-wider text-slate-500">
          {unit.years}
        </span>
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <div className="font-display text-4xl font-semibold text-slate-900 leading-none">
          {unit.price}
        </div>
        {unit.unit && (
          <div className="text-sm text-slate-500">{unit.unit}</div>
        )}
      </div>
      {unit.deposit && (
        <div className="mt-1 text-xs text-slate-500">{unit.deposit}</div>
      )}

      <ul className="mt-6 space-y-2 text-sm text-slate-600 flex-1">
        {unit.bullets.map((b) => (
          <li key={b} className="flex gap-2.5">
            <span className="text-brand-500 mt-1 select-none">—</span>
            <span className="leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>

      <Link
        to={applyHref}
        className="link-arrow mt-8 self-start text-sm font-medium
                   text-brand-700 hover:text-brand-800 underline-offset-4 hover:underline"
      >
        Apply now <span className="arrow">→</span>
      </Link>
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
