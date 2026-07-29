export function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso) {
  if (!iso) return ''
  const date = new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
  return `${date} ${formatTime(iso)}`
}

export function isSameDay(isoA, isoB) {
  const a = new Date(isoA)
  const b = new Date(isoB)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// jobs.submitted_time is a naive `timestamp` column representing wall-clock
// time at the site, not an absolute instant - so it must be written as the
// operative's local clock reading, not toISOString()'s UTC-shifted digits.
export function toLocalTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
