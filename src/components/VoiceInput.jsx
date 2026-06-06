import { useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const LANGUAGES = [
  { code: 'vi', name: 'Vietnamesisch', flag: '🇻🇳' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'Englisch', flag: '🇬🇧' },
  { code: 'zh', name: 'Chinesisch', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanisch', flag: '🇯🇵' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
]

// Demo-Modus - wenn true, werden Mock-Daten verwendet
const DEMO_MODE = true

export default function VoiceInput({ onRecipeCreated }) {
  const [isRecording, setIsRecording] = useState(false)
  const [selectedLang, setSelectedLang] = useState('vi')
  const [transcript, setTranscript] = useState('')
  const [structuredRecipe, setStructuredRecipe] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])
  const recordingInterval = useRef(null)

  const startRecording = async () => {
    try {
      setError(null)
      setTranscript('')
      setStructuredRecipe(null)
      audioChunks.current = []
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4'
      
      mediaRecorder.current = new MediaRecorder(stream, { mimeType })
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data)
        }
      }
      
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: mimeType })
        await processAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.current.start(100)
      setIsRecording(true)
      
      // Timer starten
      setRecordingTime(0)
      recordingInterval.current = setInterval(() => {
        setRecordingTime(t => t + 1)
      }, 1000)
      
    } catch (err) {
      console.error('Recording error:', err)
      setError('Mikrofon-Zugriff nicht möglich. Bitte Berechtigungen prüfen.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      setIsRecording(false)
      
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current)
      }
    }
  }

  const processAudio = async (audioBlob) => {
    setIsProcessing(true)
    
    try {
      if (DEMO_MODE) {
        // Demo-Modus: Simulierte Verzögerung
        await new Promise(r => setTimeout(r, 2000))
        
        const demoText = selectedLang === 'vi' 
          ? 'Phở bò, nấu với 500g bánh phở, 300g thịt bò, 2 lít nước dùng, hành, ngò, giá đỗ'
          : selectedLang === 'de'
          ? 'Pho Bo, Reisnudelsuppe mit Rindfleisch, 500g Reisnudeln, 300g Rindfleisch, 2 Liter Brühe, Zwiebeln, Koriander, Sprossen'
          : 'Pho Bo, beef noodle soup, 500g rice noodles, 300g beef, 2 liters broth, onions, cilantro, bean sprouts'
        
        setTranscript(demoText)
        
        // Demo-Strukturierung
        await new Promise(r => setTimeout(r, 1500))
        setStructuredRecipe({
          name: 'Phở Bò',
          original_name: 'phở bò',
          category: 'Hauptgericht',
          portions: 4,
          description: 'Traditionelle vietnamesische Reisnudelsuppe mit Rindfleisch',
          ingredients: [
            { name: 'Bánh phở', original_name: 'bánh phở', amount: 500, unit: 'g' },
            { name: 'Rindfleisch', original_name: 'thịt bò', amount: 300, unit: 'g' },
            { name: 'Rinderbrühe', original_name: 'nước dùng', amount: 2, unit: 'L' },
            { name: 'Zwiebeln', original_name: 'hành', amount: 3, unit: 'Stk' },
            { name: 'Koriander', original_name: 'ngò', amount: 1, unit: 'Bund' },
            { name: 'Sojasprossen', original_name: 'giá đỗ', amount: 200, unit: 'g' }
          ],
          steps: [
            'Brühe vorbereiten und aufkochen',
            'Nudeln nach Packungsanweisung kochen',
            'Rindfleisch in dünne Scheiben schneiden',
            'Zutaten in Schüsseln anrichten',
            'Mit heißer Brühe übergießen und servieren'
          ]
        })
        
      } else {
        // Produktiv-Modus mit Supabase Edge Functions
        const base64Audio = await blobToBase64(audioBlob)
        
        const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke('whisper-transcribe', {
          body: { audio: base64Audio, language: selectedLang }
        })
        
        if (transcribeError) throw transcribeError
        
        setTranscript(transcribeData.text)
        
        // Strukturierung
        const { data: structureData, error: structureError } = await supabase.functions.invoke('structure-recipe', {
          body: { text: transcribeData.text, language: selectedLang }
        })
        
        if (structureError) throw structureError
        
        setStructuredRecipe(structureData)
      }
      
    } catch (err) {
      console.error('Processing error:', err)
      setError('Fehler bei der Verarbeitung: ' + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result.toString().split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const saveRecipe = async () => {
    if (!structuredRecipe) return
    
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
          name: structuredRecipe.name,
          original_name: structuredRecipe.original_name,
          category: structuredRecipe.category,
          portions: structuredRecipe.portions,
          description: structuredRecipe.description,
          steps: structuredRecipe.steps
        })
        .select()
        .single()
      
      if (recipeError) throw recipeError
      
      // Zutaten verknüpfen
      for (const ing of structuredRecipe.ingredients) {
        // Existierende Zutat suchen oder neue erstellen
        const { data: existing } = await supabase
          .from('ingredients')
          .select('id')
          .eq('restaurant_id', member.restaurant_id)
          .ilike('name', ing.name)
          .maybeSingle()
        
        let ingredientId = existing?.id
        
        if (!ingredientId) {
          const { data: newIng } = await supabase
            .from('ingredients')
            .insert({
              restaurant_id: member.restaurant_id,
              name: ing.name,
              original_name: ing.original_name,
              unit: ing.unit || 'g',
              current_price: 0
            })
            .select()
            .single()
          
          ingredientId = newIng?.id
        }
        
        if (ingredientId) {
          await supabase.from('recipe_ingredients').insert({
            recipe_id: recipe.id,
            ingredient_id: ingredientId,
            amount: ing.amount
          })
        }
      }
      
      // Erfolg anzeigen und zurücksetzen
      setTranscript('')
      setStructuredRecipe(null)
      alert('Rezept erfolgreich gespeichert!')
      
      if (onRecipeCreated) {
        onRecipeCreated(recipe)
      }
      
    } catch (err) {
      setError('Fehler beim Speichern: ' + err.message)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="voice-input">
      <header className="page-header">
        <span className="eyebrow">SPRACHEINGABE</span>
        <h1>Rezept <span className="accent">einsprechen</span></h1>
        <p className="subtitle">
          Sprich dein Rezept ein. Die KI erkennt automatisch Zutaten, Mengen und Zubereitungsschritte.
          {DEMO_MODE && <span style={{ color: '#B8843E', display: 'block', marginTop: '0.5rem' }}>🎮 Demo-Modus aktiv</span>}
        </p>
      </header>

      {/* Sprach-Auswahl */}
      <div className="language-selector">
        <span className="selector-label">Sprache:</span>
        <div className="language-buttons">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`lang-btn ${selectedLang === lang.code ? 'active' : ''}`}
              onClick={() => !isRecording && setSelectedLang(lang.code)}
              disabled={isRecording}
            >
              <span className="flag">{lang.flag}</span>
              <span className="lang-name">{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Aufnahme-Bereich */}
      <div className={`recording-area ${isRecording ? 'recording' : ''}`}>
        {!isRecording && !isProcessing && !transcript && (
          <button className="record-btn" onClick={startRecording}>
            <div className="record-circle">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </div>
            <span className="record-text">Tippen zum Aufnehmen</span>
            <span className="record-hint">Halten für Push-to-Talk</span>
          </button>
        )}

        {isRecording && (
          <button className="record-btn recording" onClick={stopRecording}>
            <div className="record-circle active">
              <div className="recording-indicator">
                <span className="pulse"></span>
                <span className="pulse delay"></span>
              </div>
            </div>
            <span className="record-text">{formatTime(recordingTime)}</span>
            <span className="record-hint">Tippen zum Stoppen</span>
          </button>
        )}

        {isProcessing && (
          <div className="processing-state">
            <div className="processing-spinner"></div>
            <span>KI analysiert...</span>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Ergebnisse */}
      {(transcript || structuredRecipe) && (
        <div className="results-container">
          {transcript && (
            <div className="result-card">
              <header>
                <span className="eyebrow-small">ERKANNT</span>
                <h4>Transkript</h4>
              </header>
              <p className="transcript-text">{transcript}</p>
            </div>
          )}

          {structuredRecipe && (
            <div className="result-card structured">
              <header>
                <span className="eyebrow-small">STRUKTURIERT</span>
                <h4>{structuredRecipe.name}</h4>
                {structuredRecipe.original_name && (
                  <span className="original-name">{structuredRecipe.original_name}</span>
                )}
              </header>

              <div className="recipe-preview">
                <div className="preview-section">
                  <span className="preview-label">Kategorie</span>
                  <span className="preview-value">{structuredRecipe.category}</span>
                </div>
                <div className="preview-section">
                  <span className="preview-label">Portionen</span>
                  <span className="preview-value">{structuredRecipe.portions}</span>
                </div>

                {structuredRecipe.ingredients?.length > 0 && (
                  <div className="preview-section full">
                    <span className="preview-label">Zutaten ({structuredRecipe.ingredients.length})</span>
                    <ul className="preview-list">
                      {structuredRecipe.ingredients.map((ing, i) => (
                        <li key={i}>
                          {ing.name} {ing.original_name && <em>({ing.original_name})</em>} — {ing.amount} {ing.unit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {structuredRecipe.steps?.length > 0 && (
                  <div className="preview-section full">
                    <span className="preview-label">Zubereitung</span>
                    <ol className="preview-list numbered">
                      {structuredRecipe.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              <div className="result-actions">
                <button className="btn-primary" onClick={saveRecipe}>
                  ✓ Rezept speichern
                </button>
                <button className="btn-secondary" onClick={() => {
                  setTranscript('')
                  setStructuredRecipe(null)
                }}>
                  Erneut versuchen
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="voice-tips">
        <h4>Tipps für beste Ergebnisse:</h4>
        <ul>
          <li>Sprich langsam und deutlich</li>
          <li>Nenne Mengen einzeln: "500 Gramm Rindfleisch"</li>
          <li>Originalnamen werden automatisch erkannt</li>
          <li>Stille Umgebung für bessere Erkennung</li>
        </ul>
      </div>
    </div>
  )
}
