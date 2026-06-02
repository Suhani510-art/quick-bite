import { Router } from 'express';
import {
  createDeal,
  getAllDeals,
  getDealById,
  getMyDeals,
  updateDeal,
  deleteDeal,
} from '../controllers/deal.controller.js';
import protect from '../middleware/auth.middleware.js';
import { sellerOnly } from '../middleware/role.middleware.js';

const router = Router();

// ── Public routes (buyers browsing) ───────────────────────────
router.get('/',    getAllDeals);
router.get('/:id', getDealById);

// ── Private / Seller routes ────────────────────────────────────

// IMPORTANT: '/seller/my-deals' must be defined BEFORE '/:id'
// otherwise Express matches "seller" as an :id param
router.get(   '/seller/my-deals', protect, sellerOnly, getMyDeals);
router.post(  '/',                protect, sellerOnly, createDeal);
router.put(   '/:id',             protect, sellerOnly, updateDeal);
router.delete('/:id',             protect, sellerOnly, deleteDeal);

export default router;