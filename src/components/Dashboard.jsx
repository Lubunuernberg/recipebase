import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard({ userRole, canAccess }) {
  const [stats, setStats] = useState({
    recipes: 0,
    ingredients: 0,
    invoices: 0,
    priceAlerts: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: member } = await supabase
      .from('team_members')
      .select('restaurant_id')
      .eq('id', user.id)
      .single()

    if (!member) return

    const restaurantId = member.restaurant_id

    // Parallel laden
    const [
      { count: recipes },
      { count: ingredients },
      { count: invoices },
      { data: recent }
    ] = await Promise.all([
      supabase.from('recipes').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
      supabase.from('ingredients').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
      supabase.from('recipes')
        .select('id, name, updated_at, image_url')
        .eq('restaurant_id', restaurantId)
        .order('updated_at', { ascending: false })
        .limit(5)
    ])

    setStats({
      recipes: recipes || 0,
      ingredients: ingredients || 0,
      invoices: invoices || 0,
      priceAlerts: 0 // TODO: Preisänderungen zählen
    })
    setRecentActivity(recent || [])
    setLoading(false)
  }

  if (loading) return <div className="loading">Laden...</div>

  return (
    <div className="dashboard">
      <header className="page-header">
        <span className="eyebrow">ÜBERSICHT</span>
        <h1>Willkommen <span className="accent">zurück</span></h1>
      </header>

      <div className="stats-grid">
        <StatCard 
          number={stats.recipes} 
          label="Rezepte" 
          trend="im System"
          color="cognac"
        />
        <StatCard 
          number={stats.ingredients} 
          label="Zutaten" 
          trend="verwaltet"
          color="green"
        />
        <StatCard 
          number={stats.invoices} 
          label="Rechnungen" 
          trend="analysiert"
          color="blue"
        />
        <StatCard 
          number={stats.priceAlerts} 
          label="Preisänderungen" 
          trend="diesen Monat"
          color={stats.priceAlerts > 0 ? 'red' : 'muted'}
        />
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <header className="card-header">
            <span className="eyebrow-small">AKTUELL</span>
            <h3>Zuletzt bearbeitet</h3>
          </header>
          
          <div className="activity-list">
            {recentActivity.length === 0 ? (
              <p className="empty">Noch keine Rezepte vorhanden</p>
            ) : (
              recentActivity.map(item => (
                <div key={item.id} className="activity-item">
                  <div className="activity-image" 
                    style={{ 
                      backgroundImage: item.image_url ? `url(${item.image_url})` : 'none',
                      backgroundColor: '#f0ebe3'
                    }}
                  />
                  <div className="activity-content">
                    <span className="activity-name">{item.name}</span>
                    <span className="activity-time">
                      {new Date(item.updated_at).toLocaleDateString('de-DE', { 
                        day: 'numeric', 
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card">
          <header className="card-header">
            <span className="eyebrow-small">SCHNELLZUGRIFF</span>
            <h3>Aktionen</h3>
          </header>
          
          <div className="quick-actions">
            <QuickAction 
              label="Rezept anlegen" 
              icon="+"
              onClick={() => {}}
            />
            <QuickAction 
              label="Rechnung scannen" 
              icon="📷"
              onClick={() => {}}
            />
            <QuickAction 
              label="Spracheingabe" 
              icon="🎤"
              onClick={() => {}}
            />
          </div>
        </section>
      </div>
    </div>
  )
}

// Helper Components
function StatCard({ number, label, trend, color }) {
  const colorClasses = {
    cognac: { number: '#8b5a2b', border: '#8b5a2b' },
    green: { number: '#5d7a4f', border: '#5d7a4f' },
    blue: { number: '#4a6b7c', border: '#4a6b7c' },
    red: { number: '#a04437', border: '#a04437' },
    muted: { number: '#6b6258', border: '#d4c8b3' }
  }
  
  const colors = colorClasses[color] || colorClasses.muted
  
  return (
    <div className="stat-card" style={{ borderLeft: `3px solid ${colors.border}` }}>
      <span className="stat-number" style={{ color: colors.number }}>
        {number}
      </span>
      <span className="stat-label">{label}</span>
      <span className="stat-trend">{trend}</span>
    </div>
  )
}

function QuickAction({ label, icon, onClick }) {
  return (
    <button className="quick-action" onClick={onClick}>
      <span className="quick-icon">{icon}</span>
      <span className="quick-label">{label}</span>
    </button>
  )
}
