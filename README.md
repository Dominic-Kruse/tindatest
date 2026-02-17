# Tindatest Backend

Express + TypeScript backend with Drizzle ORM and Jest/Supertest API tests.

## Prerequisites

- Node.js 18+ (or the version you use in class)
- npm
- A Postgres database (Neon or local)

## Setup

1) Install dependencies:

```bash
npm install
```

2) Create a `.env` file in the project root with the required values:

```bash
# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?sslmode=require

# Server
PORT=3001

# JWT
JWT_SECRET=your_secret
JWT_EXPIRES_IN=7d

# Cloudinary (optional, for image upload features)
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

3) Generate and run migrations (if needed):

```bash
npm run drizzle:generate
npm run drizzle:migrate
```

## Scripts

- `npm run dev` - start the API in development (nodemon)
- `npm run build` - compile TypeScript
- `npm start` - run the built app
- `npm test` - run Jest tests (uses `jest.config.ts`)

## Testing

Tests are under `__tests__/` and use Supertest for API calls. The test script runs:

```bash
npm test
```

Notes:
- `jest.config.ts` is the active config. The test script explicitly points to it.
- Tests clear data via `__tests__/utils/db.ts` and close the DB client in `jest.setup.ts`.

## API Routes

- `/api/users` - registration, login, and user lookup
- `/api/stalls` - stalls CRUD
- `/api/products` - stall items (products) CRUD


