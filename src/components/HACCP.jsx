import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function HACCP({ user }) {
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
    
    const [{ data: tempData }, { data: cleaningData }] = await Promise.all([
      supabase.from('haccp_temperatures').select('*').order('checked_at', { ascending: false }).limit(50),
      supabase.from('haccp_cleaning').select('*').order('next_due', { ascending: true })
    ])

    setTemperatures(tempData || [])
    setCleaning(cleaningData || [])
    setLoading(false)
  }

  const submitTemperature = async (e) => {
    e.preventDefault()
    
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    const { data: memberData } = await supabase
      .from('team_members')
      .select('restaurant_id')
      .eq('id', currentUser.id)
      .single()

    await supabase.from('haccp_temperatures').insert({
      restaurant_id: memberData.restaurant_id,
      location: tempForm.location,
      target_temp: parseFloat(tempForm.target_temp),
      actual_temp: parseFloat(tempForm.actual_temp),
      notes: tempForm.notes,
      checked_by: currentUser.id
    })

    setShowTempForm(false)
    setTempForm({ location: '', target_temp: 0, actual_temp: 0, notes: '' })
    loadData()
  }

  const submitCleaning = async (e) => {
    e.preventDefault()
    
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    const { data: memberData } = await supabase
      .from('team_members')
      .select('restaurant_id')
      .eq('id', currentUser.id)
      .single()

    await supabase.from('haccp_cleaning').insert({
      restaurant_id: memberData.restaurant_id,
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
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    await supabase
      .from('haccp_cleaning')
      .update({
        last_cleaned: new Date().toISOString(),
        next_due: calculateNextDue(cleaning.find(c => c.id === id)?.frequency),
        is_completed: true,
        done_by: currentUser.id
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
    if (diff <= 2) return { color: 'var(--color-success)', icon: '✓' }
    if (diff <= 5) return { color: 'var(--color-warning)', icon: '⚠️' }
    return { color: 'var(--color-danger)', icon: '❌' }
  }

  const getDaysUntil = (date) => {
    const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))
    return days
  }

  if (loading) return <div style={styles.loading}>Laden...</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>HACCP</h1>
      </div>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('temperatures')}
          style={{
            ...styles.tab,
            background: activeTab === 'temperatures' ? 'var(--color-accent)' : 'transparent'
          }}
        >
          🌡️ Temperaturen
        </button>
        <button
          onClick={() => setActiveTab('cleaning')}
          style={{
            ...styles.tab,
            background: activeTab === 'cleaning' ? 'var(--color-accent)' : 'transparent'
          }}
        >
          🧽 Reinigung
        </button>
      </div>

      {activeTab === 'temperatures' && (
        <div>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Temperaturkontrollen</h2>
            <button onClick={() => setShowTempForm(true)} style={styles.addBtn}>
              + Messung
            </button>
          </div>

          {showTempForm && (
            <div style={styles.formOverlay}>
              <div style={styles.formModal}>
                <h3>Temperatur messen</h3>
                
                <form onSubmit={submitTemperature}>
                  <div style={styles.formField}>
                    <label>Ort</label>
                    <select
                      value={tempForm.location}
                      onChange={(e) => setTempForm({...tempForm, location: e.target.value})}
                      style={styles.input}
                      required
                    >
                      <option value="">Wählen...</option>
                      {locations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  <div style={styles.row}>
                    <div style={styles.formField}>
                      <label>Soll-Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={tempForm.target_temp}
                        onChange={(e) => setTempForm({...tempForm, target_temp: e.target.value})}
                        style={styles.input}
                      />
                    </div>
                    
                    <div style={styles.formField}>
                      <label>Ist-Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={tempForm.actual_temp}
                        onChange={(e) => setTempForm({...tempForm, actual_temp: e.target.value})}
                        style={styles.input}
                      />
                    </div>
                  </div>

                  <div style={styles.formField}>
                    <label>Notizen</label>
                    <input
                      type="text"
                      value={tempForm.notes}
                      onChange={(e) => setTempForm({...tempForm, notes: e.target.value})}
                      style={styles.input}
                      placeholder="z.B. Tür offen gestanden"
                    />
                  </div>

                  <div style={styles.formButtons}>
                    <button type="button" onClick={() => setShowTempForm(false)} style={styles.cancelBtn}>
                      Abbrechen
                    </button>
                    <button type="submit" style={styles.saveBtn}>Speichern</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div style={styles.list}>
            {temperatures.map(temp => {
              const status = getTempStatus(temp.actual_temp, temp.target_temp)
              return (
                <div key={temp.id} style={styles.tempRow}>
                  <div style={styles.tempInfo}>
                    <span style={styles.tempLocation}>{temp.location}</span>
                    <span style={styles.tempDate}>
                      {new Date(temp.checked_at).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div style={styles.tempValues}>
                    <span style={styles.tempTarget}>Soll: {temp.target_temp}°C</span>
                    <span style={{...styles.tempActual, color: status.color}}>
                      {status.icon} Ist: {temp.actual_temp}°C
                    </span>
                  </div>

                  {temp.notes && <span style={styles.tempNotes}>{temp.notes}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'cleaning' && (
        <div>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Reinigungsplan</h2>
            <button onClick={() => setShowCleaningForm(true)} style={styles.addBtn}>
              + Aufgabe
            </button>
          </div>

          {showCleaningForm && (
            <div style={styles.formOverlay}>
              <div style={styles.formModal}>
                <h3>Reinigungsaufgabe erstellen</h3>
                
                <form onSubmit={submitCleaning}>
                  <div style={styles.formField}>
                    <label>Bereich</label>
                    <input
                      type="text"
                      value={cleaningForm.area}
                      onChange={(e) => setCleaningForm({...cleaningForm, area: e.target.value})}
                      style={styles.input}
                      placeholder="z.B. Küche, Lager"
                      required
                    />
                  </div>

                  <div style={styles.formField}>
                    <label>Aufgabe</label>
                    <input
                      type="text"
                      value={cleaningForm.task}
                      onChange={(e) => setCleaningForm({...cleaningForm, task: e.target.value})}
                      style={styles.input}
                      placeholder="z.B. Böden wischen"
                      required
                    />
                  </div>

                  <div style={styles.formField}>
                    <label>Häufigkeit</label>
                    <select
                      value={cleaningForm.frequency}
                      onChange={(e) => setCleaningForm({...cleaningForm, frequency: e.target.value})}
                      style={styles.input}
                    >
                      {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  <div style={styles.formButtons}>
                    <button type="button" onClick={() => setShowCleaningForm(false)} style={styles.cancelBtn}>
                      Abbrechen
                    </button>
                    <button type="submit" style={styles.saveBtn}>Erstellen</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div style={styles.list}>
            {cleaning.map(task => {
              const daysUntil = task.next_due ? getDaysUntil(task.next_due) : null
              const isOverdue = daysUntil && daysUntil < 0
              
              return (
                <div key={task.id} style={styles.cleaningRow}>
                  <div style={styles.cleaningInfo}>
                    <span style={styles.cleaningArea}>{task.area}</span>
                    <span style={styles.cleaningTask}>{task.task}</span>
                    <span style={styles.cleaningFreq}>{task.frequency}</span>
                  </div>

                  <div style={styles.cleaningStatus}>
                    {task.is_completed ? (
                      <span style={styles.completedBadge}>✓ Erledigt</span>
                    ) : (
                      <>
                        {daysUntil !== null && (
                          <span style={{
                            ...styles.dueBadge,
                            background: isOverdue ? 'var(--color-danger)' : daysUntil <= 1 ? 'var(--color-warning)' : 'var(--color-success)'
                          }}>
                            {isOverdue ? `${Math.abs(daysUntil)} Tage überfällig` : daysUntil <= 1 ? 'Heute fällig' : `${daysUntil} Tage`}
                          </span>
                        )}
                        <button 
                          onClick={() => markCleaningDone(task.id)}
                          style={styles.doneBtn}
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

const styles = {
  container: { maxWidth: '1200px' },
  loading: { padding: '2rem', textAlign: 'center' },
  header: {
    marginBottom: '1.5rem',
  },
  title: { fontSize: '1.5rem', fontWeight: 700 },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '1rem',
  },
  tab: {
    padding: '0.75rem 1.5rem',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    color: 'var(--color-text)',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
  },
  addBtn: {
    background: 'var(--color-accent)',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    fontSize: '0.875rem',
    cursor: 'pointer',
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
  formField: {
    marginBottom: '1rem',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  input: {
    width: '100%',
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem',
    color: 'var(--color-text)',
    fontSize: '1rem',
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
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  tempRow: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem',
    border: '1px solid var(--color-border)',
  },
  tempInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
  },
  tempLocation: {
    fontWeight: 500,
  },
  tempDate: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
  },
  tempValues: {
    display: 'flex',
    gap: '1rem',
  },
  tempTarget: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
  },
  tempActual: {
    fontWeight: 600,
  },
  tempNotes: {
    display: 'block',
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  cleaningRow: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem',
    border: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cleaningInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  cleaningArea: {
    fontWeight: 500,
  },
  cleaningTask: {
    fontSize: '0.875rem',
    color: 'var(--color-text)',
  },
  cleaningFreq: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
  },
  cleaningStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  completedBadge: {
    background: 'var(--color-success)',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
  },
  dueBadge: {
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
  },
  doneBtn: {
    background: 'var(--color-accent)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
}
