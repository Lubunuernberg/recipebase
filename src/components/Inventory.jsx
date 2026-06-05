import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Inventory({ user }) {
  const [ingredients, setIngredients] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    ingredient_id: '',
    type: 'in',
    amount: 0,
    reason: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    const [{ data: ingredientsData }, { data: movementsData }] = await Promise.all([
      supabase.from('ingredients').select('*').order('name'),
      supabase.from('stock_movements')
        .select('*, ingredients(name, unit)')
        .order('created_at', { ascending: false })
        .limit(50)
    ])

    setIngredients(ingredientsData || [])
    setMovements(movementsData || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('stock_movements')
      .insert({
        ingredient_id: formData.ingredient_id,
        type: formData.type,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        user_id: currentUser.id
      })

    if (!error) {
      // Update ingredient stock
      const ingredient = ingredients.find(i => i.id === formData.ingredient_id)
      if (ingredient) {
        const newStock = formData.type === 'in' 
          ? ingredient.current_stock + parseFloat(formData.amount)
          : ingredient.current_stock - parseFloat(formData.amount)
        
        await supabase
          .from('ingredients')
          .update({ current_stock: newStock })
          .eq('id', formData.ingredient_id)
      }

      setShowForm(false)
      setFormData({ ingredient_id: '', type: 'in', amount: 0, reason: '' })
      loadData()
    }
  }

  const getMovementIcon = (type) => {
    switch(type) {
      case 'in': return '📥'
      case 'out': return '📤'
      case 'adjustment': return '⚖️'
      default: return '📦'
    }
  }

  if (loading) return <div style={styles.loading}>Laden...</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Inventur</h1>
        <button onClick={() => setShowForm(true)} style={styles.addBtn}>
          + Buchung
        </button>
      </div>

      {showForm && (
        <div style={styles.formOverlay}>
          <div style={styles.formModal}>
            <h3 style={styles.formTitle}>Warenbewegung buchen</h3>
            
            <form onSubmit={handleSubmit}>
              <div style={styles.formField}>
                <label>Zutat</label>
                <select
                  value={formData.ingredient_id}
                  onChange={(e) => setFormData({...formData, ingredient_id: e.target.value})}
                  style={styles.input}
                  required
                >
                  <option value="">Wählen...</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} (aktuell: {ing.current_stock} {ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formField}>
                <label>Typ</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  style={styles.input}
                >
                  <option value="in">📥 Wareneingang</option>
                  <option value="out">📤 Warenausgang</option>
                  <option value="adjustment">⚖️ Korrektur</option>
                </select>
              </div>

              <div style={styles.formField}>
                <label>Menge</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formField}>
                <label>Grund</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  style={styles.input}
                  placeholder="z.B. Lieferung vom 05.06."
                />
              </div>

              <div style={styles.formButtons}>
                <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>
                  Abbrechen
                </button>
                <button type="submit" style={styles.saveBtn}>
                  Buchen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{ingredients.length}</span>
          <span style={styles.statLabel}>Zutaten</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{ingredients.filter(i => i.current_stock <= i.min_stock).length}</span>
          <span style={{...styles.statLabel, color: 'var(--color-danger)'}}>Niedrig</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{movements.length}</span>
          <span style={styles.statLabel}>Buchungen</span>
        </div>
      </div>

      <h2 style={styles.sectionTitle}>Letzte Bewegungen</h2>

      <div style={styles.movementsList}>
        {movements.map(mov => (
          <div key={mov.id} style={styles.movementRow}>
            <span style={styles.movementIcon}>{getMovementIcon(mov.type)}</span>
            <div style={styles.movementInfo}>
              <span style={styles.movementName}>{mov.ingredients?.name}</span>
              <span style={styles.movementDetail}>{mov.reason || 'Kein Grund angegeben'}</span>
            </div>
            
            <span style={{
              ...styles.movementAmount,
              color: mov.type === 'in' ? 'var(--color-success)' : mov.type === 'out' ? 'var(--color-danger)' : 'var(--color-warning)'
            }}>
              {mov.type === 'in' ? '+' : mov.type === 'out' ? '-' : '±'}
              {mov.amount} {mov.ingredients?.unit}
            </span>
            
            <span style={styles.movementDate}>
              {new Date(mov.created_at).toLocaleDateTime('de-DE', { 
                day: '2-digit', 
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        ))}
        
        {movements.length === 0 && (
          <p style={styles.empty}>Noch keine Buchungen. Klicke "+ Buchung" um zu starten.</p>
        )}
      </div>
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
  formOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  formModal: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
  },
  formTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    marginBottom: '1.5rem',
  },
  formField: {
    marginBottom: '1rem',
  },
  input: {
    width: '100%',
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem',
    color: 'var(--color-text)',
    fontSize: '1rem',
    marginTop: '0.25rem',
  },
  formButtons: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  cancelBtn: {
    flex: 1,
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem',
    color: 'var(--color-text)',
    cursor: 'pointer',
  },
  saveBtn: {
    flex: 1,
    background: 'var(--color-accent)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 600,
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    marginBottom: '2rem',
  },
  statCard: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    border: '1px solid var(--color-border)',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--color-accent)',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  movementsList: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    overflow: 'hidden',
  },
  movementRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid var(--color-border)',
  },
  movementIcon: {
    fontSize: '1.25rem',
  },
  movementInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  movementName: {
    fontWeight: 500,
  },
  movementDetail: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
  },
  movementAmount: {
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  movementDate: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
  },
  empty: {
    textAlign: 'center',
    padding: '2rem',
    color: 'var(--color-text-muted)',
  },
}
