import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import RecipeForm from './RecipeForm'
import RecipeDetail from './RecipeDetail'

export default function Recipes({ user }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [detailRecipe, setDetailRecipe] = useState(null)

  useEffect(() => {
    loadRecipes()
  }, [])

  const loadRecipes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('name')

    if (!error) setRecipes(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Rezept wirklich löschen?')) return
    
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)

    if (!error) loadRecipes()
  }

  const handleEdit = (recipe) => {
    setEditingRecipe(recipe)
    setShowForm(true)
  }

  const handleNew = () => {
    setEditingRecipe(null)
    setShowForm(true)
  }

  const handleSave = () => {
    setShowForm(false)
    setEditingRecipe(null)
    loadRecipes()
  }

  const handleView = (recipe) => {
    setDetailRecipe(recipe)
  }

  if (loading) return <div style={styles.loading}>Laden...</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Rezepte</h1>
        <button onClick={handleNew} style={styles.addBtn}>
          + Neues Rezept
        </button>
      </div>

      {showForm && (
        <RecipeForm
          recipe={editingRecipe}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditingRecipe(null)
          }}
        />
      )}

      {detailRecipe && (
        <RecipeDetail
          recipe={detailRecipe}
          onClose={() => setDetailRecipe(null)}
          onUpdate={loadRecipes}
        />
      )}

      <div style={styles.grid}>
        {recipes.map(recipe => (
          <div key={recipe.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>{recipe.name}</h3>
              <div style={styles.actions}>
                <button 
                  onClick={() => handleView(recipe)} 
                  style={styles.actionBtn}
                  title="Anzeigen"
                >
                  👁️
                </button>
                <button 
                  onClick={() => handleEdit(recipe)} 
                  style={styles.actionBtn}
                  title="Bearbeiten"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => handleDelete(recipe.id)} 
                  style={{...styles.actionBtn, color: 'var(--color-danger)'}}
                  title="Löschen"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <p style={styles.category}>{recipe.category}</p>
            <p style={styles.description}>{recipe.description}</p>
            
            <div style={styles.meta}>
              <span>⏱️ {recipe.prep_time} min</span>
              <span>💰 {recipe.sell_price}€</span>
              <span>👥 {recipe.portions} Port.</span>
            </div>
          </div>
        ))}
      </div>

      {recipes.length === 0 && (
        <div style={styles.empty}>
          <p>Noch keine Rezepte vorhanden.</p>
          <button onClick={handleNew} style={styles.emptyBtn}>
            Erstes Rezept anlegen
          </button>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: '1200px' },
  loading: { padding: '2rem', textAlign: 'center' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  title: { fontSize: '1.5rem', fontWeight: 700 },
  addBtn: {
    background: 'var(--color-accent)',
    color: 'white',
    padding: '0.75rem 1.25rem',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    border: '1px solid var(--color-border)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.5rem',
  },
  cardTitle: { 
    fontSize: '1.125rem', 
    fontWeight: 600,
    flex: 1,
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0.25rem',
  },
  category: { 
    color: 'var(--color-accent)', 
    fontSize: '0.875rem', 
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  description: { 
    color: 'var(--color-text-muted)', 
    fontSize: '0.875rem', 
    marginBottom: '1rem',
    lineHeight: 1.5,
  },
  meta: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
  },
  empty: { 
    textAlign: 'center', 
    padding: '3rem', 
    color: 'var(--color-text-muted)',
  },
  emptyBtn: {
    marginTop: '1rem',
    background: 'var(--color-accent)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
  },
}
