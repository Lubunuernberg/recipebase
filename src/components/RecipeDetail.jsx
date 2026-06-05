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
      // Load recipe with ingredients
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()
      
      if (recipeError) throw recipeError
      
      // Load recipe ingredients with details
      const { data: ingredientsData, error: ingredientsError } = await supabase
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
      
      if (ingredientsError) throw ingredientsError
      
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
      <div className="recipe-detail loading">
        <div className="spinner" />
        <p>Rezept wird geladen...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="recipe-detail error">
        <p className="error-message">{error}</p>
        <button className="btn-secondary" onClick={() => navigate('/recipes')}>
          Zurück zu den Rezepten
        </button>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="recipe-detail error">
        <p>Rezept nicht gefunden</p>
        <button className="btn-secondary" onClick={() => navigate('/recipes')}>
          Zurück zu den Rezepten
        </button>
      </div>
    )
  }

  return (
    <div className="recipe-detail">
      {/* Header */}
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
          <button 
            className="btn-secondary"
            onClick={() => setShowVoiceModal(true)}
          >
            🎤 Voice
          </button>
          {userRole === 'chef' && (
            <button className="btn-primary">Bearbeiten</button>
          )}
        </div>
      </header>

      <div className="detail-grid">
        {/* Left Column - Image & Info */}
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
            <div className="description-card">
              <h3>Beschreibung</h3>
              <p>{recipe.description}</p>
            </div>
          )}

          {recipe.steps && recipe.steps.length > 0 && (
            <div className="steps-card">
              <h3>Zubereitung</h3>
              <ol className="steps-list">
                {recipe.steps.map((step, index) => (
                  <li key={index} className="step-item">
                    <span className="step-number">{index + 1}</span>
                    <span className="step-text">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Right Column - Ingredients & Costs */}
        <div className="detail-sidebar">
          {/* Cost Card */}
          <div className="cost-card">
            <h3>Kalkulation</h3>
            <div className="cost-grid">
              <div className="cost-item">
                <span className="cost-label">Gesamtkosten</span>
                <span className="cost-value">{calculateCost().toFixed(2)} €</span>
              </div>
              <div className="cost-item">
                <span className="cost-label">Kosten/Portion</span>
                <span className="cost-value">{costPerPortion.toFixed(2)} €</span>
              </div>
              {recipe.selling_price > 0 && (
                <>
                  <div className="cost-item">
                    <span className="cost-label">Verkaufspreis</span>
                    <span className="cost-value">{recipe.selling_price.toFixed(2)} €</span>
                  </div>
                  <div className="cost-item highlight">
                    <span className="cost-label">Marge</span>
                    <span className={`cost-value margin-${margin >= 60 ? 'good' : margin >= 40 ? 'ok' : 'bad'}`}>
                      {margin}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Ingredients Card */}
          <div className="ingredients-card">
            <h3>Zutaten</h3>
            <div className="ingredients-list">
              {ingredients.length === 0 ? (
                <p className="empty">Keine Zutaten hinterlegt</p>
              ) : (
                ingredients.map((item, index) => (
                  <div key={index} className="ingredient-row">
                    <div className="ingredient-main">
                      <span className="ingredient-name">
                        {item.ingredients?.name}
                        {item.ingredients?.original_name && (
                          <span className="original"> ({item.ingredients.original_name})</span>
                        )}
                      </span>
                      <span className="ingredient-amount">
                        {item.amount} {item.ingredients?.unit}
                      </span>
                    </div>
                    {userRole === 'chef' && (
                      <span className="ingredient-cost">
                        {(item.amount * (item.ingredients?.current_price || 0)).toFixed(2)} €
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Allergens Card */}
          {recipe.allergens && recipe.allergens.length > 0 && (
            <div className="allergens-card">
              <h3>Allergene</h3>
              <div className="allergens-list">
                {recipe.allergens.map((allergen, index) => (
                  <span key={index} className="allergen-tag">
                    {allergen}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Modal */}
      {showVoiceModal && (
        <div className="modal-overlay" onClick={() => setShowVoiceModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Rezept ergänzen per Sprache</h3>
              <button className="btn-close" onClick={() => setShowVoiceModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="hint">
                Halte den Button gedrückt und sprich in Vietnamesisch, Deutsch oder Englisch.
              </p>
              <button className="voice-record-btn">
                <span className="pulse"></span>
                Halten zum Sprechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
