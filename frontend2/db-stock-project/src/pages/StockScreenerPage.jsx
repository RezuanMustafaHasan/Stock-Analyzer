import React, { useState } from 'react';
import { stockAPI } from '../services/api';
import FilterPanel from '../components/FilterPanel';
import ResultsTable from '../components/ResultsTable';

export default function StockScreenerPage() {
  const [filterOptions, setFilterOptions] = useState({
    sectorMode: 'all', // 'all' | 'single' | 'multiple'
    sector: '',
    sectors: [],
    pe_min: '',
    pe_max: '',
    market_cap_min: '',
    dividend_min: '',
    sponsor_min: '',
    sponsor_max: '',
    government_min: '',
    government_max: '',
    institute_min: '',
    institute_max: '',
    foreign_min: '',
    foreign_max: '',
    public_min: '',
    public_max: ''
  });

  const [stockResults, setStockResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await stockAPI.postFilteredStocks(filterOptions);
      setStockResults(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load filtered stocks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="heading-bar"><h1>Stock Screener</h1></div>
      <FilterPanel filterOptions={filterOptions} setFilterOptions={setFilterOptions} onExecute={handleExecute} />

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <ResultsTable stockResults={stockResults} />
      )}
    </div>
  );
}