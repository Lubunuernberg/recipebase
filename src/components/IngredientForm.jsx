import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function IngredientForm({ ingredient, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    unit: 'kg',
    price_per_unit: 0,
    current_stock: 0,
    min_stock: 0,
    max_stock: 0,
    supplier: '',
    location: '',
    notes: '',
    ...ingredient
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const units = ['g', 'kg', 'ml', 'l', 'Stk', 'Bund', 'Pack']

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: ['price_per_unit', 'current_stock', 'min_stock', 'max_stock'].includes(name)
        ? parseFloat(value) || 0
        : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: memberData } = await supabase
        .from('team_members')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

      const ingredientData = {
        ...formData,
        restaurant_id: memberData.restaurant_id
      }

      let result
      if (ingredient?.id) {
        result = await supabase
          .from('ingredients')
          .update(ingredientData)
          .eq('id', ingredient.id)
      } else {
        result = await supabase
          .from('ingredients')
          .insert(ingredientData)
      }

      if (result.error) throw result.error
      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>{ingredient ? 'Zutat bearbeiten' : 'Neue Zutat'}</h2>
        
        {error && <p style={styles.error}>{error}</p>}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>
            
            <div style={{ ...styles.field, flex: '0 0 120px' }}>
              <label style={styles.label}>Einheit</label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                style={styles.input}
              >
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Preis pro Einheit (€)</label>
              <input
                type="number"
                name="price_per_unit"
                value={formData.price_per_unit}
                onChange={handleChange}
                style={styles.input}
                step="0.01"
                min="0"
              />
            </div>
            
            <div style={styles.field}>
              <label style={styles.label}>Aktueller Bestand</label>
              <input
                type="number"
                name="current_stock"
                value={formData.current_stock}
                onChange={handleChange}
                style={styles.input}
                step="0.1"
                min="0"
              />
            </div>
            
            <div style={styles.field}>
              <label style={styles.label}>Min. Bestand</label>
              <input
                type="number"
                name="min_stock"
                value={formData.min_stock}
                onChange={handleChange}
                style={styles.input}
                step="0.1"
                min="0"
              />
            </div>
            
            <div style={styles.field}>
              <label style={styles.label}>Max. Bestand</label>
              <input
                type="number"
                name="max_stock"
                value={formData.max_stock}
                onChange={handleChange}
                style={styles.input}
                step="0.1"
                min="0"
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Lieferant</label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                style={styles.input}
                placeholder="z.B. Metzgerei Schmidt"
              />
            </div>
            
            <div style={styles.field}>
              <label style={styles.label}>Lagerort</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                style={styles.input}
                placeholder="z.B. Kühlhaus A"
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Notizen</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              style={{ ...styles.input, minHeight: '80px' }}
              rows={3}
              placeholder="Weitere Informationen..."
            />
          </div>

          <div style={styles.buttons}>
            <button type="button" onClick={onCancel} style={styles.cancelBtn}>
              Abbrechen
            </button>
            <button type="submit" style={styles.saveBtn} disabled={loading}>
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
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
    padding: '1rem',
  },
  modal: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '1.5rem',
    color: 'var(--color-accent)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--color-text-muted)',
  },
  input: {
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem',
    color: 'var(--color-text)',
    fontSize: '1rem',
  },
  buttons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1.5rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid var(--color-border)',
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem 1.5rem',
    color: 'var(--color-text)',
    cursor: 'pointer',
  },
  saveBtn: {
    background: 'var(--color-accent)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem 1.5rem',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 600,
  },
  error: {
    color: 'var(--color-danger)',
    padding: '0.75rem',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1rem',
  },
}
