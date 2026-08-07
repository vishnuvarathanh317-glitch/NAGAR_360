import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await loginUser(email, password);
      login(data.user, data.token);
      navigate(data.user.role === 'officer' || data.user.role === 'admin' ? '/officer' : '/');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    }
    setLoading(false);
  }

  function quickLogin(role) {
    const creds = {
      citizen: { email: 'citizen@civicai.gov.in', password: 'password123' },
      officer: { email: 'officer@civicai.gov.in', password: 'password123' },
      admin: { email: 'admin@civicai.gov.in', password: 'password123' },
    };
    setEmail(creds[role].email);
    setPassword(creds[role].password);
  }

  return (
    <div className="login-page">
      <div className="login-card animate-in">
        <div className="login-card__logo">nagar360</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
          Sign in to manage civic issues
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="input-field"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {error && (
            <div style={{
              padding: 10, background: 'rgba(237,73,86,0.1)',
              borderRadius: 8, color: 'var(--accent-red)',
              fontSize: '0.82rem', textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-gradient btn--full"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Log In'}
          </button>
        </form>

        <div style={{
          marginTop: 24, paddingTop: 16,
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
            Demo Quick Login
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn--sm" style={{ flex: 1 }} onClick={() => quickLogin('citizen')}>
              👤 Citizen
            </button>
            <button className="btn btn-secondary btn--sm" style={{ flex: 1 }} onClick={() => quickLogin('officer')}>
              👮 Officer
            </button>
            <button className="btn btn-secondary btn--sm" style={{ flex: 1 }} onClick={() => quickLogin('admin')}>
              ⚙️ Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
