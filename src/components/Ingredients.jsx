import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Ingredients({ userRole }) {
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    original_name: '',
    unit: 'g',
    current_price: '',
    category: 'Sonstiges'
  })

  useEffect(() => {
    loadIngredients()
  }, [])

  const loadIngredients = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setIngredients([])
        setLoading(false)
        return
      }

      const { data: member } = await supabase
        .from('team_members')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

      if (!member?.restaurant_id) {
        setIngredients([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('restaurant_id', member.restaurant_id)
        .order('name')

      if (error) throw error
      setIngredients(data || [])
    } catch (err) {
      console.error('Error:', err)
      setIngredients([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: member } = await supabase
        .from('team_members')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

      await supabase.from('ingredients').insert({
        restaurant_id: member.restaurant_id,
        ...newIngredient,
        current_price: parseFloat(newIngredient.current_price) || 0
      })

      setShowForm(false)
      setNewIngredient({ name: '', original_name: '', unit: 'g', current_price: '', category: 'Sonstiges' })
      loadIngredients()
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const filteredIngredients = ingredients.filter(i => 
    i.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.original_name && i.original_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="ingredients-page" style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid var(--cream-dark)',
            borderTop: '3px solid var(--cognac)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: 'var(--text-muted)' }}>Zutaten werden geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ingredients-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">ZUTATEN</span>
          <h1>Alle <span className="accent">Zutaten</span></h1>
        </div>
        {userRole !== 'cook' && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Neue Zutat
          </button>
        )}
      </header>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Zutaten suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {showForm && (
        <form className="ingredient-form card" onSubmit={handleSubmit}>
          <h3>Neue Zutat</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Name (Deutsch)</label>
              <input
                value={newIngredient.name}
                onChange={(e) => setNewIngredient({...newIngredient, name: e.target.value})}
                placeholder="z.B. Rindfleisch"
                required
              />
            </div>
            <div className="form-field">
              <label>Originalname (optional)</label>
              <input
                value={newIngredient.original_name}
                onChange={(e) => setNewIngredient({...newIngredient, original_name: e.target.value})}
                placeholder="z.B. thịt bò"
              />
            </div>
            <div className="form-field">
              <label>Einheit</label>
              <select
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({...newIngredient, unit: e.target.value})}
              >
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="L">L</option>
                <option value="Stk">Stk</option>
                <option value="Bund">Bund</option>
              </select>
            </div>
            <div className="form-field">
              <label>Preis pro Einheit (€)</label>
              <input
                type="number"
                step="0.01"
                value={newIngredient.current_price}
                onChange={(e) => setNewIngredient({...newIngredient, current_price: e.target.value})}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Abbrechen
            </button>
            <button type="submit" className="btn-primary">Speichern</button>
          </div>
        </form>
      )}

      <div className="ingredients-table-container">
        <table className="ingredients-table">
          <thead>
            <tr>
              <th>Zutat</th>
              <th>Einheit</th>
              {userRole !== 'cook' && <th>Preis</th>}
              <th>Kategorie</th>
            </tr>
          </thead>
          <tbody>
            {filteredIngredients.map(ing => (
              <tr key={ing.id}>
                <td>
                  <div className="ingredient-cell">
                    <span className="ingredient-name">{ing.name}</span>
                    {ing.original_name && (
                      <span className="original">{ing.original_name}</span>
                    )}
                  </div>
                </td>
                <td>{ing.unit}</td>
                {userRole !== 'cook' && (
                  <td>{ing.current_price?.toFixed(2)} €</td>
                )}
                <td><span className="category-tag">{ing.category || 'Sonstiges'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
