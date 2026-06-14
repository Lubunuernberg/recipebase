import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

export default function WeeklyMenu() {
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
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: member } = await supabase
        .from('team_members')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

      const [{ data: recipesData }, { data: menuData }] = await Promise.all([
        supabase.from('recipes').select('*').eq('restaurant_id', member.restaurant_id).order('name'),
        supabase.from('weekly_menu')
          .select('*, recipes(*)')
          .eq('date_range', selectedWeek)
          .eq('restaurant_id', member.restaurant_id)
      ])

      setRecipes(recipesData || [])
      setMenuItems(menuData || [])
    } catch (err) {
      console.error('Error loading weekly menu:', err)
    }
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
    
    const { data: { user } } = await supabase.auth.getUser()
    const { data: member } = await supabase
      .from('team_members')
      .select('restaurant_id')
      .eq('id', user.id)
      .single()

    const { error } = await supabase
      .from('weekly_menu')
      .insert({
        restaurant_id: member.restaurant_id,
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

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner" />
        <p>Wochenmenü wird geladen...</p>
      </div>
    )
  }

  const totalRevenue = menuItems.reduce((sum, item) => {
    return sum + ((item.recipes?.selling_price || 0) * (item.portions || 0))
  }, 0)

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <span className="eyebrow">PLANUNG</span>
          <h1>Wochen<span className="accent">Menü</span></h1>
        </div>
        <div>
          <input
            type="week"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              border: '1px solid var(--cream-dark)',
              borderRadius: '4px',
              background: 'var(--paper)',
              fontSize: '1rem'
            }}
          />
        </div>
      </header>

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
              maxWidth: '400px',
              width: '100%'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '1.5rem' }}>
              {DAYS[selectedDay]} - Gericht hinzufügen
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-field" style={{ marginBottom: '1rem' }}>
                <label>Rezept</label>
                <select
                  value={formData.recipe_id}
                  onChange={(e) => setFormData({...formData, recipe_id: e.target.value})}
                  style={{ width: '100%' }}
                  required
                >
                  <option value="">Wählen...</option>
                  {recipes.map(recipe => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.name} ({recipe.selling_price?.toFixed(2)} €)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field" style={{ marginBottom: '1.5rem' }}>
                <label>Portionen</label>
                <input
                  type="number"
                  min="1"
                  value={formData.portions}
                  onChange={(e) => setFormData({...formData, portions: e.target.value})}
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
                  Hinzufügen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {DAYS.map((day, index) => {
          const dayMenu = getMenuForDay(index)
          const dayRevenue = dayMenu.reduce((sum, item) => {
            return sum + ((item.recipes?.selling_price || 0) * (item.portions || 0))
          }, 0)

          return (
            <div key={index} className="card" style={{ minHeight: '250px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--cream-dark)'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{day}</h3>
                <button 
                  onClick={() => handleAdd(index)}
                  className="btn-primary"
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  +
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dayMenu.map(item => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: 'var(--cream)',
                    borderRadius: '4px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>
                        {item.recipes?.name}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {item.portions} Port. | {((item.recipes?.selling_price || 0) * item.portions).toFixed(2)} €
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        fontSize: '1.25rem'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                
                {dayMenu.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
                    Keine Gerichte
                  </p>
                )}
              </div>

              {dayRevenue > 0 && (
                <div style={{
                  marginTop: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--cream-dark)',
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  color: 'var(--cognac)',
                  fontWeight: 500
                }}>
                  Tagesumsatz: {dayRevenue.toFixed(2)} €
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          Wochenübersicht
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--cognac)' }}>
              {menuItems.length}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Gerichte</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--cognac)' }}>
              {menuItems.reduce((sum, item) => sum + (item.portions || 0), 0)}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Portionen</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--cognac)' }}>
              {totalRevenue.toFixed(2)} €
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Umsatzpotenzial</div>
          </div>
        </div>
      </div>
    </div>
  )
}
