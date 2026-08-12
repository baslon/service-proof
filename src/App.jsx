import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Sites from './pages/Sites'
import Clients from './pages/Clients'
import Operatives from './pages/Operatives'
import Attendance from './pages/Attendance'
import Report from './pages/Report'
import Submit from './pages/Submit'
import SetPassword from './pages/SetPassword'
import SuperAdmin from './pages/SuperAdmin'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Pricing from './pages/Pricing'
import SignupSuccess from './pages/SignupSuccess'
import Billing from './pages/Billing'
import RequireAuth from './components/RequireAuth'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/superadmin" element={<SuperAdmin />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/signup/success" element={<SignupSuccess />} />

      <Route element={<RequireAuth roles={['admin']} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sites" element={<Sites />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/operatives" element={<Operatives />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/report" element={<Report />} />
        <Route path="/billing" element={<Billing />} />
      </Route>

      <Route element={<RequireAuth roles={['admin', 'operative']} />}>
        <Route path="/submit" element={<Submit />} />
        <Route path="/set-password" element={<SetPassword />} />
      </Route>
    </Routes>
  )
}
