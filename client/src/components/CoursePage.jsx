import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StarRating from './StarRating';
import Header from './Header';
import ProfessorSelect from './ProfessorSelect';
import { apiFetch, authHeaders } from '../lib/api';
import BASE from '../lib/api';
import '../styles/CoursePage.css';

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

// ── Inline-editable content section ──────────────────────────────────────────
function ContentSection({ title, value, fieldKey, onSave, isAdmin, type = 'text' }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const [saving,  setSaving]  = useState(false);

  function startEdit() { setDraft(value || ''); setEditing(true); }
  async function save() {
    setSaving(true);
    try { await onSave(fieldKey, draft); setEditing(false); }
    finally { setSaving(false); }
  }

  if (!isAdmin && !value) return null;

  const lines = value ? value.split('\n').filter(l => l.trim()) : [];

  return (
    <div className="cp-section-card">
      <div className="cp-section-header">
        <h3 className="cp-section-heading">{title}</h3>
        {isAdmin && !editing && (
          <button className="cp-inline-edit-btn" onClick={startEdit}>Edit</button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            className="cp-edit-textarea"
            rows={type === 'curriculum' ? 12 : type === 'bullets' ? 8 : 6}
            value={draft}
            placeholder={
              type === 'bullets'    ? 'One bullet per line…' :
              type === 'curriculum' ? 'One curriculum topic per line…' :
              `Enter ${title.toLowerCase()}…`
            }
            onChange={e => setDraft(e.target.value)}
            autoFocus
          />
          {(type === 'bullets' || type === 'curriculum') && (
            <p className="cp-edit-hint">
              {type === 'bullets' ? 'Each line becomes a separate bullet point.' : 'Each line becomes a separate curriculum item.'}
            </p>
          )}
          <div className="cp-section-edit-actions">
            <button className="cp-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
            <button className="cp-save-btn"   onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : !value ? (
        <p className="cp-muted cp-empty-hint">Not set — click Edit to add.</p>
      ) : type === 'curriculum' ? (
        <div className="cp-curriculum-grid">
          {lines.map((item, i) => (
            <div className="cp-curriculum-item" key={i}>
              <span className="cp-curriculum-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="cp-curriculum-text">{item}</span>
            </div>
          ))}
        </div>
      ) : type === 'bullets' ? (
        <ul className="cp-bullets-list">
          {lines.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      ) : (
        <p className="cp-section-text">{value}</p>
      )}
    </div>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteCourseModal({ courseName, onConfirm, onCancel, deleting }) {
  return (
    <div className="clear-modal-backdrop" onClick={onCancel}>
      <div className="clear-modal" onClick={e => e.stopPropagation()}>
        <div className="clear-modal-icon">🗑️</div>
        <h3 className="clear-modal-title">Delete Course?</h3>
        <p className="clear-modal-body">
          This will permanently delete <strong>{courseName}</strong>. This action cannot be undone.
        </p>
        <div className="clear-modal-actions">
          <button className="clear-confirm-no"  onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="clear-confirm-yes" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rating tile ───────────────────────────────────────────────────────────────
function RatingTile({ title, ratings, loading, isAdmin, user, onDelete, onSubmit }) {
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
    try { await onSubmit({ rating, comment }); }
    catch (e) { setErr(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="cp-rating-tile">
      <div className="cp-rating-tile-header">
        <h3 className="cp-section-heading">{title}</h3>
        {ratings.length > 0 && (
          <div className="cp-tile-avg">
            <StarRating value={Math.round(average)} readOnly size={15} />
            <span className="cp-avg-val">{average.toFixed(1)}</span>
            <span className="cp-avg-count">({ratings.length})</span>
          </div>
        )}
      </div>

      {!isAdmin && (
        <form className="cp-rate-form" onSubmit={handleSubmit}>
          <div className="cp-rating-group">
            <StarRating value={rating} onChange={setRating} size={24} />
            <span className="cp-rating-hint">{rating ? `${rating}/5` : 'Tap to rate'}</span>
            {myRating && <span className="cp-edit-hint-inline">Editing your previous rating</span>}
          </div>
          <textarea
            className="cp-comment-input"
            rows={2}
            placeholder="Add a comment (optional)…"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
          {err && <p className="cp-err">{err}</p>}
          <button className="cp-submit-btn" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : myRating ? 'Update Rating' : 'Submit Rating'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="cp-muted">Loading…</p>
      ) : ratings.length === 0 ? (
        <div className="cp-no-reviews">
          <p>No ratings yet.{!isAdmin && ' Be the first!'}</p>
        </div>
      ) : (
        <div className="cp-reviews-list">
          {ratings.map(r => (
            <div className="cp-review-card" key={r.id}>
              <div className="cp-review-top">
                <div className="cp-reviewer-info">
                  <div className="cp-avatar">{r.user_name?.[0]?.toUpperCase() || '?'}</div>
                  <div>
                    <span className="cp-reviewer-name">{r.user_name}</span>
                    <span className="cp-review-date">{fmtDate(r.created_at)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StarRating value={r.rating} readOnly size={13} />
                  {isAdmin && (
                    <button className="cp-delete-review" onClick={() => onDelete(r.id)} title="Delete review">🗑</button>
                  )}
                </div>
              </div>
              {r.comment && <p className="cp-review-comment">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CoursePage({
  allCourses, courseOverrides, onCourseUpdated, onCourseDeleted,
  basket, toggleBasket, validationMsg, setValidationMsg,
  user, onLogout,
}) {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isAdmin  = user?.role === 'admin';

  const base = allCourses.find(c => String(c.id) === id);
  const [course, setCourse] = useState(base ? (courseOverrides[base.id] || base) : null);

  useEffect(() => {
    if (!course && allCourses.length) {
      const found = allCourses.find(c => String(c.id) === id);
      if (found) setCourse(courseOverrides[found.id] || found);
    }
  }, [allCourses, id, courseOverrides, course]);

  // ── Admin: header edit ────────────────────────────────────────────────────
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
    });
    setSaveErr(''); setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true); setSaveErr('');
    try {
      const updated = await apiFetch(`/api/courses/${course.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...editDraft,
          professor1_id: editDraft.professor1_id ? parseInt(editDraft.professor1_id) : null,
          professor2_id: editDraft.professor2_id ? parseInt(editDraft.professor2_id) : null,
        }),
      });
      setCourse(updated); setEditing(false);
      onCourseUpdated && onCourseUpdated(updated);
    } catch (e) { setSaveErr(e.message); }
    finally { setSaving(false); }
  };

  const handleProfCreated = (p) =>
    setProfessors(prev => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));

  // ── Admin: save individual content section ────────────────────────────────
  const saveSection = async (field, value) => {
    const updated = await apiFetch(`/api/courses/${course.id}`, {
      method: 'PUT',
      body: JSON.stringify({ [field]: value }),
    });
    setCourse(updated);
    onCourseUpdated && onCourseUpdated(updated);
  };

  // ── Admin: delete course ──────────────────────────────────────────────────
  const [showDelete, setShowDelete] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/api/courses/${course.id}`, { method: 'DELETE' });
      onCourseDeleted && onCourseDeleted(course.id);
      navigate('/');
    } catch (e) {
      setSaveErr(e.message);
      setDeleting(false);
      setShowDelete(false);
    }
  };

  // ── Ratings (DB) ──────────────────────────────────────────────────────────
  const [courseRatings,  setCourseRatings]  = useState([]);
  const [profRatings,    setProfRatings]    = useState([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);

  const fetchRatings = useCallback(() => {
    if (!id) return;
    setRatingsLoading(true);
    Promise.all([
      fetch(`${BASE}/api/course-ratings/${id}`).then(r => r.json()),
      fetch(`${BASE}/api/professor-ratings/by-course/${id}`).then(r => r.json()),
    ])
      .then(([cr, pr]) => {
        setCourseRatings(Array.isArray(cr) ? cr : []);
        setProfRatings(Array.isArray(pr?.ratings) ? pr.ratings : []);
      })
      .catch(() => {})
      .finally(() => setRatingsLoading(false));
  }, [id]);

  useEffect(() => { fetchRatings(); }, [fetchRatings]);

  const submitCourseRating = async ({ rating, comment }) => {
    const r = await apiFetch(`/api/course-ratings/${id}`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
    setCourseRatings(prev => [r, ...prev.filter(x => x.user_id !== user.id)]);
  };

  const submitProfRating = async ({ rating, comment }) => {
    const r = await apiFetch(`/api/professor-ratings/${id}`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
    setProfRatings(prev => [r, ...prev.filter(x => x.user_id !== user.id)]);
  };

  const deleteCourseRating = async (ratingId) => {
    await fetch(`${BASE}/api/course-ratings/${ratingId}`, { method: 'DELETE', headers: authHeaders() });
    setCourseRatings(prev => prev.filter(r => r.id !== ratingId));
  };

  const deleteProfRating = async (ratingId) => {
    await fetch(`${BASE}/api/professor-ratings/${ratingId}`, { method: 'DELETE', headers: authHeaders() });
    setProfRatings(prev => prev.filter(r => r.id !== ratingId));
  };

  // ── Loading / not-found ───────────────────────────────────────────────────
  if (allCourses.length > 0 && !course) {
    return (
      <>
        <Header total={allCourses.length} filtered={allCourses.length} user={user} onLogout={onLogout} />
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <p style={{ fontSize: 40 }}>🔍</p>
          <p style={{ color: 'var(--text-muted)' }}>Course not found.</p>
          <button className="cp-back-btn" onClick={() => navigate('/')}>← Back to Browse</button>
        </div>
      </>
    );
  }

  if (!course) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const color    = AREA_COLORS[course.area] || '#64748b';
  const inBasket = basket.has(course.id);
  const totalReviews = courseRatings.length + profRatings.length;

  return (
    <>
      <Header total={allCourses.length} filtered={allCourses.length} user={user} onLogout={onLogout} />

      <div className="cp-wrap">
        {/* ── Breadcrumb ── */}
        <div className="cp-breadcrumb">
          <button className="cp-back-btn" onClick={() => navigate(-1)}>← Back</button>
          <span className="cp-breadcrumb-sep">/</span>
          <span className="cp-breadcrumb-current">{course.course}</span>
        </div>

        {/* ── Hero header ── */}
        <div className="cp-hero" style={{ borderTopColor: color }}>
          <div className="cp-hero-top">
            <span className="cp-area-badge" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
              {course.area}
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isAdmin && !editing && (
                <>
                  <button className="cp-edit-btn"   onClick={startEdit}>Edit Course</button>
                  <button className="cp-delete-btn" onClick={() => setShowDelete(true)} disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Delete Course'}
                  </button>
                </>
              )}
              {!isAdmin && (
                <button
                  className={`cp-planner-btn ${inBasket ? 'in-basket' : ''}`}
                  onClick={() => toggleBasket(course)}
                >
                  {inBasket ? '✓ In Planner' : '+ Add to Planner'}
                </button>
              )}
            </div>
          </div>

          {editing ? (
            <div className="cp-edit-form">
              <div className="cp-edit-row full">
                <label>Course Name</label>
                <input
                  value={editDraft.course}
                  onChange={e => setEditDraft(d => ({ ...d, course: e.target.value }))}
                />
              </div>
              <div className="cp-edit-grid">
                <div className="cp-edit-row">
                  <label>Professor 1 *</label>
                  <ProfessorSelect
                    professors={professors}
                    value={editDraft.professor1_id}
                    onChange={id => setEditDraft(d => ({ ...d, professor1_id: id }))}
                    onProfessorCreated={handleProfCreated}
                    placeholder="— Select professor —"
                    required
                  />
                </div>
                <div className="cp-edit-row">
                  <label>Professor 2</label>
                  <ProfessorSelect
                    professors={professors}
                    value={editDraft.professor2_id}
                    onChange={id => setEditDraft(d => ({ ...d, professor2_id: id }))}
                    onProfessorCreated={handleProfCreated}
                    placeholder="— None —"
                  />
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
              {saveErr && <p className="cp-err">{saveErr}</p>}
              <div className="cp-edit-actions">
                <button className="cp-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
                <button className="cp-save-btn" onClick={saveEdit} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
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
              {saveErr && <p className="cp-err">{saveErr}</p>}
            </>
          )}
        </div>

        {/* ── Inline-editable content sections ── */}
        <div className="cp-sections-grid">
          <ContentSection
            title="About This Course"
            value={course.description}
            fieldKey="description"
            onSave={saveSection}
            isAdmin={isAdmin}
            type="text"
          />
          <ContentSection
            title="Course Curriculum"
            value={course.course_curriculum}
            fieldKey="course_curriculum"
            onSave={saveSection}
            isAdmin={isAdmin}
            type="curriculum"
          />
          <ContentSection
            title="Key Takeaways"
            value={course.key_takeaways}
            fieldKey="key_takeaways"
            onSave={saveSection}
            isAdmin={isAdmin}
            type="bullets"
          />
          <ContentSection
            title="Prerequisites"
            value={course.prerequisites}
            fieldKey="prerequisites"
            onSave={saveSection}
            isAdmin={isAdmin}
            type="text"
          />
        </div>

        {/* ── Reviews — full width ── */}
        <div className="cp-reviews-section">
          <h2 className="cp-reviews-heading">
            Reviews &amp; Ratings
            {totalReviews > 0 && <span className="cp-review-count-badge">{totalReviews}</span>}
          </h2>

          <div className="cp-ratings-grid">
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

      {/* ── Modals ── */}
      {showDelete && (
        <DeleteCourseModal
          courseName={course.course}
          onConfirm={confirmDelete}
          onCancel={() => setShowDelete(false)}
          deleting={deleting}
        />
      )}
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
    </>
  );
}
