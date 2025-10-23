import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockAPI } from '../services/api';

export default function PERatio() {
  const navigate = useNavigate();
  const [year, setYear] = useState('2024');
  const [order, setOrder] = useState('ASC');
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  const fmtNum = (n) => {
    if (n === null || n === undefined || n === '') return '-';
    const v = typeof n === 'string' ? parseFloat(n) : n;
    if (Number.isNaN(v)) return n;
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(v);
  };

  const handleExecute = async () => {
    if (!year) {
      setError('Please enter a year');
      return;
    }

    setLoading(true);
    setError('');
    setCurrentPage(1); // Reset to first page on new search
    try {
      const data = await stockAPI.getPERatio(year, order);
      setStocks(data);
      if (data.length === 0) {
        setError(`No data found for year ${year}. Make sure stocks with EPS data for this year exist in the database.`);
      }
    } catch (err) {
      console.error('PE Ratio fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch P/E ratio data');
      setStocks([]);
    } finally {
      setLoading(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(stocks.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentStocks = stocks.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const handleViewDetails = (tradingCode) => {
    navigate(`/stocks/${tradingCode}/details`);
  };

  return (
    <>
      <div className="heading-bar top">
        <h2>P/E Ratio Analysis</h2>
      </div>

      <div className="card">
        <div className="controls">
          <div>
            <label htmlFor="year" style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
              Year
            </label>
            <input
              id="year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g., 2024"
              onKeyPress={(e) => e.key === 'Enter' && handleExecute()}
            />
          </div>

          <div>
            <label htmlFor="order" style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px' }}>
              Sort Order
            </label>
            <select
              id="order"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
            >
              <option value="ASC">Ascending</option>
              <option value="DESC">Descending</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={handleExecute} disabled={loading}>
              {loading ? 'Loading...' : 'Execute'}
            </button>
          </div>
        </div>

        {error && <p className="error" style={{ textAlign: 'center' }}>{error}</p>}

        {stocks.length > 0 && (
          <>
            <div style={{ marginBottom: '15px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Showing {startIndex + 1} to {Math.min(endIndex, stocks.length)} of {stocks.length} stocks
            </div>
            
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Trading Code</th>
                    <th>Company Name</th>
                    <th style={{ textAlign: 'right' }}>LTP</th>
                    <th style={{ textAlign: 'right' }}>EPS</th>
                    <th style={{ textAlign: 'right' }}>P/E Ratio</th>
                    <th style={{ textAlign: 'right' }}>Cash Dividend %</th>
                    <th style={{ textAlign: 'right' }}>Bonus Issue %</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentStocks.map((stock) => (
                    <tr key={stock.trading_code}>
                      <td><strong>{stock.trading_code}</strong></td>
                      <td>{stock.company_name}</td>
                      <td style={{ textAlign: 'right' }}>{fmtNum(stock.ltp)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtNum(stock.eps)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ color: 'var(--primary)' }}>{fmtNum(stock.pe_ratio)}</strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>{fmtNum(stock.cash_dividend)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtNum(stock.bonus_issue)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => handleViewDetails(stock.trading_code)}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '10px', 
                marginTop: '20px',
                flexWrap: 'wrap'
              }}>
                <button 
                  onClick={goToPreviousPage} 
                  disabled={currentPage === 1}
                  style={{ minWidth: '80px' }}
                >
                  Previous
                </button>
                
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {currentPage > 3 && (
                    <>
                      <button onClick={() => goToPage(1)}>1</button>
                      {currentPage > 4 && <span style={{ padding: '8px' }}>...</span>}
                    </>
                  )}
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => 
                      page === currentPage || 
                      page === currentPage - 1 || 
                      page === currentPage - 2 ||
                      page === currentPage + 1 || 
                      page === currentPage + 2
                    )
                    .map(page => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        style={{
                          backgroundColor: page === currentPage ? 'var(--primary)' : undefined,
                          color: page === currentPage ? 'white' : undefined,
                          fontWeight: page === currentPage ? 'bold' : undefined
                        }}
                      >
                        {page}
                      </button>
                    ))
                  }
                  
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && <span style={{ padding: '8px' }}>...</span>}
                      <button onClick={() => goToPage(totalPages)}>{totalPages}</button>
                    </>
                  )}
                </div>

                <button 
                  onClick={goToNextPage} 
                  disabled={currentPage === totalPages}
                  style={{ minWidth: '80px' }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {!loading && stocks.length === 0 && !error && (
          <p className="muted" style={{ textAlign: 'center', padding: '40px 20px' }}>
            Enter a year and click Execute to view P/E ratios
          </p>
        )}
      </div>
    </>
  );
}
