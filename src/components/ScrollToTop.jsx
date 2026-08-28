import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// React Router's client-side navigation doesn't reset scroll position the
// way a full page load does, so clicking a nav or footer link while
// scrolled down lands on the new page still scrolled down. This restores
// the expected behavior — top of page on a normal navigation, and still
// lets a hash target (e.g. /#how-it-works) scroll to that section instead.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1))
      if (target) {
        target.scrollIntoView()
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}
