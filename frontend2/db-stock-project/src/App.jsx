import { Route, Routes, Navigate, Link } from 'react-router-dom'
import StockViewer from './pages/StockViewer'
import BulkFetch from './pages/BulkFetch'
import StockDetails from './pages/StockDetails'
import PERatio from './pages/PERatio'
import './App.css'

function App() {
  return (
    <div className='app'>
      <nav className="navbar">
        {/* <div className="container classic nav-simple"> */}
          <Link to="/stocks">Stocks</Link>
          <Link to="/bulk">Bulk Fetch</Link>
          <Link to="/pe-ratio">P/E Ratio</Link>
        {/* </div> */}
      </nav>
      <main className="container classic">
        <Routes>
          <Route path="/" element={<Navigate to="/stocks" replace />} />
          <Route path="/stocks" element={<StockViewer />} />
          <Route path="/stocks/:code/details" element={<StockDetails />} />
          <Route path="/bulk" element={<BulkFetch />} />
          <Route path="/pe-ratio" element={<PERatio />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
