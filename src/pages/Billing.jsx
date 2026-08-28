import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

function formatPence(pence) {
  return `£${(pence / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function callBillingApi(path, body) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json
}

export default function Billing() {
  const { sites, operatives } = useApp()
  const { user } = useAuth()
  const [org, setOrg] = useState(null)
  const [plans, setPlans] = useState([])
  const [interval, setInterval] = useState('monthly')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [portalLoading, setPortalLoading] = useState(false)
  const [switchingPlanId, setSwitchingPlanId] = useState(null)

  const activeOperativeCount = operatives.filter((o) => o.active).length

  const load = async () => {
    setLoading(true)
    setError('')
    const [orgRes, plansRes] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', user.organizationId).single(),
      supabase.from('plans').select('*').order('sort_order'),
    ])
    if (orgRes.error) setError(orgRes.error.message)
    else setOrg(orgRes.data)
    if (plansRes.error) setError((prev) => prev || plansRes.error.message)
    else setPlans(plansRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasSubscription = !!org?.stripe_subscription_id
  const currentPlan = plans.find((p) => p.id === org?.plan_id)

  const handleManageBilling = async () => {
    setError('')
    setPortalLoading(true)
    try {
      const { url } = await callBillingApi('/api/billing', { action: 'createPortalSession' })
      window.location.href = url
    } catch (err) {
      setError(err.message)
      setPortalLoading(false)
    }
  }

  const handleSwitchPlan = async (plan) => {
    if (!confirm(`Switch to ${plan.name}? Billing adjusts automatically for the rest of your current period.`)) return
    setError('')
    setSwitchingPlanId(plan.id)
    try {
      await callBillingApi('/api/billing', { action: 'updateSubscription', planId: plan.id, interval })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSwitchingPlanId(null)
    }
  }

  const handleSubscribe = async (plan) => {
    setError('')
    setSwitchingPlanId(plan.id)
    try {
      const { url } = await callBillingApi('/api/billing', { action: 'subscribeOrganization', planId: plan.id, interval })
      window.location.href = url
    } catch (err) {
      setError(err.message)
      setSwitchingPlanId(null)
    }
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-zinc-900">Billing</h1>
      <p className="mt-1 text-sm text-zinc-500">Your subscription plan and usage.</p>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-600/20">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-zinc-400">Loading…</p>
      ) : (
        <>
          {hasSubscription ? (
            <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Current plan</p>
                  <p className="mt-1 text-xl font-semibold text-zinc-900">{currentPlan?.name || 'Unknown plan'}</p>
                  <p className="mt-1 text-sm capitalize text-zinc-500">
                    {org.subscription_status || 'unknown status'}
                    {org.current_period_end && ` · renews ${formatDate(org.current_period_end)}`}
                  </p>
                </div>
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {portalLoading ? 'Opening…' : 'Manage billing'}
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-zinc-100 pt-4 text-sm">
                <div>
                  <p className="text-zinc-400">Sites</p>
                  <p className="font-medium text-zinc-700">
                    {sites.length} / {org.site_limit ?? 'Unlimited'}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-400">Active operatives</p>
                  <p className="font-medium text-zinc-700">
                    {activeOperativeCount} / {org.operative_limit ?? 'Unlimited'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center">
              <p className="text-sm text-zinc-600">
                This organization doesn&apos;t have a paid subscription yet — choose a plan below to get started.
              </p>
              {(user?.siteLimit != null || user?.operativeLimit != null) && (
                <p className="mt-2 text-xs text-zinc-400">
                  Currently on manually-set limits: {user?.siteLimit ?? 'unlimited'} sites,{' '}
                  {user?.operativeLimit ?? 'unlimited'} operatives.
                </p>
              )}
            </div>
          )}

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">{hasSubscription ? 'Change plan' : 'Choose a plan'}</h2>
              <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1">
                <button
                  onClick={() => setInterval('monthly')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    interval === 'monthly' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setInterval('annual')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    interval === 'annual' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Annual
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {plans.map((plan) => {
                const isCurrent = hasSubscription && plan.id === org.plan_id
                const pence = interval === 'annual' ? plan.annual_price_pence : plan.monthly_price_pence
                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border p-5 ${isCurrent ? 'border-green-600 ring-1 ring-green-600' : 'border-zinc-200 bg-white'}`}
                  >
                    <p className="text-sm font-semibold text-zinc-900">{plan.name}</p>
                    <p className="mt-1 text-lg font-bold text-zinc-900">
                      {plan.self_serve ? (
                        <>
                          {formatPence(pence)}
                          <span className="text-xs font-normal text-zinc-500">
                            /{interval === 'annual' ? 'yr' : 'mo'} + VAT
                          </span>
                        </>
                      ) : (
                        'Talk to us'
                      )}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {plan.site_limit != null ? `${plan.site_limit} sites` : 'Unlimited sites'} ·{' '}
                      {plan.operative_limit != null ? `${plan.operative_limit} operatives` : 'Unlimited operatives'}
                    </p>
                    <div className="mt-4">
                      {isCurrent ? (
                        <span className="block rounded-lg bg-zinc-100 px-3 py-1.5 text-center text-xs font-medium text-zinc-500">
                          Current plan
                        </span>
                      ) : plan.self_serve ? (
                        <button
                          onClick={() => (hasSubscription ? handleSwitchPlan(plan) : handleSubscribe(plan))}
                          disabled={switchingPlanId === plan.id}
                          className="w-full rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {switchingPlanId === plan.id
                            ? hasSubscription
                              ? 'Switching…'
                              : 'Redirecting…'
                            : hasSubscription
                              ? `Switch to ${plan.name}`
                              : `Subscribe to ${plan.name}`}
                        </button>
                      ) : (
                        <span className="block rounded-lg border border-zinc-300 px-3 py-1.5 text-center text-xs font-medium text-zinc-500">
                          Contact us
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
