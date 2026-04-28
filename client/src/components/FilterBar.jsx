import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/FilterBar.css';

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

// ── Searchable Faculty Dropdown ───────────────────────────────────────────────
function FacultyDropdown({ faculties, selectedFaculty, setSelectedFaculty }) {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState('');
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const wrapRef    = useRef(null);
  const triggerRef = useRef(null);
  const menuRef    = useRef(null);

  // Calculate fixed position from trigger button
  function updatePos() {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 6, left: r.left });
  }

  // Close on outside click — must exclude the portal menu itself since it
  // renders in document.body outside wrapRef, otherwise mousedown on an option
  // closes the dropdown before the click event fires and selection is lost.
  useEffect(() => {
    function onMouse(e) {
      const insideWrap = wrapRef.current?.contains(e.target);
      const insideMenu = menuRef.current?.contains(e.target);
      if (!insideWrap && !insideMenu) setOpen(false);
    }
    document.addEventListener('mousedown', onMouse);
    return () => document.removeEventListener('mousedown', onMouse);
  }, []);

  // Reposition on scroll / resize while open
  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open]);

  const filtered = faculties.filter(f =>
    f.toLowerCase().includes(query.toLowerCase())
  );

  const displayLabel = selectedFaculty || 'All Faculty';

  function select(f) {
    setSelectedFaculty(f);
    setQuery('');
    setOpen(false);
  }

  function handleOpen() {
    updatePos();
    setOpen(o => !o);
    setQuery('');
  }

  return (
    <div className="fac-dropdown" ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`fac-trigger ${selectedFaculty ? 'has-value' : ''}`}
        onClick={handleOpen}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <span className="fac-label">{displayLabel}</span>
        <svg className={`fac-caret ${open ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && createPortal(
        <div ref={menuRef} className="fac-menu" style={{ top: menuPos.top, left: menuPos.left }}>
          <div className="fac-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="fac-search"
              autoFocus
              placeholder="Search faculty…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="fac-list">
            <button className={`fac-option ${!selectedFaculty ? 'active' : ''}`} onClick={() => select('')}>
              All Faculty
            </button>
            {filtered.length === 0 && (
              <p className="fac-empty">No match found</p>
            )}
            {filtered.map(f => (
              <button
                key={f}
                className={`fac-option ${selectedFaculty === f ? 'active' : ''}`}
                onClick={() => select(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Main FilterBar ────────────────────────────────────────────────────────────
export default function FilterBar({
  search, setSearch,
  areas, selectedAreas, toggleArea,
  selectedCredit, setSelectedCredit,
  faculties, selectedFaculty, setSelectedFaculty,
  terms, selectedTerm, setSelectedTerm,
  clearAll, hasFilters,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="filter-bar">
      <div className="filter-inner">

        {/* Mobile toggle */}
        <button className="mobile-toggle" onClick={() => setMobileOpen(o => !o)}>
          <span>🎛 Filters {hasFilters ? '(active)' : ''}</span>
          <span>{mobileOpen ? '▲' : '▼'}</span>
        </button>

        {/* ── Row 1: Search (full width) ── */}
        <div className={`filter-row-search ${mobileOpen ? 'mobile-visible' : ''}`}>
          <div className="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="Search courses, faculty…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ── Row 2: Filters (faculty | areas | credits | terms | clear) ── */}
        <div className={`filter-row-filters ${mobileOpen ? 'mobile-visible' : ''}`}>

          {/* Faculty — searchable dropdown */}
          <FacultyDropdown
            faculties={faculties}
            selectedFaculty={selectedFaculty}
            setSelectedFaculty={setSelectedFaculty}
          />

          <div className="filter-divider" />

          {/* Area pills */}
          <div className="area-pills">
            {areas.map(area => {
              const color  = AREA_COLORS[area] || '#64748b';
              const active = selectedAreas.includes(area);
              return (
                <button
                  key={area}
                  className={`area-pill ${active ? 'active' : ''}`}
                  style={{
                    borderColor:     active ? color : 'transparent',
                    backgroundColor: active ? `${color}22` : undefined,
                    color:           active ? color : 'var(--text-muted)',
                  }}
                  onClick={() => toggleArea(area)}
                >
                  {area}
                </button>
              );
            })}
          </div>

          <div className="filter-divider" />

          <div className="credit-term-row">
            {/* Credits */}
            <div className="credits-group">
              <span className="credits-label">Credits</span>
              <div className="credits-toggle">
                {['all', '1.5', '3'].map(val => (
                  <button
                    key={val}
                    className={`credits-btn ${selectedCredit === val ? 'active' : ''}`}
                    onClick={() => setSelectedCredit(val)}
                  >
                    {val === 'all' ? 'All' : val}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-divider" />

            {/* Term */}
            <div className="credits-group">
              <span className="credits-label">Term</span>
              <div className="credits-toggle">
                <button
                  className={`credits-btn ${selectedTerm === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedTerm('all')}
                >All</button>
                {terms.map(t => (
                  <button
                    key={t}
                    className={`credits-btn ${selectedTerm === t ? 'active' : ''}`}
                    onClick={() => setSelectedTerm(t)}
                  >
                    {t === 'X' ? 'N/A' : t.replace('Term ', '')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clear */}
          {hasFilters && (
            <>
              <div className="filter-divider" />
              <button className="clear-btn" onClick={clearAll}>✕ Clear</button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
