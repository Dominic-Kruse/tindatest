// routes/checkoutRoutes.ts
import express from 'express';
import { checkoutController } from '../controllers/checkoutController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', verifyToken, checkoutController.createOrder);
router.post('/simple', verifyToken, checkoutController.createSimpleOrder);

export default router;