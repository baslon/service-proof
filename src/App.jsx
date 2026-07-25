import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Sites from './pages/Sites'
import Clients from './pages/Clients'
import Report from './pages/Report'
import Submit from './pages/Submit'
import RequireAuth from './components/RequireAuth'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth roles={['admin']} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sites" element={<Sites />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/report" element={<Report />} />
      </Route>

      <Route element={<RequireAuth roles={['admin', 'operative']} />}>
        <Route path="/submit" element={<Submit />} />
      </Route>
    </Routes>
  )
}
