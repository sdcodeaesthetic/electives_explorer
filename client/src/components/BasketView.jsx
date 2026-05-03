import { useState } from 'react';
import '../styles/BasketView.css';

const AREA_COLORS = {
  Finance:      '#3b82f6',
  GMPP:         '#8b5cf6',
  ISM:          '#14b8a6',
  Marketing:    '#f97316',
  'OB/HR':      '#22c55e',
  Operations:   '#eab308',
  Strategy:     '#ec4899',
  'Inter-Area': '#64748b',
};

const TERM_ORDER = ['Term IV', 'Term V', 'Term VI', 'X'];
const TERM_LABELS = {
  'Term IV': 'Term 4',
  'Term V':  'Term 5',
  'Term VI': 'Term 6',
  'X':       'Flexible / Cross-Term',
};

const fmtCr = (v) => { const n = parseFloat(v); return n % 1 === 0 ? n : n.toFixed(1); };

// ── Planner Manager panel ─────────────────────────────────────────────────────
function PlannerManager({
  planners, basket, allCourses,
  onSavePlan, onRenamePlan, onUpdatePlan, onDeletePlan, onLoadPlan,
}) {
  const [newName,    setNewName]    = useState('');
  const [editingId,  setEditingId]  = useState(null);
  const [editName,   setEditName]   = useState('');
  const [comparing,  setComparing]  = useState(false);
  const [compareA,   setCompareA]   = useState('');
  const [compareB,   setCompareB]   = useState('');
  const [saving,     setSaving]     = useState(false);

  const handleSave = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    await onSavePlan(name);
    setNewName('');
    setSaving(false);
  };

  const handleRename = async (id) => {
    const name = editName.trim();
    if (!name) return;
    await onRenamePlan(id, name);
    setEditingId(null);
  };

  // Build compare data: courses for plan A and B
  const planAObj = planners.find(p => String(p.id) === String(compareA));
  const planBObj = planners.find(p => String(p.id) === String(compareB));

  const getCourseNames = (plan) => {
    if (!plan) return [];
    return plan.basket.map(id => allCourses.find(c => c.id === id)).filter(Boolean);
  };

  const coursesA = getCourseNames(planAObj);
  const coursesB = getCourseNames(planBObj);
  const idsA = new Set(coursesA.map(c => c.id));
  const idsB = new Set(coursesB.map(c => c.id));

  const renderCompareColumn = (courses, otherIds, accentClass) => {
    if (!courses.length) return <p className="plm-compare-empty">No courses in this plan.</p>;
    const byTerm = courses.reduce((acc, c) => {
      const t = c.term || 'X';
      if (!acc[t]) acc[t] = [];
      acc[t].push(c);
      return acc;
    }, {});
    return TERM_ORDER.filter(t => byTerm[t]).map(t => (
      <div key={t} className="plm-compare-term">
        <div className="plm-compare-term-label">{TERM_LABELS[t]}</div>
        {byTerm[t].map(c => (
          <div
            key={c.id}
            className={`plm-compare-row ${!otherIds.has(c.id) ? accentClass : ''}`}
          >
            <span className="plm-compare-course">{c.course}</span>
            <span className="plm-compare-cr">{c.credits ? `${c.credits}cr` : '—'}</span>
          </div>
        ))}
      </div>
    ));
  };

  return (
    <div className="basket-section">
      <h2 className="basket-section-title">Saved Plans</h2>

      {/* ── Save current basket as new plan ── */}
      <div className="plm-save-row">
        <input
          className="plm-name-input"
          type="text"
          placeholder="Plan name (e.g. Finance Major)"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          maxLength={60}
        />
        <button
          className="plm-save-btn"
          onClick={handleSave}
          disabled={saving || !newName.trim() || planners.length >= 5}
        >
          {saving ? 'Saving…' : '+ Save Current Plan'}
        </button>
      </div>
      {planners.length >= 5 && (
        <p className="plm-limit-hint">Maximum 5 plans reached. Delete one to save a new plan.</p>
      )}

      {/* ── Saved plan cards ── */}
      {planners.length === 0 ? (
        <p className="plm-empty-hint">No saved plans yet. Build your planner above and click "Save Current Plan".</p>
      ) : (
        <div className="plm-list">
          {planners.map(plan => {
            const cr = plan.basket
              .map(id => allCourses.find(c => c.id === id))
              .filter(Boolean)
              .reduce((s, c) => s + (c.credits || 0), 0);
            return (
              <div key={plan.id} className="plm-card">
                <div className="plm-card-left">
                  {editingId === plan.id ? (
                    <input
                      className="plm-edit-input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(plan.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="plm-card-name">{plan.name}</span>
                  )}
                  <span className="plm-card-meta">
                    {plan.basket.length} course{plan.basket.length !== 1 ? 's' : ''} · {fmtCr(cr)} cr
                  </span>
                </div>
                <div className="plm-card-actions">
                  {editingId === plan.id ? (
                    <>
                      <button className="plm-act-btn plm-act-save"  onClick={() => handleRename(plan.id)}>Save</button>
                      <button className="plm-act-btn plm-act-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button
                        className="plm-act-btn plm-act-load"
                        onClick={() => onLoadPlan(plan)}
                        title="Load this plan into the planner"
                      >Load</button>
                      <button
                        className="plm-act-btn plm-act-update"
                        onClick={() => onUpdatePlan(plan.id)}
                        title="Overwrite this saved plan with current planner"
                      >Update</button>
                      <button
                        className="plm-act-btn plm-act-rename"
                        onClick={() => { setEditingId(plan.id); setEditName(plan.name); }}
                        title="Rename"
                      >Rename</button>
                      <button
                        className="plm-act-btn plm-act-delete"
                        onClick={() => onDeletePlan(plan.id)}
                        title="Delete"
                      >Delete</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Compare two plans ── */}
      {planners.length >= 2 && (
        <div className="plm-compare-section">
          <button
            className="plm-compare-toggle"
            onClick={() => setComparing(v => !v)}
          >
            {comparing ? '▲ Hide Compare' : '⇔ Compare Two Plans'}
          </button>

          {comparing && (
            <div className="plm-compare-panel">
              <div className="plm-compare-selects">
                <select
                  className="plm-select"
                  value={compareA}
                  onChange={e => setCompareA(e.target.value)}
                >
                  <option value="">— Select Plan A —</option>
                  {planners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <span className="plm-compare-vs">vs</span>
                <select
                  className="plm-select"
                  value={compareB}
                  onChange={e => setCompareB(e.target.value)}
                >
                  <option value="">— Select Plan B —</option>
                  {planners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {compareA && compareB && compareA !== compareB && (
                <div className="plm-compare-grid">
                  <div className="plm-compare-col plm-col-a">
                    <div className="plm-compare-col-header plm-col-a-header">
                      {planAObj?.name}
                      <span className="plm-compare-col-cr">{fmtCr(coursesA.reduce((s,c)=>s+(c.credits||0),0))} cr</span>
                    </div>
                    {renderCompareColumn(coursesA, idsB, 'plm-only-a')}
                  </div>
                  <div className="plm-compare-col plm-col-b">
                    <div className="plm-compare-col-header plm-col-b-header">
                      {planBObj?.name}
                      <span className="plm-compare-col-cr">{fmtCr(coursesB.reduce((s,c)=>s+(c.credits||0),0))} cr</span>
                    </div>
                    {renderCompareColumn(coursesB, idsA, 'plm-only-b')}
                  </div>
                </div>
              )}
              {compareA && compareB && compareA === compareB && (
                <p className="plm-compare-same">Select two different plans to compare.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Backup Courses section ────────────────────────────────────────────────────
function BackupSection({ backupCoursesList, allCourses, toggleBackup, promoteBackup }) {
  if (!backupCoursesList.length) return null;

  // Sort by term order
  const sorted = [...backupCoursesList].sort(
    (a, b) => TERM_ORDER.indexOf(a.term || 'X') - TERM_ORDER.indexOf(b.term || 'X')
  );

  // Group by term for labelled sections
  const byTerm = sorted.reduce((acc, c) => {
    const t = c.term || 'X';
    if (!acc[t]) acc[t] = [];
    acc[t].push(c);
    return acc;
  }, {});

  const presentTerms = TERM_ORDER.filter(t => byTerm[t]);

  return (
    <div className="basket-section">
      <h2 className="basket-section-title">
        Backup Courses
        <span className="backup-section-hint"> — not counted toward credits</span>
      </h2>
      <div className="backup-list">
        {presentTerms.map(term => (
          <div key={term}>
            <div className="backup-term-label">{TERM_LABELS[term] || term}</div>
            {byTerm[term].map(c => {
              const color = AREA_COLORS[c.area] || '#64748b';
              return (
                <div key={c.id} className="backup-row">
                  <div className="backup-row-left">
                    <span className="backup-area-dot" style={{ background: color }} />
                    <div className="backup-info">
                      <span className="backup-course-name">{c.course}</span>
                      <span className="backup-meta">{c.area} · {c.faculty}</span>
                    </div>
                  </div>
                  <div className="backup-row-right">
                    <span className="backup-cr">{c.credits ? `${c.credits} cr` : '—'}</span>
                    <button
                      className="backup-promote-btn"
                      onClick={() => promoteBackup(c)}
                      title="Move to primary planner"
                    >
                      ↑ Add to Planner
                    </button>
                    <button
                      className="backup-remove-btn"
                      onClick={() => toggleBackup(c)}
                      title="Remove backup"
                    >✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main BasketView ───────────────────────────────────────────────────────────
export default function BasketView({
  basketCourses,
  backupCourses = new Set(),
  allCourses = [],
  toggleBasket,
  toggleBackup,
  promoteBackup,
  clearBasket,
  onDownloadPDF,
  canDownload,
  planners = [],
  onSavePlan,
  onRenamePlan,
  onUpdatePlan,
  onDeletePlan,
  onLoadPlan,
}) {
  const [confirming, setConfirming] = useState(false);
  const totalCredits = basketCourses.reduce((sum, c) => sum + (parseFloat(c.credits) || 0), 0);
  const totalCourses = basketCourses.length;

  const backupCoursesList = allCourses.filter(c => backupCourses.has(c.id));

  // Group by term → area
  const byTerm = basketCourses.reduce((acc, c) => {
    const term = c.term || 'X';
    if (!acc[term]) acc[term] = {};
    if (!acc[term][c.area]) acc[term][c.area] = [];
    acc[term][c.area].push(c);
    return acc;
  }, {});

  // Group by area (for breakdown section)
  const byArea = basketCourses.reduce((acc, c) => {
    if (!acc[c.area]) acc[c.area] = [];
    acc[c.area].push(c);
    return acc;
  }, {});

  const areaEntries = Object.entries(byArea).sort(
    (a, b) =>
      b[1].reduce((s, c) => s + (c.credits || 0), 0) -
      a[1].reduce((s, c) => s + (c.credits || 0), 0)
  );

  const presentTerms = TERM_ORDER.filter((t) => byTerm[t]);

  if (totalCourses === 0 && backupCoursesList.length === 0) {
    return (
      <div className="basket-wrap">
        <div className="basket-empty">
          <div className="basket-empty-icon">🛒</div>
          <h3>Your planner is empty</h3>
          <p>
            Go to <strong>Browse Courses</strong> and click on any course to add it here.
          </p>
        </div>
        {planners.length > 0 && (
          <PlannerManager
            planners={planners}
            basket={new Set()}
            allCourses={allCourses}
            onSavePlan={onSavePlan}
            onRenamePlan={onRenamePlan}
            onUpdatePlan={onUpdatePlan}
            onDeletePlan={onDeletePlan}
            onLoadPlan={onLoadPlan}
          />
        )}
      </div>
    );
  }

  const t4Credits = basketCourses.filter(c => c.term === 'Term IV').reduce((s, c) => s + (c.credits || 0), 0);
  const t5Credits = basketCourses.filter(c => c.term === 'Term V').reduce((s, c) => s + (c.credits || 0), 0);
  const t6Credits = basketCourses.filter(c => c.term === 'Term VI').reduce((s, c) => s + (c.credits || 0), 0);

  const termStatus = (credits, min, max) => {
    if (credits === 0) return 'empty';
    if (credits < min) return 'under';
    if (credits > max) return 'over';
    return 'ok';
  };

  return (
    <div className="basket-wrap">
      {/* ── Summary strip ── */}
      <div className="basket-summary">
        <div className="summary-card summary-main">
          <span className="summary-value">{fmtCr(totalCredits)}</span>
          <span className="summary-label">Total Credits <span className="credit-range">(min 48 · max 52)</span></span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{totalCourses}</span>
          <span className="summary-label">Courses Selected</span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{presentTerms.length}</span>
          <span className="summary-label">Terms Planned</span>
        </div>
      </div>

      {/* ── Per-term credit status ── */}
      <div className="term-credit-status">
        {[
          { label: 'Term 4', credits: t4Credits, min: 18, max: 21 },
          { label: 'Term 5', credits: t5Credits, min: 18, max: 21 },
          { label: 'Term 6', credits: t6Credits, min: 12, max: 12 },
        ].map(({ label, credits, min, max }) => {
          const status = termStatus(credits, min, max);
          const pct    = Math.min(100, max > 0 ? (credits / max) * 100 : 0);
          return (
            <div key={label} className={`tcs-card tcs-${status}`}>
              <div className="tcs-top">
                <span className="tcs-label">{label}</span>
                <span className="tcs-credits">{fmtCr(credits)} / {min === max ? min : `${min}–${max}`} cr</span>
                <span className="tcs-badge">
                  {status === 'ok'    && '✓ Good'}
                  {status === 'under' && '↑ Need more'}
                  {status === 'over'  && '✗ Too many'}
                  {status === 'empty' && '— Empty'}
                </span>
              </div>
              <div className="tcs-bar-track">
                <div className="tcs-bar-fill" style={{ width: `${pct}%` }} />
                <div className="tcs-bar-min"  style={{ left: `${(min / max) * 100}%` }} />
              </div>
              <div className="tcs-hint">
                {min === max ? `Exactly ${min} cr required` : `${min} cr min · ${max} cr max`}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Action row: Download + Clear All ── */}
      <div className="download-row">
        {canDownload && (
          <button className="download-pdf-btn" onClick={onDownloadPDF}>
            <span className="download-icon">⬇</span> Download Plan as PDF
          </button>
        )}
        <button className="clear-all-btn" onClick={() => setConfirming(true)}>
          ✕ Clear All
        </button>
      </div>

      {/* ── Clear All confirmation popup ── */}
      {confirming && (
        <div className="clear-modal-backdrop" onClick={() => setConfirming(false)}>
          <div className="clear-modal" onClick={e => e.stopPropagation()}>
            <div className="clear-modal-icon">🗑️</div>
            <h3 className="clear-modal-title">Clear Planner?</h3>
            <p className="clear-modal-body">
              This will remove all <strong>{basketCourses.length} course{basketCourses.length !== 1 ? 's' : ''}</strong> from your planner. This cannot be undone.
            </p>
            <div className="clear-modal-actions">
              <button className="clear-confirm-no" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="clear-confirm-yes" onClick={() => { clearBasket(); setConfirming(false); }}>
                Yes, clear all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Term-based billing view ── */}
      <div className="basket-section">
        <h2 className="basket-section-title">Elective Plan by Term</h2>

        <div className="billing-receipt">
          {presentTerms.map((term) => {
            const termAreas = byTerm[term];
            const allInTerm = Object.values(termAreas).flat();
            const termCredits = allInTerm.reduce((s, c) => s + (c.credits || 0), 0);
            const termCount = allInTerm.length;

            const sortedAreas = Object.entries(termAreas).sort(
              (a, b) =>
                b[1].reduce((s, c) => s + (c.credits || 0), 0) -
                a[1].reduce((s, c) => s + (c.credits || 0), 0)
            );

            return (
              <div className="term-section" key={term}>
                {/* Term header */}
                <div className="term-header">
                  <div className="term-header-left">
                    <span className="term-badge">{TERM_LABELS[term] || term}</span>
                    <span className="term-meta">
                      {termCount} course{termCount !== 1 ? 's' : ''} &middot;{' '}
                      {sortedAreas.length} area{sortedAreas.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="term-total-cr">{fmtCr(termCredits)} cr</span>
                </div>

                {/* Areas within this term */}
                {sortedAreas.map(([area, courses]) => {
                  const areaCredits = courses.reduce((s, c) => s + (c.credits || 0), 0);
                  const color = AREA_COLORS[area] || '#64748b';

                  return (
                    <div className="billing-area-group" key={area}>
                      <div className="billing-area-header" style={{ borderLeftColor: color }}>
                        <span className="billing-area-name" style={{ color }}>{area}</span>
                        <span className="billing-area-subtotal">{fmtCr(areaCredits)} cr</span>
                      </div>

                      {courses.map((c) => (
                        <div className="billing-row" key={c.id}>
                          <div className="billing-row-left">
                            <span className="billing-course">{c.course}</span>
                            <span className="billing-faculty">{c.faculty}</span>
                          </div>
                          <div className="billing-row-right">
                            <span className="billing-cr">{c.credits ? `${c.credits} cr` : '—'}</span>
                            <button
                              className="receipt-remove"
                              onClick={() => toggleBasket(c)}
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Term subtotal */}
                <div className="term-subtotal-row">
                  <span>{TERM_LABELS[term] || term} Subtotal</span>
                  <span>{fmtCr(termCredits)} credits</span>
                </div>
              </div>
            );
          })}

          {/* Grand total */}
          <div className="receipt-total-row">
            <span>Grand Total</span>
            <span className="receipt-total-value">{fmtCr(totalCredits)} credits</span>
          </div>
        </div>
      </div>

      {/* ── Backup courses ── */}
      <BackupSection
        backupCoursesList={backupCoursesList}
        allCourses={allCourses}
        toggleBackup={toggleBackup}
        promoteBackup={promoteBackup}
      />

      {/* ── Credit breakdown by area ── */}
      <div className="basket-section">
        <h2 className="basket-section-title">Credit Breakdown by Area</h2>
        <div className="breakdown-grid">
          {areaEntries.map(([area, courses]) => {
            const areaCredits = courses.reduce((s, c) => s + (c.credits || 0), 0);
            const pct = totalCredits > 0 ? (areaCredits / totalCredits) * 100 : 0;
            const color = AREA_COLORS[area] || '#64748b';
            return (
              <div className="breakdown-card" key={area} style={{ '--area-color': color }}>
                <div className="breakdown-top">
                  <span className="breakdown-area" style={{ color }}>{area}</span>
                  <span className="breakdown-credits">{fmtCr(areaCredits)} cr</span>
                </div>
                <div className="breakdown-bar-track">
                  <div
                    className="breakdown-bar-fill"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
                <div className="breakdown-meta">
                  <span>{courses.length} course{courses.length !== 1 ? 's' : ''}</span>
                  <span>{Math.round(pct)}% of total</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Saved plans manager ── */}
      <PlannerManager
        planners={planners}
        basket={new Set(basketCourses.map(c => c.id))}
        allCourses={allCourses}
        onSavePlan={onSavePlan}
        onRenamePlan={onRenamePlan}
        onUpdatePlan={onUpdatePlan}
        onDeletePlan={onDeletePlan}
        onLoadPlan={onLoadPlan}
      />
    </div>
  );
}
