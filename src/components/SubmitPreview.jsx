// A coded mockup rather than a screenshot, same reasoning as DashboardPreview:
// it mirrors the real mobile Submit form's structure (completion status,
// photo evidence grid, notes) with sample data, so it can't drift out of
// visual sync the way a raster capture would.
export default function SubmitPreview() {
  return (
    <div className="mx-auto w-full max-w-[260px]">
      <div className="overflow-hidden rounded-[2rem] border-8 border-slate-900 bg-slate-50 shadow-2xl">
        <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
          <span className="text-[11px] font-medium text-slate-300">&larr; Exit</span>
          <span className="text-xs font-semibold text-white">Provaserve Field</span>
          <span className="w-6" />
        </div>

        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">SP-0042 — Meridian Facilities</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">Washroom Deep Clean</h3>
          <p className="text-xs text-slate-500">Oxford Street</p>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-700">How did this job go?</p>
            <div className="flex items-center gap-2 rounded-lg border border-indigo-500 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border-4 border-indigo-600" />
              Completed
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-700">Photo evidence</p>
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex aspect-square items-center justify-center rounded-md bg-slate-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-400">
                    <path
                      fillRule="evenodd"
                      d="M1 5.25A2.25 2.25 0 013.25 3h1.5A2.25 2.25 0 016 5.25v.006c.28-.05.57-.076.87-.076h6.26c.3 0 .59.027.87.076V5.25A2.25 2.25 0 0116.25 3h.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zM10 7.5a3.25 3.25 0 100 6.5 3.25 3.25 0 000-6.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-center text-[11px] font-medium text-slate-500">3 / 3 required</p>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-700">Notes</p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-500">
              All washrooms cleaned and restocked. No issues.
            </div>
          </div>

          <div className="rounded-lg bg-indigo-600 py-2 text-center text-xs font-semibold text-white">Submit proof</div>
        </div>
      </div>
    </div>
  )
}
