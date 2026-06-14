import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { exportRecipeToPDF } from './RecipePDF'

export default function RecipeDetail({ userRole }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [allIngredients, setAllIngredients] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) {
      loadRecipe()
      loadAllIngredients()
    }
  }, [id])

  const loadAllIngredients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: member } = await supabase
        .from('team_members')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

      const { data } = await supabase
        .from('ingredients')
        .select('*')
        .eq('restaurant_id', member.restaurant_id)
        .order('name')

      setAllIngredients(data || [])
    } catch (err) {
      console.error('Error loading ingredients:', err)
    }
  }

  const loadRecipe = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()
      
      if (recipeError) throw recipeError
      
      const { data: ingredientsData } = await supabase
        .from('recipe_ingredients')
        .select(`
          id,
          ingredient_id,
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
      setEditForm({
        name: recipeData.name,
        original_name: recipeData.original_name || '',
        category: recipeData.category || 'Hauptgericht',
        portions: recipeData.portions || 4,
        description: recipeData.description || '',
        selling_price: recipeData.selling_price || '',
        steps: recipeData.steps?.length > 0 ? recipeData.steps : [''],
        image_url: recipeData.image_url || ''
      })
    } catch (err) {
      console.error('Error loading recipe:', err)
      setError('Rezept konnte nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (formData, recipeIngredients) => {
    setSaving(true)
    try {
      const { error: updateError } = await supabase
        .from('recipes')
        .update({
          name: formData.name,
          original_name: formData.original_name || null,
          category: formData.category,
          portions: parseInt(formData.portions) || 4,
          description: formData.description,
          selling_price: parseFloat(formData.selling_price) || 0,
          steps: formData.steps.filter(s => s.trim()),
          image_url: formData.image_url || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) throw updateError

      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)

      for (const ri of recipeIngredients) {
        if (ri.ingredient_id && ri.amount > 0) {
          await supabase.from('recipe_ingredients').insert({
            recipe_id: id,
            ingredient_id: ri.ingredient_id,
            amount: parseFloat(ri.amount)
          })
        }
      }

      await loadRecipe()
      setIsEditing(false)
    } catch (err) {
      console.error('Error updating recipe:', err)
      alert('Fehler beim Speichern: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Rezept wirklich löschen?')) return
    
    try {
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)
      await supabase.from('recipes').delete().eq('id', id)
      navigate('/recipes')
    } catch (err) {
      console.error('Error deleting recipe:', err)
      alert('Fehler beim Löschen: ' + err.message)
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
      {isEditing ? (
        <RecipeEditForm 
          recipe={editForm}
          setRecipe={setEditForm}
          recipeIngredients={ingredients}
          allIngredients={allIngredients}
          onCancel={() => setIsEditing(false)}
          onSave={handleUpdate}
          saving={saving}
        />
      ) : (
        <>
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
          <button className="btn-secondary" onClick={() => exportRecipeToPDF(recipe, ingredients)}>
            📄 PDF Export
          </button>
          {userRole === 'chef' && (
            <>
              <button className="btn-primary" onClick={() => setIsEditing(true)}>
                Bearbeiten
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                Löschen
              </button>
            </>
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
        </>
      )}
    </div>
  )
}

function RecipeEditForm({ recipe, setRecipe, recipeIngredients, allIngredients, onCancel, onSave, saving }) {
  const [localIngredients, setLocalIngredients] = useState([])
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    setLocalIngredients(recipeIngredients.map(ri => ({
      id: ri.id,
      ingredient_id: ri.ingredient_id || ri.ingredients?.id,
      amount: ri.amount
    })))
  }, [recipeIngredients])

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(fileName)

      setRecipe({ ...recipe, image_url: publicUrl })
    } catch (err) {
      console.error('Upload error:', err)
      alert('Fehler beim Hochladen: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const addIngredient = () => {
    setLocalIngredients([...localIngredients, { ingredient_id: '', amount: '' }])
  }

  const updateIngredient = (index, field, value) => {
    const updated = [...localIngredients]
    updated[index][field] = value
    setLocalIngredients(updated)
  }

  const removeIngredient = (index) => {
    setLocalIngredients(localIngredients.filter((_, i) => i !== index))
  }

  const addStep = () => {
    setRecipe({ ...recipe, steps: [...recipe.steps, ''] })
  }

  const updateStep = (index, value) => {
    const updated = [...recipe.steps]
    updated[index] = value
    setRecipe({ ...recipe, steps: updated })
  }

  const removeStep = (index) => {
    setRecipe({ ...recipe, steps: recipe.steps.filter((_, i) => i !== index) })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(recipe, localIngredients)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <span className="eyebrow">REZEPT BEARBEITEN</span>
          <h1>{recipe.name}</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
            Grunddaten
          </h3>
          
          <div className="form-field" style={{ marginBottom: '1rem' }}>
            <label>Rezeptbild</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {recipe.image_url ? (
                <img 
                  src={recipe.image_url} 
                  alt="Vorschau" 
                  style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                />
              ) : (
                <div style={{ 
                  width: '120px', 
                  height: '80px', 
                  background: 'var(--cream)', 
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)'
                }}>
                  Kein Bild
                </div>
              )}
              <div>
                <label 
                  className="btn-secondary"
                  style={{ cursor: 'pointer', display: 'inline-block' }}
                >
                  {uploadingImage ? 'Lädt...' : 'Bild hochladen'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    disabled={uploadingImage}
                  />
                </label>
                {recipe.image_url && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => setRecipe({ ...recipe, image_url: '' })}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    Entfernen
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-field">
              <label>Name (Deutsch) *</label>
              <input
                type="text"
                value={recipe.name}
                onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                placeholder="z.B. Phở Bò"
                required
              />
            </div>
            
            <div className="form-field">
              <label>Originalname (optional)</label>
              <input
                type="text"
                value={recipe.original_name}
                onChange={(e) => setRecipe({ ...recipe, original_name: e.target.value })}
                placeholder="z.B. phở bò"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-field">
              <label>Kategorie</label>
              <select
                value={recipe.category}
                onChange={(e) => setRecipe({ ...recipe, category: e.target.value })}
              >
                <option value="Vorspeise">Vorspeise</option>
                <option value="Hauptgericht">Hauptgericht</option>
                <option value="Nachspeise">Nachspeise</option>
                <option value="Beilage">Beilage</option>
              </select>
            </div>
            
            <div className="form-field">
              <label>Portionen</label>
              <input
                type="number"
                min="1"
                value={recipe.portions}
                onChange={(e) => setRecipe({ ...recipe, portions: e.target.value })}
              />
            </div>
            
            <div className="form-field">
              <label>Verkaufspreis (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={recipe.selling_price}
                onChange={(e) => setRecipe({ ...recipe, selling_price: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-field" style={{ marginTop: '1rem' }}>
            <label>Beschreibung</label>
            <textarea
              value={recipe.description}
              onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
              placeholder="Kurze Beschreibung des Gerichts..."
              rows="3"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              Zutaten
            </h3>
            <button type="button" className="btn-secondary" onClick={addIngredient}>
              + Zutat hinzufügen
            </button>
          </div>

          {localIngredients.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Noch keine Zutaten hinzugefügt</p>
          )}

          {localIngredients.map((ri, index) => (
            <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', alignItems: 'flex-end' }}>
              <div className="form-field" style={{ flex: 2 }}>
                <label>Zutat</label>
                <select
                  value={ri.ingredient_id}
                  onChange={(e) => updateIngredient(index, 'ingredient_id', e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Wählen...</option>
                  {allIngredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} {ing.original_name && `(${ing.original_name})`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-field" style={{ flex: 1 }}>
                <label>Menge</label>
                <input
                  type="number"
                  step="0.1"
                  value={ri.amount}
                  onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                  placeholder="500"
                />
              </div>
              
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  padding: '0.5rem'
                }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              Zubereitung
            </h3>
            <button type="button" className="btn-secondary" onClick={addStep}>
              + Schritt
            </button>
          </div>

          {recipe.steps.map((step, index) => (
            <div key={index} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ 
                width: '28px', 
                height: '28px', 
                background: 'var(--cognac)', 
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '600',
                flexShrink: 0,
                marginTop: '0.5rem'
              }}>
                {index + 1}
              </span>
              <textarea
                value={step}
                onChange={(e) => updateStep(index, e.target.value)}
                placeholder={`Schritt ${index + 1}...`}
                rows="2"
                style={{ flex: 1, resize: 'vertical' }}
              />
              <button
                type="button"
                onClick={() => removeStep(index)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  padding: '0.5rem'
                }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving || !recipe.name}
          >
            {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
          </button>
        </div>
      </form>
    </div>
  )
}
