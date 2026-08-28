import { useState } from 'react'
import Modal from '../Modal'
import FormField, { inputClass } from '../FormField'
import { useApp } from '../../context/AppContext'

export default function AddOperativeModal({ onClose }) {
  const { inviteOperative } = useApp()
  const [form, setForm] = useState({ name: '', email: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await inviteOperative(form)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Add operative">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-zinc-500">
          Sends an email invite so they can set their own password and log in.
        </p>

        <FormField label="Name">
          <input className={inputClass} value={form.name} onChange={set('name')} required />
        </FormField>

        <FormField label="Email">
          <input type="email" className={inputClass} value={form.email} onChange={set('email')} required />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}

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
            disabled={submitting}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {submitting ? 'Sending invite…' : 'Send invite'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
