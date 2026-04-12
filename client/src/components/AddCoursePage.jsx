import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getToken } from '../lib/api';
import BASE from '../lib/api';
import Header from './Header';
import ProfessorSelect from './ProfessorSelect';
import '../styles/AddCoursePage.css';

const AREAS   = ['Finance','GMPP','ISM','Marketing','OB/HR','Operations','Strategy','Inter-Area'];
const TERMS   = ['Term IV','Term V','Term VI'];
const CREDITS = [1.5, 3];  // Only two options as requested

export default function AddCoursePage({ onCreated, user, onLogout, allCourses }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    course:            '',
    professor1_id:     '',
    professor2_id:     '',
    area:              AREAS[0],
    term:              TERMS[0],
    credits:           3,
    description:       '',
    course_curriculum: '',
    prerequisites:     '',
  });

  // Key Takeaways as an array of bullet strings
  const [bullets,    setBullets]    = useState(['']);
  const [professors, setProfessors] = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState('');

  // File upload state
  const [uploading,    setUploading]    = useState(false);
  const [uploadErr,    setUploadErr]    = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  useEffect(() => {
    fetch(`${BASE}/api/professors`).then(r => r.json()).then(setProfessors).catch(() => {});
  }, []);

  const handleProfCreated = (p) =>
    setProfessors(prev => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));

  // ── Bullet helpers ──────────────────────────────────────────────────────
  const addBullet    = () => setBullets(prev => [...prev, '']);
  const removeBullet = (i) => setBullets(prev => prev.filter((_, idx) => idx !== i));
  const updateBullet = (i, val) => setBullets(prev => prev.map((b, idx) => idx === i ? val : b));

  // ── File upload + AI parse ──────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file.name);
    setUploadErr('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = getToken();
      const res = await fetch(`${BASE}/api/parse-course`, {
        method:  'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body:    formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to parse file');
      }
      const data = await res.json();
      // Auto-fill form fields
      if (data.course)            set('course',            data.course);
      if (data.description)       set('description',       data.description);
      if (data.course_curriculum) set('course_curriculum', data.course_curriculum);
      if (data.prerequisites)     set('prerequisites',     data.prerequisites);
      if (data.key_takeaways) {
        const parsed = data.key_takeaways.split('\n').filter(l => l.trim());
        setBullets(parsed.length ? parsed : ['']);
      }
    } catch (e) {
      setUploadErr('Auto-fill failed: ' + e.message);
    } finally {
      setUploading(false);
      // Reset so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.course.trim()) { setErr('Course name is required.'); return; }
    if (!form.professor1_id)  { setErr('Professor 1 is required.'); return; }

    setSaving(true); setErr('');
    try {
      const payload = {
        ...form,
        professor1_id:  parseInt(form.professor1_id),
        professor2_id:  form.professor2_id ? parseInt(form.professor2_id) : null,
        credits:        parseFloat(form.credits),
        key_takeaways:  bullets.filter(b => b.trim()).join('\n'),
      };
      const created = await apiFetch('/api/courses', {
        method: 'POST',
        body:   JSON.stringify(payload),
      });
      onCreated && onCreated(created);
      navigate(`/course/${created.id}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header total={allCourses?.length ?? 0} filtered={allCourses?.length ?? 0} user={user} onLogout={onLogout} />

      <div className="acp-wrap">
        {/* ── Page header ── */}
        <div className="acp-page-header">
          <button className="cp-back-btn" onClick={() => navigate(-1)}>← Back</button>
          <h1 className="acp-page-title">Add New Elective Course</h1>
        </div>

        <form className="acp-form" onSubmit={handleSubmit}>

          {/* ── File upload (optional, fills form automatically) ── */}
          <div className="acp-upload-card">
            <div className="acp-upload-icon">📄</div>
            <div className="acp-upload-content">
              <p className="acp-upload-title">Auto-fill from PDF or Word Document</p>
              <p className="acp-upload-sub">
                Upload a course brochure or syllabus — fields will be filled automatically using AI.
              </p>
              {uploadedFile && !uploading && (
                <p className="acp-upload-file">✓ Parsed: <strong>{uploadedFile}</strong></p>
              )}
              {uploadErr && <p className="acp-upload-err">{uploadErr}</p>}
            </div>
            <div className="acp-upload-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="acp-file-input"
                id="acp-file"
              />
              <label htmlFor="acp-file" className={`acp-upload-btn ${uploading ? 'loading' : ''}`}>
                {uploading ? 'Parsing…' : 'Choose File'}
              </label>
            </div>
          </div>

          {/* ── Section: Course Info ── */}
          <div className="acp-section">
            <h2 className="acp-section-title">Course Information</h2>
            <div className="acp-field">
              <label>Course Name *</label>
              <input
                value={form.course}
                onChange={e => set('course', e.target.value)}
                placeholder="e.g. Financial Risk Management"
                autoFocus
              />
            </div>
            <div className="acp-grid-2">
              <div className="acp-field">
                <label>Professor 1 *</label>
                <ProfessorSelect
                  professors={professors}
                  value={form.professor1_id}
                  onChange={id => set('professor1_id', id)}
                  onProfessorCreated={handleProfCreated}
                  placeholder="— Select professor —"
                  required
                />
              </div>
              <div className="acp-field">
                <label>Professor 2</label>
                <ProfessorSelect
                  professors={professors}
                  value={form.professor2_id}
                  onChange={id => set('professor2_id', id)}
                  onProfessorCreated={handleProfCreated}
                  placeholder="— None —"
                />
              </div>
              <div className="acp-field">
                <label>Area</label>
                <select value={form.area} onChange={e => set('area', e.target.value)}>
                  {AREAS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div className="acp-field">
                <label>Term</label>
                <select value={form.term} onChange={e => set('term', e.target.value)}>
                  {TERMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="acp-field">
                <label>Credits</label>
                <select value={form.credits} onChange={e => set('credits', e.target.value)}>
                  {CREDITS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Section: Course Content ── */}
          <div className="acp-section">
            <h2 className="acp-section-title">Course Content</h2>

            {/* About This Course */}
            <div className="acp-field">
              <label>About This Course</label>
              <textarea
                rows={4}
                value={form.description}
                placeholder="Describe what this course is about, its goals and relevance…"
                onChange={e => set('description', e.target.value)}
              />
            </div>

            {/* Course Curriculum */}
            <div className="acp-field">
              <label>Course Curriculum</label>
              <textarea
                rows={6}
                value={form.course_curriculum}
                placeholder="One topic per line — e.g.&#10;Introduction to Risk Management&#10;Credit Risk Models&#10;Market Risk Analysis"
                onChange={e => set('course_curriculum', e.target.value)}
              />
              <span className="acp-field-hint">Each line will appear as a separate curriculum item.</span>
            </div>

            {/* Key Takeaways — bulleted */}
            <div className="acp-field">
              <label>Key Takeaways</label>
              <div className="acp-bullets-wrap">
                {bullets.map((b, i) => (
                  <div className="acp-bullet-row" key={i}>
                    <span className="acp-bullet-dot">•</span>
                    <input
                      className="acp-bullet-input"
                      value={b}
                      placeholder={`Takeaway ${i + 1}…`}
                      onChange={e => updateBullet(i, e.target.value)}
                    />
                    {bullets.length > 1 && (
                      <button type="button" className="acp-bullet-remove" onClick={() => removeBullet(i)} title="Remove">×</button>
                    )}
                  </div>
                ))}
                <button type="button" className="acp-add-bullet-btn" onClick={addBullet}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Bullet
                </button>
              </div>
            </div>

            {/* Prerequisites */}
            <div className="acp-field">
              <label>Prerequisites</label>
              <textarea
                rows={3}
                value={form.prerequisites}
                placeholder="Describe any prerequisites or prior knowledge required…"
                onChange={e => set('prerequisites', e.target.value)}
              />
            </div>
          </div>

          {/* ── Actions ── */}
          {err && <p className="acp-err">{err}</p>}
          <div className="acp-form-actions">
            <button type="button" className="cp-cancel-btn" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="acp-submit-btn" disabled={saving}>
              {saving ? 'Creating Course…' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
