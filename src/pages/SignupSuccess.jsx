import { Link } from 'react-router-dom'
import { COMPANY } from '../lib/company'

export default function SignupSuccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">You&apos;re subscribed</h1>
        <p className="mt-2 text-sm text-slate-500">
          Check your email for a link to set your password and get started with {COMPANY.product}.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Already set your password? Sign in
        </Link>
      </div>
    </div>
  )
}
