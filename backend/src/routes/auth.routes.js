import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller.js';
import protect from '../middleware/auth.middleware.js';
import { anyRole } from '../middleware/role.middleware.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login',    login);

// Private routes
router.get('/me', protect, anyRole, getMe);

export default router;