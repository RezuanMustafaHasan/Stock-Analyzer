import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockAPI } from '../services/api';

export default function TopMovers() {
  const navigate = useNavigate();
  const [top, setTop] = useState(10);
  const [order, setOrder] = useState('DESC'); // DESC for gainers, ASC for losers
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExecute = async () => {
    if (!top || top < 1) {
      setError('Please enter a valid number for top count');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await stockAPI.postTopMovers({ top, order });
      setResults(data || []);
      if (!data || data.length === 0) {
        setError('No data found for the selected criteria');
      }
    } catch (err) {
      console.error('Top movers fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch top movers data');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (n, digits = 2) => {
    if (n == null || Number.isNaN(Number(n))) return '-';
    return Number(n).toLocaleString('en-US', { 
      minimumFractionDigits: digits, 
      maximumFractionDigits: digits 
    });
  };

  const handleRowClick = (tradingCode) => {
    navigate(`/stocks/${tradingCode}/details`);
  };

  return (
    <>
      <div className="heading-bar top">
        <h2>Top Gainers / Losers</h2>
      </div>

      <div className="card">
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          alignItems: 'flex-end', 
          flexWrap: 'wrap', 
          marginBottom: '20px',
          padding: '10px 0'
        }}>
          <div>
            <label htmlFor="top" style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              fontSize: '14px',
              color: '#333'
            }}>
              Top Count
            </label>
            <input
              id="top"
              type="number"
              value={top}
              onChange={(e) => setTop(Number(e.target.value))}
              min="1"
              max="200"
              placeholder="e.g., 10"
              style={{
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                width: '120px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#007bff'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              fontSize: '14px',
              color: '#333'
            }}>
              Order
            </label>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="DESC"
                  checked={order === 'DESC'}
                  onChange={(e) => setOrder(e.target.value)}
                  style={{ marginRight: '6px' }}
                />
                <span style={{ fontSize: '14px' }}>Gainers (DESC)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="ASC"
                  checked={order === 'ASC'}
                  onChange={(e) => setOrder(e.target.value)}
                  style={{ marginRight: '6px' }}
                />
                <span style={{ fontSize: '14px' }}>Losers (ASC)</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleExecute}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease',
              minWidth: '100px'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#0056b3')}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#007bff')}
          >
            {loading ? 'Loading...' : 'Execute'}
          </button>
        </div>

        {error && <p style={{ color: 'red', textAlign: 'center', margin: '10px 0' }}>{error}</p>}

        {results.length > 0 && (
          <div className="table-wrapper">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Code</th>
                  <th style={{ textAlign: 'left' }}>Company</th>
                  <th style={{ textAlign: 'left' }}>Sector</th>
                  <th style={{ textAlign: 'right' }}>Last Price</th>
                  <th style={{ textAlign: 'right' }}>Change (%)</th>
                  <th style={{ textAlign: 'right' }}>Volume</th>
                  <th style={{ textAlign: 'right' }}>Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {results.map((stock) => {
                  const changeColor = stock.change_percentage > 0 ? 'green' : stock.change_percentage < 0 ? 'red' : undefined;
                  return (
                    <tr 
                      key={stock.trading_code}
                      onClick={() => handleRowClick(stock.trading_code)}
                      style={{ 
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.closest('tr').style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.target.closest('tr').style.backgroundColor = 'transparent'}
                    >
                      <td><strong>{stock.trading_code}</strong></td>
                      <td>{stock.company_name}</td>
                      <td>{stock.sector}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(stock.last_price, 2)}</td>
                      <td style={{ textAlign: 'right', color: changeColor }}>
                        <strong>{formatNumber(stock.change_percentage, 2)}%</strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(stock.volume, 0)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(stock.market_cap, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && results.length === 0 && !error && (
          <p style={{ textAlign: 'center', color: '#666', padding: '40px 20px' }}>
            Click "Execute" to load top movers data
          </p>
        )}
      </div>
    </>
  );
}