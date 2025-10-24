import { Route, Routes, Navigate, Link } from 'react-router-dom'
import StockViewer from './pages/StockViewer'
import BulkFetch from './pages/BulkFetch'
import StockDetails from './pages/StockDetails'
import PERatio from './pages/PERatio'
import SectorsSummary from './pages/SectorsSummary'
import MarketSnapshot from './pages/MarketSnapshot'
import StockScreenerPage from './pages/StockScreenerPage'
import TopMovers from './pages/TopMovers'
import './App.css'

function App() {
  return (
    <div className='app'>
      <nav className="navbar">
        {/* <div className="container classic nav-simple"> */}
          <Link to="/stocks">Stocks</Link>
          <Link to="/bulk">Bulk Fetch</Link>
          <Link to="/pe-ratio">P/E Ratio</Link>
          <Link to="/sectors-summary">Sectors Summary</Link>
          <Link to="/market-snapshot">Market Snapshot</Link>
          <Link to="/stock-screener">Stock Screener</Link>
          <Link to="/top-movers">Top Movers</Link>
        {/* </div> */}
      </nav>
      <main className="container classic">
        <Routes>
          <Route path="/" element={<Navigate to="/stocks" replace />} />
          <Route path="/stocks" element={<StockViewer />} />
          <Route path="/stocks/:code/details" element={<StockDetails />} />
          <Route path="/bulk" element={<BulkFetch />} />
          <Route path="/pe-ratio" element={<PERatio />} />
          <Route path="/sectors-summary" element={<SectorsSummary />} />
          <Route path="/market-snapshot" element={<MarketSnapshot />} />
          <Route path="/stock-screener" element={<StockScreenerPage />} />
          <Route path="/top-movers" element={<TopMovers />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
