import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, authHeaders } from '../lib/api';
import StarRating from './StarRating';
import '../styles/CourseDetailModal.css';

async function fetchProfessors() {
  const r = await fetch('/api/professors');
  if (!r.ok) throw new Error('Failed to load professors');
  return r.json();
}

const AREA_COLORS = {
  Finance: '#3b82f6', GMPP: '#8b5cf6', ISM: '#14b8a6',
  Marketing: '#f97316', 'OB/HR': '#22c55e', Operations: '#eab308',
  Strategy: '#ec4899', 'Inter-Area': '#64748b',
};

const AREAS   = ['Finance','GMPP','ISM','Marketing','OB/HR','Operations','Strategy','Inter-Area'];
const TERMS   = ['Term IV','Term V','Term VI'];
const CREDITS = [1.5, 2, 2.5, 3, 4, 6];

function avg(ratings) {
  if (!ratings.length) return 0;
  return ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Reusable rating tile ─────────────────────────────────────────────────────
function RatingTile({ title, ratings, loading, isAdmin, onDelete, user, onSubmit }) {
  const [rating,     setRating]     = useState(0);
  const [comment,    setComment]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err,        setErr]        = useState('');

  const average  = avg(ratings);
  const myRating = ratings.find(r => r.user_id === user?.id);

  useEffect(() => {
    if (myRating) { setRating(myRating.rating); setComment(myRating.comment || ''); }
  }, [myRating]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { setErr('Please select a star rating.'); return; }
    setErr(''); setSubmitting(true);
    try {
      await onSubmit({ rating, comment });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="cdm-section cdm-rating-tile">
      <div className="cdm-rating-tile-header">
        <h3 className="cdm-section-title">{title}</h3>
        {ratings.length > 0 && (
          <div className="cdm-tile-avg">
            <StarRating value={Math.round(average)} readOnly size={14} />
            <span className="cdm-agg-val">{average.toFixed(1)}</span>
            <span className="cdm-agg-count-sm">({ratings.length})</span>
          </div>
        )}
      </div>

      {!isAdmin && (
        <form className="cdm-review-form" onSubmit={handleSubmit}>
          <div className="cdm-rating-group">
            <StarRating value={rating} onChange={setRating} />
            <span className="cdm-rating-hint">{rating ? `${rating}/5` : 'Tap to rate'}</span>
            {myRating && <span className="cdm-edit-hint">Editing your previous rating</span>}
          </div>
          <textarea
            className="cdm-comment-input"
            rows={2}
            placeholder="Add a comment (optional)…"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
          {err && <p className="cdm-err">{err}</p>}
          <button className="cdm-submit-btn" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : myRating ? 'Update Rating' : 'Submit Rating'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="cdm-muted">Loading…</p>
      ) : ratings.length === 0 ? (
        <div className="cdm-no-reviews">
          <p>No ratings yet.{!isAdmin && ' Be the first!'}</p>
        </div>
      ) : (
        <div className="cdm-reviews-list">
          {ratings.map(r => (
            <div className="cdm-review-card" key={r.id}>
              <div className="cdm-review-top">
                <div className="cdm-reviewer-info">
                  <div className="cdm-avatar">{r.user_name?.[0]?.toUpperCase() || '?'}</div>
                  <div>
                    <span className="cdm-reviewer-name">{r.user_name}</span>
                    <span className="cdm-review-date">{fmtDate(r.created_at)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StarRating value={r.rating} readOnly size={13} />
                  {isAdmin && (
                    <button className="cdm-delete-review" onClick={() => onDelete(r.id)} title="Delete">🗑</button>
                  )}
                </div>
              </div>
              {r.comment && <p className="cdm-review-comment">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────
export default function CourseDetailModal({ course: initialCourse, onClose, onCourseUpdated, inBasket, onToggleBasket }) {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';

  const [course,      setCourse]      = useState(initialCourse);
  const [editing,     setEditing]     = useState(false);
  const [editDraft,   setEditDraft]   = useState({});
  const [saving,      setSaving]      = useState(false);
  const [saveErr,     setSaveErr]     = useState('');
  const [professors,  setProfessors]  = useState([]);

  const [courseRatings,  setCourseRatings]  = useState([]);
  const [profRatings,    setProfRatings]    = useState([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    fetchProfessors().then(setProfessors).catch(() => {});
  }, []);

  const fetchRatings = useCallback(() => {
    setRatingsLoading(true);
    Promise.all([
      fetch(`/api/course-ratings/${course.id}`).then(r => r.json()),
      fetch(`/api/professor-ratings/by-course/${course.id}`).then(r => r.json()),
    ])
      .then(([cr, pr]) => {
        setCourseRatings(Array.isArray(cr) ? cr : []);
        setProfRatings(Array.isArray(pr?.ratings) ? pr.ratings : []);
      })
      .finally(() => setRatingsLoading(false));
  }, [course.id]);

  useEffect(() => { fetchRatings(); }, [fetchRatings]);

  // ── admin edit ────────────────────────────────────────────────────────────
  const startEdit = () => {
    setEditDraft({
      course:        course.course,
      professor1_id: course.professor1_id || '',
      professor2_id: course.professor2_id || '',
      area:          course.area,
      term:          course.term,
      credits:       course.credits,
      description:   course.description || '',
    });
    setSaveErr(''); setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true); setSaveErr('');
    try {
      const updated = await apiFetch(`/api/courses/${course.id}`, {
        method: 'PUT',
        body: JSON.stringify(editDraft),
      });
      setCourse(updated);
      setEditing(false);
      onCourseUpdated && onCourseUpdated(updated);
    } catch (e) {
      setSaveErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── submit ratings ────────────────────────────────────────────────────────
  const submitCourseRating = async ({ rating, comment }) => {
    const r = await apiFetch(`/api/course-ratings/${course.id}`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
    setCourseRatings(prev => [r, ...prev.filter(x => x.user_id !== user.id)]);
  };

  const submitProfRating = async ({ rating, comment }) => {
    const r = await apiFetch(`/api/professor-ratings/${course.id}`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
    setProfRatings(prev => [r, ...prev.filter(x => x.user_id !== user.id)]);
  };

  // ── admin delete ratings ──────────────────────────────────────────────────
  const deleteCourseRating = async (id) => {
    await fetch(`/api/course-ratings/${id}`, { method: 'DELETE', headers: authHeaders() });
    setCourseRatings(prev => prev.filter(r => r.id !== id));
  };

  const deleteProfRating = async (id) => {
    await fetch(`/api/professor-ratings/${id}`, { method: 'DELETE', headers: authHeaders() });
    setProfRatings(prev => prev.filter(r => r.id !== id));
  };

  const color = AREA_COLORS[course.area] || '#64748b';

  return (
    <div className="cdm-backdrop" onClick={onClose}>
      <div className="cdm-panel" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="cdm-header" style={{ borderTopColor: color }}>
          <div className="cdm-header-top">
            <span className="cdm-area-badge" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
              {course.area}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {isAdmin && !editing && (
                <button className="cdm-edit-btn" onClick={startEdit}>Edit Course</button>
              )}
              <button className="cdm-close" onClick={onClose}>✕</button>
            </div>
          </div>

          {editing ? (
            <div className="cdm-edit-form">
              <div className="cdm-edit-row">
                <label>Course Name</label>
                <input value={editDraft.course} onChange={e => setEditDraft(d => ({ ...d, course: e.target.value }))} />
              </div>
              <div className="cdm-edit-grid">
                <div className="cdm-edit-row">
                  <label>Professor 1 *</label>
                  <select value={editDraft.professor1_id} onChange={e => setEditDraft(d => ({ ...d, professor1_id: e.target.value ? parseInt(e.target.value) : '' }))}>
                    <option value="">— Select professor —</option>
                    {professors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="cdm-edit-row">
                  <label>Professor 2</label>
                  <select value={editDraft.professor2_id} onChange={e => setEditDraft(d => ({ ...d, professor2_id: e.target.value ? parseInt(e.target.value) : '' }))}>
                    <option value="">— None —</option>
                    {professors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="cdm-edit-row">
                  <label>Area</label>
                  <select value={editDraft.area} onChange={e => setEditDraft(d => ({ ...d, area: e.target.value }))}>
                    {AREAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="cdm-edit-row">
                  <label>Term</label>
                  <select value={editDraft.term} onChange={e => setEditDraft(d => ({ ...d, term: e.target.value }))}>
                    {TERMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="cdm-edit-row">
                  <label>Credits</label>
                  <select value={editDraft.credits} onChange={e => setEditDraft(d => ({ ...d, credits: parseFloat(e.target.value) }))}>
                    {CREDITS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="cdm-edit-row">
                <label>Description</label>
                <textarea rows={3} value={editDraft.description} placeholder="Add a short course description…"
                  onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} />
              </div>
              {saveErr && <p className="cdm-err">{saveErr}</p>}
              <div className="cdm-edit-actions">
                <button className="cdm-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
                <button className="cdm-save-btn" onClick={saveEdit} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="cdm-title">{course.course}</h2>
              <div className="cdm-meta-pills">
                <span className="cdm-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {course.faculty}
                </span>
                <span className="cdm-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {course.term}
                </span>
                <span className="cdm-pill cdm-credits-pill">
                  {course.credits ? `${course.credits} Credits` : 'Credits TBD'}
                </span>
              </div>
              {course.description && <p className="cdm-description">{course.description}</p>}
            </>
          )}
        </div>

        {/* ── Add-to-planner button ── */}
        {!editing && (
          <div className="cdm-planner-row">
            <button
              className={`cdm-planner-btn ${inBasket ? 'in-basket' : ''}`}
              onClick={() => onToggleBasket && onToggleBasket(course)}
            >
              {inBasket ? '✓ Added to Planner' : '+ Add to Planner'}
            </button>
          </div>
        )}

        {/* ── Two separate rating tiles side by side ── */}
        <div className="cdm-body">
          <div className="cdm-ratings-grid">
            <RatingTile
              title="Course Rating"
              ratings={courseRatings}
              loading={ratingsLoading}
              isAdmin={isAdmin}
              user={user}
              onDelete={deleteCourseRating}
              onSubmit={submitCourseRating}
            />
            <RatingTile
              title={`Professor — ${course.faculty}`}
              ratings={profRatings}
              loading={ratingsLoading}
              isAdmin={isAdmin}
              user={user}
              onDelete={deleteProfRating}
              onSubmit={submitProfRating}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
