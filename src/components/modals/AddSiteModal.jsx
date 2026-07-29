import { useState } from 'react'
import Modal from '../Modal'
import FormField, { inputClass } from '../FormField'
import { useApp } from '../../context/AppContext'

export default function AddSiteModal({ onClose }) {
  const { clients, addSite } = useApp()
  const [form, setForm] = useState({
    name: '',
    clientId: clients[0]?.id || '',
    address: '',
    postcode: '',
    siteContact: '',
    phone: '',
    accessNotes: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.clientId) {
      setError('Add a client before adding a site — every site must belong to one.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await addSite(form)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Add new site">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Site name">
          <input className={inputClass} value={form.name} onChange={set('name')} required />
        </FormField>

        <FormField label="Client">
          <select className={inputClass} value={form.clientId} onChange={set('clientId')} disabled={clients.length === 0}>
            {clients.length === 0 ? (
              <option value="">No clients yet — add a client first</option>
            ) : (
              clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        </FormField>

        <FormField label="Address">
          <input className={inputClass} value={form.address} onChange={set('address')} required />
        </FormField>

        <FormField label="Postcode">
          <input className={inputClass} value={form.postcode} onChange={set('postcode')} required />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Site contact">
            <input className={inputClass} value={form.siteContact} onChange={set('siteContact')} />
          </FormField>
          <FormField label="Phone">
            <input className={inputClass} value={form.phone} onChange={set('phone')} />
          </FormField>
        </div>

        <FormField label="Access notes">
          <textarea rows={3} className={inputClass} value={form.accessNotes} onChange={set('accessNotes')} />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={clients.length === 0 || submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Adding…' : 'Add site'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
