import { useState } from 'react'
import { Link } from 'react-router-dom'
import BookDemoModal from './modals/BookDemoModal'
import { COMPANY } from '../lib/company'

const FOOTER_ICON_PATHS = {
  mail: 'M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6zm2 0l7 6 7-6',
  steps: 'M4 6h4m-4 6h4m-4 6h4M12 6h8M12 12h8M12 18h8',
  tag: 'M20.59 13.41L11 3.83A2 2 0 009.59 3.24L4 3v5.59a2 2 0 00.59 1.41l9.59 9.59a2 2 0 002.82 0l3.59-3.59a2 2 0 000-2.82zM7 7h.01',
  calendar: 'M8 2v4m8-4v4M4 8h16M4 6a1 1 0 011-1h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6z',
  login: 'M15 3h4a1 1 0 011 1v16a1 1 0 01-1 1h-4M10 17l5-5-5-5M15 12H3',
  shield: 'M12 2.5L19 5.5V11C19 16 15.5 19.5 12 21C8.5 19.5 5 16 5 11V5.5Z',
  doc: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
}

function FooterIcon({ name, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={FOOTER_ICON_PATHS[name]} />
    </svg>
  )
}

// The footer used across every public page — home, pricing, and the legal
// pages. COMPANY.legalName / registeredIn / registrationNumber / vatNumber
// carry the Companies Act 2006 disclosure requirement, so this is the one
// place that text is allowed to live.
export default function SiteFooter() {
  const [bookingDemo, setBookingDemo] = useState(false)

  return (
    <footer className="border-t border-zinc-200">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <path d="M8 12.5l2.6 2.6L16.5 9" />
              </svg>
              <span className="font-display text-base font-semibold text-zinc-900">{COMPANY.product}</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-600">
              Turns every cleaning job into photo-verified proof, from scheduled visit to client-ready report.
            </p>
            <a
              href={`mailto:${COMPANY.contactEmail}`}
              className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-600 transition hover:text-zinc-900"
            >
              <FooterIcon name="mail" className="h-4 w-4 shrink-0 text-zinc-400" />
              {COMPANY.contactEmail}
            </a>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-900">Product</p>
            <ul className="mt-4 space-y-3">
              <li>
                <a href="/#how-it-works" className="flex items-center gap-2 text-sm text-zinc-600 transition hover:text-zinc-900">
                  <FooterIcon name="steps" className="h-4 w-4 shrink-0 text-zinc-400" />
                  How it works
                </a>
              </li>
              <li>
                <Link to="/pricing" className="flex items-center gap-2 text-sm text-zinc-600 transition hover:text-zinc-900">
                  <FooterIcon name="tag" className="h-4 w-4 shrink-0 text-zinc-400" />
                  Pricing
                </Link>
              </li>
              <li>
                <button
                  onClick={() => setBookingDemo(true)}
                  className="flex items-center gap-2 text-sm text-zinc-600 transition hover:text-zinc-900"
                >
                  <FooterIcon name="calendar" className="h-4 w-4 shrink-0 text-zinc-400" />
                  Book a demo
                </button>
              </li>
              <li>
                <Link to="/login" className="flex items-center gap-2 text-sm text-zinc-600 transition hover:text-zinc-900">
                  <FooterIcon name="login" className="h-4 w-4 shrink-0 text-zinc-400" />
                  Sign in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-900">Legal</p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link to="/privacy" className="flex items-center gap-2 text-sm text-zinc-600 transition hover:text-zinc-900">
                  <FooterIcon name="shield" className="h-4 w-4 shrink-0 text-zinc-400" />
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="flex items-center gap-2 text-sm text-zinc-600 transition hover:text-zinc-900">
                  <FooterIcon name="doc" className="h-4 w-4 shrink-0 text-zinc-400" />
                  Terms
                </Link>
              </li>
              <li>
                <Link to="/contact" className="flex items-center gap-2 text-sm text-zinc-600 transition hover:text-zinc-900">
                  <FooterIcon name="mail" className="h-4 w-4 shrink-0 text-zinc-400" />
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-zinc-200 pt-8 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <path d="M8 12.5l2.6 2.6L16.5 9" />
            </svg>
            <span className="text-sm text-zinc-500">&copy; {new Date().getFullYear()} {COMPANY.product}</span>
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            {COMPANY.legalName}, registered in {COMPANY.registeredIn} no. {COMPANY.registrationNumber}. VAT{' '}
            {COMPANY.vatNumber}.
          </p>
          {COMPANY.registeredOffice && <p className="mt-1 text-xs text-zinc-400">Registered office: {COMPANY.registeredOffice}</p>}
        </div>
      </div>

      {bookingDemo && <BookDemoModal onClose={() => setBookingDemo(false)} />}
    </footer>
  )
}
