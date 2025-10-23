import React from 'react';

const fmtDate = (d) => {
  if (!d) return '-';
  const dd = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dd.getTime())) return d;
  return dd.toISOString().slice(0, 10);
};
const fmtNum = (n) => {
  if (n === null || n === undefined || n === '') return '-';
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (Number.isNaN(v)) return n;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v);
};

export default function CorporateActions({ data }) {
  if (!data) return null;
  const { lastAGMDate, forYearEnded, cashDividends = [], bonusIssues = [], rightIssues = [] } = data;
  return (
    <section className="section">
      <div className="heading-bar"><h4>Corporate Actions</h4></div>
      <div className="card">
        <div className="meta-row">
          <div><strong>Last AGM held on:</strong> {fmtDate(lastAGMDate)}</div>
          <div><strong>For the year ended:</strong> {fmtDate(forYearEnded)}</div>
        </div>
        <div className="grid">
          <div>
            <h5>Cash Dividend</h5>
            {cashDividends.length ? (
              <table className="table classic">
                <thead><tr><th>Year</th><th>%</th></tr></thead>
                <tbody>
                  {cashDividends.map((d, idx) => (
                    <tr key={idx}><td>{d.year}</td><td>{fmtNum(d.percentage)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="muted">None</p>}
          </div>
          <div>
            <h5>Bonus Issue (Stock Dividend)</h5>
            {bonusIssues.length ? (
              <table className="table classic">
                <thead><tr><th>Year</th><th>%</th></tr></thead>
                <tbody>
                  {bonusIssues.map((d, idx) => (
                    <tr key={idx}><td>{d.year}</td><td>{fmtNum(d.percentage)}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="muted">None</p>}
          </div>
          <div>
            <h5>Right Issue</h5>
            {rightIssues.length ? (
              <table className="table classic">
                <thead><tr><th>Year</th><th>Ratio</th></tr></thead>
                <tbody>
                  {rightIssues.map((r, idx) => (
                    <tr key={idx}><td>{r.year}</td><td>{r.ratio}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="muted">None</p>}
          </div>
        </div>
      </div>
    </section>
  );
}