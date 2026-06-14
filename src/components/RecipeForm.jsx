import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RecipeForm({ onClose, onSaved }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [ingredients, setIngredients] = useState([])
  const [recipeIngredients, setRecipeIngredients] = useState([])
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    original_name: '',
    category: 'Hauptgericht',
    portions: 4,
    description: '',
    selling_price: '',
    steps: [''],
    image_url: ''
  })

  useEffect(() => {
    loadIngredients()
  }, [])

  const loadIngredients = async () => {
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

      setIngredients(data || [])
    } catch (err) {
      console.error('Error loading ingredients:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: member } = await supabase
        .from('team_members')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

      // Rezept speichern
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          restaurant_id: member.restaurant_id,
          name: formData.name,
          original_name: formData.original_name || null,
          category: formData.category,
          portions: parseInt(formData.portions) || 4,
          description: formData.description,
          selling_price: parseFloat(formData.selling_price) || 0,
          steps: formData.steps.filter(s => s.trim()),
          image_url: formData.image_url || null
        })
        .select()
        .single()

      if (recipeError) throw recipeError

      // Zutaten verknüpfen
      for (const ri of recipeIngredients) {
        if (ri.ingredient_id && ri.amount > 0) {
          await supabase.from('recipe_ingredients').insert({
            recipe_id: recipe.id,
            ingredient_id: ri.ingredient_id,
            amount: parseFloat(ri.amount)
          })
        }
      }

      if (onSaved) {
        onSaved(recipe)
      } else {
        navigate(`/recipe/${recipe.id}`)
      }

    } catch (err) {
      console.error('Error saving recipe:', err)
      alert('Fehler beim Speichern: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

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

      setFormData({ ...formData, image_url: publicUrl })
    } catch (err) {
      console.error('Upload error:', err)
      alert('Fehler beim Hochladen: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const addIngredient = () => {
    setRecipeIngredients([...recipeIngredients, { ingredient_id: '', amount: '' }])
  }

  const updateIngredient = (index, field, value) => {
    const updated = [...recipeIngredients]
    updated[index][field] = value
    setRecipeIngredients(updated)
  }

  const removeIngredient = (index) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index))
  }

  const addStep = () => {
    setFormData({ ...formData, steps: [...formData.steps, ''] })
  }

  const updateStep = (index, value) => {
    const updated = [...formData.steps]
    updated[index] = value
    setFormData({ ...formData, steps: updated })
  }

  const removeStep = (index) => {
    setFormData({ ...formData, steps: formData.steps.filter((_, i) => i !== index) })
  }

  return (
    <div className="recipe-form-container" style={{ padding: '2rem', maxWidth: '800px' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <span className="eyebrow">REZEPT</span>
        <h1>Neues <span className="accent">Rezept</span> anlegen</h1>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Grunddaten */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
            Grunddaten
          </h3>
          
          <div className="form-field" style={{ marginBottom: '1rem' }}>
            <label>Rezeptbild</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {formData.image_url ? (
                <img 
                  src={formData.image_url} 
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
                {formData.image_url && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Phở Bò"
                required
              />
            </div>
            
            <div className="form-field">
              <label>Originalname (optional)</label>
              <input
                type="text"
                value={formData.original_name}
                onChange={(e) => setFormData({ ...formData, original_name: e.target.value })}
                placeholder="z.B. phở bò"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-field">
              <label>Kategorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                value={formData.portions}
                onChange={(e) => setFormData({ ...formData, portions: e.target.value })}
              />
            </div>
            
            <div className="form-field">
              <label>Verkaufspreis (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-field" style={{ marginTop: '1rem' }}>
            <label>Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Kurze Beschreibung des Gerichts..."
              rows="3"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Zutaten */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              Zutaten
            </h3>
            <button type="button" className="btn-secondary" onClick={addIngredient}>
              + Zutat hinzufügen
            </button>
          </div>

          {recipeIngredients.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Noch keine Zutaten hinzugefügt
            </p>
          )}

          {recipeIngredients.map((ri, index) => (
            <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', alignItems: 'flex-end' }}>
              <div className="form-field" style={{ flex: 2 }}>
                <label>Zutat</label>
                <select
                  value={ri.ingredient_id}
                  onChange={(e) => updateIngredient(index, 'ingredient_id', e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Wählen...</option>
                  {ingredients.map(ing => (
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

        {/* Zubereitung */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              Zubereitung
            </h3>
            <button type="button" className="btn-secondary" onClick={addStep}>
              + Schritt
            </button>
          </div>

          {formData.steps.map((step, index) => (
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

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onClose ? onClose() : navigate('/recipes')}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !formData.name}
          >
            {loading ? 'Wird gespeichert...' : 'Rezept speichern'}
          </button>
        </div>
      </form>
    </div>
  )
}
