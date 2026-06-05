import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function InvoiceAnalyzer() {
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      // 1. Upload to Supabase Storage
      const fileName = `invoices/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName)

      // 3. Analyze with AI
      setAnalyzing(true)
      await analyzeInvoice(publicUrl, fileName)

    } catch (err) {
      setError('Fehler: ' + err.message)
    } finally {
      setUploading(false)
      setAnalyzing(false)
    }
  }

  const analyzeInvoice = async (imageUrl, fileName) => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    const { data: member } = await supabase
      .from('team_members')
      .select('restaurant_id')
      .eq('id', user.id)
      .single()

    // Call Supabase Edge Function for AI analysis
    const { data, error } = await supabase.functions.invoke('analyze-invoice', {
      body: { imageUrl }
    })

    if (error) throw error

    // Save to database
    await supabase.from('invoices').insert({
      restaurant_id: member.restaurant_id,
      file_name: fileName,
      image_url: imageUrl,
      supplier: data.supplier,
      total_amount: data.total,
      date: data.date,
      items: data.items,
      status: 'analyzed'
    })

    // Check for price changes
    await checkPriceChanges(data.items, member.restaurant_id)

    setResult(data)
  }

  const checkPriceChanges = async (items, restaurantId) => {
    for (const item of items) {
      const { data: existing } = await supabase
        .from('ingredients')
        .select('current_price')
        .eq('restaurant_id', restaurantId)
        .ilike('name', item.name)
        .single()

      if (existing && Math.abs(existing.current_price - item.price) > 0.01) {
        // Price changed - create alert
        await supabase.from('price_alerts').insert({
          restaurant_id: restaurantId,
          ingredient_name: item.name,
          old_price: existing.current_price,
          new_price: item.price,
          change_percent: ((item.price - existing.current_price) / existing.current_price * 100).toFixed(1)
        })
      }
    }
  }

  return (
    <div className="invoice-analyzer">
      <header className="page-header">
        <span className="eyebrow">RECHNUNGEN</span>
        <h1>Rechnungs-<span className="accent">Analyse</span></h1>
        <p className="subtitle">
          Fotografiere Rechnungen direkt ein. Die KI erkennt automatisch 
          Lieferant, Produkte, Mengen und Preise.
        </p>
      </header>

      <div className="upload-zone">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          accept="image/*,.pdf"
          style={{ display: 'none' }}
        />
        
        {!uploading && !analyzing && !result && (
          <button 
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="upload-icon">📷</span>
            <span className="upload-text">Rechnung fotografieren oder hochladen</span>
            <span className="upload-hint">Unterstützt: JPG, PNG, PDF</span>
          </button>
        )}

        {(uploading || analyzing) && (
          <div className="processing">
            <div className="spinner"></div>
            <span>{uploading ? 'Wird hochgeladen...' : 'KI analysiert...'}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {result && (
        <div className="result-card">
          <header className="result-header">
            <div>
              <span className="eyebrow">ERKANNT</span>
              <h3>{result.supplier || 'Lieferant unbekannt'}</h3>
            </div>
            <div className="result-total">
              <span className="total-label">Gesamtbetrag</span>
              <span className="total-amount">{result.total?.toFixed(2)} €</span>
            </div>
          </header>

          <table className="result-table">
            <thead>
              <tr>
                <th>Produkt</th>
                <th>Menge</th>
                <th>Einheit</th>
                <th>Preis</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {result.items?.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td>{item.price?.toFixed(2)} €</td>
                  <td>
                    <span className={`status ${item.matched ? 'matched' : 'new'}`}>
                      {item.matched ? '✓ Bekannt' : 'Neu'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="result-actions">
            <button className="btn-primary" onClick={() => setResult(null)}>
              Speichern
            </button>
            <button className="btn-secondary" onClick={() => setResult(null)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
