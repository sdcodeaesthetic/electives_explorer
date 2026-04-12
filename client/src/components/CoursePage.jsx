import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StarRating from './StarRating';
import Header from './Header';
import { apiFetch } from '../lib/api';
import BASE from '../lib/api';
import courseDetails from '../data/courseDetails.js';
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

/**
 * Determines whether a student's email is from a batch that is eligible
 * to submit ratings and comments.
 *
 * Eligibility rules (MBA programme, IIM Sambalpur):
 *  - Email pattern: mba{YY}{name}@iimsambalpur.ac.in  (e.g. mba25swarnadip@...)
 *  - Batch YY = programme start year 20YY, end year 20(YY+2)
 *  - First year: July 20YY → March 20(YY+1)
 *  - Promoted to second year (senior): June 20(YY+1)
 *  - Can rate: senior batch (≥ June 1 of 20(YY+1)) OR alumni (passout)
 *  - Cannot rate: still in first year (< June 1 of 20(YY+1))
 */
function getBatchEligibility(email) {
  if (!email) return { canRate: false, reason: 'not_logged_in', eligibleFrom: null };

  const match = email.toLowerCase().match(/^mba(\d{2})/);
  if (!match) return { canRate: false, reason: 'non_mba', eligibleFrom: null };

  const batchStartYear = 2000 + parseInt(match[1], 10);
  // Senior promotion: around June 1 of the second calendar year
  const seniorDate = new Date(batchStartYear + 1, 5, 1); // month is 0-indexed; 5 = June
  const now = new Date();

  if (now >= seniorDate) {
    return { canRate: true, reason: 'eligible', eligibleFrom: null };
  }
  return { canRate: false, reason: 'junior', eligibleFrom: seniorDate };
}

// ── Static filled-star display (supports float averages) ─────────────────────
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

// ── One summary row:  [label]  ★★★★☆  4.2  (N ratings) ──────────────────────
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

// ── Compact per-entity rating form ────────────────────────────────────────────
function RatingForm({ formLabel, myRating, onSubmit }) {
  const [rating,     setRating]     = useState(myRating?.rating  || 0);
  const [comment,    setComment]    = useState(myRating?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [err,        setErr]        = useState('');

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
      {err && <p className="cp-err">{err}</p>}
      <button className="cp-submit-btn" type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : myRating ? 'Update Rating' : 'Submit Rating'}
      </button>
    </form>
  );
}

