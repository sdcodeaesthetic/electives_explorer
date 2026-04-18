import '../styles/CourseCard.css';

const AREA_COLORS = {
  Finance:      '#3b82f6',
  GMPP:         '#8b5cf6',
  ISM:          '#14b8a6',
  Marketing:    '#f97316',
  'OB/HR':      '#22c55e',
  Operations:   '#eab308',
  Strategy:     '#ec4899',
  'Inter-Area': '#64748b',
};

export default function CourseCard({
  course,
  selected = false,
  isBackup = false,
  onToggle,
  onToggleBackup,
  onExpand,
  isAdmin = false,
  onDelete,
}) {
  const color = AREA_COLORS[course.area] || '#64748b';

  return (
    <div
      className={`course-card${selected ? ' selected' : ''}${isBackup ? ' backup' : ''}`}
      style={{ '--card-glow': color }}
      onClick={() => onExpand && onExpand(course)}
      onMouseEnter={e => { if (!selected && !isBackup) e.currentTarget.style.borderColor = `${color}55`; }}
      onMouseLeave={e => { if (!selected && !isBackup) e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
    >
      {/* Top row: area badge + credits + check / backup badge */}
      <div className="card-top">
        <span
          className="area-badge"
          style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
        >
          {course.area}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {selected && !isAdmin && (
            <span className="card-check">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="2.5,8.5 6.5,12.5 13.5,4.5" />
              </svg>
            </span>
          )}
          {isBackup && !isAdmin && (
            <span className="card-backup-badge" title="Saved as backup">
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v12l-5-2.5L3 14V2z"/>
              </svg>
            </span>
          )}
          <span className={`credits-pill ${!course.credits ? 'unknown' : ''}`}>
            {course.credits ? `${course.credits} Cr` : '—'}
          </span>
        </div>
      </div>

      {/* Title */}
      <p className="card-title">{course.course}</p>

      {/* Meta */}
      <div className="card-meta">
        <div className="meta-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span>{course.faculty}</span>
        </div>
        {course.term && (
          <div className="meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{course.term}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      {isAdmin ? (
        <div className="card-footer" onClick={e => e.stopPropagation()}>
          <button
            className="card-delete-btn"
            onClick={() => onDelete && onDelete(course)}
          >
            🗑 Delete Course
          </button>
        </div>
      ) : (
        <div className="card-footer" onClick={e => e.stopPropagation()}>
          <button
            className={`card-add-btn ${selected ? 'added' : ''}`}
            onClick={() => onToggle && onToggle(course)}
          >
            {selected ? '✓ In Planner' : '+ Add to Planner'}
          </button>
          {!selected && (
            <button
              className={`card-backup-btn ${isBackup ? 'active' : ''}`}
              onClick={() => onToggleBackup && onToggleBackup(course)}
              title={isBackup ? 'Remove backup' : 'Save as backup'}
            >
              <svg viewBox="0 0 16 16" fill={isBackup ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                <path d="M3 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v12l-5-2.5L3 14V2z"/>
              </svg>
              {isBackup ? 'Backup saved' : 'Set as backup'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
