import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/api';

/**
 * Searchable professor dropdown with "Add new professor" capability.
 *
 * Props:
 *   professors        – array of { id, name }
 *   value             – selected professor id (number | '' | null)
 *   onChange          – (id) => void
 *   onProfessorCreated– (newProfessor) => void  — called after POST succeeds
 *   placeholder       – string  (default "— Select professor —")
 *   required          – bool
 */
export default function ProfessorSelect({
  professors = [],
  value,
  onChange,
  onProfessorCreated,
  placeholder = '— Select professor —',
  required = false,
}) {
  const [open,     setOpen]     = useState(false);
  const [query,    setQuery]    = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr,setCreateErr]= useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected   = professors.find(p => p.id === value || p.id === Number(value));
  const filtered   = professors.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );
  const exactMatch = professors.some(p =>
    p.name.toLowerCase() === query.trim().toLowerCase()
  );
  const showAdd    = query.trim() && !exactMatch;

  async function handleAdd() {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    setCreateErr('');
    try {
      const prof = await apiFetch('/api/professors', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      onProfessorCreated && onProfessorCreated(prof);
      onChange(prof.id);
      setOpen(false);
      setQuery('');
    } catch (e) {
      setCreateErr(e.message);
    } finally {
      setCreating(false);
    }
  }

  function select(id) {
    onChange(id);
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="prof-sel" ref={wrapRef}>
      <button
        type="button"
        className={`prof-sel-trigger ${required && !value ? 'required-empty' : ''}`}
        onClick={() => { setOpen(o => !o); setQuery(''); setCreateErr(''); }}
      >
        <span className="prof-sel-label">
          {selected ? selected.name : <span className="prof-sel-placeholder">{placeholder}</span>}
        </span>
        <svg className={`prof-sel-caret ${open ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="prof-sel-menu">
          <div className="prof-sel-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="prof-sel-search"
              autoFocus
              placeholder="Search or type new name…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && showAdd) handleAdd(); }}
            />
          </div>

          <div className="prof-sel-list">
            {/* Clear selection */}
            <button
              type="button"
              className={`prof-sel-option muted ${!value ? 'active' : ''}`}
              onClick={() => select('')}
            >
              {placeholder}
            </button>

            {filtered.length === 0 && !showAdd && (
              <p className="prof-sel-empty">No professors found</p>
            )}

            {filtered.map(p => (
              <button
                type="button"
                key={p.id}
                className={`prof-sel-option ${Number(value) === p.id ? 'active' : ''}`}
                onClick={() => select(p.id)}
              >
                {p.name}
              </button>
            ))}

            {showAdd && (
              <button
                type="button"
                className="prof-sel-add-btn"
                disabled={creating}
                onClick={handleAdd}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {creating ? 'Adding…' : `Add "${query.trim()}"`}
              </button>
            )}

            {createErr && <p className="prof-sel-err">{createErr}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
