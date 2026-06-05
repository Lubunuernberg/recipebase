import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Recipes from './components/Recipes'
import RecipeDetail from './components/RecipeDetail'
import Ingredients from './components/Ingredients'
import InvoiceAnalyzer from './components/InvoiceAnalyzer'
import VoiceInput from './components/VoiceInput'

// Rollen-Definition
const ROLES = {
  CHEF: 'chef',      // Vollzugriff
  COOK: 'cook',      // Nur Rezepte ansehen
  MANAGER: 'manager' // Rezepte + Inventur, keine Preise
}

function App() {
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState('dashboard')
  const [selectedRecipe, setSelectedRecipe] = useState(null)

  useEffect(() => {
    checkSession()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        loadUserRole(session.user.id)
      } else {
        setUserRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setSession(session)
    if (session) {
      await loadUserRole(session.user.id)
    }
    setLoading(false)
  }

  const loadUserRole = async (userId) => {
    const { data, error } = await supabase
      .from('team_members')
      .select('role')
      .eq('id', userId)
      .single()
    
    if (data) {
      setUserRole(data.role)
    }
    setLoading(false)
  }

  // Navigation handler
  const navigate = (view, data = null) => {
    setCurrentView(view)
    if (data) setSelectedRecipe(data)
  }

  // Berechtigungs-Check
  const canAccess = (feature) => {
    const permissions = {
      [ROLES.CHEF]: ['dashboard', 'recipes', 'recipe_detail', 'ingredients', 'invoices', 'voice', 'prices'],
      [ROLES.COOK]: ['dashboard', 'recipes', 'recipe_detail', 'voice'],
      [ROLES.MANAGER]: ['dashboard', 'recipes', 'recipe_detail', 'ingredients', 'invoices']
    }
    return permissions[userRole]?.includes(feature) || false
  }

  if (loading) return <div className="loading">Laden...</div>
  
  if (!session) return <Auth onAuth={() => checkSession()} />

  // Sidebar Navigation
  const navItems = [
    { id: 'dashboard', label: 'Übersicht', icon: '◎', roles: [ROLES.CHEF, ROLES.COOK, ROLES.MANAGER] },
    { id: 'recipes', label: 'Rezepte', icon: '○', roles: [ROLES.CHEF, ROLES.COOK, ROLES.MANAGER] },
    { id: 'ingredients', label: 'Zutaten', icon: '□', roles: [ROLES.CHEF, ROLES.MANAGER] },
    { id: 'invoices', label: 'Rechnungen', icon: '△', roles: [ROLES.CHEF, ROLES.MANAGER] },
    { id: 'voice', label: 'Sprache', icon: '♪', roles: [ROLES.CHEF, ROLES.COOK] },
  ].filter(item => item.roles.includes(userRole))

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
              onClick={() => navigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="user-footer">
          <div className="user-info">
            <span className="user-role">{userRole === ROLES.CHEF ? 'Küchenchef' : userRole === ROLES.COOK ? 'Koch' : 'Manager'}</span>
          </div>
          <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
            Abmelden
          </button>
        </div>
      </nav>

      <main className="main-content">
        {currentView === 'dashboard' && <Dashboard userRole={userRole} canAccess={canAccess} />}
        {currentView === 'recipes' && <Recipes 
          userRole={userRole} 
          onRecipeClick={(recipe) => navigate('recipe_detail', recipe)}
          canAccess={canAccess}
        />}
        {currentView === 'recipe_detail' && selectedRecipe && <RecipeDetail 
          recipe={selectedRecipe} 
          userRole={userRole}
          onBack={() => navigate('recipes')}
          canAccess={canAccess}
        />}
        {currentView === 'ingredients' && canAccess('ingredients') && <Ingredients userRole={userRole} />}
        {currentView === 'invoices' && canAccess('invoices') && <InvoiceAnalyzer />}
        {currentView === 'voice' && canAccess('voice') && <VoiceInput />}
      </main>
    </div>
  )
}

export default App
