import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Recipes({ userRole }) {
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadRecipes()
  }, [])

  const loadRecipes = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setRecipes([])
        setLoading(false)
        return
      }

      const { data: member } = await supabase
        .from('team_members')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

      if (!member?.restaurant_id) {
        setRecipes([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('restaurant_id', member.restaurant_id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setRecipes(data || [])
    } catch (err) {
      console.error('Error loading recipes:', err)
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }

  const filteredRecipes = recipes.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.original_name && r.original_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="recipes-page" style={{ padding: '2rem' }}>
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
          <p style={{ color: 'var(--text-muted)' }}>Rezepte werden geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="recipes-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">REZEPTE</span>
          <h1>Alle <span className="accent">Rezepte</span></h1>
        </div>
        {userRole === 'chef' && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Neues Rezept
          </button>
        )}
      </header>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Rezepte suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="empty-state">
          <p>Noch keine Rezepte vorhanden.</p>
          {userRole === 'chef' && (
            <button className="btn-secondary" onClick={() => setShowForm(true)}>
              Erstes Rezept anlegen
            </button>
          )}
        </div>
      ) : (
        <div className="recipes-grid">
          {filteredRecipes.map(recipe => (
            <div 
              key={recipe.id} 
              className="recipe-card"
              onClick={() => navigate(`/recipe/${recipe.id}`)}
            >
              <div className="recipe-image">
                {recipe.image_url ? (
                  <img src={recipe.image_url} alt={recipe.name} />
                ) : (
                  <div className="image-placeholder">📷</div>
                )}
              </div>
              <div className="recipe-content">
                <h3>{recipe.name}</h3>
                {recipe.original_name && (
                  <span className="original-name">{recipe.original_name}</span>
                )}
                <div className="recipe-meta">
                  <span>{recipe.category || 'Hauptgericht'}</span>
                  <span>•</span>
                  <span>{recipe.portions} Portionen</span>
                </div>
                {userRole === 'chef' && recipe.selling_price > 0 && (
                  <div className="recipe-price">
                    {recipe.selling_price.toFixed(2)} €
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
