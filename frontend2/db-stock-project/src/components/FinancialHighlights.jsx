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

export default function FinancialHighlights({ data }) {
  if (!data) return null;
  const yearEnd = data.yearEnd || '-';
  const asOn = data.loanStatus?.asOn || null;
  const st = data.loanStatus?.shortTermLoan ?? null;
  const lt = data.loanStatus?.longTermLoan ?? null;
  const displayDate = asOn ? fmtDate(asOn) : yearEnd;
  return (
    <section className="section">
      <div className="heading-bar"><h4>Corporate Performance at a glance</h4></div>
      <div className="card">
        <table className="table classic">
          <tbody>
            <tr>
              <th>Present Operational Status</th>
              <td>Active</td>
            </tr>
            <tr>
              <th>Present Loan Status as on {displayDate}</th>
              <td></td>
            </tr>
            <tr>
              <th>Short-term loan (mn)</th>
              <td>{fmtNum(st) === '-' ? 0 : fmtNum(st)}</td>
            </tr>
            <tr>
              <th>Long-term loan (mn)</th>
              <td>{fmtNum(lt)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}