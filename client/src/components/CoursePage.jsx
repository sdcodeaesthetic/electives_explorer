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

function calcAvg(ratings) {
  if (!ratings.length) return 0;
  return ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Static star display (supports float averages) ─────────────────────────────
function StarDisplay({ value, size = 17 }) {
  const rounded = Math.round(value);
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{
          fontSize: size, lineHeight: 1,
          color: s <= rounded ? '#f0a500' : 'rgba(255,255,255,0.2)',
        }}>★</span>
      ))}
    </span>
  );
}

// ── One summary row: [label]  ★★★★☆  4.2  (N) ────────────────────────────────
function RatingSummaryRow({ label, ratings, loading, showLabel = true }) {
  const average = calcAvg(ratings);
  return (
    <div className="cp-rsr">
      {showLabel && <span className="cp-rsr-label">{label}</span>}
      {loading ? (
        <span className="cp-muted" style={{ fontSize: 12 }}>Loading…</span>
      ) : ratings.length === 0 ? (
        <span className="cp-rsr-none">No ratings yet</span>
      ) : (
        <div className="cp-rsr-data">
          <StarDisplay value={average} size={17} />
          <span className="cp-rsr-val">{average.toFixed(1)}</span>
          <span className="cp-rsr-count">({ratings.length} {ratings.length === 1 ? 'rating' : 'ratings'})</span>
        </div>
      )}
    </div>
  );
}

