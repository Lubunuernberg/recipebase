import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function RecipeDetail({ recipe, onClose, onUpdate }) {
  const [ingredients, setIngredients] = useState([])
  const [availableIngredients, setAvailableIngredients] = useState([])
  const [recipeItems, setRecipeItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({ ingredient_id: '', amount: 0, unit: 'g' })

  useEffect(() => {
    loadData()
  }, [recipe.id])

  const loadData = async () => {
    setLoading(true)
    
    // Load recipe ingredients
    const { data: items } = await supabase
      .from('recipe_ingredients')
      .select('*, ingredients(*)')
      .eq('recipe_id', recipe.id)

    // Load all available ingredients
    const { data: allIngredients } = await supabase
      .from('ingredients')
      .select('*')
      .order('name')

    setRecipeItems(items || [])
    setAvailableIngredients(allIngredients || [])
    setLoading(false)
  }

  const calculateTotalCost = () => {
    return recipeItems.reduce((sum, item) => {
      const cost = (item.amount / getUnitFactor(item.unit)) * item.ingredients.price_per_unit
      return sum + cost
    }, 0)
  }

  const getUnitFactor = (unit) => {
    // Convert to base unit for calculation
    switch(unit) {
      case 'kg': return 1
      case 'g': return 1000
      case 'l': return 1
      case 'ml': return 1000
      default: return 1
    }
  }

  const handleAddIngredient = async () => {
    if (!newItem.ingredient_id || newItem.amount <= 0) return

    const { error } = await supabase
      .from('recipe_ingredients')
      .insert({
        recipe_id: recipe.id,
        ingredient_id: newItem.ingredient_id,
        amount: newItem.amount,
        unit: newItem.unit
      })

    if (!error) {
      setShowAddForm(false)
      setNewItem({ ingredient_id: '', amount: 0, unit: 'g' })
      loadData()
      onUpdate()
    }
  }

  const handleRemoveIngredient = async (itemId) => {
    const { error } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('id', itemId)

    if (!error) {
      loadData()
      onUpdate()
    }
  }

  const totalCost = calculateTotalCost()
  const costPerPortion = totalCost / (recipe.portions || 1)
  const profit = recipe.sell_price - costPerPortion
  const profitMargin = recipe.sell_price > 0 ? (profit / recipe.sell_price * 100).toFixed(1) : 0

  if (loading) return <div style={styles.overlay}><div style={styles.modal}>Laden...</div></div>

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{recipe.name}</h2>
            <p style={styles.category}>{recipe.category} • {recipe.prep_time} min • {recipe.portions} Portionen</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.content}>
          <div style={styles.calculationPanel}>
            <h3 style={styles.sectionTitle}>📊 Kalkulation</h3>
            
            <div style={styles.calcGrid}>
              <div style={styles.calcItem}>
                <label>Gesamtkosten</label>
                <span style={styles.calcValue}>{totalCost.toFixed(2)}€</span>
              </div>
              
              <div style={styles.calcItem}>
                <label>Kosten/Portion</label>
                <span style={styles.calcValue}>{costPerPortion.toFixed(2)}€</span>
              </div>
              
              <div style={styles.calcItem}>
                <label>Verkaufspreis</label>
                <span style={styles.calcValue}>{recipe.sell_price}€</span>
              </div>
              
              <div style={styles.calcItem}>
                <label>Marge</label>
                <span style={{...styles.calcValue, color: profit > 0 ? 'var(--color-success)' : 'var(--color-danger)'}}>
                  {profit.toFixed(2)}€ ({profitMargin}%)
                </span>
              </div>
            </div>

            <div style={styles.costBar}>
              <div 
                style={{
                  ...styles.costFill,
                  width: `${Math.min((costPerPortion / recipe.sell_price) * 100, 100)}%`,
                  background: costPerPortion / recipe.sell_price > 0.4 ? 'var(--color-danger)' : 'var(--color-warning)'
                }}
              />
            </div>
            <p style={styles.costHint}>
              {costPerPortion / recipe.sell_price > 0.4 ? '⚠️ Hohe Kosten!' : costPerPortion / recipe.sell_price > 0.3 ? '⚡ Optimieren möglich' : '✅ Gute Marge'}
            </p>
          </div>

          <div style={styles.ingredientsPanel}>
            <div style={styles.panelHeader}>
              <h3 style={styles.sectionTitle}>🥬 Zutaten</h3>
              <button onClick={() => setShowAddForm(true)} style={styles.addBtn}>+ Zutat</button>
            </div>

            {showAddForm && (
              <div style={styles.addForm}>
                <select
                  value={newItem.ingredient_id}
                  onChange={(e) => setNewItem({...newItem, ingredient_id: e.target.value})}
                  style={styles.select}
                >
                  <option value="">Zutat wählen...</option>
                  {availableIngredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.price_per_unit}€/{ing.unit})</option>
                  ))}
                </select>
                
                <input
                  type="number"
                  placeholder="Menge"
                  value={newItem.amount}
                  onChange={(e) => setNewItem({...newItem, amount: parseFloat(e.target.value)})}
                  style={styles.amountInput}
                />
                
                <select
                  value={newItem.unit}
                  onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                  style={styles.unitSelect}
                >
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="Stk">Stk</option>
                  <option value="Bund">Bund</option>
                </select>
                
                <button onClick={handleAddIngredient} style={styles.confirmBtn}>✓</button>
                <button onClick={() => setShowAddForm(false)} style={styles.cancelBtn}>✕</button>
              </div>
            )}

            <div style={styles.ingredientsList}>
              {recipeItems.map(item => (
                <div key={item.id} style={styles.ingredientRow}>
                  <div style={styles.ingInfo}>
                    <span style={styles.ingName}>{item.ingredients.name}</span>
                    <span style={styles.ingAmount}>{item.amount} {item.unit}</span>
                  </div>
                  
                  <span style={styles.ingCost}>
                    {((item.amount / getUnitFactor(item.unit)) * item.ingredients.price_per_unit).toFixed(2)}€
                  </span>
                  
                  <button 
                    onClick={() => handleRemoveIngredient(item.id)}
                    style={styles.removeBtn}
                  >
                    🗑️
                  </button>
                </div>
              ))}
              
              {recipeItems.length === 0 && <p style={styles.empty}>Noch keine Zutaten. Klicke "+ Zutat" um zu starten.</p>}
            </div>
          </div>

          {recipe.instructions && recipe.instructions.length > 0 && (
            <div style={styles.instructionsPanel}>
              <h3 style={styles.sectionTitle}>📝 Zubereitung</h3>
              <ol style={styles.instructionsList}>
                {recipe.instructions.map((step, i) => (
                  <li key={i} style={styles.instructionItem}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
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
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '1.5rem',
    borderBottom: '1px solid var(--color-border)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
  },
  category: {
    color: 'var(--color-text-muted)',
    fontSize: '0.875rem',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text-muted)',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.5rem',
  },
  content: {
    padding: '1.5rem',
  },
  calculationPanel: {
    background: 'var(--color-bg-input)',
    borderRadius: 'var(--radius-md)',
    padding: '1.25rem',
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  calcGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1rem',
    marginBottom: '1rem',
  },
  calcItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  calcValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
  },
  costBar: {
    height: '8px',
    background: 'var(--color-border)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '0.5rem',
  },
  costFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  costHint: {
    fontSize: '0.875rem',
    textAlign: 'center',
  },
  ingredientsPanel: {
    marginBottom: '1.5rem',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  addBtn: {
    background: 'var(--color-accent)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  addForm: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
    padding: '1rem',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-md)',
  },
  select: {
    flex: 2,
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.5rem',
    color: 'var(--color-text)',
  },
  amountInput: {
    flex: 1,
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.5rem',
    color: 'var(--color-text)',
  },
  unitSelect: {
    flex: 0.5,
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.5rem',
    color: 'var(--color-text)',
  },
  confirmBtn: {
    background: 'var(--color-success)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    width: '36px',
    cursor: 'pointer',
  },
  cancelBtn: {
    background: 'var(--color-danger)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    width: '36px',
    cursor: 'pointer',
  },
  ingredientsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  ingredientRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-md)',
  },
  ingInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  ingName: {
    fontWeight: 500,
  },
  ingAmount: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
  },
  ingCost: {
    fontWeight: 600,
    color: 'var(--color-accent)',
    marginRight: '1rem',
  },
  removeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-danger)',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  empty: {
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    padding: '2rem',
  },
  instructionsPanel: {
    borderTop: '1px solid var(--color-border)',
    paddingTop: '1.5rem',
  },
  instructionItem: {
    marginBottom: '0.75rem',
    lineHeight: 1.6,
    paddingLeft: '1rem',
  },
}
