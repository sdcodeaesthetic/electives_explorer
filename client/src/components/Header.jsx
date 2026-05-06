import { useTheme } from '../context/ThemeContext';

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

export default function Header({ total, filtered, user, onLogout }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="site-header" style={{
      padding: '40px 24px 32px',
      textAlign: 'center',
      background: theme === 'light'
        ? 'linear-gradient(180deg, rgba(242,243,245,0.9) 0%, transparent 100%)'
        : 'linear-gradient(180deg, rgba(10,22,40,0.6) 0%, transparent 100%)',
      position: 'relative',
    }}>
      {/* User bar top-right */}
      {user && (
        <div className="site-header-userbar" style={{
          position: 'absolute', top: 16, right: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {/* Theme toggle */}
          <button
            className="theme-toggle"
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.07)',
            border: `1px solid ${theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 20, padding: '5px 14px', fontSize: 12,
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: user.role === 'admin' ? '#8b5cf6' : 'var(--accent)',
              color: '#000', fontSize: 11, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {user.name?.[0]?.toUpperCase()}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>{user.name}</span>
            {user.role === 'admin' && (
              <span style={{
                background: '#8b5cf6', color: '#fff', fontSize: 9,
                fontWeight: 700, padding: '1px 6px', borderRadius: 8, letterSpacing: '0.05em',
              }}>ADMIN</span>
            )}
          </div>
          <button
            onClick={onLogout}
            style={{
              background: theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.07)',
              border: `1px solid ${theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12, padding: '6px 12px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.07)'}
          >
            Sign out
          </button>
        </div>
      )}

      <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '12px' }}>
        IIM Sambalpur · MBA Programme
      </p>
      <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: '14px' }}>
        Electives{' '}
        <span style={{ color: 'var(--accent)' }}>Explorer</span>
      </h1>
      <p className="header-subtitle" style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 auto 20px' }}>
        Browse and filter MBA elective courses by specialization, faculty, and credits.
      </p>
    </header>
  );
}
