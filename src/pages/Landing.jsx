import { useState } from 'react'
import { Link } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import BookDemoModal from '../components/modals/BookDemoModal'
import DashboardPreview from '../components/DashboardPreview'
import SubmitPreview from '../components/SubmitPreview'

const PROBLEMS = [
  {
    title: 'No proof a clean happened',
    body: "Clients ask for evidence after a complaint, and all you've got is a rota and a shrug.",
  },
  {
    title: 'Missed shifts go unnoticed',
    body: 'Without a paper trail, a skipped washroom clean is invisible until someone complains.',
  },
  {
    title: 'Disputes eat account manager time',
    body: 'Every "did this get done?" query means digging through texts, emails, and memory.',
  },
]

const STEPS = [
  {
    step: '1',
    title: 'Schedule the job',
    body: 'Set the task, site, and required photo count in seconds.',
  },
  {
    step: '2',
    title: 'Operative submits proof',
    body: 'From their phone: photos, completion status, and notes, tied to the job automatically.',
  },
  {
    step: '3',
    title: 'Manager sees evidence live',
    body: 'Dashboard flags missing evidence and at-risk jobs before the client has to ask.',
  },
  {
    step: '4',
    title: 'Client gets the report',
    body: 'A clean, exportable proof-of-service report for every contract period.',
  },
]

const PERSONAS = [
  { role: 'Facilities Manager', need: 'Wants a single dashboard to see every site’s status without chasing supervisors.' },
  { role: 'Cleaning Company Owner', need: 'Needs hard evidence to defend contract renewals and justify pricing.' },
  { role: 'Operative / Cleaner', need: 'Wants a fast, simple way to prove the job is done without extra admin.' },
  { role: 'Client Contact', need: 'Wants confidence the contract is being delivered without micromanaging it.' },
]

export const FAQS = [
  {
    q: 'Do operatives need to install a separate app?',
    a: "No — operatives submit proof from their phone's browser. Nothing to install, nothing to update.",
  },
  {
    q: 'What counts as evidence?',
    a: 'Photos (the number required is set per job), an optional short video, a completion status, and notes from the operative.',
  },
  {
    q: 'Can I control how many photos are required per job?',
    a: 'Yes — the required photo count is set when a job is scheduled, and can be different for every job.',
  },
  {
    q: 'Is there a free trial?',
    a: "No. Book a demo instead and we'll walk you through Provaserve on your own sites before you subscribe.",
  },
  {
    q: 'Are the prices shown inclusive of VAT?',
    a: 'No — prices are exclusive of VAT, which is calculated and added at checkout based on your billing address.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrades and downgrades take effect immediately and are prorated automatically for the rest of your billing period.',
  },
  {
    q: "Can operatives from one client or site see another's data?",
    a: "No — every organization's data is fully separated. Operatives and admins only ever see the sites and jobs they're scoped to.",
  },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-zinc-200 py-4">
      <h3>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <span className="text-sm font-semibold text-zinc-900">{q}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </h3>
      {open && <p className="mt-2 text-sm text-zinc-500">{a}</p>}
    </div>
  )
}

export default function Landing() {
  const [bookingDemo, setBookingDemo] = useState(false)

  return (
    <div className="bg-zinc-50 font-geist text-zinc-900">
      <SiteHeader />

      <section className="bg-dot-grid px-6 pb-20 pt-20 sm:pb-28 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-900 sm:text-5xl sm:leading-[1.08] lg:text-6xl">
            Can you{' '}
            <span className="relative inline-block">
              prove
              <svg
                viewBox="0 0 160 14"
                preserveAspectRatio="none"
                className="absolute -bottom-2 left-0 h-3 w-full"
                aria-hidden="true"
              >
                <path
                  d="M2 9 C 30 2, 60 12, 80 6 C 100 1, 130 11, 158 5"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>{' '}
            the clean happened?
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-zinc-600">
            Provaserve turns every cleaning job into proof: your operative submits timestamped photos and a
            completion status straight from their phone, so you and your client see the same evidence &mdash; no
            rota checks, no spreadsheets, and no more &quot;did this get done?&quot; disputes eating your team&apos;s
            time.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-6 sm:flex-row">
            <button
              onClick={() => setBookingDemo(true)}
              className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Book a demo
            </button>
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-900 transition hover:text-zinc-600"
            >
              See it in action
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 w-full max-w-3xl min-w-0">
          <DashboardPreview />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-zinc-900">
            Is lack of evidence costing you contracts?
          </h2>
          <p className="mt-4 text-zinc-600">
            SME facilities and cleaning companies lose renewals and goodwill over disputes that a simple photo would settle.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
              <h3 className="font-display text-lg font-semibold tracking-tight text-zinc-900">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-zinc-900">How does Provaserve work?</h2>
            <p className="mt-4 text-zinc-600">From scheduled job to client-ready report, in four steps.</p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.step} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                  {s.step}
                </div>
                <h3 className="text-base font-semibold text-zinc-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-zinc-900">Who is Provaserve built for?</h2>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PERSONAS.map((p) => (
            <div key={p.role} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-zinc-900">{p.role}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{p.need}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-zinc-900">
              What does the evidence actually look like?
            </h2>
            <p className="mt-4 text-zinc-600">
              The same job, seen from both ends: an operative capturing proof on their phone, and the dashboard a
              cleaning manager sees on the admin dashboard.
            </p>
          </div>
          <div className="mt-14 grid min-w-0 gap-12 sm:grid-cols-2 sm:items-center">
            <div className="min-w-0">
              <SubmitPreview />
              <p className="mt-6 text-center text-sm text-zinc-600">
                Operatives submit proof from the job site &mdash; no separate app to install.
              </p>
            </div>
            <div className="min-w-0">
              <DashboardPreview />
              <p className="mt-6 text-center text-sm text-zinc-600">
                Cleaning managers see every site&apos;s status live, all in one dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-24">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-zinc-900">Frequently asked questions</h2>
        </div>
        <div className="mt-10">
          {FAQS.map((item) => (
            <FaqItem key={item.q} {...item} />
          ))}
        </div>
      </section>

      <section id="book-demo" className="px-6 py-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-zinc-900 px-8 py-20 text-center sm:px-16">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(22,163,74,0.16), transparent), radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
              backgroundSize: 'auto, 26px 26px',
            }}
          />

          <div className="relative">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Ready to see <span className="text-green-400">Provaserve</span> on your own sites?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">
              Book a live walkthrough and we'll show you exactly how it'd work for your team, using your sites
              and your reporting needs.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={() => setBookingDemo(true)}
                className="flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
              >
                Book a demo
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
              <Link
                to="/pricing"
                className="rounded-md border border-zinc-700 bg-zinc-800/50 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                See pricing
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
              {[
                'No app for operatives to install',
                'Demo on your own sites',
                'Cancel or change plans anytime',
              ].map((item) => (
                <span key={item} className="flex items-center gap-1.5 text-sm text-zinc-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5 shrink-0"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

      {bookingDemo && <BookDemoModal onClose={() => setBookingDemo(false)} />}
    </div>
  )
}