// ── Compact rating submission form ────────────────────────────────────────────
function RatingForm({ formLabel, myRating, onSubmit }) {
  const [rating,     setRating]     = useState(myRating?.rating  || 0);
  const [comment,    setComment]    = useState(myRating?.comment || '');
  const [anonymous,  setAnonymous]  = useState(myRating?.anonymous || false);
  const [submitting, setSubmitting] = useState(false);
  const [err,        setErr]        = useState('');

  // Sync if myRating changes (e.g. after submit)
  useEffect(() => {
    if (myRating) {
      setRating(myRating.rating);
      setComment(myRating.comment || '');
      setAnonymous(myRating.anonymous || false);
    }
  }, [myRating]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { setErr('Please select a star rating.'); return; }
    setErr(''); setSubmitting(true);
    try { await onSubmit({ rating, comment, anonymous }); }
    catch (e) { setErr(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <form className="cp-rate-form" onSubmit={handleSubmit}>
      {formLabel && <span className="cp-rate-form-label">{formLabel}</span>}
      <div className="cp-rating-group">
        <StarRating value={rating} onChange={setRating} size={22} />
        <span className="cp-rating-hint">{rating ? `${rating}/5` : 'Tap to rate'}</span>
        {myRating && <span className="cp-edit-hint-inline">Editing your rating</span>}
      </div>
      <textarea
        className="cp-comment-input"
        rows={2}
        placeholder="Add a comment (optional)…"
        value={comment}
        onChange={e => setComment(e.target.value)}
      />
      <label className="cp-anon-label">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={e => setAnonymous(e.target.checked)}
        />
        Anonymous
      </label>
      {err && <p className="cp-err">{err}</p>}
      <button className="cp-submit-btn" type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : myRating ? 'Update Rating' : 'Submit Rating'}
      </button>
    </form>
  );
}

// ── Comment card (full-width grid below ratings) ──────────────────────────────
function CommentCard({ review, source, isAdmin, onDelete }) {
  return (
    <div className="cp-comment-card">
      <div className="cp-comment-card-top">
        <div className="cp-reviewer-info">
          <div className="cp-avatar cp-avatar--anon" data-anon={review.anonymous}>
            {review.anonymous ? 'A' : (review.user_name?.[0]?.toUpperCase() || '?')}
          </div>
          <div>
            <span className="cp-reviewer-name">{review.anonymous ? 'Anonymous' : review.user_name}</span>
            <span className="cp-review-date">{fmtDate(review.created_at)}</span>
          </div>
        </div>
        <div className="cp-comment-card-right">
          <StarDisplay value={review.rating} size={13} />
          <span className="cp-comment-source">{source}</span>
          {isAdmin && (
            <button className="cp-delete-review" onClick={() => onDelete(review.id)} title="Delete">🗑</button>
          )}
        </div>
      </div>
      <p className="cp-review-comment">{review.comment}</p>
    </div>
  );
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

// ── Complementary Courses section ────────────────────────────────────────────
function ComplementarySection({ courses: raw, isAdmin, onSave, allCourses }) {
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState('');
  const [jsonErr,  setJsonErr]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [notFound, setNotFound] = useState(false);

  function showNotFound() {
    setNotFound(true);
    setTimeout(() => setNotFound(false), 2500);
  }

  let courses = raw;
  if (typeof raw === 'string') {
    try { courses = JSON.parse(raw); } catch { courses = []; }
  }
  if (!Array.isArray(courses)) courses = [];

  function startEdit() { setDraft(JSON.stringify(courses, null, 2)); setJsonErr(''); setEditing(true); }

  async function save() {
    let parsed;
    try {
      parsed = JSON.parse(draft);
      if (!Array.isArray(parsed)) { setJsonErr('Value must be a JSON array.'); return; }
    } catch (e) { setJsonErr('Invalid JSON: ' + e.message); return; }
    setSaving(true);
    try { await onSave('complementary_courses', parsed); setEditing(false); }
    catch (e) { setJsonErr(e.message); }
    finally { setSaving(false); }
  }

  if (!isAdmin && courses.length === 0) return null;

  return (
    <div className="cp-section-card">
      <div className="cp-section-header">
        <h3 className="cp-section-heading">Complementary Courses</h3>
        {isAdmin && !editing && (
          <button className="cp-inline-edit-btn" onClick={startEdit}>Edit</button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            className="cp-edit-textarea cp-json-editor"
            rows={14}
            value={draft}
            placeholder='[{"course":"...","term":"...","credits":3,"area":"...","faculty":"...","why":"..."}]'
            onChange={e => { setDraft(e.target.value); setJsonErr(''); }}
            autoFocus
          />
          {jsonErr && <p className="cp-err">{jsonErr}</p>}
          <div className="cp-section-edit-actions">
            <button className="cp-cancel-btn" onClick={() => { setEditing(false); setJsonErr(''); }}>Cancel</button>
            <button className="cp-save-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      ) : courses.length > 0 ? (
        <div className="cp-comp-list" style={{ position: 'relative' }}>
          {notFound && (
            <div className="cp-comp-not-found-toast">Course not found.</div>
          )}
          {courses.map((c, i) => {
            const match = Array.isArray(allCourses)
              ? allCourses.find(ac => ac.course?.toLowerCase() === c.course?.toLowerCase())
              : null;
            const cardContent = (
              <>
                <div className="cp-comp-header">
                  <span className="cp-comp-name">{c.course}</span>
                  <div className="cp-comp-pills">
                    <span className="cp-comp-pill">{c.term}</span>
                    <span className="cp-comp-pill">{c.credits} cr</span>
                    <span className="cp-comp-pill">{c.area}</span>
                  </div>
                </div>
                <p className="cp-comp-faculty">{c.faculty}</p>
                <p className="cp-comp-why">{c.why}</p>
              </>
            );
            return match ? (
              <a
                key={i}
                href={`/#/course/${match.id}`}
                target="_blank"
                rel="noreferrer"
                className="cp-comp-card cp-comp-card-link"
              >
                {cardContent}
              </a>
            ) : (
              <div key={i} className="cp-comp-card cp-comp-card-link" onClick={showNotFound} style={{ cursor: 'pointer' }}>
                {cardContent}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="cp-muted cp-empty-hint">Not set — click Edit to add.</p>
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
          <button className="clear-confirm-no"  onClick={onCancel}  disabled={deleting}>Cancel</button>
          <button className="clear-confirm-yes" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
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
  const [courseRatings,   setCourseRatings]   = useState([]);
  const [profRatingsData, setProfRatingsData] = useState({ professors: [] });
  const [ratingsLoading,  setRatingsLoading]  = useState(true);

  const fetchRatings = useCallback(() => {
    if (!id) return;
    setRatingsLoading(true);
    Promise.all([
      fetch(`${BASE}/api/course-ratings/${id}`).then(r => r.json()),
      fetch(`${BASE}/api/professor-ratings/by-course/${id}`).then(r => r.json()),
    ])
      .then(([cr, pr]) => {
        setCourseRatings(Array.isArray(cr) ? cr : []);
        setProfRatingsData(pr?.professors ? pr : { professors: [] });
      })
      .catch(() => {})
      .finally(() => setRatingsLoading(false));
  }, [id]);

  useEffect(() => { fetchRatings(); }, [fetchRatings]);

  const submitCourseRating = async ({ rating, comment, anonymous }) => {
    const r = await apiFetch(`/api/course-ratings/${id}`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment, anonymous }),
    });
    setCourseRatings(prev => [r, ...prev.filter(x => x.user_id !== user.id)]);
  };

  const submitProfRating = async (professorId, { rating, comment, anonymous }) => {
    const r = await apiFetch(`/api/professor-ratings/${id}`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment, anonymous, professor_id: professorId }),
    });
    setProfRatingsData(prev => ({
      professors: prev.professors.map(p =>
        p.id === professorId
          ? { ...p, ratings: [r, ...p.ratings.filter(x => x.user_id !== user.id)] }
          : p
      ),
    }));
  };

  const deleteCourseRating = async (ratingId) => {
    await fetch(`${BASE}/api/course-ratings/${ratingId}`, { method: 'DELETE', headers: authHeaders() });
    setCourseRatings(prev => prev.filter(r => r.id !== ratingId));
  };

  const deleteProfRating = async (ratingId) => {
    await fetch(`${BASE}/api/professor-ratings/${ratingId}`, { method: 'DELETE', headers: authHeaders() });
    setProfRatingsData(prev => ({
      professors: prev.professors.map(p => ({
        ...p,
        ratings: p.ratings.filter(r => r.id !== ratingId),
      })),
    }));
  };

  // ── All comments (course + all professors), newest first ─────────────────
  const allComments = [
    ...courseRatings.filter(r => r.comment).map(r => ({ ...r, _source: 'Course' })),
    ...profRatingsData.professors.flatMap(p =>
      p.ratings.filter(r => r.comment).map(r => ({ ...r, _source: p.name }))
    ),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const totalRatings = courseRatings.length +
    profRatingsData.professors.reduce((s, p) => s + p.ratings.length, 0);

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
          <ComplementarySection
            courses={course.complementary_courses}
            isAdmin={isAdmin}
            onSave={saveSection}
            allCourses={allCourses}
          />
        </div>

        {/* ── Reviews — full width ── */}
        <div className="cp-reviews-section">
          <h2 className="cp-reviews-heading">
            Reviews &amp; Ratings
            {totalRatings > 0 && <span className="cp-review-count-badge">{totalRatings}</span>}
          </h2>

          {/* ── Two-column rating tiles ── */}
          <div className="cp-ratings-grid">

            {/* Course rating tile */}
            <div className="cp-rating-tile">
              <h3 className="cp-rating-tile-title">Course Rating</h3>
              <RatingSummaryRow
                ratings={courseRatings}
                loading={ratingsLoading}
                showLabel={false}
              />
              {!isAdmin && (
                <RatingForm
                  myRating={courseRatings.find(r => r.user_id === user?.id)}
                  onSubmit={submitCourseRating}
                />
              )}
            </div>

            {/* Professor rating tile */}
            <div className="cp-rating-tile">
              <h3 className="cp-rating-tile-title">Professor Ratings</h3>
              {ratingsLoading ? (
                <p className="cp-muted" style={{ fontSize: 13 }}>Loading…</p>
              ) : profRatingsData.professors.length === 0 ? (
                <p className="cp-rsr-none">No professor assigned.</p>
              ) : (
                profRatingsData.professors.map((prof, idx) => (
                  <div key={prof.id} className={`cp-prof-rating-block${idx > 0 ? ' cp-prof-rating-block--sep' : ''}`}>
                    <RatingSummaryRow
                      label={prof.name}
                      ratings={prof.ratings}
                      loading={ratingsLoading}
                      showLabel={true}
                    />
                    {!isAdmin && (
                      <RatingForm
                        formLabel={`Rate ${prof.name}`}
                        myRating={prof.ratings.find(r => r.user_id === user?.id)}
                        onSubmit={(payload) => submitProfRating(prof.id, payload)}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Comments — always visible, full width below the two tiles ── */}
          <div className="cp-comments-section">
            <h3 className="cp-comments-heading">
              Comments
              {allComments.length > 0 && <span className="cp-review-count-badge">{allComments.length}</span>}
            </h3>
            {allComments.length === 0 ? (
              <p className="cp-rsr-none" style={{ padding: '8px 0' }}>No comments yet.</p>
            ) : (
              <div className="cp-comments-grid">
                {allComments.map(r => (
                  <CommentCard
                    key={`${r._source}-${r.id}`}
                    review={r}
                    source={r._source}
                    isAdmin={isAdmin}
                    onDelete={r._source === 'Course' ? deleteCourseRating : deleteProfRating}
                  />
                ))}
              </div>
            )}
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
