import { useState } from 'react';
import { stockAPI } from '../services/api';

export default function TopMovers() {
  const [top, setTop] = useState(10);
  const [order, setOrder] = useState('DESC'); // DESC = Gainers, ASC = Losers
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const execute = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await stockAPI.postTopMovers({ top, order });
      setRows(data || []);
    } catch (e) {
      setError(e?.message || 'Failed to fetch top movers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="heading-bar"><h2>Top Gainers / Losers</h2></div>

      <div className="controls" style={{ justifyContent: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label>Top Count</label>
          <input className="input" type="number" min={1} max={200} value={top} onChange={(e) => setTop(parseInt(e.target.value || '10', 10))} style={{ width: '120px' }} />
        </div>
        <div className="radio-row">
          <label><input type="radio" name="order" value="DESC" checked={order === 'DESC'} onChange={(e) => setOrder(e.target.value)} /> Gainers (DESC)</label>
          <label><input type="radio" name="order" value="ASC" checked={order === 'ASC'} onChange={(e) => setOrder(e.target.value)} /> Losers (ASC)</label>
        </div>
        <button className="btn primary" onClick={execute} disabled={loading}>Execute</button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="table-wrapper">
        <table className="table classic">
          <thead>
            <tr>
              <th>Code</th>
              <th>Company</th>
              <th>Sector</th>
              <th>Last Price</th>
              <th>Change (%)</th>
              <th>Volume</th>
              <th>Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.trading_code}>
                <td>{r.trading_code}</td>
                <td>{r.company_name}</td>
                <td>{r.sector}</td>
                <td>{r.last_price != null ? r.last_price.toFixed(2) : ''}</td>
                <td>{r.change_percentage != null ? r.change_percentage.toFixed(2) : ''}</td>
                <td>{r.volume != null ? r.volume.toLocaleString() : ''}</td>
                <td>{r.market_cap != null ? r.market_cap.toLocaleString() : ''}</td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td colSpan={7} className="muted">No data yet. Choose options and Execute.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}