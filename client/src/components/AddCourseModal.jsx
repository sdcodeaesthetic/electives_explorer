import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import BASE from '../lib/api';
import ProfessorSelect from './ProfessorSelect';
import '../styles/CourseDetailModal.css';

const AREAS   = ['Finance','GMPP','ISM','Marketing','OB/HR','Operations','Strategy','Inter-Area'];
const TERMS   = ['Term IV','Term V','Term VI'];
const CREDITS = [1.5, 2, 2.5, 3, 4, 6];

export default function AddCourseModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    course: '', professor1_id: '', professor2_id: '', area: AREAS[0], term: TERMS[0], credits: 3, description: '',
  });
  const [professors, setProfessors] = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState('');

  useEffect(() => {
    fetch(`${BASE}/api/professors`).then(r => r.json()).then(setProfessors).catch(() => {});
  }, []);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleProfCreated = (p) =>
    setProfessors(prev => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.course.trim() || !form.professor1_id) {
      setErr('Course name and Professor 1 are required.');
      return;
    }
    setSaving(true); setErr('');
    try {
      const payload = {
        course:        form.course,
        professor1_id: parseInt(form.professor1_id),
        professor2_id: form.professor2_id ? parseInt(form.professor2_id) : null,
        area:          form.area,
        term:          form.term,
        credits:       parseFloat(form.credits),
        description:   form.description,
      };
      const created = await apiFetch('/api/courses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onCreated(created);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cdm-backdrop" onClick={onClose}>
      <div className="cdm-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="cdm-header" style={{ borderTopColor: 'var(--accent)' }}>
          <div className="cdm-header-top">
            <span className="cdm-area-badge" style={{ background: 'rgba(240,165,0,0.15)', color: 'var(--accent)', border: '1px solid rgba(240,165,0,0.3)' }}>
              New Course
            </span>
            <button className="cdm-close" onClick={onClose}>✕</button>
          </div>
          <h2 className="cdm-title" style={{ fontSize: 20 }}>Add Elective Course</h2>
        </div>

        <div className="cdm-body">
          <form className="cdm-edit-form" onSubmit={handleSubmit}>
            <div className="cdm-edit-row">
              <label>Course Name *</label>
              <input
                value={form.course}
                onChange={e => set('course', e.target.value)}
                placeholder="e.g. Financial Risk Management"
                autoFocus
              />
            </div>
            <div className="cdm-edit-grid">
              <div className="cdm-edit-row">
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
              <div className="cdm-edit-row">
                <label>Professor 2</label>
                <ProfessorSelect
                  professors={professors}
                  value={form.professor2_id}
                  onChange={id => set('professor2_id', id)}
                  onProfessorCreated={handleProfCreated}
                  placeholder="— None —"
                />
              </div>
              <div className="cdm-edit-row">
                <label>Area</label>
                <select value={form.area} onChange={e => set('area', e.target.value)}>
                  {AREAS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div className="cdm-edit-row">
                <label>Term</label>
                <select value={form.term} onChange={e => set('term', e.target.value)}>
                  {TERMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="cdm-edit-row">
                <label>Credits</label>
                <select value={form.credits} onChange={e => set('credits', e.target.value)}>
                  {CREDITS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="cdm-edit-row">
              <label>Description</label>
              <textarea
                rows={3}
                value={form.description}
                placeholder="Short course description (optional)…"
                onChange={e => set('description', e.target.value)}
              />
            </div>
            {err && <p className="cdm-err">{err}</p>}
            <div className="cdm-edit-actions">
              <button type="button" className="cdm-cancel-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="cdm-save-btn" disabled={saving}>
                {saving ? 'Creating…' : 'Create Course'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
