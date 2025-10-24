import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { stockAPI } from '../services/api';
import CorporateActions from '../components/CorporateActions';
import FinancialHighlights from '../components/FinancialHighlights';
import Shareholding from '../components/Shareholding';

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

export default function StockDetails() {
  const { code: paramCode } = useParams();
  const navigate = useNavigate();
  const [code] = useState((paramCode || 'SIBL').toUpperCase());
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        const data = await stockAPI.getStockByCode(code);
        setStock(data);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };
    load();
  }, [code]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <div className="heading-bar top"><h2>Stock Details</h2></div>
      <div className="controls">
        <Link to="/stocks" className="btn-link">← Back to Stocks</Link>
        {/* <button onClick={() => navigate(`/stocks/${code}`)}>Legacy View</button> */}
      </div>
      {loading && <p className="muted" style={{ textAlign: 'center' }}>Loading {code}…</p>}
      {error && <p className="error" style={{ textAlign: 'center' }}>{error}</p>}
      {stock && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="heading-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0 }}>{stock.companyName} ({stock.tradingCode})</h3>
            <span className="muted">Sector: {stock.sector}</span>
          </div>

          <div className="subnav">
            <a href="#market">Market</a>
            <a href="#basic">Basics</a>
            <a href="#performance">Performance</a>
            <a href="#financials">Financials</a>
            <a href="#highlights">Highlights</a>
            <a href="#shareholding">Shareholding</a>
            <a href="#corporate">Corporate</a>
            <a href="#links">Links</a>
          </div>

          {stock.marketInformation && (
            <section className="section" id="market">
              <div className="heading-bar"><h4>Market Information</h4></div>
              <div className="card">
                <p className="muted" style={{ textAlign: 'center' }}>As of: {fmtDate(stock.marketInformation.asOfDate)}</p>
                <div className="grid-two">
                  <table className="table classic">
                    <tbody>
                      <tr><th>LTP</th><td>{fmtNum(stock.marketInformation.lastTradingPrice)}</td></tr>
                      <tr><th>Closing</th><td>{fmtNum(stock.marketInformation.closingPrice)}</td></tr>
                      <tr><th>Change</th><td>{fmtNum(stock.marketInformation.change)} ({fmtNum(stock.marketInformation.changePercentage)}%)</td></tr>
                      <tr><th>Open</th><td>{fmtNum(stock.marketInformation.openingPrice)}</td></tr>
                      <tr><th>Adjusted Open</th><td>{fmtNum(stock.marketInformation.adjustedOpeningPrice)}</td></tr>
                      <tr><th>Yesterday Close</th><td>{fmtNum(stock.marketInformation.yesterdaysClosingPrice)}</td></tr>
                    </tbody>
                  </table>
                  <table className="table classic">
                    <tbody>
                      <tr><th>Day's Range</th><td>{fmtNum(stock.marketInformation.daysRange?.low)} - {fmtNum(stock.marketInformation.daysRange?.high)}</td></tr>
                      <tr><th>52W Range</th><td>{fmtNum(stock.marketInformation.fiftyTwoWeeksMovingRange?.low)} - {fmtNum(stock.marketInformation.fiftyTwoWeeksMovingRange?.high)}</td></tr>
                      <tr><th>Day's Volume</th><td>{fmtNum(stock.marketInformation.daysVolume)}</td></tr>
                      <tr><th>Day's Trades</th><td>{fmtNum(stock.marketInformation.daysTradeCount)}</td></tr>
                      <tr><th>Day's Value</th><td>{fmtNum(stock.marketInformation.daysValue)}</td></tr>
                      <tr><th>Market Cap</th><td>{fmtNum(stock.marketInformation.marketCapitalization)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {stock.basicInformation && (
            <section className="section" id="basic">
              <div className="heading-bar"><h4>Basic Information</h4></div>
              <div className="card">
                <table className="table classic">
                  <tbody>
                    <tr><th>Authorized Capital</th><td>{fmtNum(stock.basicInformation.authorizedCapital)}</td></tr>
                    <tr><th>Paid Up Capital</th><td>{fmtNum(stock.basicInformation.paidUpCapital)}</td></tr>
                    <tr><th>Face Value</th><td>{fmtNum(stock.basicInformation.faceValue)}</td></tr>
                    <tr><th>Total Outstanding Securities</th><td>{fmtNum(stock.basicInformation.totalOutstandingSecurities)}</td></tr>
                    <tr><th>Instrument</th><td>{stock.basicInformation.typeOfInstrument ?? '-'}</td></tr>
                    <tr><th>Market Lot</th><td>{fmtNum(stock.basicInformation.marketLot)}</td></tr>
                    <tr><th>Listing Year</th><td>{fmtNum(stock.basicInformation.listingYear)}</td></tr>
                    <tr><th>Market Category</th><td>{stock.basicInformation.marketCategory ?? '-'}</td></tr>
                    <tr><th>Electronic Share</th><td>{stock.basicInformation.isElectronicShare ? 'Y' : 'N'}</td></tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {stock.corporateActions && (
            <section className="section" id="performance">
              <CorporateActions data={stock.corporateActions} />
            </section>
          )}

          {stock.financialPerformance && (
            <section className="section" id="financials">
              <div className="heading-bar"><h4>EPS</h4></div>
              <div className="card">
                <h5 style={{marginTop:0}}>Interim EPS</h5>
                <table className="table classic">
                  <thead>
                    <tr><th>Year</th><th>Period</th><th>Ending On</th><th>Basic</th><th>Diluted</th></tr>
                  </thead>
                  <tbody>
                    {(stock.financialPerformance.interimEPS || []).length ? (
                      stock.financialPerformance.interimEPS.map((e, idx) => (
                        <tr key={idx}>
                          <td>{fmtNum(e.year)}</td>
                          <td>{e.period || '-'}</td>
                          <td>{fmtDate(e.endingOn)}</td>
                          <td>{fmtNum(e.basic)}</td>
                          <td>{fmtNum(e.diluted)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="muted">No interim EPS data.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="card" style={{marginTop:12}}>
                <h5 style={{marginTop:0}}>Audited EPS</h5>
                <table className="table classic">
                  <thead>
                    <tr><th>Year</th><th>EPS</th></tr>
                  </thead>
                  <tbody>
                    {(stock.financialPerformance.auditedEPS || []).length ? (
                      stock.financialPerformance.auditedEPS.map((a, idx) => (
                        <tr key={idx}>
                          <td>{fmtNum(a.year)}</td>
                          <td>{fmtNum(a.eps)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={2} className="muted">No audited EPS data.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {stock.financialHighlights && (
            <section className="section" id="highlights">
              <FinancialHighlights data={stock.financialHighlights} />
            </section>
          )}

          {Array.isArray(stock.shareholding) && stock.shareholding.length > 0 && (
            <section className="section" id="shareholding">
              <Shareholding data={stock.shareholding} />
            </section>
          )}

          {/* {stock.corporateInformation && (
            <section className="section" id="corporate">
              <div className="heading-bar"><h4>Corporate Information</h4></div>
              <div className="card">
                <table className="table classic">
                  <tbody>
                    <tr><th>Address</th><td>{stock.corporateInformation.address || '-'}</td></tr>
                    <tr><th>Email</th><td>{stock.corporateInformation.email || '-'}</td></tr>
                    <tr><th>Website</th><td>{stock.corporateInformation.website || '-'}</td></tr>
                    <tr><th>Secretary</th><td>{stock.corporateInformation.companySecretary?.name || '-'} ({stock.corporateInformation.companySecretary?.cell || '-'})</td></tr>
                  </tbody>
                </table>
                {Array.isArray(stock.corporateInformation.phone) && stock.corporateInformation.phone.length ? (
                  <div style={{ marginTop: 10 }}>
                    <h5>Phones</h5>
                    <ul>
                      {stock.corporateInformation.phone.map((p, idx) => <li key={idx}>{p}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          )} */}

          {/* {stock.links && (
            <section className="section" id="links">
              <div className="heading-bar"><h4>Links</h4></div>
              <div className="card">
                <ul>
                  <li>Financial Statements: <a href={stock.links.financial_statements} target="_blank" rel="noreferrer">Open</a></li>
                  <li>PSI: <a href={stock.links.price_sensitive_information} target="_blank" rel="noreferrer">Open</a></li>
                </ul>
              </div>
            </section>
          )} */}
        </div>
      )}
    </div>
  );
}