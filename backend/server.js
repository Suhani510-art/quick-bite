import dotenv from 'dotenv';
dotenv.config(); // ← SABSE PEHLE — baaki sab imports se pehle

import express  from 'express';
import cors     from 'cors';
import helmet   from 'helmet';
import morgan   from 'morgan';

import connectDB           from './src/config/db.js';
import startExpireDealsJob from './src/jobs/expireDeals.job.js';

import authRoutes  from './src/routes/auth.routes.js';
import dealRoutes  from './src/routes/deal.routes.js';
import cartRoutes  from './src/routes/cart.routes.js';
import orderRoutes from './src/routes/order.routes.js';

connectDB();
startExpireDealsJob();

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
  ],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',   authRoutes);
app.use('/api/deals',  dealRoutes);
app.use('/api/cart',   cartRoutes);
app.use('/api/orders', orderRoutes);

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status:  'ok',
    message: 'Food Deals API is running ',
    time:    new Date().toISOString(),
  });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  console.error(' Error:', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});