import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/cart.controller.js';
import protect from '../middleware/auth.middleware.js';
import { buyerOnly } from '../middleware/role.middleware.js';

const router = Router();

// All cart routes are private and buyer-only
router.use(protect, buyerOnly);

router.get(   '/',         getCart);
router.post(  '/',         addToCart);
router.put(   '/:dealId',  updateCartItem);
router.delete('/',         clearCart);
router.delete('/:dealId',  removeFromCart);

export default router;