import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Navigation from './components/Navigation'
import Dashboard from './components/Dashboard'
import Recipes from './components/Recipes'
import Ingredients from './components/Ingredients'

import Inventory from './components/Inventory'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Laden...</p>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Navigation user={session.user} />
        <main style={{ flex: 1, padding: '1.5rem', marginLeft: '240px' }}>
          <Routes>
            <Route path="/" element={<Dashboard user={session.user} />} />
            <Route path="/recipes" element={<Recipes user={session.user} />} />
            <Route path="/ingredients" element={<Ingredients user={session.user} />} />
            <Route path="/inventory" element={<Inventory user={session.user} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
