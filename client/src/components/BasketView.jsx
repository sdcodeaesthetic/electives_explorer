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

export default function BasketView({ basketCourses, toggleBasket, clearBasket, onDownloadPDF, canDownload }) {
  const [confirming, setConfirming] = useState(false);
  const totalCredits = basketCourses.reduce((sum, c) => sum + (parseFloat(c.credits) || 0), 0);
  const totalCourses = basketCourses.length;

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

  if (totalCourses === 0) {
    return (
      <div className="basket-wrap">
        <div className="basket-empty">
          <div className="basket-empty-icon">🛒</div>
          <h3>Your planner is empty</h3>
          <p>
            Go to <strong>Browse Courses</strong> and click on any course to add it here.
          </p>
        </div>
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
    </div>
  );
}
