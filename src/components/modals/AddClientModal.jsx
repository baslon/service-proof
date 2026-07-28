import { useState } from 'react'
import Modal from '../Modal'
import FormField, { inputClass } from '../FormField'
import { useApp } from '../../context/AppContext'
import { SECTORS } from '../../context/mockData'

export default function AddClientModal({ onClose }) {
  const { addClient } = useApp()
  const [form, setForm] = useState({
    name: '',
    sector: SECTORS[0],
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contractStartDate: '',
    notes: '',
  })

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    addClient(form)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Add new client">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Client name">
          <input className={inputClass} value={form.name} onChange={set('name')} required />
        </FormField>

        <FormField label="Sector">
          <select className={inputClass} value={form.sector} onChange={set('sector')}>
            {SECTORS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Contact name">
            <input className={inputClass} value={form.contactName} onChange={set('contactName')} />
          </FormField>
          <FormField label="Contact phone">
            <input className={inputClass} value={form.contactPhone} onChange={set('contactPhone')} />
          </FormField>
        </div>

        <FormField label="Contact email">
          <input type="email" className={inputClass} value={form.contactEmail} onChange={set('contactEmail')} />
        </FormField>

        <FormField label="Contract start date">
          <input type="date" className={inputClass} value={form.contractStartDate} onChange={set('contractStartDate')} />
        </FormField>

        <FormField label="Notes">
          <textarea rows={3} className={inputClass} value={form.notes} onChange={set('notes')} />
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
            Add client
          </button>
        </div>
      </form>
    </Modal>
  )
}
