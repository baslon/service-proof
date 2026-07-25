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

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    addSite(form)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Add new site">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Site name">
          <input className={inputClass} value={form.name} onChange={set('name')} required />
        </FormField>

        <FormField label="Client">
          <select className={inputClass} value={form.clientId} onChange={set('clientId')}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
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
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            Add site
          </button>
        </div>
      </form>
    </Modal>
  )
}
