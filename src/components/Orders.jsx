import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Orders({ user }) {
  const [orders, setOrders] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    supplier_id: '',
    items: [{ ingredient_id: '', amount: 0, unit: 'kg' }]
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    const [{ data: ordersData }, { data: suppliersData }, { data: ingredientsData }] = await Promise.all([
      supabase.from('orders').select('*, suppliers(name), order_items(*)').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('ingredients').select('*').lte('current_stock', 'min_stock').order('name')
    ])

    setOrders(ordersData || [])
    setSuppliers(suppliersData || [])
    setLowStock(ingredientsData || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    const { data: memberData } = await supabase
      .from('team_members')
      .select('restaurant_id')
      .eq('id', currentUser.id)
      .single()

    // Create order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: memberData.restaurant_id,
        supplier_id: formData.supplier_id,
        status: 'draft'
      })
      .select()
      .single()

    if (!orderError && orderData) {
      // Add order items
      const items = formData.items
        .filter(item => item.ingredient_id && item.amount > 0)
        .map(item => ({
          order_id: orderData.id,
          ingredient_id: item.ingredient_id,
          amount: item.amount,
          unit: item.unit
        }))

      if (items.length > 0) {
        await supabase.from('order_items').insert(items)
      }

      setShowForm(false)
      setFormData({ supplier_id: '', items: [{ ingredient_id: '', amount: 0, unit: 'kg' }] })
      loadData()
    }
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ingredient_id: '', amount: 0, unit: 'kg' }]
    }))
  }

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index][field] = value
    setFormData(prev => ({ ...prev, items: newItems }))
  }

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'draft': return 'var(--color-text-muted)'
      case 'sent': return 'var(--color-warning)'
      case 'confirmed': return 'var(--color-success)'
      case 'delivered': return 'var(--color-accent)'
      case 'cancelled': return 'var(--color-danger)'
      default: return 'var(--color-text-muted)'
    }
  }

  const getStatusLabel = (status) => {
    switch(status) {
      case 'draft': return 'Entwurf'
      case 'sent': return 'Gesendet'
      case 'confirmed': return 'Bestätigt'
      case 'delivered': return 'Geliefert'
      case 'cancelled': return 'Storniert'
      default: return status
    }
  }

  if (loading) return <div style={styles.loading}>Laden...</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Bestellungen</h1>
        <button onClick={() => setShowForm(true)} style={styles.addBtn}>
          + Neue Bestellung
        </button>
      </div>

      {showForm && (
        <div style={styles.formOverlay}>
          <div style={styles.formModal}>
            <h3 style={styles.formTitle}>Bestellung erstellen</h3>
            
            <form onSubmit={handleSubmit}>
              <div style={styles.formField}>
                <label>Lieferant</label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                  style={styles.input}
                  required
                >
                  <option value="">Wählen...</option>
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formField}>
                <label style={{ marginBottom: '0.5rem', display: 'block' }}>Artikel</label>
                {formData.items.map((item, index) => (
                  <div key={index} style={styles.itemRow}>
                    <input
                      type="text"
                      placeholder="Artikel"
                      value={item.ingredient_id}
                      onChange={(e) => updateItem(index, 'ingredient_id', e.target.value)}
                      style={{...styles.input, flex: 2}}
                    />
                    <input
                      type="number"
                      placeholder="Menge"
                      value={item.amount}
                      onChange={(e) => updateItem(index, 'amount', e.target.value)}
                      style={{...styles.input, flex: 1}}
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      style={{...styles.input, flex: 0.5}}
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="ml">ml</option>
                      <option value="Stk">Stk</option>
                      <option value="Pack">Pack</option>
                    </select>
                    <button type="button" onClick={() => removeItem(index)} style={styles.removeItemBtn}>
                      ✕
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addItem} style={styles.addItemBtn}>
                  + Artikel hinzufügen
                </button>
              </div>

              <div style={styles.formButtons}>
                <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>
                  Abbrechen
                </button>
                <button type="submit" style={styles.saveBtn}>
                  Erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lowStock.length > 0 && (
        <div style={styles.alert}>
          <strong>⚠️ Niedriger Bestand:</strong> {lowStock.length} Zutaten müssen nachbestellt werden
        </div>
      )}

      <div style={styles.ordersList}>
        {orders.map(order => (
          <div key={order.id} style={styles.orderCard}>
            <div style={styles.orderHeader}>
              <div>
                <span style={styles.orderNumber}>Bestellung #{order.id.slice(-6).toUpperCase()}</span>
                <span style={{...styles.orderStatus, color: getStatusColor(order.status)}}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <span style={styles.orderDate}>
                {new Date(order.created_at).toLocaleDateString('de-DE')}
              </span>
            </div>
            
            <div style={styles.orderBody}>
              <p style={styles.supplierName}>
                📦 {order.suppliers?.name}
              </p>
              
              {order.order_items && order.order_items.length > 0 && (
                <p style={styles.itemCount}>
                  {order.order_items.length} Artikel
                </p>
              )}
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div style={styles.empty}>
            <p>Noch keine Bestellungen.</p>
            <button onClick={() => setShowForm(true)} style={styles.emptyBtn}>
              Erste Bestellung erstellen
            </button>
          </div>
        )}
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
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
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
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.75rem',
    color: 'var(--color-text)',
    fontSize: '1rem',
  },
  itemRow: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  removeItemBtn: {
    background: 'var(--color-danger)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    width: '36px',
    cursor: 'pointer',
  },
  addItemBtn: {
    background: 'transparent',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.5rem',
    color: 'var(--color-accent)',
    cursor: 'pointer',
    width: '100%',
    marginTop: '0.5rem',
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
  alert: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--color-danger)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem',
    marginBottom: '1.5rem',
    color: 'var(--color-danger)',
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  orderCard: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    padding: '1.25rem',
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  orderNumber: {
    fontWeight: 600,
    marginRight: '1rem',
  },
  orderStatus: {
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  orderDate: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
  },
  orderBody: {},
  supplierName: {
    fontSize: '1rem',
    marginBottom: '0.25rem',
  },
  itemCount: {
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
