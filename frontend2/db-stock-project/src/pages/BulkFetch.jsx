import { useEffect, useState } from 'react'
import { stockAPI } from '../services/api'

export default function BulkFetch() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const start = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await stockAPI.startBulkFetch()
      setStatus(res.data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await stockAPI.getBulkFetchProgress()
        setStatus(res.data)
      } catch {}
    }, 1500)
    return () => clearInterval(id)
  }, [])

  const percent = status?.total ? Math.round((status.completed / status.total) * 100) : 0

  return (
    <>
      <div className="heading-bar top"><h2>Bulk Fetch</h2></div>
      <div className="card">
        <div className="controls">
          <button onClick={start} disabled={loading}>Start bulk fetch</button>
          <button onClick={async () => { try { const res = await stockAPI.stopBulkFetch(); setStatus(res.data) } catch {} }}>Stop</button>
        </div>
        {status && (
          <div style={{ marginBottom: 12 }}>
            <div className="progress-wrap" aria-label="bulk-progress">
              <div className="progress-bar" style={{ width: `${percent}%` }} />
            </div>
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <strong>{percent}%</strong> completed
            </div>
          </div>
        )}
        {error && <p className="error" style={{ textAlign: 'center' }}>{error}</p>}
        {status && (
          <table className="table classic">
            <tbody>
              <tr><th>Status</th><td>{status.isRunning ? 'Running' : 'Stopped'}</td></tr>
              <tr><th>Total</th><td>{status.total}</td></tr>
              <tr><th>Completed</th><td>{status.completed}</td></tr>
              <tr><th>Current</th><td>{status.current || '-'}</td></tr>
              <tr><th>Started</th><td>{status.startedAt ? new Date(status.startedAt).toISOString().slice(0,10) : '-'}</td></tr>
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}