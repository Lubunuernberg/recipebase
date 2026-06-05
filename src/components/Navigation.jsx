import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const menuItems = [
  { id: '/', label: 'Dashboard', icon: '📊' },
  { id: '/recipes', label: 'Rezepte', icon: '🍳' },
  { id: '/ingredients', label: 'Zutaten', icon: '🥬' },
  { id: '/inventory', label: 'Inventur', icon: '📦' },
  { id: '/menu', label: 'Wochenmenü', icon: '📅' },
  { id: '/orders', label: 'Bestellungen', icon: '🛒' },
  { id: '/haccp', label: 'HACCP', icon: '🌡️' },
]

export default function Navigation({ user }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <nav style={styles.sidebar}>
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🍜</span>
          <span style={styles.logoText}>RecipeBase</span>
        </div>
      </div>

      <ul style={styles.menu}>
        {menuItems.map(item => (
          <li key={item.id}>
            <NavLink
              to={item.id}
              style={({ isActive }) => ({
                ...styles.menuItem,
                background: isActive ? 'var(--color-accent)' : 'transparent',
              })}
            >
              <span style={styles.icon}>{item.icon}</span>
              <span style={styles.label}>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div style={styles.footer}>
        <div style={styles.userInfo}>
          <span style={styles.userEmail}>{user?.email?.split('@')[0]}</span>
        </div>
        <button onClick={handleSignOut} style={styles.logoutBtn}>
          <span>🚪</span>
          <span>Abmelden</span>
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
    width: '240px',
    background: 'var(--color-bg-card)',
    borderRight: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
  },
  header: {
    padding: '1rem',
    borderBottom: '1px solid var(--color-border)',
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
  menu: {
    flex: 1,
    listStyle: 'none',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    fontSize: '0.9375rem',
    textDecoration: 'none',
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
  userInfo: {
    marginBottom: '0.75rem',
  },
  userEmail: {
    color: 'var(--color-text-muted)',
    fontSize: '0.875rem',
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
  },
}
