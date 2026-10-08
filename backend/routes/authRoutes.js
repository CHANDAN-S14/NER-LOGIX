import { Router } from 'express';
import { register, login, me } from '../controllers/authController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', optionalAuth, register);
router.post('/login', login);
router.get('/me', protect, me);

export default router;
