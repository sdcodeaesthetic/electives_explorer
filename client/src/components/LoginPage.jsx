import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import '../styles/LoginPage.css';

const INST_DOMAIN = 'iimsambalpur.ac.in';

export default function LoginPage() {
  const { login, register } = useAuth();

  const [role,     setRole]     = useState('student');  // 'student' | 'admin'
  const [mode,     setMode]     = useState('login');    // 'login' | 'register'  (student only)

  // shared fields
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  const [error,         setError]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [emailPopup,    setEmailPopup]    = useState(false);

  // Forgot password modal state
  const [forgotOpen,    setForgotOpen]    = useState(false);
  const [forgotDone,    setForgotDone]    = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotErr,     setForgotErr]     = useState('');
  const [fpName,        setFpName]        = useState('');
  const [fpEmail,       setFpEmail]       = useState('');
  const [fpPassword,    setFpPassword]    = useState('');
  const [fpConfirm,     setFpConfirm]     = useState('');

  function resetForm() {
    setName(''); setEmail(''); setPassword(''); setError('');
  }

  function switchRole(r) { setRole(r); setMode('login'); resetForm(); }
  function switchMode(m) { setMode(m); resetForm(); }

  function openForgot() {
    setFpName(''); setFpEmail(email); setFpPassword(''); setFpConfirm('');
    setForgotErr(''); setForgotDone(false);
    setForgotOpen(true);
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotErr('');
    if (fpPassword !== fpConfirm) { setForgotErr('Passwords do not match.'); return; }
    if (fpPassword.length < 6)    { setForgotErr('Password must be at least 6 characters.'); return; }
    setForgotLoading(true);
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ name: fpName, email: fpEmail, password: fpPassword }),
      });
      setForgotDone(true);
    } catch (err) {
      setForgotErr(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Block non-institutional email before hitting the server
    if (role === 'student') {
      const em = email.trim().toLowerCase();
      if (!em.endsWith(`@${INST_DOMAIN}`)) {
        setEmailPopup(true);
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await register(name, email, password);
      } else {
        const identifier = email;
        const user = await login(identifier, password, role);
        if (user.role !== role) {
          setError(`These credentials belong to a ${user.role} account. Please use the correct tab.`);
          localStorage.removeItem('elective_user');
          window.location.reload();
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">E</div>
          <div>
            <p className="login-inst">IIM Sambalpur</p>
            <h1 className="login-title">Electives Explorer</h1>
          </div>
        </div>

        {/* Role tabs */}
        <div className="login-tabs">
          <button className={`login-tab ${role === 'student' ? 'active' : ''}`} onClick={() => switchRole('student')}>
            Student
          </button>
          <button className={`login-tab ${role === 'admin' ? 'active' : ''}`} onClick={() => switchRole('admin')}>
            Admin
          </button>
        </div>

        {/* Student mode/sub-tabs */}
        {role === 'student' && (
          <div className="login-mode-tabs">
            <button className={`login-mode-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => switchMode('login')}>
              Sign In
            </button>
            <button className={`login-mode-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => switchMode('register')}>
              Create Account
            </button>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          {/* Name — register only */}
          {mode === 'register' && (
            <div className="login-field">
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
          )}

          {/* Email (students) or Username (admin) */}
          {role === 'student' ? (
            <div className="login-field">
              <label>Institutional Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={`yourname@${INST_DOMAIN}`}
                autoComplete="email"
                required
              />
              <span className="login-field-hint">Must be a @{INST_DOMAIN} address</span>
            </div>
          ) : (
            <div className="login-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@iimsambalpur.ac.in"
                autoComplete="email"
                required
              />
            </div>
          )}

          {/* Password */}
          <div className="login-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Password</label>
              {role === 'student' && mode === 'login' && (
                <button
                  type="button"
                  className="forgot-link"
                  onClick={openForgot}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading
              ? (mode === 'register' ? 'Creating account…' : 'Signing in…')
              : (mode === 'register' ? 'Create Account' : `Sign in as ${role === 'admin' ? 'Admin' : 'Student'}`)
            }
          </button>
        </form>

        {/* Admin hint */}
        {role === 'admin' && (
          <div className="login-demo">
            <p>Admin accounts are managed by the institution</p>
          </div>
        )}
      </div>

      {/* Forgot password modal */}
      {forgotOpen && (
        <div className="modal-backdrop" onClick={() => setForgotOpen(false)}>
          <div className="modal-box forgot-modal" onClick={e => e.stopPropagation()}>
            {forgotDone ? (
              <>
                <div className="modal-icon">✅</div>
                <h3 className="modal-title">Password Updated</h3>
                <p className="modal-body">Your password has been reset successfully. You can now sign in with your new password.</p>
                <button className="modal-close-btn" onClick={() => setForgotOpen(false)}>Back to Sign In</button>
              </>
            ) : (
              <>
                <div className="modal-icon">🔑</div>
                <h3 className="modal-title">Reset Password</h3>
                <form className="forgot-form" onSubmit={handleForgotSubmit}>
                  <div className="login-field">
                    <label>Full Name</label>
                    <input
                      type="text"
                      placeholder="Your registered full name"
                      value={fpName}
                      onChange={e => setFpName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="login-field">
                    <label>Institutional Email</label>
                    <input
                      type="email"
                      placeholder={`yourname@${INST_DOMAIN}`}
                      value={fpEmail}
                      onChange={e => setFpEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="login-field">
                    <label>New Password</label>
                    <input
                      type="password"
                      placeholder="Min. 6 characters"
                      value={fpPassword}
                      onChange={e => setFpPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div className="login-field">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Re-enter new password"
                      value={fpConfirm}
                      onChange={e => setFpConfirm(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  {forgotErr && <div className="login-error">{forgotErr}</div>}
                  <button className="login-btn" type="submit" disabled={forgotLoading}>
                    {forgotLoading ? 'Updating…' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    className="forgot-cancel-btn"
                    onClick={() => setForgotOpen(false)}
                  >
                    Cancel
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Institutional email popup */}
      {emailPopup && (
        <div className="modal-backdrop" onClick={() => setEmailPopup(false)}>
          <div className="modal-box email-popup" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">📧</div>
            <h3 className="modal-title">Institutional Email Required</h3>
            <p className="modal-body">
              Please use your <strong>@{INST_DOMAIN}</strong> email address to access the platform.
              Personal email addresses (Gmail, Yahoo, etc.) are not accepted.
            </p>
            <button className="modal-close-btn" onClick={() => { setEmailPopup(false); setEmail(''); }}>
              Use Institutional Email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
