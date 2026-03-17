import { useState } from 'react';
import { apiFetch } from '../lib/api';
import '../styles/SuggestionsTab.css';

const AREA_COLORS = {
  Finance: '#3b82f6', GMPP: '#8b5cf6', ISM: '#14b8a6',
  Marketing: '#f97316', 'OB/HR': '#22c55e', Operations: '#eab308',
  Strategy: '#ec4899', 'Inter-Area': '#64748b',
};
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

export default function SuggestionsTab({ allCourses, basket, toggleBasket }) {
  const [careerGoal, setCareerGoal] = useState('');
  const [majors,     setMajors]     = useState('');
  const [minors,     setMinors]     = useState('');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!careerGoal.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await apiFetch('/api/suggestions', {
        method: 'POST',
        body: JSON.stringify({ careerGoal, majors, minors }),
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

        <form className="suggest-form" onSubmit={handleSubmit}>
          <div className="suggest-field">
            <label>Career Goal</label>
            <div className="suggest-chip-row">
              {CAREER_SUGGESTIONS.map(s => (
                <button
                  key={s} type="button"
                  className={`suggest-chip ${careerGoal === s ? 'active' : ''}`}
                  onClick={() => setCareerGoal(s)}
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
            />
          </div>

          <div className="suggest-row">
            <div className="suggest-field">
              <label>Preferred Major(s)</label>
              <input
                type="text"
                value={majors}
                onChange={e => setMajors(e.target.value)}
                placeholder="e.g. Finance, Strategy"
                className="suggest-input"
              />
            </div>
            <div className="suggest-field">
              <label>Preferred Minor(s)</label>
              <input
                type="text"
                value={minors}
                onChange={e => setMinors(e.target.value)}
                placeholder="e.g. Marketing, ISM"
                className="suggest-input"
              />
            </div>
          </div>

          <button className="suggest-btn" type="submit" disabled={loading || !careerGoal.trim()}>
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
