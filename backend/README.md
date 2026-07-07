# Backend

REST API for the Agritech BDSP V4V proof of concept.

## Commands

```bash
npm install
npm run dev
```

The API defaults to `http://localhost:4000` and reads `DATABASE_URL` from the repository root `.env` file.

## Phase 2 Routes

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /posts`
- `POST /posts`
- `PATCH /posts/:postId/status`
- `GET /bdsp/network`
- `GET /hubs`
- `POST /hubs`
- `GET /deals`
- `POST /deals`
