# Backend2 (MySQL)

Express server storing DSE stock data in MySQL. Now scrapes directly from DSE (independent of original backend) and exposes bulk-fetch utilities.

## Setup

1. Ensure MySQL is running and accessible.
2. Configure `.env` in `backend2`:

```
PORT=5002
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=12345678
DB_NAME=dse_stocks
```

3. Install dependencies and start:

```
cd backend2
npm install
npm run dev
```

Server runs at `http://localhost:5002`.

Note: `SOURCE_API_URL` is no longer required. The server scrapes DSE directly.

## Schema

`schema.sql` contains DDL for all tables. The server ensures schema on startup.

## API

- `POST /api/stocks/fetch { tradingCode }`: scrape from DSE and store.
- `POST /api/stocks/refresh/:tradingCode`: re-scrape and store.
- `GET /api/stocks`: list stored stocks.
- `GET /api/stocks/:tradingCode`: assembled stock payload from SQL tables.
- `POST /api/stocks/bulk-fetch`: start background bulk job for all trading codes.
- `GET /api/stocks/bulk-fetch/progress`: view bulk job progress.
- `POST /api/stocks/bulk-fetch/stop`: request stop of bulk job.