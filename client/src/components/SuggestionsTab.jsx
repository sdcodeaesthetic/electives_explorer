import { useState } from 'react';
import { apiFetch } from '../lib/api';
import '../styles/SuggestionsTab.css';

const AREA_COLORS = {
  Finance: '#3b82f6', GMPP: '#8b5cf6', ISM: '#14b8a6',
  Marketing: '#f97316', 'OB/HR': '#22c55e', Operations: '#eab308',
  Strategy: '#ec4899', 'Inter-Area': '#64748b',
};
const AREAS      = ['Finance', 'ISM', 'Marketing', 'OB/HR', 'Operations', 'Strategy'];
const TERM_ORDER = ['Term IV', 'Term V', 'Term VI'];

const CAREER_SUGGESTIONS = [
  'Investment Banking / Finance',
  'Product Management',
  'Marketing & Brand Management',
  'Consulting / Strategy',
  'Operations & Supply Chain',
  'HR & Organizational Leadership',
  'Technology & Digital Transformation',
  'Entrepreneurship / Startups',
];

// Multi-select dropdown limited to `max` items
function AreaPicker({ label, selected, onChange, max }) {
  const available = AREAS.filter(a => !selected.includes(a));
  const add    = (a) => { if (selected.length < max) onChange([...selected, a]); };
  const remove = (a) => onChange(selected.filter(x => x !== a));

  return (
    <div className="suggest-field">
      <label>{label} <span className="suggest-field-hint">(up to {max})</span></label>
      <div className="suggest-area-chips">
        {selected.map(a => (
          <span key={a} className="suggest-area-tag" style={{ '--ac': AREA_COLORS[a] || '#64748b' }}>
            {a}
            <button type="button" className="suggest-area-remove" onClick={() => remove(a)}>✕</button>
          </span>
        ))}
        {selected.length < max && (
          <select
            className="suggest-area-select"
            value=""
            onChange={e => { if (e.target.value) add(e.target.value); }}
          >
            <option value="">+ Add area…</option>
            {available.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        {selected.length === 0 && available.length === 0 && (
          <span className="suggest-field-hint">All areas selected</span>
        )}
      </div>
    </div>
  );
}

export default function SuggestionsTab({ allCourses, basket, toggleBasket }) {
  const [careerGoal, setCareerGoal] = useState('');
  const [majors,     setMajors]     = useState([]);   // array, max 2
  const [minors,     setMinors]     = useState([]);   // array, max 2
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState('');

  const canGenerate = !loading && (careerGoal.trim() || majors.length > 0 || minors.length > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canGenerate) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await apiFetch('/api/suggestions', {
        method: 'POST',
        body: JSON.stringify({
          careerGoal,
          majors: majors.join(', '),
          minors: minors.join(', '),
        }),
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const byTerm = result
    ? TERM_ORDER.reduce((acc, t) => {
        acc[t] = result.basket.filter(c => c.term === t);
        return acc;
      }, {})
    : {};

  const termCredits = (term) =>
    (byTerm[term] || []).reduce((s, c) => s + (c.credits || 0), 0);

  const addAllToBasket = () => {
    result?.basket.forEach(c => {
      const full = allCourses.find(ac => ac.id === c.courseId);
      if (full && !basket.has(full.id)) toggleBasket(full);
    });
  };

  return (
    <div className="suggest-page">
      {/* Form panel */}
      <div className="suggest-form-panel">
        <div className="suggest-form-header">
          <div className="suggest-ai-badge">AI</div>
          <div>
            <h2 className="suggest-title">Smart Course Planner</h2>
            <p className="suggest-subtitle">Describe your career aspirations and get a personalised elective basket</p>
          </div>
        </div>

        <form className={`suggest-form${loading ? ' suggest-form--locked' : ''}`} onSubmit={handleSubmit}>
          <div className="suggest-field">
            <label>Career Goal <span className="suggest-field-hint">(optional if majors/minors selected)</span></label>
            <div className="suggest-chip-row">
              {CAREER_SUGGESTIONS.map(s => (
                <button
                  key={s} type="button"
                  className={`suggest-chip ${careerGoal === s ? 'active' : ''}`}
                  onClick={() => setCareerGoal(s)}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={careerGoal}
              onChange={e => setCareerGoal(e.target.value)}
              placeholder="Or describe your own goal…"
              className="suggest-input"
              disabled={loading}
            />
          </div>

          <div className="suggest-row">
            <AreaPicker
              label="Preferred Major(s)"
              selected={majors}
              onChange={loading ? () => {} : setMajors}
              max={2}
            />
            <AreaPicker
              label="Preferred Minor(s)"
              selected={minors}
              onChange={loading ? () => {} : setMinors}
              max={2}
            />
          </div>

          <button className="suggest-btn" type="submit" disabled={!canGenerate}>
            {loading ? (
              <><span className="suggest-spinner" /> Generating suggestions…</>
            ) : (
              'Generate My Elective Plan'
            )}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="suggest-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="suggest-results">
          <div className="suggest-summary">
            <span className="suggest-summary-icon">✦</span>
            <p>{result.summary}</p>
          </div>

          <div className="suggest-results-header">
            <h3>Suggested Elective Basket</h3>
            <button className="suggest-add-all-btn" onClick={addAllToBasket}>
              Add All to Planner
            </button>
          </div>

          {TERM_ORDER.map(term => {
            const courses = byTerm[term] || [];
            if (!courses.length) return null;
            const credits = termCredits(term);
            return (
              <div key={term} className="suggest-term-block">
                <div className="suggest-term-header">
                  <span className="suggest-term-label">{term}</span>
                  <span className="suggest-term-credits">{credits} credits</span>
                </div>
                <div className="suggest-course-list">
                  {courses.map(c => {
                    const full  = allCourses.find(ac => ac.id === c.courseId);
                    const inBasket = full && basket.has(full.id);
                    const color = AREA_COLORS[c.area] || '#64748b';
                    return (
                      <div key={c.courseId} className="suggest-course-card">
                        <div className="suggest-course-area-dot" style={{ background: color }} />
                        <div className="suggest-course-info">
                          <div className="suggest-course-name">{c.course}</div>
                          <div className="suggest-course-meta">
                            <span style={{ color }}>{c.area}</span>
                            <span>·</span>
                            <span>{c.faculty}</span>
                            <span>·</span>
                            <span>{c.credits ?? '—'} cr</span>
                          </div>
                          <div className="suggest-course-reason">{c.reason}</div>
                        </div>
                        {full && (
                          <button
                            className={`suggest-add-btn ${inBasket ? 'added' : ''}`}
                            onClick={() => toggleBasket(full)}
                          >
                            {inBasket ? '✓ Added' : '+ Add'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Credit summary */}
          <div className="suggest-credit-summary">
            {TERM_ORDER.map(term => {
              const cr  = termCredits(term);
              const ok  = term === 'Term VI' ? cr === 12 : (cr >= 18 && cr <= 21);
              return (
                <div key={term} className={`suggest-credit-row ${ok ? 'ok' : 'warn'}`}>
                  <span>{term}</span>
                  <span>{cr} cr</span>
                  <span>{term === 'Term VI' ? '= 12' : '18–21'}</span>
                  <span>{ok ? '✓' : '⚠'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
