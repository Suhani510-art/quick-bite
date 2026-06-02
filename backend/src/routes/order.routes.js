import { Router } from 'express';
import {
  placeOrder,
  getMyOrders,
  getOrderById,
  checkDelivery,
} from '../controllers/order.controller.js';
import protect from '../middleware/auth.middleware.js';
import { buyerOnly } from '../middleware/role.middleware.js';

const router = Router();

router.use(protect, buyerOnly);

router.post('/check-delivery', checkDelivery);
router.post('/',               placeOrder);
router.get('/my-orders',       getMyOrders);
router.get('/:id',             getOrderById);

export default router;