import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RecipeDetail({ userRole }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showVoiceModal, setShowVoiceModal] = useState(false)

  useEffect(() => {
    if (id) {
      loadRecipe()
    }
  }, [id])

  const loadRecipe = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Load recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()
      
      if (recipeError) throw recipeError
      
      // Load ingredients
      const { data: ingredientsData } = await supabase
        .from('recipe_ingredients')
        .select(`
          amount,
          ingredients:ingredient_id (
            id,
            name,
            original_name,
            unit,
            current_price
          )
        `)
        .eq('recipe_id', id)
      
      setRecipe(recipeData)
      setIngredients(ingredientsData || [])
    } catch (err) {
      console.error('Error loading recipe:', err)
      setError('Rezept konnte nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }

  const calculateCost = () => {
    return ingredients.reduce((total, item) => {
      const price = item.ingredients?.current_price || 0
      return total + (item.amount * price)
    }, 0)
  }

  const costPerPortion = recipe?.portions > 0 ? calculateCost() / recipe.portions : 0
  const margin = recipe?.selling_price > 0 
    ? ((recipe.selling_price - costPerPortion) / recipe.selling_price * 100).toFixed(1)
    : 0

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner" />
        <p>Rezept wird geladen...</p>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: '#A04444' }}>{error || 'Rezept nicht gefunden'}</p>
        <button className="btn-secondary" onClick={() => navigate('/recipes')}>
          Zurück zu den Rezepten
        </button>
      </div>
    )
  }

  return (
    <div className="recipe-detail">
      <header className="detail-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/recipes')}>
            ← Zurück
          </button>
          <div className="title-section">
            <span className="eyebrow">REZEPT</span>
            <h1>{recipe.name}</h1>
            {recipe.original_name && (
              <span className="original-name">{recipe.original_name}</span>
            )}
          </div>
        </div>
        
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowVoiceModal(true)}>
            🎤 Ergänzen
          </button>
          {userRole === 'chef' && (
            <button className="btn-primary">Bearbeiten</button>
          )}
        </div>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="recipe-image-card">
            {recipe.image_url ? (
              <img src={recipe.image_url} alt={recipe.name} />
            ) : (
              <div className="placeholder-image">
                <span>📷</span>
                <p>Kein Bild vorhanden</p>
              </div>
            )}
          </div>

          <div className="info-card">
            <h3>Informationen</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Kategorie</span>
                <span className="value">{recipe.category || '–'}</span>
              </div>
              <div className="info-item">
                <span className="label">Portionen</span>
                <span className="value">{recipe.portions}</span>
              </div>
              <div className="info-item">
                <span className="label">Erstellt</span>
                <span className="value">
                  {new Date(recipe.created_at).toLocaleDateString('de-DE')}
                </span>
              </div>
            </div>
          </div>

          {recipe.description && (
            <div className="card">
              <h3>Beschreibung</h3>
              <p>{recipe.description}</p>
            </div>
          )}

          {recipe.steps && recipe.steps.length > 0 && (
            <div className="card">
              <h3>Zubereitung</h3>
              <ol className="steps-list">
                {recipe.steps.map((step, idx) => (
                  <li key={idx} className="step-item">
                    <span className="step-number">{idx + 1}</span>
                    <span className="step-text">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="detail-sidebar">
          <div className="card">
            <h3>Kalkulation</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="cost-item">
                <span>Gesamtkosten</span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem' }}>
                  {calculateCost().toFixed(2)} €
                </span>
              </div>
              <div className="cost-item">
                <span>Kosten/Portion</span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem' }}>
                  {costPerPortion.toFixed(2)} €
                </span>
              </div>
              {recipe.selling_price > 0 && (
                <>
                  <div className="cost-item">
                    <span>Verkaufspreis</span>
                    <span>{recipe.selling_price.toFixed(2)} €</span>
                  </div>
                  <div className="cost-item" style={{ 
                    background: 'var(--cream)', 
                    margin: '0 -1rem', 
                    padding: '0.75rem 1rem',
                    borderRadius: '4px'
                  }}>
                    <span>Marge</span>
                    <span style={{ 
                      color: margin >= 60 ? '#5A7A4F' : margin >= 40 ? '#B8843E' : '#A64444',
                      fontWeight: 600
                    }}>
                      {margin}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <h3>Zutaten</h3>
            {ingredients.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Keine Zutaten hinterlegt</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {ingredients.map((item, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--cream-dark)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{item.ingredients?.name}</div>
                      {item.ingredients?.original_name && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--cognac)', fontStyle: 'italic' }}>
                          {item.ingredients.original_name}
                        </div>
                      )}
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {item.amount} {item.ingredients?.unit}
                      </div>
                    </div>
                    {userRole === 'chef' && (
                      <div style={{ fontFamily: 'var(--font-serif)' }}>
                        {(item.amount * (item.ingredients?.current_price || 0)).toFixed(2)} €
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {recipe.allergens?.length > 0 && (
            <div className="card">
              <h3>Allergene</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {recipe.allergens.map((a, i) => (
                  <span key={i} style={{
                    fontSize: '0.75rem',
                    padding: '0.375rem 0.75rem',
                    background: 'var(--cream)',
                    borderRadius: '4px'
                  }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Modal */}
      {showVoiceModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(10, 9, 8, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowVoiceModal(false)}
        >
          <div 
            style={{
              background: 'var(--paper)',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '480px',
              width: '100%'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3>Rezept ergänzen per Sprache</h3>
            <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>
              Halte den Button gedrückt und sprich in Vietnamesisch, Deutsch oder Englisch.
            </p>
            <button 
              style={{
                width: '100%',
                padding: '1.5rem',
                background: 'var(--charcoal)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: 'pointer',
                marginTop: '1rem'
              }}
            >
              🎤 Aufnahme starten
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
