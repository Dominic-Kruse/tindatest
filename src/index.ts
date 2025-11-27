import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { db } from './db'
import * as schema from './db/schema'
import usersRouter from './routes/users'
import authRouter from './routes/authRoutes' 
import stallsRouter from './routes/stalls';
import productsRouter from './routes/productsRoutes';
import cartRoutes from './routes/cartRoutes'
import orderRoutes from './routes/orderRoutes'
import searchRouter from "./routes/searchRoutes";
import checkoutRoutes from './routes/checkoutRoutes'

const app = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Mount routers
app.use('/api/users', usersRouter)
app.use('/api/auth', authRouter) 
app.use('/api/stalls', stallsRouter);
app.use('/api/products', productsRouter);
app.use('/uploads', express.static('uploads'));
app.use("/api/cart", cartRoutes);
app.use('/api/orders', orderRoutes);
app.use("/api/search", searchRouter);
app.use('/api/checkout', checkoutRoutes)

// (Optional) keep your test routes for fetching tables
const tables = [
  'users', 'vendors', 'buyers', 'stalls', 'stall_items', 'conversations',
  'messages', 'images', 'sessions', 'revoked_tokens', 'reviews',
  'shopping_carts', 'line_items', 'orders', 'payments', 'sales'
] as const

tables.forEach((table) => {
  app.get(`/api/${table}`, async (_req, res) => {
    try {
      // @ts-ignore
      const rows = await db.query[table].findMany()
      res.json(rows)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: `Failed to fetch ${table}` })
    }
  })
})

app.get('/api/debug/routes', (req, res) => {
  const routes = app._router.stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => {
      return {
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }
    })
  res.json(routes)
})

// Vercel-compatible export (REMOVE app.listen)
export default app