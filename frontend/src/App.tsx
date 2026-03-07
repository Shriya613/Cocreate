import { Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import AppPage from '@/pages/AppPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/app/:appId" element={<AppPage />} />
    </Routes>
  )
}
