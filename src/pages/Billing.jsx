import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
      const { url } = await callBillingApi('/api/create-billing-portal-session')
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
      await callBillingApi('/api/update-subscription', { planId: plan.id, interval })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSwitchingPlanId(null)
    }
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
      <p className="mt-1 text-sm text-slate-500">Your subscription plan and usage.</p>

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-inset ring-red-600/20">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-400">Loading…</p>
      ) : !hasSubscription ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">This organization doesn&apos;t have a paid subscription yet.</p>
          <Link
            to="/pricing"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            View plans
          </Link>
          {(user?.siteLimit != null || user?.operativeLimit != null) && (
            <p className="mt-4 text-xs text-slate-400">
              Currently on manually-set limits: {user?.siteLimit ?? 'unlimited'} sites, {user?.operativeLimit ?? 'unlimited'}{' '}
              operatives.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current plan</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{currentPlan?.name || 'Unknown plan'}</p>
                <p className="mt-1 text-sm capitalize text-slate-500">
                  {org.subscription_status || 'unknown status'}
                  {org.current_period_end && ` · renews ${formatDate(org.current_period_end)}`}
                </p>
              </div>
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {portalLoading ? 'Opening…' : 'Manage billing'}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm">
              <div>
                <p className="text-slate-400">Sites</p>
                <p className="font-medium text-slate-700">
                  {sites.length} / {org.site_limit ?? 'Unlimited'}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Active operatives</p>
                <p className="font-medium text-slate-700">
                  {activeOperativeCount} / {org.operative_limit ?? 'Unlimited'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Change plan</h2>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                <button
                  onClick={() => setInterval('monthly')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    interval === 'monthly' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setInterval('annual')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    interval === 'annual' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Annual
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {plans.map((plan) => {
                const isCurrent = plan.id === org.plan_id
                const pence = interval === 'annual' ? plan.annual_price_pence : plan.monthly_price_pence
                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border p-5 ${isCurrent ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 bg-white'}`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {plan.self_serve ? (
                        <>
                          {formatPence(pence)}
                          <span className="text-xs font-normal text-slate-500">
                            /{interval === 'annual' ? 'yr' : 'mo'} + VAT
                          </span>
                        </>
                      ) : (
                        'Talk to us'
                      )}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {plan.site_limit != null ? `${plan.site_limit} sites` : 'Unlimited sites'} ·{' '}
                      {plan.operative_limit != null ? `${plan.operative_limit} operatives` : 'Unlimited operatives'}
                    </p>
                    <div className="mt-4">
                      {isCurrent ? (
                        <span className="block rounded-lg bg-slate-100 px-3 py-1.5 text-center text-xs font-medium text-slate-500">
                          Current plan
                        </span>
                      ) : plan.self_serve ? (
                        <button
                          onClick={() => handleSwitchPlan(plan)}
                          disabled={switchingPlanId === plan.id}
                          className="w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {switchingPlanId === plan.id ? 'Switching…' : `Switch to ${plan.name}`}
                        </button>
                      ) : (
                        <span className="block rounded-lg border border-slate-300 px-3 py-1.5 text-center text-xs font-medium text-slate-500">
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
