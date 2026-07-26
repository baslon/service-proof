import { STATUS_BADGE_STYLES } from '../context/statusStyles'

export default function StatusBadge({ status, label, className = '' }) {
  const style = STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.Incomplete
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style} ${className}`}
    >
      {label || status}
    </span>
  )
}
