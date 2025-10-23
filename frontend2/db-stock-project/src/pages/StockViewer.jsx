import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockAPI } from '../services/api';

export default function StockViewer() {
  // Remove unused useParams
  // const params = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('SIBL');
  const [stock, setStock] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

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

  useEffect(() => {
    stockAPI.listStocks().then(setList).catch(e => setError(e.message));
  }, []);

  // Disable route-param driven auto-load; StockViewer is now an index page
  // useEffect(() => {
  //   if (params.code) {
  //     setCode(params.code);
  //     // Ensure local cache has data
  //     // load(params.code);
  //   }
  // }, []);
  // (Removed dependency on route params)

  const load = async (c = code) => {
    setError(null);
    setLoading(true);
    try {
      const data = await stockAPI.getStockByCode(c.toUpperCase());
      setStock(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fetchFromSource = async () => {
    setError(null);
    setFetching(true);
    try {
      const res = await stockAPI.fetchStockData(code.toUpperCase());
      await stockAPI.listStocks().then(setList);
    } catch (e) {
      setError(e.message);
    } finally {
      setFetching(false);
    }
  };

  const refresh = async () => {
    setError(null);
    setRefreshing(true);
    try {
      const res = await stockAPI.refreshStockData(code.toUpperCase());
      await stockAPI.listStocks().then(setList);
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <div className="heading-bar top"><h2>Stock Viewer</h2></div>
      <div className="controls">
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Trading code" />
        <button onClick={() => { navigate(`/stocks/${code.toUpperCase()}/details`); }} disabled={loading}>Open Details</button>
        <button onClick={fetchFromSource} disabled={fetching}>Fetch & Store</button>
        <button onClick={refresh} disabled={refreshing}>Refresh</button>
      </div>
      {error && <p className="error" style={{ textAlign: 'center' }}>{error}</p>}
      {/* Removed inline stock details; dedicated page handles detailed view */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="heading-bar"><h4>Stored Stocks</h4></div>
        <div className="controls">
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by code or name" />
          <button onClick={() => stockAPI.listStocks().then(setList)}>Reload</button>
        </div>
        {Array.isArray(list) && list.length ? (
          <table className="table classic">
            <thead>
              <tr><th>Code</th><th>Company</th><th>Sector</th><th>Last Updated</th><th>Action</th></tr>
            </thead>
            <tbody>
              {list.filter(s => {
                const q = filter.trim().toLowerCase();
                if (!q) return true;
                return s.trading_code.toLowerCase().includes(q) || (s.company_name || '').toLowerCase().includes(q);
              }).map(s => (
                <tr key={s.trading_code}>
                  <td>{s.trading_code}</td>
                  <td>{s.company_name}</td>
                  <td>{s.sector}</td>
                  <td>{fmtDate(s.last_updated)}</td>
                  <td>
                    <button onClick={() => { setCode(s.trading_code); navigate(`/stocks/${s.trading_code}/details`); }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="muted">No stocks stored yet.</p>}
      </div>
    </>
  );
}