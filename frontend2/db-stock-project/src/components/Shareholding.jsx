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

export default function Shareholding({ data }) {
  if (!Array.isArray(data) || !data.length) return null;
  const rows = [...data].sort((a,b) => new Date(b.asOn) - new Date(a.asOn));
  return (
    <section className="section">
      <div className="heading-bar"><h4>Other Information of the Company</h4></div>
      <div className="card">
        <table className="table classic">
          <thead>
            <tr>
              <th>As On</th>
              <th>Sponsor/Director</th>
              <th>Govt</th>
              <th>Institute</th>
              <th>Foreign</th>
              <th>Public</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, idx) => (
              <tr key={idx}>
                <td>{fmtDate(s.asOn)}</td>
                <td>{fmtNum(s.sponsorDirector)}%</td>
                <td>{fmtNum(s.government)}%</td>
                <td>{fmtNum(s.institute)}%</td>
                <td>{fmtNum(s.foreignShare)}%</td>
                <td>{fmtNum(s.public)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}