import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StarRating from './StarRating';
import Header from './Header';
import { apiFetch } from '../lib/api';
import BASE from '../lib/api';
import courseDetails from '../data/courseDetails.js';
import '../styles/CoursePage.css';

const reviewsKey = (id) => `elective_reviews_${id}`;

const AREA_COLORS = {
  Finance: '#3b82f6', GMPP: '#8b5cf6', ISM: '#14b8a6',
  Marketing: '#f97316', 'OB/HR': '#22c55e', Operations: '#eab308',
  Strategy: '#ec4899', 'Inter-Area': '#64748b',
};
const AREAS   = ['Finance','GMPP','ISM','Marketing','OB/HR','Operations','Strategy','Inter-Area'];
const TERMS   = ['Term IV','Term V','Term VI'];
const CREDITS = [1.5, 2, 2.5, 3, 4, 6];

function avg(reviews, field) {
  const valid = reviews.filter(r => r[field] > 0);
  if (!valid.length) return 0;
  return valid.reduce((s, r) => s + r[field], 0) / valid.length;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CoursePage({
  allCourses, courseOverrides, onCourseUpdated,
  basket, toggleBasket, validationMsg, setValidationMsg,
  user, onLogout,
}) {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isAdmin  = user?.role === 'admin';

  // Resolve course from allCourses + any admin overrides
  const base   = allCourses.find(c => String(c.id) === id);
  const [course, setCourse] = useState(base ? (courseOverrides[base.id] || base) : null);

  // Sync if allCourses loads after mount (first render)
  useEffect(() => {
    if (!course && allCourses.length) {
      const found = allCourses.find(c => String(c.id) === id);
      if (found) setCourse(courseOverrides[found.id] || found);
    }
  }, [allCourses, id, courseOverrides, course]);

  // ── Admin edit state ──────────────────────────────────────────────────────
  const [editing,    setEditing]    = useState(false);
  const [editDraft,  setEditDraft]  = useState({});
  const [saving,     setSaving]     = useState(false);
  const [saveErr,    setSaveErr]    = useState('');
  const [professors, setProfessors] = useState([]);

  useEffect(() => {
    fetch(`${BASE}/api/professors`).then(r => r.json()).then(setProfessors).catch(() => {});
  }, []);

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
    setSaveErr('');
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true); setSaveErr('');
    try {
      const payload = {
        ...editDraft,
        professor1_id: editDraft.professor1_id ? parseInt(editDraft.professor1_id) : null,
        professor2_id: editDraft.professor2_id ? parseInt(editDraft.professor2_id) : null,
      };
      const updated = await apiFetch(`/api/courses/${course.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
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

  // ── Reviews ───────────────────────────────────────────────────────────────
  const [reviews,    setReviews]    = useState([]);
  const [revLoad,    setRevLoad]    = useState(true);
  const [cRating,    setCRating]    = useState(0);
  const [pRating,    setPRating]    = useState(0);
  const [comment,    setComment]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErr,    setFormErr]    = useState('');

  const fetchReviews = useCallback(() => {
    if (!id) return;
    setRevLoad(true);
    try {
      const stored = JSON.parse(localStorage.getItem(reviewsKey(id))) || [];
      setReviews(Array.isArray(stored) ? stored : []);
    } catch {
      setReviews([]);
    }
    setRevLoad(false);
  }, [id]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const submitReview = (e) => {
    e.preventDefault();
    if (!cRating && !pRating && !comment.trim()) {
      setFormErr('Please provide at least a rating or a comment.');
      return;
    }
    setFormErr(''); setSubmitting(true);
    const newReview = {
      id: Date.now(),
      username: user.username,
      name: user.name,
      courseRating: cRating,
      profRating: pRating,
      comment,
      timestamp: new Date().toISOString(),
    };
    const updated = [...reviews, newReview];
    localStorage.setItem(reviewsKey(id), JSON.stringify(updated));
    setReviews(updated);
    setCRating(0); setPRating(0); setComment('');
    setSubmitting(false);
  };

  const deleteReview = (reviewId) => {
    const updated = reviews.filter(r => r.id !== reviewId);
    localStorage.setItem(reviewsKey(id), JSON.stringify(updated));
    setReviews(updated);
  };

  // ── Not found ─────────────────────────────────────────────────────────────
  if (allCourses.length > 0 && !course) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ fontSize: 40 }}>🔍</p>
        <p style={{ color: 'var(--text-muted)' }}>Course not found.</p>
        <button className="cp-back-btn" onClick={() => navigate('/')}>← Back to Browse</button>
      </div>
    );
  }

  if (!course) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const color     = AREA_COLORS[course.area] || '#64748b';
  const inBasket  = basket.has(course.id);
  const avgCourse = avg(reviews, 'courseRating');
  const avgProf   = avg(reviews, 'profRating');
  const detail    = courseDetails[String(course.id)];

  return (
    <>
      <Header total={allCourses.length} filtered={allCourses.length} user={user} onLogout={onLogout} />

      <div className="cp-wrap">
        {/* ── Breadcrumb / back ── */}
        <div className="cp-breadcrumb">
          <button className="cp-back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <span className="cp-breadcrumb-sep">/</span>
          <span className="cp-breadcrumb-current">{course.course}</span>
        </div>

        {/* ── Hero header ── */}
        <div className="cp-hero" style={{ borderTopColor: color }}>
          <div className="cp-hero-top">
            <span className="cp-area-badge" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
              {course.area}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {isAdmin && !editing && (
                <button className="cp-edit-btn" onClick={startEdit}>Edit Course</button>
              )}
              <button
                className={`cp-planner-btn ${inBasket ? 'in-basket' : ''}`}
                onClick={() => toggleBasket(course)}
              >
                {inBasket ? '✓ In Planner' : '+ Add to Planner'}
              </button>
            </div>
          </div>

          {editing ? (
            <div className="cp-edit-form">
              <div className="cp-edit-row full">
                <label>Course Name</label>
                <input value={editDraft.course} onChange={e => setEditDraft(d => ({ ...d, course: e.target.value }))} />
              </div>
              <div className="cp-edit-grid">
                <div className="cp-edit-row">
                  <label>Professor 1 *</label>
                  <select value={editDraft.professor1_id} onChange={e => setEditDraft(d => ({ ...d, professor1_id: e.target.value }))}>
                    <option value="">— Select professor —</option>
                    {professors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="cp-edit-row">
                  <label>Professor 2</label>
                  <select value={editDraft.professor2_id} onChange={e => setEditDraft(d => ({ ...d, professor2_id: e.target.value }))}>
                    <option value="">— None —</option>
                    {professors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="cp-edit-row">
                  <label>Area</label>
                  <select value={editDraft.area} onChange={e => setEditDraft(d => ({ ...d, area: e.target.value }))}>
                    {AREAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="cp-edit-row">
                  <label>Term</label>
                  <select value={editDraft.term} onChange={e => setEditDraft(d => ({ ...d, term: e.target.value }))}>
                    {TERMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="cp-edit-row">
                  <label>Credits</label>
                  <select value={editDraft.credits} onChange={e => setEditDraft(d => ({ ...d, credits: parseFloat(e.target.value) }))}>
                    {CREDITS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="cp-edit-row full">
                <label>Description</label>
                <textarea rows={3} value={editDraft.description} placeholder="Add a short course description…"
                  onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} />
              </div>
              {saveErr && <p className="cp-err">{saveErr}</p>}
              <div className="cp-edit-actions">
                <button className="cp-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
                <button className="cp-save-btn" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="cp-title">{course.course}</h1>
              <div className="cp-meta-pills">
                <span className="cp-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {course.faculty}
                </span>
                <span className="cp-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {course.term}
                </span>
                <span className="cp-pill cp-credits-pill">
                  {course.credits ? `${course.credits} Credits` : 'Credits TBD'}
                </span>
              </div>
              {course.description && <p className="cp-description">{course.description}</p>}
            </>
          )}
        </div>

        {/* ── Document-extracted details ── */}
        {detail && (
          <div className="cp-detail-grid">

            {/* About This Course — full width */}
            {detail.intro && (
              <div className="cp-detail-card cp-detail-full">
                <h3 className="cp-detail-heading">About This Course</h3>
                <p className="cp-detail-text">{detail.intro}</p>
              </div>
            )}

            {/* Course Curriculum — full width */}
            {detail.outline?.length > 0 && (
              <div className="cp-detail-card cp-detail-full cp-curriculum-card">
                <h3 className="cp-detail-heading">Course Curriculum</h3>
                <p className="cp-detail-text" style={{ marginBottom: 16 }}>
                  This course is structured across {detail.outline.length} topic{detail.outline.length > 1 ? 's' : ''},
                  covering both foundational concepts and applied skills. The sessions are designed to build progressively,
                  combining theory with real-world case discussions.
                </p>
                <div className="cp-curriculum-grid">
                  {detail.outline.map((item, i) => (
                    <div className="cp-curriculum-item" key={i}>
                      <span className="cp-curriculum-num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="cp-curriculum-text">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Takeaways — half width */}
            {detail.keyTakeaways?.length > 0 && (
              <div className="cp-detail-card">
                <h3 className="cp-detail-heading">Key Takeaways</h3>
                <ul className="cp-detail-list cp-takeaway-list">
                  {detail.keyTakeaways.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prerequisites — half width */}
            <div className="cp-detail-card cp-prereq-card">
              <h3 className="cp-detail-heading">Prerequisites</h3>
              <p className="cp-detail-text cp-prereq-text">{detail.prerequisites || 'None mentioned'}</p>
            </div>
          </div>
        )}

        {/* ── Content grid ── */}
        <div className="cp-content">

          {/* ── Left: Ratings aggregate + Review form ── */}
          <div className="cp-left">

            {/* Aggregate */}
            {reviews.length > 0 && (
              <div className="cp-agg-card">
                <h2 className="cp-section-title">Overall Ratings</h2>
                <div className="cp-agg-row">
                  <div className="cp-agg-item">
                    <span className="cp-agg-num">{avgCourse.toFixed(1)}</span>
                    <StarRating value={Math.round(avgCourse)} readOnly size={20} />
                    <span className="cp-agg-label">Course</span>
                  </div>
                  <div className="cp-agg-divider" />
                  <div className="cp-agg-item">
                    <span className="cp-agg-num">{avgProf.toFixed(1)}</span>
                    <StarRating value={Math.round(avgProf)} readOnly size={20} />
                    <span className="cp-agg-label">Professor</span>
                  </div>
                  <div className="cp-agg-divider" />
                  <div className="cp-agg-item">
                    <span className="cp-agg-num">{reviews.length}</span>
                    <span className="cp-agg-label">Reviews</span>
                  </div>
                </div>
              </div>
            )}

            {/* Review form — students only */}
            {!isAdmin && (
              <div className="cp-card">
                <h2 className="cp-section-title">Rate This Course</h2>
                <form className="cp-review-form" onSubmit={submitReview}>
                  <div className="cp-rating-row">
                    <div className="cp-rating-group">
                      <span className="cp-rating-label">Course</span>
                      <StarRating value={cRating} onChange={setCRating} size={26} />
                      <span className="cp-rating-hint">{cRating ? `${cRating}/5` : 'Tap to rate'}</span>
                    </div>
                    <div className="cp-rating-group">
                      <span className="cp-rating-label">Professor</span>
                      <StarRating value={pRating} onChange={setPRating} size={26} />
                      <span className="cp-rating-hint">{pRating ? `${pRating}/5` : 'Tap to rate'}</span>
                    </div>
                  </div>
                  <textarea
                    className="cp-comment-input"
                    rows={4}
                    placeholder="Share your thoughts about this course, workload, learning outcomes…"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                  {formErr && <p className="cp-err">{formErr}</p>}
                  <button className="cp-submit-btn" type="submit" disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit Review'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* ── Right: Reviews list ── */}
          <div className="cp-right">
            <h2 className="cp-section-title" style={{ marginBottom: 16 }}>
              Student Reviews
              {reviews.length > 0 && <span className="cp-review-count">{reviews.length}</span>}
            </h2>

            {revLoad ? (
              <p className="cp-muted">Loading reviews…</p>
            ) : reviews.length === 0 ? (
              <div className="cp-no-reviews">
                <p style={{ fontSize: 36, marginBottom: 10 }}>💬</p>
                <p>No reviews yet.</p>
                {!isAdmin && <p style={{ marginTop: 4 }}>Be the first to rate this course!</p>}
              </div>
            ) : (
              <div className="cp-reviews-list">
                {reviews.map(r => (
                  <div className="cp-review-card" key={r.id}>
                    <div className="cp-review-top">
                      <div className="cp-reviewer-info">
                        <div className="cp-avatar">{r.name?.[0]?.toUpperCase() || '?'}</div>
                        <div>
                          <span className="cp-reviewer-name">{r.name}</span>
                          <span className="cp-review-date">{fmtDate(r.timestamp)}</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <button className="cp-delete-review" onClick={() => deleteReview(r.id)} title="Delete">🗑</button>
                      )}
                    </div>
                    {(r.courseRating > 0 || r.profRating > 0) && (
                      <div className="cp-review-ratings">
                        {r.courseRating > 0 && (
                          <span className="cp-mini-rating">Course <StarRating value={r.courseRating} readOnly size={13} /></span>
                        )}
                        {r.profRating > 0 && (
                          <span className="cp-mini-rating">Prof <StarRating value={r.profRating} readOnly size={13} /></span>
                        )}
                      </div>
                    )}
                    {r.comment && <p className="cp-review-comment">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Validation modal (credit violations from this page) ── */}
        {validationMsg && (
          <div className="modal-backdrop" onClick={() => setValidationMsg(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-icon">⚠️</div>
              <h3 className="modal-title">Credit Limit Violated</h3>
              <ul className="modal-list">
                {validationMsg.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
              <p className="modal-hint">Remove a course from your planner to fix the issue.</p>
              <button className="modal-close-btn" onClick={() => setValidationMsg(null)}>Got it</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
