import { useEffect, useMemo, useState } from 'react';
import { stockAPI } from '../services/api';

export default function SectorsSummary() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState('sectorName');
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await stockAPI.getSectorsSummary();
        setRows(data || []);
      } catch (e) {
        console.error('Failed to load sectors summary', e);
        setError(e.response?.data?.message || e.message || 'Failed to load sectors summary');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totals = useMemo(() => {
    const totalMarketCap = rows.reduce((acc, r) => acc + (r.totalMarketCapital || 0), 0);
    return {
      totalSectors: rows.length,
      totalMarketCapBillion: totalMarketCap / 1_000_000_000
    };
  }, [rows]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb) * dir;
      }
      const na = Number(va ?? 0);
      const nb = Number(vb ?? 0);
      return (na - nb) * dir;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const fmtNum = (n, fractionDigits = 2) => {
    if (n === null || n === undefined || n === '') return '-';
    const v = typeof n === 'string' ? parseFloat(n) : n;
    if (Number.isNaN(v)) return n;
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: fractionDigits, minimumFractionDigits: fractionDigits }).format(v);
  };

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <>
      <div className="heading-bar top">
        <h2>Sectors Summary</h2>
      </div>

      <div className="card">
        {loading && <p className="muted" style={{ textAlign: 'center', padding: '40px 20px' }}>Loading...</p>}
        {error && <p className="error" style={{ textAlign: 'center' }}>{error}</p>}

        {!loading && !error && (
          <>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', flexWrap: 'wrap' }}>
              <div><strong>Total sectors:</strong> {totals.totalSectors}</div>
              <div><strong>Total market capital (bn):</strong> {fmtNum(totals.totalMarketCapBillion)}</div>
            </div>

            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('sectorName')}>Sector Name</th>
                    <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('totalTrade')}>Total Trade</th>
                    <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('totalVolume')}>Total Volume</th>
                    <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('gainers')}>No. of Gainer</th>
                    <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('losers')}>No. of Looser</th>
                    <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('totalMarketCapital')}>Total Market Capital (bn)</th>
                    <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('marketCapitalPct')}>Market Capital in %</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((r) => (
                    <tr key={r.sectorName}>
                      <td><strong>{r.sectorName}</strong></td>
                      <td style={{ textAlign: 'right' }}>{fmtNum(r.totalTrade, 0)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtNum(r.totalVolume, 0)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtNum(r.gainers, 0)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtNum(r.losers, 0)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtNum((r.totalMarketCapital || 0) / 1_000_000_000)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtNum(r.marketCapitalPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length === 0 && (
              <p className="muted" style={{ textAlign: 'center', padding: '40px 20px' }}>
                No sector summary available. Make sure stocks exist in the database with basic and market information.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}