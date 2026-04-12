import '../styles/CreditRibbon.css';

const TERMS = [
  { key: 'Term IV',  label: 'TERM 4', min: 18, max: 21 },
  { key: 'Term V',   label: 'TERM 5', min: 18, max: 21 },
  { key: 'Term VI',  label: 'TERM 6', min: 12, max: 12 },
];

const TOTAL_MIN = 48;
const TOTAL_MAX = 54;

function getStatus(credits, min, max) {
  if (credits === 0)   return 'empty';
  if (credits < min)   return 'under';
  if (credits > max)   return 'over';
  return 'ok';
}

function getHint(credits, min, max) {
  if (credits === 0)   return `${min} cr to go`;
  if (credits < min)   return `${min - credits} cr to go`;
  if (credits > max)   return `${credits - max} cr over limit`;
  if (min === max)     return `✓ Exactly ${min} cr`;
  return `✓ On track`;
}

export default function CreditRibbon({ basketCourses }) {
  const termCr = {};
  TERMS.forEach(t => {
    termCr[t.key] = basketCourses
      .filter(c => c.term === t.key)
      .reduce((s, c) => s + (c.credits || 0), 0);
  });

  const total       = Object.values(termCr).reduce((s, v) => s + v, 0);
  const totalStatus = getStatus(total, TOTAL_MIN, TOTAL_MAX);

  return (
    <div className="crb-ribbon">
      <div className="crb-inner">

        {TERMS.map(term => {
          const cr     = termCr[term.key];
          const status = getStatus(cr, term.min, term.max);
          const hint   = getHint(cr, term.min, term.max);
          const fillPct = Math.min(100, term.max > 0 ? (cr / term.max) * 100 : 0);
          const minPct  = (term.min / term.max) * 100;

          return (
            <div key={term.key} className={`crb-term crb-s-${status}`}>
              <div className="crb-top">
                <span className="crb-term-label">{term.label}</span>
                <div className="crb-credits">
                  <span className="crb-num">{cr}</span>
                  <span className="crb-range">
                    &nbsp;/&nbsp;{term.min === term.max ? term.min : `${term.min}–${term.max}`} cr
                  </span>
                </div>
              </div>

              <div className="crb-bar-track">
                <div className="crb-bar-fill" style={{ width: `${fillPct}%` }} />
                <div className="crb-bar-min"  style={{ left: `${minPct}%` }} />
              </div>

              <span className="crb-hint">{hint}</span>
            </div>
          );
        })}

        {/* Total pill */}
        <div className={`crb-total crb-total-${totalStatus}`}>
          <span className="crb-total-label">TOTAL</span>
          <span className="crb-total-num">{total}</span>
          <span className="crb-total-range">/ {TOTAL_MIN}–{TOTAL_MAX} cr</span>
        </div>

      </div>
    </div>
  );
}
