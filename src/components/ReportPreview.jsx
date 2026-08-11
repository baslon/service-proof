// Same coded-mockup approach as DashboardPreview/SubmitPreview: a simplified,
// representative version of the real Report page's structure (period,
// completion rate, per-job evidence), not a pixel-for-pixel screenshot.
const JOBS = [
  { id: 'SP-0038', task: 'Washroom Deep Clean', site: 'Oxford Street', photos: '4/4' },
  { id: 'SP-0039', task: 'Daily Office Clean', site: 'Riverside Plaza', photos: '6/6' },
  { id: 'SP-0040', task: 'Clinical Area Sanitation', site: 'Meridian Clinic', photos: '5/5' },
]

export default function ReportPreview() {
  return (
    <div className="rounded-2xl bg-slate-900/5 p-2 shadow-2xl ring-1 ring-slate-900/10 sm:p-3">
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 truncate text-xs text-slate-400">provaserve.app/report</span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">Service Report — Meridian Facilities</p>
              <p className="text-[11px] text-slate-400">Period: 1 Aug – 31 Aug 2026</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              96% evidenced
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {JOBS.map((j) => (
              <div key={j.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900">{j.id}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {j.task} &middot; {j.site}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-600">
                  {j.photos}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
