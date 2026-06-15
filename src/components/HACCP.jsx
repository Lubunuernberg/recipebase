import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function HACCP({ userRole }) {
  const [activeTab, setActiveTab] = useState('temperatures')
  const [temperatures, setTemperatures] = useState([])
  const [cleaning, setCleaning] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTempForm, setShowTempForm] = useState(false)
  const [showCleaningForm, setShowCleaningForm] = useState(false)
  const [tempForm, setTempForm] = useState({
    location: '',
    target_temp: 0,
    actual_temp: 0,
    notes: ''
  })
  const [cleaningForm, setCleaningForm] = useState({
    area: '',
    task: '',
    frequency: 'täglich'
  })

  const locations = ['Kühlhaus A', 'Kühlhaus B', 'Gefrierschrank', 'Kühltheke', 'Warmhalteschrank', 'Vorratskammer']
  const frequencies = ['täglich', 'wöchentlich', 'monatlich', 'nach Bedarf']

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: member } = await supabase
        .from('team_members')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()
      
      const [{ data: tempData }, { data: cleaningData }] = await Promise.all([
        supabase.from('haccp_temperatures')
          .select('*')
          .eq('restaurant_id', member.restaurant_id)
          .order('checked_at', { ascending: false })
          .limit(50),
        supabase.from('haccp_cleaning')
          .select('*')
          .eq('restaurant_id', member.restaurant_id)
          .order('next_due', { ascending: true })
      ])

      setTemperatures(tempData || [])
      setCleaning(cleaningData || [])
    } catch (err) {
      console.error('Error loading HACCP data:', err)
    }
    setLoading(false)
  }

  const submitTemperature = async (e) => {
    e.preventDefault()
    
    const { data: { user } } = await supabase.auth.getUser()
    const { data: member } = await supabase
      .from('team_members')
      .select('restaurant_id')
      .eq('id', user.id)
      .single()
    
    await supabase.from('haccp_temperatures').insert({
      restaurant_id: member.restaurant_id,
      location: tempForm.location,
      target_temp: parseFloat(tempForm.target_temp),
      actual_temp: parseFloat(tempForm.actual_temp),
      notes: tempForm.notes,
      checked_by: user.id
    })

    setShowTempForm(false)
    setTempForm({ location: '', target_temp: 0, actual_temp: 0, notes: '' })
    loadData()
  }

  const submitCleaning = async (e) => {
    e.preventDefault()
    
    const { data: { user } } = await supabase.auth.getUser()
    const { data: member } = await supabase
      .from('team_members')
      .select('restaurant_id')
      .eq('id', user.id)
      .single()

    await supabase.from('haccp_cleaning').insert({
      restaurant_id: member.restaurant_id,
      area: cleaningForm.area,
      task: cleaningForm.task,
      frequency: cleaningForm.frequency,
      is_completed: false
    })

    setShowCleaningForm(false)
    setCleaningForm({ area: '', task: '', frequency: 'täglich' })
    loadData()
  }

  const markCleaningDone = async (id) => {
    const { data: { user } } = await supabase.auth.getUser()
    const task = cleaning.find(c => c.id === id)
    
    await supabase
      .from('haccp_cleaning')
      .update({
        last_cleaned: new Date().toISOString(),
        next_due: calculateNextDue(task?.frequency),
        is_completed: true,
        done_by: user.id
      })
      .eq('id', id)

    loadData()
  }

  const calculateNextDue = (frequency) => {
    const now = new Date()
    switch(frequency) {
      case 'täglich': now.setDate(now.getDate() + 1); break
      case 'wöchentlich': now.setDate(now.getDate() + 7); break
      case 'monatlich': now.setMonth(now.getMonth() + 1); break
      default: now.setDate(now.getDate() + 1)
    }
    return now.toISOString()
  }

  const getTempStatus = (actual, target) => {
    const diff = Math.abs(actual - target)
    if (diff <= 2) return { color: '#2d6a4f', icon: '✓', label: 'OK' }
    if (diff <= 5) return { color: '#b35900', icon: '⚠', label: 'Warnung' }
    return { color: '#a04444', icon: '✕', label: 'Kritisch' }
  }

  const getDaysUntil = (date) => {
    const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))
    return days
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner" />
        <p>HACCP wird geladen...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <span className="eyebrow">HYGIENE</span>
          <h1>HACCP <span className="accent">Kontrolle</span></h1>
        </div>
      </header>

      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem',
        borderBottom: '1px solid var(--cream-dark)',
        paddingBottom: '1rem'
      }}>
        <button
          onClick={() => setActiveTab('temperatures')}
          className={activeTab === 'temperatures' ? 'btn-primary' : 'btn-secondary'}
        >
          🌡 Temperaturen
        </button>
        <button
          onClick={() => setActiveTab('cleaning')}
          className={activeTab === 'cleaning' ? 'btn-primary' : 'btn-secondary'}
        >
          🧽 Reinigung
        </button>
      </div>

      {activeTab === 'temperatures' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              Temperaturkontrollen
            </h3>
            <button onClick={() => setShowTempForm(true)} className="btn-primary">
              + Messung
            </button>
          </div>

          {showTempForm && (
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
            onClick={() => setShowTempForm(false)}
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
                <h3 style={{ marginBottom: '1.5rem' }}>Temperatur messen</h3>
                
                <form onSubmit={submitTemperature}>
                  <div className="form-field" style={{ marginBottom: '1rem' }}>
                    <label>Ort</label>
                    <select
                      value={tempForm.location}
                      onChange={(e) => setTempForm({...tempForm, location: e.target.value})}
                      style={{ width: '100%' }}
                      required
                    >
                      <option value="">Wählen...</option>
                      {locations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-field">
                      <label>Soll-Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={tempForm.target_temp}
                        onChange={(e) => setTempForm({...tempForm, target_temp: e.target.value})}
                        style={{ width: '100%' }}
                      />
                    </div>
                    
                    <div className="form-field">
                      <label>Ist-Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={tempForm.actual_temp}
                        onChange={(e) => setTempForm({...tempForm, actual_temp: e.target.value})}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div className="form-field" style={{ marginBottom: '1.5rem' }}>
                    <label>Notizen</label>
                    <input
                      type="text"
                      value={tempForm.notes}
                      onChange={(e) => setTempForm({...tempForm, notes: e.target.value})}
                      style={{ width: '100%' }}
                      placeholder="z.B. Tür offen gestanden"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" onClick={() => setShowTempForm(false)} className="btn-secondary" style={{ flex: 1 }}>
                      Abbrechen
                    </button>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                      Speichern
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {temperatures.map(temp => {
              const status = getTempStatus(temp.actual_temp, temp.target_temp)
              return (
                <div key={temp.id} className="card" style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.5rem'
                }}>
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{temp.location}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {new Date(temp.checked_at).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {temp.notes && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        {temp.notes}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Soll</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem' }}>{temp.target_temp}°C</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ist</div>
                      <div style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '1.125rem', 
                        fontWeight: 600,
                        color: status.color 
                      }}>
                        {temp.actual_temp}°C
                      </div>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      background: status.color,
                      color: 'white'
                    }}>
                      {status.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'cleaning' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              Reinigungsplan
            </h3>
            <button onClick={() => setShowCleaningForm(true)} className="btn-primary">
              + Aufgabe
            </button>
          </div>

          {showCleaningForm && (
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
            onClick={() => setShowCleaningForm(false)}
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
                <h3 style={{ marginBottom: '1.5rem' }}>Reinigungsaufgabe</h3>
                
                <form onSubmit={submitCleaning}>
                  <div className="form-field" style={{ marginBottom: '1rem' }}>
                    <label>Bereich</label>
                    <input
                      type="text"
                      value={cleaningForm.area}
                      onChange={(e) => setCleaningForm({...cleaningForm, area: e.target.value})}
                      style={{ width: '100%' }}
                      placeholder="z.B. Küche, Lager"
                      required
                    />
                  </div>

                  <div className="form-field" style={{ marginBottom: '1rem' }}>
                    <label>Aufgabe</label>
                    <input
                      type="text"
                      value={cleaningForm.task}
                      onChange={(e) => setCleaningForm({...cleaningForm, task: e.target.value})}
                      style={{ width: '100%' }}
                      placeholder="z.B. Böden wischen"
                      required
                    />
                  </div>

                  <div className="form-field" style={{ marginBottom: '1.5rem' }}>
                    <label>Häufigkeit</label>
                    <select
                      value={cleaningForm.frequency}
                      onChange={(e) => setCleaningForm({...cleaningForm, frequency: e.target.value})}
                      style={{ width: '100%' }}
                    >
                      {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" onClick={() => setShowCleaningForm(false)} className="btn-secondary" style={{ flex: 1 }}>
                      Abbrechen
                    </button>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                      Erstellen
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {cleaning.map(task => {
              const daysUntil = task.next_due ? getDaysUntil(task.next_due) : null
              const isOverdue = daysUntil && daysUntil < 0
              
              return (
                <div key={task.id} className="card" style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.5rem'
                }}>
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{task.area}</div>
                    <div style={{ fontSize: '0.875rem' }}>{task.task}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {task.frequency}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {task.is_completed ? (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: '#2d6a4f',
                        color: 'white'
                      }}>
                        ✓ Erledigt
                      </span>
                    ) : (
                      <>
                        {daysUntil !== null && (
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            background: isOverdue ? '#a04444' : daysUntil <= 1 ? '#b35900' : '#2d6a4f',
                            color: 'white'
                          }}>
                            {isOverdue ? `${Math.abs(daysUntil)} Tage überfällig` : daysUntil <= 1 ? 'Heute fällig' : `${daysUntil} Tage`}
                          </span>
                        )}
                        <button 
                          onClick={() => markCleaningDone(task.id)}
                          className="btn-primary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        >
                          Erledigt
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
