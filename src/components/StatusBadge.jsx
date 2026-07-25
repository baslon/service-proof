const STYLES = {
  'Completed & Evidenced': 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  'Missing Evidence': 'bg-amber-100 text-amber-700 ring-amber-600/20',
  'At Risk': 'bg-red-100 text-red-700 ring-red-600/20',
  Incomplete: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  'Awaiting Review': 'bg-blue-100 text-blue-700 ring-blue-600/20',
}

export default function StatusBadge({ status, label, className = '' }) {
  const style = STYLES[status] || STYLES.Incomplete
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style} ${className}`}
    >
      {label || status}
    </span>
  )
}
