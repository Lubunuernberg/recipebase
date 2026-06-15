import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Inventory({ userRole }) {
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
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: member } = await supabase
        .from('team_members')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

      const [{ data: ingredientsData }, { data: movementsData }] = await Promise.all([
        supabase.from('ingredients').select('*').eq('restaurant_id', member.restaurant_id).order('name'),
        supabase.from('stock_movements')
          .select('*, ingredients(name, unit)')
          .eq('restaurant_id', member.restaurant_id)
          .order('created_at', { ascending: false })
          .limit(50)
      ])

      setIngredients(ingredientsData || [])
      setMovements(movementsData || [])
    } catch (err) {
      console.error('Error loading inventory:', err)
    }
    setLoading(false)
  }

  const calculateStock = (ingredientId) => {
    return movements
      .filter(m => m.ingredient_id === ingredientId)
      .reduce((sum, m) => sum + (m.type === 'in' ? m.amount : -m.amount), 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const { data: { user } } = await supabase.auth.getUser()
    const { data: member } = await supabase
      .from('team_members')
      .select('restaurant_id')
      .eq('id', user.id)
      .single()
    
    const { error } = await supabase
      .from('stock_movements')
      .insert({
        restaurant_id: member.restaurant_id,
        ingredient_id: formData.ingredient_id,
        type: formData.type,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        user_id: user.id
      })

    if (!error) {
      setShowForm(false)
      setFormData({ ingredient_id: '', type: 'in', amount: 0, reason: '' })
      loadData()
    }
  }

  const getLowStockItems = () => {
    return ingredients.filter(ing => {
      const stock = calculateStock(ing.id)
      return stock < (ing.min_stock || 0)
    })
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner" />
        <p>Inventar wird geladen...</p>
      </div>
    )
  }

  const lowStock = getLowStockItems()

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <span className="eyebrow">LAGER</span>
          <h1>Inven<span className="accent">tar</span></h1>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Buchung
        </button>
      </header>

      {lowStock.length > 0 && (
        <div className="card" style={{ 
          marginBottom: '2rem', 
          borderLeft: '4px solid var(--danger)',
          background: 'rgba(160, 68, 68, 0.05)'
        }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--danger)' }}>
            ⚠️ Mindestbestand unterschritten
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {lowStock.map(item => (
              <span key={item.id} style={{
                padding: '0.5rem 1rem',
                background: 'var(--danger)',
                color: 'white',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}>
                {item.name}: {calculateStock(item.id).toFixed(2)} {item.unit} 
                (Min: {item.min_stock} {item.unit})
              </span>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10, 9, 8, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}
        onClick={() => setShowForm(false)}
        >
          <div 
            style={{
              background: 'var(--paper)',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '450px',
              width: '100%'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '1.5rem' }}>Lagerbuchung</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-field" style={{ marginBottom: '1rem' }}>
                <label>Zutat</label>
                <select
                  value={formData.ingredient_id}
                  onChange={(e) => setFormData({...formData, ingredient_id: e.target.value})}
                  style={{ width: '100%' }}
                  required
                >
                  <option value="">Wählen...</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit}) - Bestand: {calculateStock(ing.id).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field" style={{ marginBottom: '1rem' }}>
                <label>Typ</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="in"
                      checked={formData.type === 'in'}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                    />
                    <span style={{ color: '#2d6a4f' }}>⬆ Zugang</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="out"
                      checked={formData.type === 'out'}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                    />
                    <span style={{ color: '#a04444' }}>⬇ Abgang</span>
                  </label>
                </div>
              </div>

              <div className="form-field" style={{ marginBottom: '1rem' }}>
                <label>Menge ({formData.ingredient_id ? ingredients.find(i => i.id === formData.ingredient_id)?.unit : 'kg/l/Stk'})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div className="form-field" style={{ marginBottom: '1.5rem' }}>
                <label>Grund</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="z.B. Lieferung vom 15.06."
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Abbrechen
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Buchen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          Aktueller Bestand
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Zutat</th>
                <th>Einheit</th>
                <th style={{ textAlign: 'right' }}>Bestand</th>
                <th style={{ textAlign: 'right' }}>Min. Bestand</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map(ing => {
                const stock = calculateStock(ing.id)
                const isLow = stock < (ing.min_stock || 0)
                return (
                  <tr key={ing.id}>
                    <td style={{ fontWeight: 500 }}>{ing.name}</td>
                    <td>{ing.unit}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {stock.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      {ing.min_stock || '-'}
                    </td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: isLow ? 'var(--danger)' : '#2d6a4f',
                        color: 'white'
                      }}>
                        {isLow ? 'Kritisch' : 'OK'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          Letzte Buchungen
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Zutat</th>
                <th>Typ</th>
                <th style={{ textAlign: 'right' }}>Menge</th>
                <th>Grund</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id}>
                  <td>{new Date(m.created_at).toLocaleDateString('de-DE')}</td>
                  <td>{m.ingredients?.name}</td>
                  <td>
                    <span style={{
                      color: m.type === 'in' ? '#2d6a4f' : '#a04444',
                      fontWeight: 500
                    }}>
                      {m.type === 'in' ? '⬆ Zugang' : '⬇ Abgang'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {m.amount} {m.ingredients?.unit}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {m.reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
