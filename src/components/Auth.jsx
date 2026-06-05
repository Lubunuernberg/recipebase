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
      const { data, error } = await supabase.auth.signInWithPassword({
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
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
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>RecipeBase</h1>
        <p style={styles.subtitle}>{isSignUp ? 'Account erstellen' : 'Anmelden'}</p>

        <form onSubmit={isSignUp ? handleSignUp : handleLogin} style={styles.form}>
          {isSignUp && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              required
            />
          )}
          
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />

          {error && <p style={styles.error}>{error}</p>}
          {message && <p style={styles.success}>{message}</p>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Laden...' : isSignUp ? 'Account erstellen' : 'Anmelden'}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          style={styles.switchButton}
        >
          {isSignUp ? 'Bereits Account? Anmelden' : 'Neuer Account?'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  card: {
    background: 'var(--color-bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: 'var(--shadow-lg)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: '0.5rem',
    color: 'var(--color-accent)',
  },
  subtitle: {
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.875rem 1rem',
    color: 'var(--color-text)',
    fontSize: '1rem',
    transition: 'border-color 0.2s',
  },
  button: {
    background: 'var(--color-accent)',
    color: 'white',
    padding: '0.875rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '1rem',
    fontWeight: 600,
    transition: 'background 0.2s',
  },
  switchButton: {
    background: 'transparent',
    color: 'var(--color-accent)',
    padding: '0.75rem',
    marginTop: '1rem',
    fontSize: '0.875rem',
    width: '100%',
  },
  error: {
    color: 'var(--color-danger)',
    fontSize: '0.875rem',
    textAlign: 'center',
  },
  success: {
    color: 'var(--color-success)',
    fontSize: '0.875rem',
    textAlign: 'center',
  },
}
