import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      setMessage('Login erfolgreich!')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      })
      if (error) throw error
      setMessage('Account erstellt! Bitte E-Mail bestätigen.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">◎</span>
          <span className="logo-text">Recipe<span className="accent">Base</span></span>
        </div>

        <span className="eyebrow auth-eyebrow">{isSignUp ? 'NEU' : 'WILLKOMMEN'}</span>
        <h1 className="auth-title">{isSignUp ? 'Account erstellen' : 'Anmelden'}</h1>

        <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="auth-form">
          {isSignUp && (
            <div className="form-field">
              <label>Name</label>
              <input
                type="text"
                placeholder="Max Mustermann"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          
          <div className="form-field">
            <label>E-Mail</label>
            <input
              type="email"
              placeholder="name@restaurant.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-field">
            <label>Passwort</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}

          <button type="submit" className="btn-primary auth-button" disabled={loading}>
            {loading ? 'Laden...' : isSignUp ? 'Account erstellen' : 'Anmelden'}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="auth-switch"
        >
          {isSignUp ? 'Bereits Account? Anmelden' : 'Neu hier? Account erstellen'}
        </button>
      </div>
    </div>
  )
}
