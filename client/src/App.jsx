import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './styles/global.css';
import { useCourses } from './hooks/useCourses';
import { useAuth } from './context/AuthContext';
import { apiFetch } from './lib/api';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import CourseGrid from './components/CourseGrid';
import BasketView from './components/BasketView';
import CoursePage from './components/CoursePage';
import LoginPage from './components/LoginPage';
import SuggestionsTab from './components/SuggestionsTab';
import CreditRibbon from './components/CreditRibbon';
import AddCoursePage from './components/AddCoursePage';

// ── Mobile credit progress badge (Browse tab, mobile only) ───────────────────
const MCB_TERMS = [
  { key: 'Term IV',  label: 'T4', min: 18, max: 21 },
  { key: 'Term V',   label: 'T5', min: 18, max: 21 },
  { key: 'Term VI',  label: 'T6', min: 12, max: 12 },
];

function MobileCreditBadge({ basketCourses }) {
  const TOTAL_MIN = 48, TOTAL_MAX = 54;
  const total   = basketCourses.reduce((s, c) => s + (parseFloat(c.credits) || 0), 0);
  const pct     = Math.min(100, (total / TOTAL_MAX) * 100);
  const minMark = (TOTAL_MIN / TOTAL_MAX) * 100;
  const status  = total === 0 ? 'empty' : total > TOTAL_MAX ? 'over' : total >= TOTAL_MIN ? 'ok' : 'under';

  return (
    <div className={`mcb-widget mcb-${status}`}>
      {/* Total row */}
      <div className="mcb-total-row">
        <span className="mcb-label">Credits</span>
        <span className="mcb-num">{total}<span className="mcb-range">/{TOTAL_MAX}</span></span>
      </div>
      <div className="mcb-bar-track">
        <div className="mcb-bar-fill" style={{ width: `${pct}%` }} />
        <div className="mcb-bar-min"  style={{ left: `${minMark}%` }} />
      </div>

      {/* Per-term mini bars */}
      <div className="mcb-terms">
        {MCB_TERMS.map(({ key, label, min, max }) => {
          const cr  = basketCourses.filter(c => c.term === key).reduce((s, c) => s + (parseFloat(c.credits) || 0), 0);
          const tp  = Math.min(100, (cr / max) * 100);
          const tm  = (min / max) * 100;
          const ts  = cr === 0 ? 'empty' : cr > max ? 'over' : cr >= min ? 'ok' : 'under';
          return (
            <div key={key} className="mcb-term-row">
              <span className="mcb-term-label">{label}</span>
              <div className={`mcb-term-track mcb-t-${ts}`}>
                <div className="mcb-term-fill" style={{ width: `${tp}%` }} />
                <div className="mcb-term-min"  style={{ left: `${tm}%` }} />
              </div>
              <span className={`mcb-term-cr mcb-t-${ts}`}>{cr}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TERM_RULES = {
  'Term IV':  { min: 18, max: 21, label: 'Term 4' },
  'Term V':   { min: 18, max: 21, label: 'Term 5' },
  'Term VI':  { min: 12, max: 12, label: 'Term 6' },
};
const TOTAL_MIN = 48;
const TOTAL_MAX = 54;

function getTermCredits(courses, term) {
  return courses.filter(c => c.term === term).reduce((s, c) => s + (c.credits || 0), 0);
}

export default function App() {
  const { user, logout } = useAuth();

  // Show login page if not authenticated
  if (!user) return <LoginPage />;

  return <AppInner logout={logout} user={user} />;
}

function AppInner({ logout, user }) {
  const navigate = useNavigate();
  const {
    loading, error,
    filtered, allCourses,
    areas, faculties, terms,
    search, setSearch,
    selectedAreas, toggleArea,
    selectedCredit, setSelectedCredit,
    selectedFaculty, setSelectedFaculty,
    selectedTerm, setSelectedTerm,
    clearAll, hasFilters,
    filterVersion,
    refetchCourses,
  } = useCourses();

  const [activeTab, setActiveTab]     = useState('browse');
  const [basket,    setBasket]        = useState(new Set());
  const [validationMsg, setValidationMsg] = useState(null);
  const [courseOverrides, setCourseOverrides] = useState({});

  const saveTimer    = useRef(null);
  const isRestored   = useRef(false);

  // Restore basket from DB on login (students only)
  useEffect(() => {
    if (user.role !== 'student') return;
    apiFetch('/api/session')
      .then(data => {
        if (data.basket?.length) setBasket(new Set(data.basket));
        isRestored.current = true;
      })
      .catch(() => { isRestored.current = true; });
  }, [user]);

  // Auto-save basket to DB whenever it changes (students only, debounced 800ms)
  useEffect(() => {
    if (user.role !== 'student' || !isRestored.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiFetch('/api/session', {
        method: 'PUT',
        body: JSON.stringify({ basket: [...basket] }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [basket, user]);

  // When admin saves an edit, sync overrides back to browse view
  const handleCourseUpdated = (updated) => {
    setCourseOverrides(prev => ({ ...prev, [updated.id]: updated }));
  };

  // When admin creates a new course (from AddCoursePage), refresh the full list
  const handleCourseCreated = () => {
    refetchCourses();
  };

  // When admin deletes a course from the grid tile
  const handleDeleteCourse = async (course) => {
    try {
      await apiFetch(`/api/courses/${course.id}`, { method: 'DELETE' });
      refetchCourses();
    } catch (e) {
      setValidationMsg([e.message]);
    }
  };

  // When admin deletes a course from inside CoursePage
  const handleCourseDeleted = (courseId) => {
    setCourseOverrides(prev => { const next = { ...prev }; delete next[courseId]; return next; });
    refetchCourses();
  };

  const clearBasket = () => setBasket(new Set());

  const toggleBasket = (course) => {
    setBasket(prev => {
      const next = new Set(prev);
      if (next.has(course.id)) {
        next.delete(course.id);
        return next;
      }

      // Simulate adding the course and check constraints
      const simCourses = allCourses.filter(c => next.has(c.id)).concat(course);
      const t4    = getTermCredits(simCourses, 'Term IV');
      const t5    = getTermCredits(simCourses, 'Term V');
      const t6    = getTermCredits(simCourses, 'Term VI');
      const total = t4 + t5 + t6;

      const violations = [];
      if (course.term === 'Term IV' && t4 > 21)
        violations.push(`Term 4 would exceed the 21-credit maximum (${t4} cr).`);
      if (course.term === 'Term V' && t5 > 21)
        violations.push(`Term 5 would exceed the 21-credit maximum (${t5} cr).`);
      if (course.term === 'Term VI' && t6 > 12)
        violations.push(`Term 6 is capped at exactly 12 credits (${t6} cr).`);
      if (total > TOTAL_MAX)
        violations.push(`Total would exceed the ${TOTAL_MAX}-credit maximum (${total} cr).`);

      if (violations.length > 0) {
        setValidationMsg(violations);
        return prev;
      }

      next.add(course.id);
      return next;
    });
  };

  const basketCourses = allCourses.filter(c => basket.has(c.id));

  const handleDownloadPDF = () => {
    const t4    = getTermCredits(basketCourses, 'Term IV');
    const t5    = getTermCredits(basketCourses, 'Term V');
    const t6    = getTermCredits(basketCourses, 'Term VI');
    const total = t4 + t5 + t6;

    const violations = [];
    if (t4 < 18) violations.push(`Term 4 needs at least 18 credits (currently ${t4} cr).`);
    if (t4 > 21) violations.push(`Term 4 exceeds the 21-credit maximum (${t4} cr).`);
    if (t5 < 18) violations.push(`Term 5 needs at least 18 credits (currently ${t5} cr).`);
    if (t5 > 21) violations.push(`Term 5 exceeds the 21-credit maximum (${t5} cr).`);
    if (t6 !== 12) violations.push(`Term 6 must have exactly 12 credits (currently ${t6} cr).`);
    if (total < TOTAL_MIN) violations.push(`Total must be at least ${TOTAL_MIN} credits (currently ${total} cr).`);
    if (total > TOTAL_MAX) violations.push(`Total cannot exceed ${TOTAL_MAX} credits (currently ${total} cr).`);

    if (violations.length > 0) {
      setValidationMsg(violations);
      return;
    }

    // Open a clean print window
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(buildPrintHTML(basketCourses, { t4, t5, t6, total }));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  // ── helpers ──────────────────────────────────────────────────────────────
  const allThreeTermsFilled =
    basketCourses.some(c => c.term === 'Term IV') &&
    basketCourses.some(c => c.term === 'Term V')  &&
    basketCourses.some(c => c.term === 'Term VI');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading courses…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 32 }}>⚠️</p>
      <p style={{ color: 'var(--text-muted)' }}>Could not connect to server. Is the API running?</p>
      <code style={{ fontSize: 12, color: '#f87171', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 6 }}>{error}</code>
    </div>
  );

  // Merge any admin-edited overrides into the course list for display
  const displayCourses = filtered.map(c => courseOverrides[c.id] || c);

  // Shared browse+planner layout, rendered at "/"
  const BrowseLayout = (
    <>
      <Header total={allCourses.length} filtered={filtered.length} user={user} onLogout={logout} />

      {/* ── Sticky zone: tabs (students only) + filters + credit ribbon ── */}
      <div className="sticky-zone">
        {user.role !== 'admin' && (
          <div className="tab-bar">
            <div className="tab-bar-inner">
              <button
                className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
                onClick={() => setActiveTab('browse')}
              >
                Browse Courses
              </button>
              <button
                className={`tab-btn ${activeTab === 'basket' ? 'active' : ''}`}
                onClick={() => setActiveTab('basket')}
              >
                My Planner
                {basket.size > 0 && <span className="tab-badge">{basket.size}</span>}
              </button>
              {user.role === 'student' && (
                <button
                  className={`tab-btn ${activeTab === 'suggest' ? 'active' : ''}`}
                  onClick={() => setActiveTab('suggest')}
                >
                  AI Suggestions
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'browse' && (
          <>
            <FilterBar
              search={search} setSearch={setSearch}
              areas={areas} selectedAreas={selectedAreas} toggleArea={toggleArea}
              selectedCredit={selectedCredit} setSelectedCredit={setSelectedCredit}
              faculties={faculties} selectedFaculty={selectedFaculty} setSelectedFaculty={setSelectedFaculty}
              terms={terms} selectedTerm={selectedTerm} setSelectedTerm={setSelectedTerm}
              clearAll={clearAll} hasFilters={hasFilters}
            />
            {user.role !== 'admin' && (
              <div className="crb-desktop-only">
                <CreditRibbon basketCourses={basketCourses} />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Mobile credit badge (Browse tab only, hidden on desktop via CSS) ── */}
      {user.role !== 'admin' && activeTab === 'browse' && (
        <MobileCreditBadge basketCourses={basketCourses} />
      )}

      {/* ── Scrollable content ── */}
      {activeTab === 'browse' && (
        <CourseGrid
          courses={displayCourses}
          total={allCourses.length}
          filterVersion={filterVersion}
          basket={basket}
          toggleBasket={toggleBasket}
          onExpand={course => navigate(`/course/${course.id}`)}
          isAdmin={user.role === 'admin'}
          onAddCourse={() => navigate('/admin/add-course')}
          onDeleteCourse={handleDeleteCourse}
        />
      )}
      {activeTab === 'basket' && (
        <BasketView
          basketCourses={basketCourses}
          toggleBasket={toggleBasket}
          clearBasket={clearBasket}
          onDownloadPDF={handleDownloadPDF}
          canDownload={allThreeTermsFilled}
        />
      )}
      {activeTab === 'suggest' && user.role === 'student' && (
        <SuggestionsTab
          allCourses={allCourses}
          basket={basket}
          toggleBasket={toggleBasket}
        />
      )}
    </>
  );

  return (
    <>
      <Routes>
        <Route path="/" element={BrowseLayout} />
        <Route
          path="/course/:id"
          element={
            <CoursePage
              allCourses={allCourses}
              courseOverrides={courseOverrides}
              onCourseUpdated={handleCourseUpdated}
              onCourseDeleted={handleCourseDeleted}
              basket={basket}
              toggleBasket={toggleBasket}
              validationMsg={validationMsg}
              setValidationMsg={setValidationMsg}
              user={user}
              onLogout={logout}
            />
          }
        />
        <Route
          path="/admin/add-course"
          element={
            <AddCoursePage
              onCreated={handleCourseCreated}
              user={user}
              onLogout={logout}
              allCourses={allCourses}
            />
          }
        />
      </Routes>

      {/* ── Validation modal ── */}
      {validationMsg && (
        <div className="modal-backdrop" onClick={() => setValidationMsg(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">⚠️</div>
            <h3 className="modal-title">Credit Limit Violated</h3>
            <ul className="modal-list">
              {validationMsg.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
            <p className="modal-hint">Remove a course to fix the issue before adding another.</p>
            <button className="modal-close-btn" onClick={() => setValidationMsg(null)}>Got it</button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Print HTML builder ────────────────────────────────────────────────────────
const AREA_COLORS = {
  Finance: '#3b82f6', GMPP: '#8b5cf6', ISM: '#14b8a6',
  Marketing: '#f97316', 'OB/HR': '#22c55e', Operations: '#eab308',
  Strategy: '#ec4899', 'Inter-Area': '#64748b',
};
const TERM_ORDER  = ['Term IV', 'Term V', 'Term VI'];
const TERM_LABELS = { 'Term IV': 'Term 4', 'Term V': 'Term 5', 'Term VI': 'Term 6' };

function buildPrintHTML(courses, { t4, t5, t6, total }) {
  const byTerm = TERM_ORDER.reduce((acc, t) => {
    acc[t] = courses.filter(c => c.term === t);
    return acc;
  }, {});

  const termCredits = { 'Term IV': t4, 'Term V': t5, 'Term VI': t6 };

  // Area breakdown
  const areaMap = {};
  courses.forEach(c => {
    if (!areaMap[c.area]) areaMap[c.area] = { credits: 0, count: 0 };
    areaMap[c.area].credits += c.credits || 0;
    areaMap[c.area].count  += 1;
  });
  const areaEntries = Object.entries(areaMap).sort((a, b) => b[1].credits - a[1].credits);
  const areaCards = areaEntries.map(([area, { credits, count }]) => {
    const pct = total > 0 ? Math.round((credits / total) * 100) : 0;
    const color = AREA_COLORS[area] || '#64748b';
    return `
      <div class="area-card">
        <div class="area-top">
          <span class="area-name" style="color:${color}">${area}</span>
          <span class="area-cr">${credits} cr</span>
        </div>
        <div class="area-bar-bg"><div class="area-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="area-meta">${count} course${count > 1 ? 's' : ''} &nbsp;·&nbsp; ${pct}% of total</div>
      </div>`;
  }).join('');

  const termRows = TERM_ORDER.map(term => {
    const list = byTerm[term];
    if (!list.length) return '';
    const rows = list.map(c => `
      <tr>
        <td>${c.course}</td>
        <td>${c.area}</td>
        <td>${c.faculty}</td>
        <td style="text-align:right;font-weight:600">${c.credits || '—'}</td>
      </tr>`).join('');
    return `
      <tr class="term-hdr">
        <td colspan="3">${TERM_LABELS[term]}</td>
        <td style="text-align:right">${termCredits[term]} cr</td>
      </tr>
      ${rows}
      <tr class="subtotal-row">
        <td colspan="3">${TERM_LABELS[term]} Subtotal</td>
        <td style="text-align:right">${termCredits[term]} credits</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>IIM Sambalpur – Elective Plan</title>
<style>
  body { font-family: Arial, sans-serif; color: #111; margin: 40px; }
  h1   { font-size: 22px; margin-bottom: 4px; }
  .sub { font-size: 13px; color: #555; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th   { background: #1e3a5f; color: #fff; padding: 8px 12px; text-align: left; }
  td   { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; }
  tr:hover td { background: #f9fafb; }
  .term-hdr td { background: #f0a500; color: #000; font-weight: 700; font-size: 13px; }
  .subtotal-row td { background: #fef9ee; font-weight: 600; color: #555; font-size: 12px; border-top: 1px dashed #ccc; }
  .total-row td { background: #1e3a5f; color: #fff; font-weight: 700; font-size: 14px; padding: 10px 12px; }
  .rule-table { margin-top: 24px; font-size: 12px; width: auto; }
  .rule-table td, .rule-table th { padding: 5px 14px; }
  .ok  { color: #16a34a; font-weight: 700; }
  .bad { color: #dc2626; font-weight: 700; }
  .section-title { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #6b7280; margin: 28px 0 12px; }
  .area-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
  .area-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; background: #f8fafc; }
  .area-top  { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
  .area-name { font-size: 13px; font-weight: 700; }
  .area-cr   { font-size: 16px; font-weight: 800; color: #111; }
  .area-bar-bg   { background: #e5e7eb; border-radius: 4px; height: 4px; margin-bottom: 6px; }
  .area-bar-fill { height: 4px; border-radius: 4px; }
  .area-meta { font-size: 11px; color: #6b7280; }
</style></head><body>
<h1>IIM Sambalpur · MBA Elective Plan</h1>
<p class="sub">Generated on ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</p>
<p class="section-title">Credit Breakdown by Area</p>
<div class="area-grid">${areaCards}</div>
<table>
  <thead><tr><th>Course</th><th>Area</th><th>Faculty</th><th style="text-align:right">Credits</th></tr></thead>
  <tbody>
    ${termRows}
    <tr class="total-row"><td colspan="3">Grand Total</td><td style="text-align:right">${total} credits</td></tr>
  </tbody>
</table>
<table class="rule-table" style="margin-top:28px">
  <thead><tr><th>Term</th><th>Credits</th><th>Rule</th><th>Status</th></tr></thead>
  <tbody>
    <tr><td>Term 4</td><td>${t4}</td><td>18 – 21</td><td class="${t4>=18&&t4<=21?'ok':'bad'}">${t4>=18&&t4<=21?'✓ OK':'✗ Violation'}</td></tr>
    <tr><td>Term 5</td><td>${t5}</td><td>18 – 21</td><td class="${t5>=18&&t5<=21?'ok':'bad'}">${t5>=18&&t5<=21?'✓ OK':'✗ Violation'}</td></tr>
    <tr><td>Term 6</td><td>${t6}</td><td>= 12</td><td class="${t6===12?'ok':'bad'}">${t6===12?'✓ OK':'✗ Violation'}</td></tr>
    <tr><td><strong>Total</strong></td><td>${total}</td><td>48 – 54</td><td class="${total>=48&&total<=54?'ok':'bad'}">${total>=48&&total<=54?'✓ OK':'✗ Violation'}</td></tr>
  </tbody>
</table>
</body></html>`;
}
