import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'

// Rollen-Definition
const ROLES = {
  CHEF: 'chef',
  COOK: 'cook', 
  MANAGER: 'manager'
}

// Navigation Items
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Übersicht', icon: '◎', roles: ['chef', 'cook', 'manager'] },
  { id: 'recipes', label: 'Rezepte', icon: '○', roles: ['chef', 'cook', 'manager'] },
  { id: 'ingredients', label: 'Zutaten', icon: '□', roles: ['chef', 'manager'] },
  { id: 'invoices', label: 'Rechnungen', icon: '△', roles: ['chef', 'manager'] },
  { id: 'voice', label: 'Sprache', icon: '♪', roles: ['chef', 'cook'] },
]

function App() {
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentView, setCurrentView] = useState('dashboard')

  useEffect(() => {
    initApp()
  }, [])

  const initApp = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      
      if (session?.user) {
        await loadUserRole(session.user.id)
      }
    } catch (err) {
      console.error('Init error:', err)
      setError('Verbindungsfehler. Bitte neu laden.')
    } finally {
      setLoading(false)
    }

    // Auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        loadUserRole(session.user.id)
      } else {
        setUserRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }

  const loadUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.log('No team member found, defaulting to chef')
        setUserRole('chef') // Default für ersten User
      } else {
        setUserRole(data?.role || 'chef')
      }
    } catch (err) {
      console.error('Role load error:', err)
      setUserRole('chef')
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F5F1EB'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #E8DFCE',
            borderTop: '3px solid #8B5A2B',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: '#6B6258', fontSize: '14px' }}>Laden...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F5F1EB',
        padding: '2rem'
      }}>
        <div style={{
          background: '#FAF8F5',
          border: '1px solid #E8DFCE',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#A04444', marginBottom: '1rem' }}>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: '#8B5A2B',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Neu laden
          </button>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  // Filter navigation by role
  const userRoleStr = userRole || 'chef'
  const navItems = NAV_ITEMS.filter(item => item.roles.includes(userRoleStr))

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">
          <span className="logo-icon">◎</span>
          <span className="logo-text">Recipe<span className="accent">Base</span></span>
        </div>
        
        <div className="nav-sections">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => setCurrentView(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="user-footer">
          <div className="user-info">
            <span className="user-role">
              {userRole === 'chef' ? 'Küchenchef' : userRole === 'cook' ? 'Koch' : 'Manager'}
            </span>
          </div>
          <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
            Abmelden
          </button>
        </div>
      </nav>

      <main className="main-content">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView !== 'dashboard' && (
          <div style={{ padding: '2rem' }}>
            <h1>{navItems.find(n => n.id === currentView)?.label}</h1>
            <p style={{ color: '#6B6258', marginTop: '1rem' }}>
              Dieses Modul wird noch entwickelt.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
