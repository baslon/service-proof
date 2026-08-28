import { useState } from 'react'
import { Link } from 'react-router-dom'
import BookDemoModal from './modals/BookDemoModal'
import { COMPANY } from '../lib/company'

// Shared by the desktop header and the mobile menu so the two can't drift.
// Sign in stays out of the list: it's a router Link rather than an anchor,
// and it belongs last in both. "How it works" points at the home page's
// anchor with a leading slash so it still resolves correctly from pages
// other than the home page itself.
const NAV_LINKS = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact', href: '/contact' },
]

// The header used across every public page — home, pricing, and the legal
// pages — so the site reads as one product rather than a patchwork of
// screens that happen to share a color palette.
export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [bookingDemo, setBookingDemo] = useState(false)

  return (
    <header className="border-b border-zinc-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
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
          <span className="font-display text-base font-semibold tracking-tight text-zinc-900">{COMPANY.product}</span>
        </Link>

        <nav className="hidden items-center gap-7 sm:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
            >
              {link.label}
            </a>
          ))}
          <Link to="/login" className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900">
            Sign in
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setBookingDemo(true)}
            className="whitespace-nowrap rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 sm:px-4 sm:py-2 sm:text-sm"
          >
            Book a demo
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 sm:hidden"
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
        <nav className="flex flex-col gap-1 border-t border-zinc-200 px-6 py-4 sm:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/login"
            onClick={() => setMenuOpen(false)}
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
          >
            Sign in
          </Link>
        </nav>
      )}

      {bookingDemo && <BookDemoModal onClose={() => setBookingDemo(false)} />}
    </header>
  )
}
