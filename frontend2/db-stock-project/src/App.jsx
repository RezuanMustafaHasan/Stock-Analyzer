import { Route, Routes, Navigate, Link } from 'react-router-dom'
import StockViewer from './pages/StockViewer'
import BulkFetch from './pages/BulkFetch'
import StockDetails from './pages/StockDetails'
import './App.css'

function App() {
  return (
    <div className='app'>
      <nav className="navbar">
        {/* <div className="container classic nav-simple"> */}
          <Link to="/stocks">Stocks</Link>
          <Link to="/bulk">Bulk Fetch</Link>
        {/* </div> */}
      </nav>
      <main className="container classic">
        <Routes>
          <Route path="/" element={<Navigate to="/stocks" replace />} />
          <Route path="/stocks" element={<StockViewer />} />
          <Route path="/stocks/:code/details" element={<StockDetails />} />
          <Route path="/bulk" element={<BulkFetch />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
