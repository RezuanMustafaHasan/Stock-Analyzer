import { Route, Routes, Navigate, Link } from 'react-router-dom'
import StockViewer from './pages/StockViewer'
import BulkFetch from './pages/BulkFetch'
import StockDetails from './pages/StockDetails'
import PERatio from './pages/PERatio'
import SectorsSummary from './pages/SectorsSummary'
import MarketSnapshot from './pages/MarketSnapshot'
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
        </Routes>
      </main>
    </div>
  )
}

export default App