// ── Comment card ──────────────────────────────────────────────────────────────
function CommentCard({ review, source }) {
  return (
    <div className="cp-comment-card">
      <div className="cp-comment-card-top">
        <div className="cp-reviewer-info">
          <div className="cp-avatar">{review.user_name?.[0]?.toUpperCase() || '?'}</div>
          <div>
            <span className="cp-reviewer-name">{review.user_name}</span>
            <span className="cp-review-date">{fmtDate(review.created_at)}</span>
          </div>
        </div>
        <div className="cp-comment-card-right">
          <StarDisplay value={review.rating} size={13} />
          <span className="cp-comment-source">{source}</span>
        </div>
      </div>
      <p className="cp-review-comment">{review.comment}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CoursePage({
  allCourses, courseOverrides, onCourseUpdated,
  basket, toggleBasket, validationMsg, setValidationMsg,
  user, onLogout,
}) {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isAdmin  = user?.role === 'admin';

  // Batch-based rating eligibility (students only; admins bypass this)
  const eligibility = isAdmin ? { canRate: false } : getBatchEligibility(user?.email);
  const canRate     = !isAdmin && eligibility.canRate;

  const base = allCourses.find(c => String(c.id) === id);
  const [course, setCourse] = useState(base ? (courseOverrides[base.id] || base) : null);

  useEffect(() => {
    if (!course && allCourses.length) {
      const found = allCourses.find(c => String(c.id) === id);
      if (found) setCourse(courseOverrides[found.id] || found);
    }
  }, [allCourses, id, courseOverrides, course]);

  // ── Admin edit ────────────────────────────────────────────────────────────
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

  // ── DB-backed ratings ─────────────────────────────────────────────────────
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

  const submitCourseRating = async ({ rating, comment }) => {
    const r = await apiFetch(`/api/course-ratings/${id}`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
    setCourseRatings(prev => [r, ...prev.filter(x => x.user_id !== user.id)]);
  };

  const submitProfRating = async (professorId, { rating, comment }) => {
    const r = await apiFetch(`/api/professor-ratings/${id}`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment, professor_id: professorId }),
    });
    setProfRatingsData(prev => ({
      professors: prev.professors.map(p =>
        p.id === professorId
          ? { ...p, ratings: [r, ...p.ratings.filter(x => x.user_id !== user.id)] }
          : p
      ),
    }));
  };

  // All comments (course + professors), newest first
  const allComments = [
    ...courseRatings.filter(r => r.comment).map(r => ({ ...r, _source: 'Course' })),
    ...profRatingsData.professors.flatMap(p =>
      p.ratings.filter(r => r.comment).map(r => ({ ...r, _source: p.name }))
    ),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const totalRatings = courseRatings.length +
    profRatingsData.professors.reduce((s, p) => s + p.ratings.length, 0);

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

  const color    = AREA_COLORS[course.area] || '#64748b';
  const inBasket = basket.has(course.id);
  const detail   = courseDetails[String(course.id)];

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
            <div style={{ display: 'flex', gap: 8 }}>
              {isAdmin && !editing && (
                <button className="cp-edit-btn" onClick={startEdit}>Edit Course</button>
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
                <textarea rows={3} value={editDraft.description}
                  placeholder="Add a short course description…"
                  onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} />
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
              {course.description && <p className="cp-description">{course.description}</p>}
            </>
          )}
        </div>

        {/* ── Static course details (from courseDetails.js) ── */}
        {detail && (
          <div className="cp-detail-grid">
            {detail.intro && (
              <div className="cp-detail-card cp-detail-full">
                <h3 className="cp-detail-heading">About This Course</h3>
                <p className="cp-detail-text">{detail.intro}</p>
              </div>
            )}
            {detail.outline?.length > 0 && (
              <div className="cp-detail-card cp-detail-full cp-curriculum-card">
                <h3 className="cp-detail-heading">Course Curriculum</h3>
                <p className="cp-detail-text" style={{ marginBottom: 16 }}>
                  This course is structured across {detail.outline.length} topic{detail.outline.length > 1 ? 's' : ''},
                  covering both foundational concepts and applied skills.
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
            {detail.keyTakeaways?.length > 0 && (
              <div className="cp-detail-card">
                <h3 className="cp-detail-heading">Key Takeaways</h3>
                <ul className="cp-detail-list cp-takeaway-list">
                  {detail.keyTakeaways.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
            <div className="cp-detail-card cp-prereq-card">
              <h3 className="cp-detail-heading">Prerequisites</h3>
              <p className="cp-detail-text cp-prereq-text">{detail.prerequisites || 'None mentioned'}</p>
            </div>
          </div>
        )}

        {/* ── Reviews & Ratings — full width ── */}
        <div className="cp-reviews-section">
          <h2 className="cp-reviews-heading">
            Reviews &amp; Ratings
            {totalRatings > 0 && <span className="cp-review-count-badge">{totalRatings}</span>}
          </h2>

          {/* Locked notice for first-year students */}
          {!isAdmin && !canRate && (
            <div className="cp-rate-locked">
              <span className="cp-rate-locked-icon">🔒</span>
              <span>
                Rating &amp; commenting is available for <strong>senior and alumni batch</strong> students only.
                {eligibility.eligibleFrom && (
                  <> You will be eligible from <strong>
                    {eligibility.eligibleFrom.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </strong>.</>
                )}
              </span>
            </div>
          )}

          {/* Two-column rating tiles */}
          <div className="cp-ratings-grid">

            {/* Course rating */}
            <div className="cp-rating-tile">
              <h3 className="cp-rating-tile-title">Course Rating</h3>
              <RatingSummaryRow
                ratings={courseRatings}
                loading={ratingsLoading}
                showLabel={false}
              />
              {canRate && (
                <RatingForm
                  myRating={courseRatings.find(r => r.user_id === user?.id)}
                  onSubmit={submitCourseRating}
                />
              )}
            </div>

            {/* Professor ratings — one row per professor */}
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
                      loading={false}
                      showLabel={true}
                    />
                    {canRate && (
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

          {/* Comments — full width below tiles */}
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
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Validation modal ── */}
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
