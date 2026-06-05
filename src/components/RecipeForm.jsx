import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function RecipeForm({ recipe, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Hauptgericht',
    description: '',
    prep_time: 30,
    sell_price: 0,
    portions: 1,
    instructions: [''],
    ...recipe
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'sell_price' || name === 'prep_time' || name === 'portions' 
        ? parseFloat(value) || 0 
        : value
    }))
  }

  const handleInstructionChange = (index, value) => {
    const newInstructions = [...formData.instructions]
    newInstructions[index] = value
    setFormData(prev => ({ ...prev, instructions: newInstructions }))
  }

  const addInstruction = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }))
  }

  const removeInstruction = (index) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Get restaurant_id from team_members
      const { data: memberData } = await supabase
        .from('team_members')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

      const recipeData = {
        ...formData,
        restaurant_id: memberData.restaurant_id,
        is_active: true
      }

      let result
      if (recipe?.id) {
        // Update existing
        result = await supabase
          .from('recipes')
          .update(recipeData)
          .eq('id', recipe.id)
      } else {
        // Create new
        result = await supabase
          .from('recipes')
          .insert(recipeData)
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
        <h2 style={styles.title}>{recipe ? 'Rezept bearbeiten' : 'Neues Rezept'}</h2>
        
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
            
            <div style={styles.field}>
              <label style={styles.label}>Kategorie</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="Vorspeise">Vorspeise</option>
                <option value="Hauptgericht">Hauptgericht</option>
                <option value="Nachspeise">Nachspeise</option>
                <option value="Getränk">Getränk</option>
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Beschreibung</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              style={{ ...styles.input, minHeight: '80px' }}
              rows={3}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Zubereitungszeit (Min)</label>
              <input
                type="number"
                name="prep_time"
                value={formData.prep_time}
                onChange={handleChange}
                style={styles.input}
                min={1}
              />
            </div>
            
            <div style={styles.field}>
              <label style={styles.label}>Verkaufspreis (€)</label>
              <input
                type="number"
                name="sell_price"
                value={formData.sell_price}
                onChange={handleChange}
                style={styles.input}
                step="0.01"
                min="0"
              />
            </div>
            
            <div style={styles.field}>
              <label style={styles.label}>Portionen</label>
              <input
                type="number"
                name="portions"
                value={formData.portions}
                onChange={handleChange}
                style={styles.input}
                min={1}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Zubereitung</label>
            {formData.instructions.map((instruction, index) => (
              <div key={index} style={styles.instructionRow}>
                <span style={styles.stepNumber}>{index + 1}.</span>
                <input
                  type="text"
                  value={instruction}
                  onChange={(e) => handleInstructionChange(index, e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                  placeholder={`Schritt ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeInstruction(index)}
                  style={styles.removeBtn}
                  disabled={formData.instructions.length <= 1}
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addInstruction} style={styles.addBtn}>
              + Schritt hinzufügen
            </button>
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
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
  instructionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  stepNumber: {
    color: 'var(--color-accent)',
    fontWeight: 600,
    minWidth: '24px',
  },
  removeBtn: {
    background: 'var(--color-danger)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  addBtn: {
    background: 'transparent',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem',
    color: 'var(--color-accent)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    marginTop: '0.5rem',
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
