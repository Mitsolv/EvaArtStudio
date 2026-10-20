import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import Home from './pages/Home'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Services from './pages/dashboard/Services'
import Schedule from './pages/dashboard/Schedule'
import Bookings from './pages/dashboard/Bookings'
import Chat from './pages/dashboard/Chat'
import Book from './pages/dashboard/Book'
import MyBookings from './pages/dashboard/MyBookings'
import Settings from './pages/dashboard/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="services" element={<Services />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="chat" element={<Chat />} />
            <Route path="settings" element={<Settings />} />
            <Route path="book" element={<Book />} />
            <Route path="my-bookings" element={<MyBookings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}