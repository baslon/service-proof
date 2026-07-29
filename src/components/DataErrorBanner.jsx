import { useState } from 'react'
import { useApp } from '../context/AppContext'

// Shown whenever a data fetch failed. The retry matters as much as the
// message: without it the only way back is a full page reload, which looks
// like the app broke rather than like one request didn't land.
export default function DataErrorBanner({ className = '' }) {
  const { error, refreshData } = useApp()
  const [retrying, setRetrying] = useState(false)

  if (!error) return null

  const retry = async () => {
    setRetrying(true)
    try {
      await refreshData()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-600/20 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <span>
        <strong>Couldn&apos;t load your latest data.</strong> What&apos;s shown may be out of date. ({error})
      </span>
      <button
        onClick={retry}
        disabled={retrying}
        className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60"
      >
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  )
}
