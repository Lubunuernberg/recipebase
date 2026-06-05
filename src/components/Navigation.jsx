import { useState } from 'react'
import { supabase } from '../lib/supabase'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'recipes', label: 'Rezepte', icon: '🍳' },
  { id: 'ingredients', label: 'Zutaten', icon: '🥬' },
  { id: 'inventory', label: 'Inventur', icon: '📦' },
  { id: 'menu', label: 'Wochenmenü', icon: '📅' },
  { id: 'orders', label: 'Bestellungen', icon: '🛒' },
  { id: 'haccp', label: 'HACCP', icon: '🌡️' },
]

export default function Navigation({ onSignOut }) {
  const [activeItem, setActiveItem] = useState('dashboard')
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    if (onSignOut) onSignOut()
  }

  return (
    <nav style={{
      ...styles.sidebar,
      width: isCollapsed ? '60px' : '240px'
    }}>
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🍜</span>
          {!isCollapsed && <span style={styles.logoText}>RecipeBase</span>}
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={styles.collapseBtn}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      <ul style={styles.menu}>
        {menuItems.map(item => (
          <li key={item.id}>
            <button
              onClick={() => setActiveItem(item.id)}
              style={{
                ...styles.menuItem,
                background: activeItem === item.id ? 'var(--color-accent)' : 'transparent',
              }}
            >
              <span style={styles.icon}>{item.icon}</span>
              {!isCollapsed && <span style={styles.label}>{item.label}</span>}
            </button>
          </li>
        ))}
      </ul>

      <div style={styles.footer}>
        <button onClick={handleSignOut} style={styles.logoutBtn}>
          <span>🚪</span>
          {!isCollapsed && <span>Abmelden</span>}
        </button>
      </div>
    </nav>
  )
}

const styles = {
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    height: '100vh',
    background: 'var(--color-bg-card)',
    borderRight: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.3s ease',
    zIndex: 100,
  },
  header: {
    padding: '1rem',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoIcon: {
    fontSize: '1.5rem',
  },
  logoText: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: 'var(--color-accent)',
  },
  collapseBtn: {
    background: 'var(--color-bg-input)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  menu: {
    flex: 1,
    listStyle: 'none',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    color: 'var(--color-text)',
    fontSize: '0.9375rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  icon: {
    fontSize: '1.25rem',
    width: '24px',
    textAlign: 'center',
  },
  label: {
    whiteSpace: 'nowrap',
  },
  footer: {
    padding: '1rem',
    borderTop: '1px solid var(--color-border)',
  },
  logoutBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-muted)',
    fontSize: '0.9375rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
}
