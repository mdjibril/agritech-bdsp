# V4V Web Platform

Phase 4 React dashboard for public marketplace access and authenticated BDSP
network management.

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies `/api` to the backend at
`http://localhost:4000`. Start the backend before signing in.

Seeded BDSP login:

```text
Phone: +2348100000001
Password: password123
```

Set `VITE_API_URL` when the backend is hosted separately.
