import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Recipes({ user }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div style={styles.loading}>Laden...</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Rezepte</h1>
        <button style={styles.addBtn}>+ Neues Rezept</button>
      </div>

      <div style={styles.grid}>
        {recipes.map(recipe => (
          <div key={recipe.id} style={styles.card}>
            <h3 style={styles.cardTitle}>{recipe.name}</h3>
            <p style={styles.category}>{recipe.category}</p>
            <p style={styles.description}>{recipe.description}</p>
            <div style={styles.meta}>
              <span>⏱️ {recipe.prep_time} min</span>
              <span>💰 {recipe.sell_price}€</span>
            </div>
          </div>
        ))}
      </div>

      {recipes.length === 0 && (
        <p style={styles.empty}>Noch keine Rezepte vorhanden.</p>
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    border: '1px solid var(--color-border)',
  },
  cardTitle: { fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' },
  category: { color: 'var(--color-accent)', fontSize: '0.875rem', marginBottom: '0.5rem' },
  description: { color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' },
  meta: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
  },
  empty: { textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' },
}
