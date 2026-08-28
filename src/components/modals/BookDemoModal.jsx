import { useState } from 'react'
import Modal from '../Modal'
import FormField, { inputClass } from '../FormField'

export default function BookDemoModal({ onClose }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    sites: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <Modal open onClose={onClose} title="Request received" centered>
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-sm text-zinc-600">
            Thanks{form.name ? `, ${form.name.split(' ')[0]}` : ''} — we've got your demo request for{' '}
            <strong className="text-zinc-900">{form.company || 'your organisation'}</strong>. Someone from our team
            will reach out within one business day to find a time.
          </p>
          <button
            onClick={onClose}
            className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title="Book a demo" centered>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-zinc-500">
          Tell us a bit about your team and we'll set up a live walkthrough of Provaserve for your sites.
        </p>

        <FormField label="Full name">
          <input className={inputClass} value={form.name} onChange={set('name')} required />
        </FormField>

        <FormField label="Work email">
          <input type="email" className={inputClass} value={form.email} onChange={set('email')} required />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Company">
            <input className={inputClass} value={form.company} onChange={set('company')} required />
          </FormField>
          <FormField label="Number of sites">
            <input type="number" min={1} className={inputClass} value={form.sites} onChange={set('sites')} />
          </FormField>
        </div>

        <FormField label="Anything we should know?">
          <textarea
            rows={3}
            className={inputClass}
            value={form.message}
            onChange={set('message')}
            placeholder="Optional"
          />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Request demo
          </button>
        </div>
      </form>
    </Modal>
  )
}
