import { useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Supported languages with their Whisper codes
const LANGUAGES = [
  { code: 'vi', name: 'Vietnamesisch', flag: '🇻🇳' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'Englisch', flag: '🇬🇧' },
  { code: 'zh', name: 'Chinesisch', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanisch', flag: '🇯🇵' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
]

export default function VoiceInput({ onRecipeCreated, onClose }) {
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
      
      // Use webm format for better browser support
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4'
      })
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data)
        }
      }
      
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
        await processAudio(audioBlob)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.current.start(100) // Collect data every 100ms
      setIsRecording(true)
      
      // Start timer
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
      // Convert to base64
      const base64Audio = await blobToBase64(audioBlob)
      
      // Send to Supabase Edge Function
      const { data, error: funcError } = await supabase.functions.invoke('whisper-transcribe', {
        body: { 
          audio: base64Audio,
          language: selectedLang
        }
      })
      
      if (funcError) throw funcError
      
      setTranscript(data.text)
      
      // Structure the recipe with Claude
      if (data.text) {
        await structureRecipe(data.text, selectedLang)
      }
      
    } catch (err) {
      console.error('Processing error:', err)
      setError('Fehler bei der Verarbeitung: ' + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const structureRecipe = async (text, lang) => {
    try {
      const { data, error: funcError } = await supabase.functions.invoke('structure-recipe', {
        body: { 
          text,
          language: lang
        }
      })
      
      if (funcError) throw funcError
      
      setStructuredRecipe(data)
    } catch (err) {
      console.error('Structure error:', err)
      // Don't show error - user can still use raw transcript
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
      
      // Insert recipe
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
      
      // Insert ingredients
      if (structuredRecipe.ingredients?.length > 0) {
        for (const ing of structuredRecipe.ingredients) {
          // Try to find existing ingredient
          const { data: existing } = await supabase
            .from('ingredients')
            .select('id')
            .eq('restaurant_id', member.restaurant_id)
            .ilike('name', ing.name)
            .maybeSingle()
          
          let ingredientId = existing?.id
          
          // Create if not found
          if (!ingredientId) {
            const { data: newIng, error: ingError } = await supabase
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
            
            if (!ingError) {
              ingredientId = newIng.id
            }
          }
          
          // Link to recipe
          if (ingredientId) {
            await supabase.from('recipe_ingredients').insert({
              recipe_id: recipe.id,
              ingredient_id: ingredientId,
              amount: ing.amount
            })
          }
        }
      }
      
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
        </p>
      </header>

      {/* Language Selector */}
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

      {/* Recording Area */}
      <div className={`recording-area ${isRecording ? 'recording' : ''}`}>
        {!isRecording && !isProcessing && !transcript && (
          <button 
            className="record-btn"
            onClick={startRecording}
          >
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
          <button 
            className="record-btn recording"
            onClick={stopRecording}
          >
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

      {error && (
        <div className="error-message">{error}</div>
      )}

      {/* Results */}
      {(transcript || structuredRecipe) && (
        <div className="results-container">
          {/* Raw Transcript */}
          {transcript && (
            <div className="result-card">
              <header>
                <span className="eyebrow-small">ERKANNT</span>
                <h4>Transkript</h4>
              </header>
              <p className="transcript-text">{transcript}</p>
            </div>
          )}

          {/* Structured Recipe */}
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
                </button>                <button className="btn-secondary" onClick={() => {
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
          <li>Spreiche langsam und deutlich</li>
          <li>Nenne Mengen einzeln: "500 Gramm Rindfleisch"</li>
          <li>Originalnamen werden automatisch erkannt</li>
          <li>Stille Umgebung für bessere Erkennung</li>
        </ul>
      </div>
    </div>
  )
}
