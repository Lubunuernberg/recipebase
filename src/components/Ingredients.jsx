import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Ingredients({ user }) {
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadIngredients()
  }, [])

  const loadIngredients = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name')

    if (!error) setIngredients(data || [])
    setLoading(false)
  }

  const getStockStatus = (current, min) => {
    if (current <= min) return { color: 'var(--color-danger)', label: 'Niedrig' }
    if (current <= min * 1.5) return { color: 'var(--color-warning)', label: 'Mittel' }
    return { color: 'var(--color-success)', label: 'OK' }
  }

  if (loading) return <div style={styles.loading}>Laden...</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Zutaten</h1>
        <button style={styles.addBtn}>+ Neue Zutat</button>
      </div>

      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <span>Name</span>
          <span>Bestand</span>
          <span>Status</span>
          <span>Preis</span>
          <span>Lieferant</span>
        </div>

        {ingredients.map(ing => {
          const status = getStockStatus(ing.current_stock, ing.min_stock)
          return (
            <div key={ing.id} style={styles.tableRow}>
              <span style={styles.name}>{ing.name}</span>
              <span>{ing.current_stock} {ing.unit}</span>
              <span style={{ color: status.color, fontWeight: 600 }}>{status.label}</span>
              <span>{ing.price_per_unit}€/{ing.unit}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>{ing.supplier || '-'}</span>
            </div>
          )
        })}
      </div>

      {ingredients.length === 0 && (
        <p style={styles.empty}>Noch keine Zutaten vorhanden.</p>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: '1200px' },
  loading: { padding: '2rem', textAlign: 'center' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  title: { fontSize: '1.5rem', fontWeight: 700 },
  addBtn: {
    background: 'var(--color-accent)',
    color: 'white',
    padding: '0.75rem 1.25rem',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  table: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 2fr',
    gap: '1rem',
    padding: '1rem 1.25rem',
    background: 'var(--color-bg-input)',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 2fr',
    gap: '1rem',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.875rem',
    alignItems: 'center',
  },
  name: { fontWeight: 500 },
  empty: { textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' },
}
