import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import IngredientForm from './IngredientForm'

export default function Ingredients({ user }) {
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState(null)

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

  const getStockStatus = (current, min, max) => {
    if (current <= min) return { color: 'var(--color-danger)', label: 'Niedrig', bg: 'rgba(239, 68, 68, 0.1)' }
    if (current >= max * 0.9) return { color: 'var(--color-warning)', label: 'Voll', bg: 'rgba(245, 158, 11, 0.1)' }
    return { color: 'var(--color-success)', label: 'OK', bg: 'rgba(34, 197, 94, 0.1)' }
  }

  const handleDelete = async (id) => {
    if (!confirm('Zutat wirklich löschen?')) return
    
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id)

    if (!error) loadIngredients()
  }

  const handleEdit = (ingredient) => {
    setEditingIngredient(ingredient)
    setShowForm(true)
  }

  const handleNew = () => {
    setEditingIngredient(null)
    setShowForm(true)
  }

  const handleSave = () => {
    setShowForm(false)
    setEditingIngredient(null)
    loadIngredients()
  }

  if (loading) return <div style={styles.loading}>Laden...</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Zutaten</h1>
        <button onClick={handleNew} style={styles.addBtn}>
          + Neue Zutat
        </button>
      </div>

      {showForm && (
        <IngredientForm
          ingredient={editingIngredient}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditingIngredient(null)
          }}
        />
      )}

      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <span>Name</span>
          <span>Bestand</span>
          <span>Status</span>
          <span>Preis</span>
          <span>Lieferant</span>
          <span>Aktionen</span>
        </div>

        {ingredients.map(ing => {
          const status = getStockStatus(ing.current_stock, ing.min_stock, ing.max_stock)
          return (
            <div key={ing.id} style={styles.tableRow}>
              <div style={styles.nameCell}>
                <span style={styles.name}>{ing.name}</span>
                {ing.location && <span style={styles.location}>📍 {ing.location}</span>}
              </div>
              <span>{ing.current_stock} {ing.unit}</span>
              <span style={{ 
                color: status.color, 
                fontWeight: 600,
                background: status.bg,
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
              }}>
                {status.label}
              </span>
              <span>{ing.price_per_unit}€/{ing.unit}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>{ing.supplier || '-'}</span>
              <div style={styles.actions}>
                <button 
                  onClick={() => handleEdit(ing)} 
                  style={styles.actionBtn}
                  title="Bearbeiten"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => handleDelete(ing.id)} 
                  style={{...styles.actionBtn, color: 'var(--color-danger)'}}
                  title="Löschen"
                >
                  🗑️
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {ingredients.length === 0 && (
        <div style={styles.empty}>
          <p>Noch keine Zutaten vorhanden.</p>
          <button onClick={handleNew} style={styles.emptyBtn}>
            Erste Zutat anlegen
          </button>
        </div>
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
    gridTemplateColumns: '2fr 1fr 1fr 1fr 2fr 1fr',
    gap: '1rem',
    padding: '1rem 1.25rem',
    background: 'var(--color-bg-input)',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    alignItems: 'center',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 2fr 1fr',
    gap: '1rem',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.875rem',
    alignItems: 'center',
  },
  nameCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  name: { fontWeight: 500 },
  location: { 
    fontSize: '0.75rem', 
    color: 'var(--color-text-muted)',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0.25rem',
  },
  empty: { 
    textAlign: 'center', 
    padding: '3rem', 
    color: 'var(--color-text-muted)',
  },
  emptyBtn: {
    marginTop: '1rem',
    background: 'var(--color-accent)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
  },
}
