import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockAPI } from '../services/api';

export default function MarketSnapshot() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState('trading_code');
  const [sortDir, setSortDir] = useState('asc');

  const fetchData = async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await stockAPI.getMarketSnapshot(query);
      setRows(data || []);
    } catch (e) {
      console.error('Market snapshot fetch error', e);
      setError(e.response?.data?.message || e.message || 'Failed to load market snapshot');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData('');
  }, []);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

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

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData(q);
  };

  const handleRowClick = (tradingCode) => {
    navigate(`/stocks/${tradingCode}/details`);
  };

  return (
    <>
      <div className="heading-bar top">
        <h2>Market Snapshot</h2>
      </div>

      <div className="card">
        <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            alignItems: 'flex-end', 
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: '1', minWidth: '250px' }}>
            {/* <label htmlFor="search" style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '600', 
              fontSize: '14px'
            }}>
              Search
            </label> */}
            <input
              id="search"
              type="text"
              placeholder="Company or Trading Code"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                width: '20%',
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            <button 
              type="submit" 
              disabled={loading}
              style={{ marginLeft: '8px' }}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            </div>
          </div>
        </form>

        {error && <p className="error" style={{ textAlign: 'center' }}>{error}</p>}

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('trading_code')}>Trading Code</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('company_name')}>Company Name</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('sector')}>Sector</th>
                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('last_price')}>Last Price</th>
                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('change_percentage')}>Change %</th>
                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('volume')}>Volume</th>
                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('market_cap')}>Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => {
                const changeColor = r.change_percentage > 0 ? 'green' : r.change_percentage < 0 ? 'red' : undefined;
                return (
                  <tr 
                    key={r.trading_code}
                    onClick={() => handleRowClick(r.trading_code)}
                    style={{ 
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.closest('tr').style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.closest('tr').style.backgroundColor = 'transparent'}
                  >
                    <td><strong>{r.trading_code}</strong></td>
                    <td>{r.company_name}</td>
                    <td>{r.sector}</td>
                    <td style={{ textAlign: 'right' }}>{fmtNum(r.last_price)}</td>
                    <td style={{ textAlign: 'right', color: changeColor }}><strong>{fmtNum(r.change_percentage)}</strong></td>
                    <td style={{ textAlign: 'right' }}>{fmtNum(r.volume, 0)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtNum(r.market_cap)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && rows.length === 0 && !error && (
          <p className="muted" style={{ textAlign: 'center', padding: '40px 20px' }}>
            No data. Try a different search or ensure market info exists.
          </p>
        )}
      </div>
    </>
  );
}