import { Router } from 'express';
import { getVendorOrders, updateOrderStatus, getVendorOrderStats } from '../controllers/orderController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/vendor', verifyToken, getVendorOrders);
router.get('/stats', verifyToken, getVendorOrderStats);
router.patch('/:orderId/status', verifyToken, updateOrderStatus);

export default router;
