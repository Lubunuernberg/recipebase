import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Dashboard({ userRole }) {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    recipes: 0,
    ingredients: 0,
    weeklyRevenue: 0,
    lowStockCount: 0
  })
  const [alerts, setAlerts] = useState({
    lowStock: [],
    haccpOverdue: [],
    haccpTempIssues: []
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Nicht eingeloggt')
        setLoading(false)
        return
      }

      const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

      if (memberError || !member) {
        setStats({ recipes: 0, ingredients: 0, weeklyRevenue: 0, lowStockCount: 0 })
        setRecentActivity([])
        setLoading(false)
        return
      }

      const restaurantId = member.restaurant_id

      // Aktuelle Woche für Menü-Berechnung
      const now = new Date()
      const year = now.getFullYear()
      const week = getWeekNumber(now)
      const currentWeek = `${year}-W${week.toString().padStart(2, '0')}`

      // Parallel laden aller Daten
      const [
        recipesRes,
        ingredientsRes,
        movementsRes,
        weeklyMenuRes,
        cleaningRes,
        tempRes,
        recentRecipesRes,
        recentMovementsRes
      ] = await Promise.all([
        supabase.from('recipes').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        supabase.from('ingredients').select('*').eq('restaurant_id', restaurantId),
        supabase.from('stock_movements').select('*').eq('restaurant_id', restaurantId),
        supabase.from('weekly_menu')
          .select('*, recipes(selling_price)')
          .eq('restaurant_id', restaurantId)
          .eq('date_range', currentWeek),
        supabase.from('haccp_cleaning')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('is_completed', false),
        supabase.from('haccp_temperatures')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('checked_at', { ascending: false })
          .limit(20),
        supabase.from('recipes')
          .select('id, name, updated_at, image_url')
          .eq('restaurant_id', restaurantId)
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase.from('stock_movements')
          .select('*, ingredients(name)')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(5)
      ])

      // Lager-Bestände berechnen
      const stockLevels = {}
      movementsRes.data?.forEach(m => {
        if (!stockLevels[m.ingredient_id]) stockLevels[m.ingredient_id] = 0
        stockLevels[m.ingredient_id] += m.type === 'in' ? m.amount : -m.amount
      })

      // Kritische Bestände filtern
      const lowStock = ingredientsRes.data?.filter(ing => {
        const stock = stockLevels[ing.id] || 0
        return stock < (ing.min_stock || 0)
      }) || []

      // Wochenumsatz berechnen
      const weeklyRevenue = weeklyMenuRes.data?.reduce((sum, item) => {
        return sum + ((item.recipes?.selling_price || 0) * (item.portions || 0))
      }, 0) || 0

      // HACCP-Warnungen
      const nowDate = new Date()
      const haccpOverdue = cleaningRes.data?.filter(task => {
        if (!task.next_due) return false
        return new Date(task.next_due) < nowDate
      }) || []

      // Temperatur-Probleme (letzte 24h)
      const yesterday = new Date(nowDate.getTime() - 24 * 60 * 60 * 1000)
      const haccpTempIssues = tempRes.data?.filter(temp => {
        if (new Date(temp.checked_at) < yesterday) return false
        const diff = Math.abs(temp.actual_temp - temp.target_temp)
        return diff > 2
      }) || []

      // Aktivitäten kombinieren
      const activities = [
        ...recentRecipesRes.data?.map(r => ({
          type: 'recipe',
          id: r.id,
          name: r.name,
          image_url: r.image_url,
          time: r.updated_at,
          action: 'bearbeitet'
        })) || [],
        ...recentMovementsRes.data?.map(m => ({
          type: 'inventory',
          id: m.id,
          name: m.ingredients?.name,
          time: m.created_at,
          action: m.type === 'in' ? 'Zugang' : 'Abgang',
          amount: m.amount
        })) || []
      ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5)

      setStats({
        recipes: recipesRes.count || 0,
        ingredients: ingredientsRes.data?.length || 0,
        weeklyRevenue,
        lowStockCount: lowStock.length
      })
      setAlerts({
        lowStock,
        haccpOverdue,
        haccpTempIssues
      })
      setRecentActivity(activities)
      
    } catch (err) {
      console.error('Dashboard Error:', err)
      setError('Fehler beim Laden: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
    return weekNo
  }

  const totalAlerts = alerts.lowStock.length + alerts.haccpOverdue.length + alerts.haccpTempIssues.length

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Dashboard wird geladen...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>
        <button className="btn-secondary" onClick={loadDashboard}>
          Erneut versuchen
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <span className="eyebrow">ÜBERSICHT</span>
          <h1>Willkommen <span className="accent">zurück</span></h1>
        </div>
      </header>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <StatCard 
          number={stats.recipes} 
          label="Rezepte" 
          trend="im System"
          color="cognac"
          icon="○"
        />
        <StatCard 
          number={stats.ingredients} 
          label="Zutaten" 
          trend="verwaltet"
          color="green"
          icon="□"
        />
        <StatCard 
          number={`${stats.weeklyRevenue.toFixed(0)} €`}
          label="Wochenumsatz" 
          trend="Menü-Planung"
          color="blue"
          icon="◎"
        />
        <StatCard 
          number={stats.lowStockCount} 
          label="Kritische Bestände" 
          trend="Aktion nötig"
          color={stats.lowStockCount > 0 ? 'red' : 'muted'}
          icon="⚠"
          onClick={stats.lowStockCount > 0 ? () => navigate('/inventory') : undefined}
          clickable={stats.lowStockCount > 0}
        />
      </div>

      {/* Alerts Section */}
      {totalAlerts > 0 && (
        <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--danger)' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠</span>
            <span>Aktion erforderlich</span>
            <span style={{ 
              marginLeft: 'auto', 
              background: 'var(--danger)', 
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.875rem'
            }}>
              {totalAlerts}
            </span>
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {alerts.lowStock.slice(0, 3).map(item => (
              <AlertItem 
                key={item.id}
                icon="□"
                text={`${item.name}: Bestand unter Minimum`}
                action="Lager prüfen"
                onClick={() => navigate('/inventory')}
                type="warning"
              />
            ))}
            
            {alerts.haccpOverdue.slice(0, 2).map(task => (
              <AlertItem 
                key={task.id}
                icon="★"
                text={`${task.area}: ${task.task} überfällig`}
                action="HACCP öffnen"
                onClick={() => navigate('/haccp')}
                type="danger"
              />
            ))}
            
            {alerts.haccpTempIssues.slice(0, 2).map(temp => (
              <AlertItem 
                key={temp.id}
                icon="🌡"
                text={`${temp.location}: Temperaturabweichung (${temp.actual_temp}°C / Soll: ${temp.target_temp}°C)`}
                action="Prüfen"
                onClick={() => navigate('/haccp')}
                type="warning"
              />
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        {/* Recent Activity */}
        <section className="card">
          <header style={{ marginBottom: '1.5rem' }}>
            <span className="eyebrow-small">AKTUELL</span>
            <h3>Letzte Aktivitäten</h3>
          </header>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentActivity.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Noch keine Aktivitäten vorhanden
              </p>
            ) : (
              recentActivity.map(item => (
                <div key={`${item.type}-${item.id}`} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem',
                  padding: '0.75rem',
                  background: 'var(--cream)',
                  borderRadius: '4px'
                }}>
                  {item.type === 'recipe' && item.image_url ? (
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '4px',
                      backgroundImage: `url(${item.image_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      flexShrink: 0
                    }} />
                  ) : (
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '4px',
                      background: 'var(--cognac)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '1.25rem',
                      flexShrink: 0
                    }}>
                      {item.type === 'recipe' ? '○' : '□'}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {item.action}
                      {item.amount && ` • ${item.amount}`}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(item.time).toLocaleDateString('de-DE', { 
                      day: 'numeric', 
                      month: 'short'
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="card">
          <header style={{ marginBottom: '1.5rem' }}>
            <span className="eyebrow-small">SCHNELLZUGRIFF</span>
            <h3>Aktionen</h3>
          </header>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <QuickAction 
              label="Rezept anlegen" 
              icon="+"
              onClick={() => navigate('/recipe/new')}
            />
            <QuickAction 
              label="Wochenmenü" 
              icon="◎"
              onClick={() => navigate('/weekly-menu')}
            />
            <QuickAction 
              label="Lager buchen" 
              icon="□"
              onClick={() => navigate('/inventory')}
            />
            <QuickAction 
              label="HACCP" 
              icon="★"
              onClick={() => navigate('/haccp')}
            />
            <QuickAction 
              label="Rechnung scannen" 
              icon="△"
              onClick={() => navigate('/invoices')}
            />
            <QuickAction 
              label="Zutaten" 
              icon="◇"
              onClick={() => navigate('/ingredients')}
            />
          </div>
        </section>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({ number, label, trend, color, icon, onClick, clickable }) {
  const colors = {
    cognac: { border: '#8b5a2b', bg: 'rgba(139, 90, 43, 0.05)' },
    green: { border: '#5d7a4f', bg: 'rgba(93, 122, 79, 0.05)' },
    blue: { border: '#4a6b7c', bg: 'rgba(74, 107, 124, 0.05)' },
    red: { border: '#a04437', bg: 'rgba(160, 68, 55, 0.05)' },
    muted: { border: '#d4c8b3', bg: 'var(--cream)' }
  }
  
  const style = colors[color] || colors.muted
  
  return (
    <div 
      onClick={onClick}
      style={{ 
        borderLeft: `3px solid ${style.border}`,
        background: style.bg,
        padding: '1.5rem',
        borderRadius: '4px',
        cursor: clickable ? 'pointer' : 'default'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.25rem' }}>{icon}</span>
        <span style={{ 
          fontFamily: 'var(--font-serif)', 
          fontSize: '2rem',
          fontWeight: 600,
          color: style.border
        }}>
          {number}
        </span>
      </div>
      <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{trend}</div>
    </div>
  )
}

// Alert Item Component
function AlertItem({ icon, text, action, onClick, type }) {
  const colors = {
    warning: { border: '#b35900', bg: 'rgba(179, 89, 0, 0.05)' },
    danger: { border: '#a04444', bg: 'rgba(160, 68, 68, 0.05)' }
  }
  
  const style = colors[type] || colors.warning
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '1rem',
      padding: '0.75rem 1rem',
      background: style.bg,
      borderLeft: `3px solid ${style.border}`,
      borderRadius: '4px'
    }}>
      <span>{icon}</span>
      <span style={{ flex: 1 }}>{text}</span>
      <button 
        onClick={onClick}
        className="btn-primary"
        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
      >
        {action}
      </button>
    </div>
  )
}

// Quick Action Component
function QuickAction({ label, icon, onClick }) {
  return (
    <button 
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1.5rem 1rem',
        background: 'var(--cream)',
        border: '1px solid var(--cream-dark)',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--cognac)'
        e.currentTarget.style.color = 'white'
        e.currentTarget.style.borderColor = 'var(--cognac)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--cream)'
        e.currentTarget.style.color = ''
        e.currentTarget.style.borderColor = 'var(--cream-dark)'
      }}
    >
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{label}</span>
    </button>
  )
}
