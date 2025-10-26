import React, { useEffect, useMemo, useState } from 'react';
import { stockAPI } from '../services/api';

export default function FilterPanel({ filterOptions, setFilterOptions, onExecute }) {
  const [sectors, setSectors] = useState([]);
  const [sectorQuery, setSectorQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await stockAPI.getSectorsSummary();
        let names = Array.isArray(data) ? data.map((s) => s.sector_name || s.sector || s.name).filter(Boolean) : [];
        names = Array.from(new Set(names)).sort();
        if (!names.length) {
          // Fallback: derive sector list from stocks if summary is unavailable
          const stocks = await stockAPI.listStocks();
          const fallback = Array.isArray(stocks) ? Array.from(new Set(stocks.map((st) => st.sector).filter(Boolean))).sort() : [];
          names = fallback;
        }
        if (mounted) setSectors(names);
      } catch (e) {
        try {
          const stocks = await stockAPI.listStocks();
          const fallback = Array.isArray(stocks) ? Array.from(new Set(stocks.map((st) => st.sector).filter(Boolean))).sort() : [];
          if (mounted) setSectors(fallback);
        } catch (_) {
          // leave sectors empty
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const update = (key, value) => {
    setFilterOptions((prev) => ({ ...prev, [key]: value }));
  };

  const filteredSectors = useMemo(() => {
    const q = sectorQuery.trim().toLowerCase();
    if (!q) return sectors;
    return sectors.filter((s) => s.toLowerCase().includes(q));
  }, [sectorQuery, sectors]);

  const toggleSector = (name, checked) => {
    setFilterOptions((prev) => {
      const set = new Set(prev.sectors || []);
      if (checked) set.add(name); else set.delete(name);
      return { ...prev, sectors: Array.from(set) };
    });
  };

  return (
    <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
      <div className="heading-bar"><h2>Filters</h2></div>

      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(260px, 1fr))' }}>
        <div className="form-card">
          <div className="form-row">
            <label>Sector Mode</label>
            <div className="radio-row">
              <label><input type="radio" name="sectorMode" value="all" checked={filterOptions.sectorMode === 'all'} onChange={(e) => update('sectorMode', e.target.value)} /> All</label>
              <label><input type="radio" name="sectorMode" value="single" checked={filterOptions.sectorMode === 'single'} onChange={(e) => update('sectorMode', e.target.value)} /> Single</label>
              <label><input type="radio" name="sectorMode" value="multiple" checked={filterOptions.sectorMode === 'multiple'} onChange={(e) => update('sectorMode', e.target.value)} /> Multiple</label>
            </div>
          </div>

          {filterOptions.sectorMode === 'single' && (
            <div className="form-row">
              <label>Sector</label>
              <select className="input" value={filterOptions.sector} onChange={(e) => update('sector', e.target.value)}>
                <option value="">Select...</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {filterOptions.sectorMode === 'multiple' && (
            <div className="form-row">
              <label>Sector(s)</label>
              <input
                className="input"
                type="text"
                placeholder="Search sectors"
                value={sectorQuery}
                onChange={(e) => setSectorQuery(e.target.value)}
                style={{ marginBottom: '0.5rem' }}
              />
              <div className="checkbox-list" style={{ maxHeight: '220px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '0.5rem' }}>
                {filteredSectors.length ? (
                  filteredSectors.map((s) => (
                    <label key={s} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={Array.isArray(filterOptions.sectors) ? filterOptions.sectors.includes(s) : false}
                        onChange={(e) => toggleSector(s, e.target.checked)}
                      />
                      <span>{s}</span>
                    </label>
                  ))
                ) : (
                  <div style={{ color: '#666' }}>No sectors found</div>
                )}
              </div>
              {Array.isArray(filterOptions.sectors) && filterOptions.sectors.length > 0 && (
                <div className="chip-row" style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {filterOptions.sectors.map((s) => (
                    <span key={s} className="chip">{s}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-card">
          <div className="form-row">
            <label>P/E Ratio (min)</label>
            <input className="input" type="number" step="0.01" value={filterOptions.pe_min} onChange={(e) => update('pe_min', e.target.value)} />
          </div>
          <div className="form-row">
            <label>P/E Ratio (max)</label>
            <input className="input" type="number" step="0.01" value={filterOptions.pe_max} onChange={(e) => update('pe_max', e.target.value)} />
          </div>
          <div className="form-row">
            <label>Dividend Yield (min)</label>
            <input className="input" type="number" step="0.01" value={filterOptions.dividend_min} onChange={(e) => update('dividend_min', e.target.value)} />
          </div>
          <div className="form-row">
            <label>Market Cap (min)</label>
            <input className="input" type="number" step="1" value={filterOptions.market_cap_min} onChange={(e) => update('market_cap_min', e.target.value)} />
          </div>
        </div>

        <div className="form-card">
          <div className="heading-bar"><h3>Loan Filters</h3></div>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(160px, 1fr))', gap: '0.5rem' }}>
            <div className="form-row">
              <label>Short-term loan (min)</label>
              <input className="input" type="number" step="1" value={filterOptions.short_term_loan_min} onChange={(e) => update('short_term_loan_min', e.target.value)} />
            </div>
            <div className="form-row">
              <label>Short-term loan (max)</label>
              <input className="input" type="number" step="1" value={filterOptions.short_term_loan_max} onChange={(e) => update('short_term_loan_max', e.target.value)} />
            </div>
            <div className="form-row">
              <label>Long-term loan (min)</label>
              <input className="input" type="number" step="1" value={filterOptions.long_term_loan_min} onChange={(e) => update('long_term_loan_min', e.target.value)} />
            </div>
            <div className="form-row">
              <label>Long-term loan (max)</label>
              <input className="input" type="number" step="1" value={filterOptions.long_term_loan_max} onChange={(e) => update('long_term_loan_max', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-card">
          <div className="heading-bar"><h3>Shareholding (latest)</h3></div>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(160px, 1fr))', gap: '0.5rem' }}>
            <div className="form-row"><label>Sponsor/Director min (%)</label><input className="input" type="number" step="0.01" value={filterOptions.sponsor_min} onChange={(e) => update('sponsor_min', e.target.value)} /></div>
            <div className="form-row"><label>Sponsor/Director max (%)</label><input className="input" type="number" step="0.01" value={filterOptions.sponsor_max} onChange={(e) => update('sponsor_max', e.target.value)} /></div>
            <div className="form-row"><label>Government min (%)</label><input className="input" type="number" step="0.01" value={filterOptions.government_min} onChange={(e) => update('government_min', e.target.value)} /></div>
            <div className="form-row"><label>Government max (%)</label><input className="input" type="number" step="0.01" value={filterOptions.government_max} onChange={(e) => update('government_max', e.target.value)} /></div>
            <div className="form-row"><label>Institute min (%)</label><input className="input" type="number" step="0.01" value={filterOptions.institute_min} onChange={(e) => update('institute_min', e.target.value)} /></div>
            <div className="form-row"><label>Institute max (%)</label><input className="input" type="number" step="0.01" value={filterOptions.institute_max} onChange={(e) => update('institute_max', e.target.value)} /></div>
            <div className="form-row"><label>Foreign min (%)</label><input className="input" type="number" step="0.01" value={filterOptions.foreign_min} onChange={(e) => update('foreign_min', e.target.value)} /></div>
            <div className="form-row"><label>Foreign max (%)</label><input className="input" type="number" step="0.01" value={filterOptions.foreign_max} onChange={(e) => update('foreign_max', e.target.value)} /></div>
            <div className="form-row"><label>Public min (%)</label><input className="input" type="number" step="0.01" value={filterOptions.public_min} onChange={(e) => update('public_min', e.target.value)} /></div>
            <div className="form-row"><label>Public max (%)</label><input className="input" type="number" step="0.01" value={filterOptions.public_max} onChange={(e) => update('public_max', e.target.value)} /></div>
          </div>
        </div>
      </div>

      <div className="toolbar" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button className="btn primary" onClick={onExecute}>Execute</button>
      </div>
    </div>
  );
}