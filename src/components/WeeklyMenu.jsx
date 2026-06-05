import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

export default function WeeklyMenu({ user }) {
  const [recipes, setRecipes] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek())
  const [showForm, setShowForm] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)
  const [formData, setFormData] = useState({
    recipe_id: '',
    portions: 10
  })

  function getCurrentWeek() {
    const now = new Date()
    const year = now.getFullYear()
    const week = getWeekNumber(now)
    return `${year}-W${week.toString().padStart(2, '0')}`
  }

  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
    return weekNo
  }

  useEffect(() => {
    loadData()
  }, [selectedWeek])

  const loadData = async () => {
    setLoading(true)
    
    const [{ data: recipesData }, { data: menuData }] = await Promise.all([
      supabase.from('recipes').select('*').eq('is_active', true).order('name'),
      supabase.from('weekly_menu')
        .select('*, recipes(*)')
        .eq('date_range', selectedWeek)
    ])

    setRecipes(recipesData || [])
    setMenuItems(menuData || [])
    setLoading(false)
  }

  const getMenuForDay = (dayIndex) => {
    return menuItems.filter(item => item.day_of_week === dayIndex)
  }

  const handleAdd = (dayIndex) => {
    setSelectedDay(dayIndex)
    setFormData({ recipe_id: '', portions: 10 })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    const { data: memberData } = await supabase
      .from('team_members')
      .select('restaurant_id')
      .eq('id', currentUser.id)
      .single()

    const { error } = await supabase
      .from('weekly_menu')
      .insert({
        restaurant_id: memberData.restaurant_id,
        recipe_id: formData.recipe_id,
        day_of_week: selectedDay,
        portions: parseInt(formData.portions),
        date_range: selectedWeek
      })

    if (!error) {
      setShowForm(false)
      loadData()
    }
  }

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from('weekly_menu')
      .delete()
      .eq('id', id)

    if (!error) loadData()
  }

  const calculateShoppingList = () => {
    const needed = {}
    
    menuItems.forEach(menuItem => {
      const recipe = menuItem.recipes
      const factor = menuItem.portions / (recipe.portions || 1)
      
      // This would need recipe_ingredients data
      // Simplified for now
    })
    
    return needed
  }

  if (loading) return <div style={styles.loading}>Laden...</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Wochenmenü</h1>
        <div style={styles.weekSelector}>
          <input
            type="week"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            style={styles.weekInput}
          />
        </div>
      </div>

      {showForm && (
        <div style={styles.formOverlay}>
          <div style={styles.formModal}>
            <h3 style={styles.formTitle}>{DAYS[selectedDay]} - Gericht hinzufügen</h3>
            
            <form onSubmit={handleSubmit}>
              <div style={styles.formField}>
                <label>Rezept</label>
                <select
                  value={formData.recipe_id}
                  onChange={(e) => setFormData({...formData, recipe_id: e.target.value})}
                  style={styles.input}
                  required
                >
                  <option value="">Wählen...</option>
                  {recipes.map(recipe => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.name} ({recipe.sell_price}€)
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formField}>
                <label>Portionen</label>
                <input
                  type="number"
                  min="1"
                  value={formData.portions}
                  onChange={(e) => setFormData({...formData, portions: e.target.value})}
                  style={styles.input}
                />
              </div>

              <div style={styles.formButtons}>
                <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>
                  Abbrechen
                </button>
                <button type="submit" style={styles.saveBtn}>
                  Hinzufügen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={styles.weekGrid}>
        {DAYS.map((day, index) => {
          const dayMenu = getMenuForDay(index)
          return (
            <div key={index} style={styles.dayCard}>
              <div style={styles.dayHeader}>
                <h3 style={styles.dayTitle}>{day}</h3>
                <button 
                  onClick={() => handleAdd(index)}
                  style={styles.addBtn}
                >
                  +
                </button>
              </div>

              <div style={styles.dayContent}>
                {dayMenu.map(item => (
                  <div key={item.id} style={styles.menuItem}>
                    <div style={styles.menuInfo}>
                      <span style={styles.menuName}>{item.recipes?.name}</span>
                      <span style={styles.menuPortions}>{item.portions} Port.</span>
                    </div>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      style={styles.deleteBtn}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                
                {dayMenu.length === 0 && (
                  <p style={styles.empty}>Keine Gerichte</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={styles.summary}>
        <h3 style={styles.summaryTitle}>Wochenübersicht</h3>
        <div style={styles.summaryStats}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryValue}>{menuItems.length}</span>
            <span style={styles.summaryLabel}>Gerichte</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryValue}>
              {menuItems.reduce((sum, item) => sum + (item.portions || 0), 0)}
            </span>
            <span style={styles.summaryLabel}>Portionen</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryValue}>
              {menuItems.reduce((sum, item) => sum + ((item.recipes?.sell_price || 0) * (item.portions || 0)), 0).toFixed(2)}€
            </span>
            <span style={styles.summaryLabel}>Umsatzpotenzial</span>
          </div>
        </div>
      </div>
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
  weekSelector: {},
  weekInput: {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem',
    color: 'var(--color-text)',
    fontSize: '1rem',
  },
  formOverlay: {
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
  },
  formModal: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
  },
  formTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    marginBottom: '1.5rem',
  },
  formField: {
    marginBottom: '1rem',
  },
  input: {
    width: '100%',
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem',
    color: 'var(--color-text)',
    fontSize: '1rem',
    marginTop: '0.25rem',
  },
  formButtons: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  cancelBtn: {
    flex: 1,
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem',
    color: 'var(--color-text)',
    cursor: 'pointer',
  },
  saveBtn: {
    flex: 1,
    background: 'var(--color-accent)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 600,
  },
  weekGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  dayCard: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    minHeight: '200px',
  },
  dayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    borderBottom: '1px solid var(--color-border)',
  },
  dayTitle: {
    fontSize: '1rem',
    fontWeight: 600,
  },
  addBtn: {
    background: 'var(--color-accent)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    fontSize: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayContent: {
    padding: '0.75rem',
  },
  menuItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-md)',
    marginBottom: '0.5rem',
  },
  menuInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  menuName: {
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  menuPortions: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-danger)',
    cursor: 'pointer',
    padding: '0.25rem',
  },
  empty: {
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '0.875rem',
    padding: '1rem',
  },
  summary: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    border: '1px solid var(--color-border)',
  },
  summaryTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  summaryStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
  },
  summaryItem: {
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--color-accent)',
  },
  summaryLabel: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
  },
}
