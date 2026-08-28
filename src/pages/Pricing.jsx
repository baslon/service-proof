import { useEffect, useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import { supabase } from '../lib/supabaseClient'
import { COMPANY } from '../lib/company'

function formatPence(pence) {
  return `£${(pence / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}

export default function Pricing() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [interval, setInterval] = useState('monthly')
  const [checkingOutPlanId, setCheckingOutPlanId] = useState(null)

  useEffect(() => {
    supabase
      .from('plans')
      .select('*')
      .order('sort_order')
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message)
        else setPlans(data || [])
        setLoading(false)
      })
  }, [])

  const handleSubscribe = async (plan) => {
    setError('')
    setCheckingOutPlanId(plan.id)
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createCheckoutSession', planId: plan.id, interval }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not start checkout')
      window.location.href = json.url
    } catch (err) {
      setError(err.message)
      setCheckingOutPlanId(null)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-geist text-zinc-900">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-900">Plans &amp; pricing</h1>
          <p className="mt-3 text-zinc-600">Choose the plan that matches how many sites you manage.</p>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1">
            <button
              onClick={() => setInterval('monthly')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                interval === 'monthly' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('annual')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                interval === 'annual' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Annual <span className="ml-1 rounded bg-amber-400 px-1.5 py-0.5 text-xs font-semibold text-zinc-900">2 months free</span>
            </button>
          </div>
        </div>

        {error && <p className="mt-6 text-center text-sm text-red-600">{error}</p>}
        {loading && <p className="mt-16 text-center text-sm text-zinc-400">Loading plans…</p>}

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {plans.map((plan) => {
            const pence = interval === 'annual' ? plan.annual_price_pence : plan.monthly_price_pence
            const isPopular = plan.name === 'Pro'
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-white p-6 shadow-sm ${
                  isPopular ? 'border-green-600 ring-1 ring-green-600' : 'border-zinc-200'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
                <h2 className="font-display text-lg font-semibold text-zinc-900">{plan.name}</h2>

                <div className="mt-3">
                  {plan.self_serve ? (
                    <>
                      <span className="text-3xl font-bold text-zinc-900">{formatPence(pence)}</span>
                      <span className="text-sm text-zinc-500">
                        /{interval === 'annual' ? 'year' : 'month'} + VAT
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-zinc-900">Talk to us</span>
                  )}
                </div>

                <ul className="mt-5 space-y-2 text-sm text-zinc-600">
                  <li>{plan.site_limit != null ? `Up to ${plan.site_limit} sites` : 'Unlimited sites'}</li>
                  <li>{plan.operative_limit != null ? `Up to ${plan.operative_limit} active operatives` : 'Unlimited operatives'}</li>
                </ul>

                <div className="mt-6">
                  {plan.self_serve ? (
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={checkingOutPlanId === plan.id || !plan[`stripe_price_id_${interval === 'annual' ? 'annual' : 'monthly'}`]}
                      className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {checkingOutPlanId === plan.id ? 'Redirecting…' : `Subscribe to ${plan.name}`}
                    </button>
                  ) : (
                    <a
                      href={`mailto:${COMPANY.contactEmail}?subject=${encodeURIComponent('Enterprise plan enquiry')}`}
                      className="block w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-center text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Talk to us
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
