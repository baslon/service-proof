import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import Landing, { FAQS } from './pages/Landing'

// Only the Landing page is prerendered — it's fully static (no data
// fetching), unlike Pricing which reads live plans from Supabase and can't
// be rendered ahead of time without a separate build-time data fetch.
export function render(url) {
  return renderToString(
    <StaticRouter location={url}>
      <Landing />
    </StaticRouter>
  )
}

export function getFaqs() {
  return FAQS
}
