export default function Header({ total, filtered, user, onLogout }) {
  return (
    <header className="site-header" style={{
      padding: '40px 24px 32px',
      textAlign: 'center',
      background: 'linear-gradient(180deg, rgba(10,22,40,0.6) 0%, transparent 100%)',
      position: 'relative',
    }}>
      {/* User bar top-right */}
      {user && (
        <div className="site-header-userbar" style={{
          position: 'absolute', top: 16, right: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
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
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12, padding: '6px 12px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
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
