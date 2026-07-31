import { useState } from 'react'
import Modal from '../Modal'
import { useApp } from '../../context/AppContext'

export default function EditOperativeModal({ operative, onClose }) {
  const { clients, setOperativeActive, setOperativeClients } = useApp()
  const [active, setActive] = useState(operative.active)
  const [selectedClientIds, setSelectedClientIds] = useState(operative.clientIds)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleClient = (clientId) => {
    setSelectedClientIds((prev) => (prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]))
  }

  const sameClientSet = (a, b) => a.length === b.length && a.every((id) => b.includes(id))

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (active !== operative.active) {
        await setOperativeActive(operative.id, active)
      }
      if (!sameClientSet(selectedClientIds, operative.clientIds)) {
        await setOperativeClients(operative.id, selectedClientIds)
      }
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={operative.name}>
      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm">
              <span className="font-medium text-slate-800">Active</span>
              <span className="block text-xs text-slate-500">
                Inactive operatives can&apos;t be assigned to new jobs and can&apos;t sign in. Past jobs still show
                their name — nothing about their history changes.
              </span>
            </span>
          </label>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Clients</span>
          <p className="mb-2 text-xs text-slate-500">
            Leave every box unchecked to make this operative available for every client. Check one or more to limit
            them to just those clients — useful for someone who only covers specific sites, or who occasionally covers
            for another client.
          </p>
          <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {clients.length === 0 ? (
              <p className="px-2 py-1 text-sm text-slate-400">No clients yet.</p>
            ) : (
              clients.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedClientIds.includes(c.id)}
                    onChange={() => toggleClient(c.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {c.name}
                </label>
              ))
            )}
          </div>
        </div>

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
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
