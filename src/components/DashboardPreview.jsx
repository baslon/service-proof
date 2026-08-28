import StatusBadge from './StatusBadge'
import { STATUS_TEXT_COLOR } from '../context/statusStyles'

// A coded mockup rather than a screenshot. Reuses the real StatusBadge
// component and the real status colour tokens, so it can never drift out of
// visual sync with the actual dashboard the way a raster capture would the
// moment real demo data changes. Sample data only — nothing here is a real
// client, site or job.
const SUMMARY = [
  { label: 'Completed & Evidenced', value: 14, status: 'Completed & Evidenced' },
  { label: 'Missing Evidence', value: 1, status: 'Missing Evidence' },
  { label: 'At Risk', value: 1, status: 'At Risk' },
]

const JOBS = [
  { id: 'SP-0042', site: 'Oxford Street', task: 'Washroom Deep Clean', status: 'Completed & Evidenced', photos: '6/6' },
  { id: 'SP-0043', site: 'Riverside Plaza', task: 'Daily Office Clean', status: 'Missing Evidence', photos: '2/6' },
  { id: 'SP-0044', site: 'Meridian Clinic', task: 'Clinical Area Sanitation', status: 'At Risk', photos: '0/6' },
]

export default function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
        <span className="ml-3 truncate text-xs text-zinc-400">provaserve.app/dashboard</span>
      </div>

      <div className="p-4 sm:p-5">
        <p className="font-display text-sm font-semibold text-zinc-900">Dashboard</p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {SUMMARY.map((s) => (
            <div key={s.label} className="min-w-0 rounded-lg border border-zinc-200 px-3 py-2">
              <p className="truncate text-[10px] font-medium text-zinc-500">{s.label}</p>
              <p className={`mt-1 text-lg font-bold ${STATUS_TEXT_COLOR[s.status]}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {JOBS.map((j) => (
            <div
              key={j.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-zinc-900">{j.id}</p>
                <p className="truncate text-[11px] text-zinc-500">
                  {j.task} &middot; {j.site}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="hidden text-[11px] text-zinc-400 sm:inline">{j.photos}</span>
                <StatusBadge status={j.status} className="!px-2 !py-0.5 !text-[10px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
