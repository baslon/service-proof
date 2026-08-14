import { useState } from 'react'
import { Link } from 'react-router-dom'
import BookDemoModal from '../components/modals/BookDemoModal'
import DashboardPreview from '../components/DashboardPreview'
import SubmitPreview from '../components/SubmitPreview'
import { COMPANY, CONTENT_LAST_REVIEWED } from '../lib/company'

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
    <div className="border-b border-slate-200 py-4">
      <h3>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <span className="text-sm font-semibold text-slate-900">{q}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </h3>
      {open && <p className="mt-2 text-sm text-slate-500">{a}</p>}
    </div>
  )
}

// Shared by the desktop header and the mobile menu so the two can't drift.
// Sign in stays out of the list: it's a router Link rather than an anchor,
// and it belongs last in both.
const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact', href: `mailto:${COMPANY.contactEmail}` },
]

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [bookingDemo, setBookingDemo] = useState(false)

  return (
    <div className="bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M12 2.5L19 5.5V11C19 16 15.5 19.5 12 21C8.5 19.5 5 16 5 11V5.5Z" />
                <path d="M8.5 11.5L11 14L15.5 9" />
              </svg>
            </div>
            <span className="text-base font-semibold text-slate-900">{COMPANY.product}</span>
          </div>

          <nav className="hidden items-center gap-7 sm:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                {link.label}
              </a>
            ))}
            <Link to="/login" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
              Sign in
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setBookingDemo(true)}
              className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 sm:px-4 sm:py-2 sm:text-sm"
            >
              Book a demo
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 sm:hidden"
            >
              {menuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-slate-100 px-6 py-4 sm:hidden">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Sign in
            </Link>
          </nav>
        )}
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-slate-900">
        {/* Faint grid texture — CSS-only depth for the flat gradient. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="text-center lg:text-left">
            <p className="mb-4 text-xs font-medium text-indigo-100">Proof-of-service for commercial cleaning</p>
            <h1 className="mx-auto max-w-2xl text-3xl font-bold leading-snug tracking-tight text-white sm:text-4xl sm:leading-snug lg:mx-0 lg:text-5xl">
              Can you prove the clean happened?
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-indigo-100 lg:mx-0">
              Provaserve turns every cleaning job into proof: your operative submits timestamped photos and a
              completion status straight from their phone, so you and your client see the same evidence &mdash; no
              rota checks, no spreadsheets, and no more &quot;did this get done?&quot; disputes eating your team&apos;s
              time.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <button
                onClick={() => setBookingDemo(true)}
                className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
              >
                Book a demo
              </button>
              <Link
                to="/dashboard"
                className="text-sm font-semibold text-indigo-100 underline decoration-indigo-300/50 underline-offset-4 transition hover:text-white"
              >
                See it in action
              </Link>
            </div>
          </div>

          <div className="mx-auto w-full min-w-0 max-w-md lg:mx-0 lg:max-w-none">
            <DashboardPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Is lack of evidence costing you contracts?</h2>
          <p className="mt-4 text-slate-500">
            SME facilities and cleaning companies lose renewals and goodwill over disputes that a simple photo would settle.
          </p>
        </div>
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900">{p.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">How does Provaserve work?</h2>
            <p className="mt-4 text-slate-500">From scheduled job to client-ready report, in four steps.</p>
          </div>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.step} className="relative rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {s.step}
                </div>
                <h3 className="text-base font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Who is Provaserve built for?</h2>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PERSONAS.map((p) => (
            <div key={p.role} className="rounded-xl border border-slate-200 p-6">
              <h3 className="text-base font-semibold text-slate-900">{p.role}</h3>
              <p className="mt-2 text-sm text-slate-500">{p.need}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              What does the evidence actually look like?
            </h2>
            <p className="mt-4 text-slate-500">
              The same job, seen from both ends: an operative capturing proof on their phone, and the dashboard a
              cleaning manager sees on the admin dashboard.
            </p>
          </div>
          <div className="mt-14 grid min-w-0 gap-12 sm:grid-cols-2 sm:items-center">
            <div className="min-w-0">
              <SubmitPreview />
              <p className="mt-6 text-center text-sm text-slate-500">
                Operatives submit proof from the job site &mdash; no separate app to install.
              </p>
            </div>
            <div className="min-w-0">
              <DashboardPreview />
              <p className="mt-6 text-center text-sm text-slate-500">
                Cleaning managers see every site&apos;s status live, all in one dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Frequently asked questions</h2>
        </div>
        <div className="mt-10">
          {FAQS.map((item) => (
            <FaqItem key={item.q} {...item} />
          ))}
        </div>
      </section>

      <section id="book-demo" className="bg-slate-900 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">Ready to see Provaserve on your own sites?</h2>
          <p className="mt-4 text-slate-300">
            Book a live walkthrough and we'll show you exactly how it'd work for your team, using your sites
            and your reporting needs.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={() => setBookingDemo(true)}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-500"
            >
              Book a demo
            </button>
            <Link
              to="/pricing"
              className="text-sm font-semibold text-slate-300 underline decoration-slate-500 underline-offset-4 transition hover:text-white"
            >
              View plans &amp; pricing
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-slate-400">
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span>&copy; {new Date().getFullYear()} {COMPANY.product}</span>
            <span aria-hidden="true">&middot;</span>
            <Link to="/privacy" className="transition hover:text-slate-600">
              Privacy
            </Link>
            <span aria-hidden="true">&middot;</span>
            <Link to="/terms" className="transition hover:text-slate-600">
              Terms
            </Link>
            <span aria-hidden="true">&middot;</span>
            <a href={`mailto:${COMPANY.contactEmail}`} className="transition hover:text-slate-600">
              Contact
            </a>
          </p>
          <p className="mt-2 text-xs">
            {COMPANY.legalName}, registered in {COMPANY.registeredIn} no. {COMPANY.registrationNumber}. VAT{' '}
            {COMPANY.vatNumber}.
          </p>
          {COMPANY.registeredOffice && <p className="mt-1 text-xs">Registered office: {COMPANY.registeredOffice}</p>}
          <p className="mt-1 text-xs">
            Page content last reviewed{' '}
            <time dateTime={CONTENT_LAST_REVIEWED}>
              {new Date(CONTENT_LAST_REVIEWED).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>
          </p>
        </div>
      </footer>

      {bookingDemo && <BookDemoModal onClose={() => setBookingDemo(false)} />}
    </div>
  )
}
