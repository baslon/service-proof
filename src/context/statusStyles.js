// Single source of truth for status → color mapping, shared by the badge
// pill styling and any plain-text accent color (e.g. dashboard counters).
export const STATUS_BADGE_STYLES = {
  'Completed & Evidenced': 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  'Missing Evidence': 'bg-amber-100 text-amber-700 ring-amber-600/20',
  'At Risk': 'bg-red-100 text-red-700 ring-red-600/20',
  Incomplete: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  'Awaiting Review': 'bg-blue-100 text-blue-700 ring-blue-600/20',
}

export const STATUS_TEXT_COLOR = {
  'Completed & Evidenced': 'text-emerald-600',
  'Missing Evidence': 'text-amber-600',
  'At Risk': 'text-red-600',
  Incomplete: 'text-slate-600',
  'Awaiting Review': 'text-blue-600',
}

// "Incomplete / Pending" groups fresh Assigned jobs with those awaiting
// admin review. Defined once here so Dashboard, Sidebar, and Clients can't
// drift out of sync on what counts as pending.
export const isPendingStatus = (job) => job.status === 'Incomplete' || job.status === 'Awaiting Review'
