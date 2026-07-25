import { createContext, useContext, useReducer, useCallback, useMemo } from 'react'
import { CLIENTS, SITES, INITIAL_JOBS, OPERATIVES } from './mockData'

const AppContext = createContext(null)

function initialState() {
  return {
    clients: CLIENTS,
    sites: SITES,
    jobs: INITIAL_JOBS,
    operatives: OPERATIVES,
  }
}

function nextJobId(jobs) {
  const max = jobs.reduce((acc, j) => {
    const n = parseInt(j.id.replace('SP-', ''), 10)
    return Number.isFinite(n) && n > acc ? n : acc
  }, 0)
  return `SP-${String(max + 1).padStart(4, '0')}`
}

function reducer(state, action) {
  switch (action.type) {
    case 'RESET_DEMO':
      return initialState()

    case 'ADD_JOB': {
      const job = {
        id: nextJobId(state.jobs),
        photosSubmitted: 0,
        photos: [],
        submittedTime: null,
        status: 'Scheduled',
        notes: '',
        ...action.payload,
      }
      return { ...state, jobs: [job, ...state.jobs] }
    }

    case 'UPDATE_JOB': {
      return {
        ...state,
        jobs: state.jobs.map((j) => (j.id === action.payload.id ? { ...j, ...action.payload.patch } : j)),
      }
    }

    case 'DELETE_JOB': {
      return { ...state, jobs: state.jobs.filter((j) => j.id !== action.payload.id) }
    }

    case 'SUBMIT_PROOF': {
      const { jobId, completionStatus, photos, notes } = action.payload
      const target = state.jobs.find((j) => j.id === jobId)
      // Once a job is Completed & Evidenced it's locked — evidence that can be
      // silently rewritten after the fact isn't proof of anything. Corrections
      // past this point go through an admin (Edit Job), not a re-submission.
      if (!target || target.status === 'Completed & Evidenced') {
        return state
      }
      const statusMap = {
        Completed: 'Completed & Evidenced',
        'Completed with issue': 'At Risk',
        'Unable to complete': 'Missing Evidence',
      }
      return {
        ...state,
        jobs: state.jobs.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: statusMap[completionStatus] || 'Awaiting Review',
                photos,
                photosSubmitted: photos.length,
                notes,
                submittedTime: new Date().toISOString().slice(0, 16),
              }
            : j
        ),
      }
    }

    case 'ADD_SITE': {
      const site = {
        id: `ST-${String(state.sites.length + 1).padStart(2, '0')}`,
        addedDate: new Date().toISOString().slice(0, 10),
        ...action.payload,
      }
      return { ...state, sites: [...state.sites, site] }
    }

    case 'ADD_CLIENT': {
      const client = {
        id: `CL-${String(state.clients.length + 1).padStart(2, '0')}`,
        ...action.payload,
      }
      return { ...state, clients: [...state.clients, client] }
    }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  const addJob = useCallback((payload) => dispatch({ type: 'ADD_JOB', payload }), [])
  const updateJob = useCallback((id, patch) => dispatch({ type: 'UPDATE_JOB', payload: { id, patch } }), [])
  const deleteJob = useCallback((id) => dispatch({ type: 'DELETE_JOB', payload: { id } }), [])
  const submitProof = useCallback(
    (jobId, completionStatus, photos, notes) =>
      dispatch({ type: 'SUBMIT_PROOF', payload: { jobId, completionStatus, photos, notes } }),
    []
  )
  const addSite = useCallback((payload) => dispatch({ type: 'ADD_SITE', payload }), [])
  const addClient = useCallback((payload) => dispatch({ type: 'ADD_CLIENT', payload }), [])
  const resetDemo = useCallback(() => dispatch({ type: 'RESET_DEMO' }), [])

  const value = useMemo(
    () => ({
      ...state,
      addJob,
      updateJob,
      deleteJob,
      submitProof,
      addSite,
      addClient,
      resetDemo,
    }),
    [state, addJob, updateJob, deleteJob, submitProof, addSite, addClient, resetDemo]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
