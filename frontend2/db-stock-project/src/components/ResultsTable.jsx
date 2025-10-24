import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ResultsTable({ stockResults }) {
  const navigate = useNavigate();

  const formatNumber = (n, digits = 2) => {
    if (n == null || Number.isNaN(Number(n))) return '-';
    return Number(n).toFixed(digits);
  };

  const handleRowClick = (tradingCode) => {
    navigate(`/stocks/${tradingCode}/details`);
  };

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Trading Code</th>
            <th style={{ textAlign: 'left' }}>Company Name</th>
            <th style={{ textAlign: 'left' }}>Sector</th>
            <th style={{ textAlign: 'right' }}>Closing Price</th>
            <th style={{ textAlign: 'right' }}>P/E Ratio</th>
            <th style={{ textAlign: 'right' }}>Dividend Yield (%)</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(stockResults) && stockResults.length > 0 ? (
            stockResults.map((r) => (
              <tr 
                key={r.trading_code}
                onClick={() => handleRowClick(r.trading_code)}
                style={{ 
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.closest('tr').style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.target.closest('tr').style.backgroundColor = 'transparent'}
              >
                <td>{r.trading_code}</td>
                <td>{r.company_name}</td>
                <td>{r.sector}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(r.closing_price, 2)}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(r.pe_ratio, 2)}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(r.dividend_yield, 2)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '1rem' }}>No results</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}