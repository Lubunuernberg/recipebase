import { useState } from 'react'

export default function VoiceInput() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')

  return (
    <div className="voice-input">
      <header className="page-header">
        <span className="eyebrow">SPRACHE</span>
        <h1>Rezept <span className="accent">einsprechen</span></h1>
        <p className="subtitle">
          Sprich dein Rezept in Vietnamesisch, Deutsch oder Englisch ein. 
          Die KI erkennt und strukturiert automatisch.
        </p>
      </header>

      <div className="voice-recorder">
        <button 
          className={`record-btn ${isRecording ? 'recording' : ''}`}
          onClick={() => setIsRecording(!isRecording)}
        >
          <span className="record-icon">{isRecording ? '◼' : '●'}</span>
          <span>{isRecording ? 'Aufnahme stoppen' : 'Aufnahme starten'}</span>
        </button>

        {transcript && (
          <div className="transcript-box">
            <h4>Erkannt:</h4>
            <p>{transcript}</p>
          </div>
        )}
      </div>
    </div>
  )
}
