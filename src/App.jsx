import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Recipes from './components/Recipes'
import RecipeDetail from './components/RecipeDetail'
import Ingredients from './components/Ingredients'
import InvoiceAnalyzer from './components/InvoiceAnalyzer'
import RecipeForm from './components/RecipeForm'
import WeeklyMenu from './components/WeeklyMenu'

// Rollen-Definition
const ROLES = {
  CHEF: 'chef',
  COOK: 'cook',
  MANAGER: 'manager'
}

function AppContent() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        setUserRole('chef')
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

  return (
    <div className="app">
      <Sidebar userRole={userRole} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard userRole={userRole} />} />
          <Route path="/recipes" element={<Recipes userRole={userRole} />} />
          <Route path="/recipe/:id" element={<RecipeDetail userRole={userRole} />} />
          <Route path="/ingredients" element={userRole !== 'cook' ? <Ingredients userRole={userRole} /> : <Navigate to="/" />} />
          <Route path="/invoices" element={userRole !== 'cook' ? <InvoiceAnalyzer /> : <Navigate to="/" />} />
          <Route path="/recipe/new" element={<RecipeForm userRole={userRole} />} />
          <Route path="/weekly-menu" element={<WeeklyMenu />} />
        </Routes>
      </main>
    </div>
  )
}

function Sidebar({ userRole }) {
  const navigate = useNavigate()
  const location = window.location.pathname

  const navItems = [
    { path: '/', label: 'Übersicht', icon: '◎', allowed: ['chef', 'cook', 'manager'] },
    { path: '/recipes', label: 'Rezepte', icon: '○', allowed: ['chef', 'cook', 'manager'] },
    { path: '/recipe/new', label: '+ Neues Rezept', icon: '+', allowed: ['chef'] },
    { path: '/weekly-menu', label: 'Wochenmenü', icon: '◎', allowed: ['chef', 'manager'] },
    { path: '/ingredients', label: 'Zutaten', icon: '□', allowed: ['chef', 'manager'] },
    { path: '/invoices', label: 'Rechnungen', icon: '△', allowed: ['chef', 'manager'] },
  ].filter(item => item.allowed.includes(userRole))

  return (
    <nav className="sidebar">
      <div className="logo">
        <span className="logo-icon">◎</span>
        <span className="logo-text">Recipe<span className="accent">Base</span></span>
      </div>
      
      <div className="nav-sections">
        {navItems.map(item => (
          <button
            key={item.path}
            className={`nav-item ${location === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
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
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
