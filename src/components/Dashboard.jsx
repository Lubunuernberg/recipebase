import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard({ user }) {
  const [stats, setStats] = useState({
    recipes: 0,
    ingredients: 0,
    lowStock: 0,
    menuItems: 0,
  })
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    
    // Get user's restaurant_id
    const { data: memberData } = await supabase
      .from('team_members')
      .select('restaurant_id')
      .eq('id', user.id)
      .single()

    if (!memberData?.restaurant_id) {
      setLoading(false)
      return
    }

    const restaurantId = memberData.restaurant_id

    // Load stats
    const [
      { count: recipeCount },
      { count: ingredientCount },
      { data: lowStockItems },
      { count: menuCount },
    ] = await Promise.all([
      supabase.from('recipes').select('*', { count: 'exact' }).eq('restaurant_id', restaurantId),
      supabase.from('ingredients').select('*', { count: 'exact' }).eq('restaurant_id', restaurantId),
      supabase.from('ingredients')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .lte('current_stock', 'min_stock'),
      supabase.from('weekly_menu').select('*', { count: 'exact' }).eq('restaurant_id', restaurantId),
    ])

    setStats({
      recipes: recipeCount || 0,
      ingredients: ingredientCount || 0,
      lowStock: lowStockItems?.length || 0,
      menuItems: menuCount || 0,
    })

    // Mock recent activity for now
    setRecentActivity([
      { id: 1, action: 'Rezept erstellt', item: 'Pho Bo', time: '2 Stunden ago', type: 'recipe' },
      { id: 2, action: 'Zutat aktualisiert', item: 'Rindfleisch', time: '4 Stunden ago', type: 'ingredient' },
      { id: 3, action: 'Bestellung gesendet', item: 'Metzgerei Schmidt', time: 'Gestern', type: 'order' },
    ])

    setLoading(false)
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Dashboard</h1>
      <p style={styles.welcome}>Willkommen zurück, {user.email}</p>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <StatCard
          icon="🍳"
          label="Rezepte"
          value={stats.recipes}
          color="var(--color-accent)"
        />
        <StatCard
          icon="🥬"
          label="Zutaten"
          value={stats.ingredients}
          color="var(--color-success)"
        />
        <StatCard
          icon="⚠️"
          label="Niedriger Bestand"
          value={stats.lowStock}
          color={stats.lowStock > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)'}
        />
        <StatCard
          icon="📅"
          label="Menüeinträge"
          value={stats.menuItems}
          color="var(--color-warning)"
        />
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Schnellzugriff</h2>
        <div style={styles.quickActions}>
          <QuickActionButton icon="➕" label="Neues Rezept" />
          <QuickActionButton icon="📝" label="Inventur" />
          <QuickActionButton icon="🛒" label="Bestellung" />
          <QuickActionButton icon="🌡️" label="HACCP" />
        </div>
      </div>

      {/* Recent Activity */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Letzte Aktivität</h2>
        <div style={styles.activityList}>
          {recentActivity.map(activity => (
            <div key={activity.id} style={styles.activityItem}>
              <div style={styles.activityIcon}>
                {activity.type === 'recipe' && '🍳'}
                {activity.type === 'ingredient' && '🥬'}
                {activity.type === 'order' && '🛒'}
              </div>
              <div style={styles.activityContent}>
                <p style={styles.activityAction}>{activity.action}</p>
                <p style={styles.activityItem}>{activity.item}</p>
              </div>
              <span style={styles.activityTime}>{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: color + '20', color }}>
        {icon}
      </div>
      <div>
        <p style={styles.statLabel}>{label}</p>
        <p style={{ ...styles.statValue, color }}>{value}</p>
      </div>
    </div>
  )
}

function QuickActionButton({ icon, label }) {
  return (
    <button style={styles.quickActionBtn}>
      <span style={styles.quickActionIcon}>{icon}</span>
      <span style={styles.quickActionLabel}>{label}</span>
    </button>
  )
}

const styles = {
  container: {
    maxWidth: '1200px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--color-bg-input)',
    borderTop: '3px solid var(--color-accent)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
  },
  welcome: {
    color: 'var(--color-text-muted)',
    marginBottom: '2rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  statCard: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    border: '1px solid var(--color-border)',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
  },
  statLabel: {
    color: 'var(--color-text-muted)',
    fontSize: '0.875rem',
    marginBottom: '0.25rem',
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '1rem',
  },
  quickActionBtn: {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--color-text)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  quickActionIcon: {
    fontSize: '1.5rem',
  },
  quickActionLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  activityList: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    overflow: 'hidden',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid var(--color-border)',
  },
  activityIcon: {
    width: '40px',
    height: '40px',
    background: 'var(--color-bg-input)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontWeight: 500,
    marginBottom: '0.125rem',
  },
  activityItem: {
    color: 'var(--color-text-muted)',
    fontSize: '0.875rem',
  },
  activityTime: {
    color: 'var(--color-text-muted)',
    fontSize: '0.75rem',
  },
}
