import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Navigation from './components/Navigation'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Laden...</p>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div style={styles.app}>
      <Navigation onSignOut={() => supabase.auth.signOut()} />
      <main style={styles.main}>
        <Dashboard user={session.user} />
      </main>
    </div>
  )
}

const styles = {
  app: {
    display: 'flex',
    minHeight: '100vh',
  },
  main: {
    flex: 1,
    padding: '1.5rem',
    marginLeft: '240px', // Sidebar width
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--color-bg-input)',
    borderTop: '3px solid var(--color-accent)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
}

export default App
