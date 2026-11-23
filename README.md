# DSE Stock Analyzer

A database project for collecting and browsing Dhaka Stock Exchange data.
An Express backend retrieves stock data from DSE and stores it in MySQL.
A React dashboard presents stored stocks, sector data, and market summaries.

## Run locally

Use Node.js 22.12 or newer and a running MySQL instance. Create a local
`backend2/.env` using the settings in the [backend guide](backend2/README.md).
Use credentials for your own MySQL instance. The configured user needs to be
able to create the database and tables during startup.

In the first terminal:

```bash
cd backend2
npm ci
npm run dev
```

Check [the API health endpoint](http://localhost:5002/api/health). In a second
terminal, starting from the repository root:

```bash
cd frontend2/db-stock-project
npm ci
npm run dev
```

Open [the dashboard](http://localhost:3001). The default API address is
`http://localhost:5002/api`. Data ingestion depends on the availability and
page structure of the upstream exchange website.

## Code and schema

- [Backend routes and configuration](backend2/README.md)
- [MySQL schema used by the backend](backend2/schema.sql)
- [Frontend source](frontend2/db-stock-project/src/)
