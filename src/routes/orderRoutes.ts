import { Router } from 'express';
import { getVendorOrders, updateOrderStatus, getVendorOrderStats } from '../controllers/orderController';

const router = Router();

router.get('/vendor', getVendorOrders);
router.get('/stats', getVendorOrderStats);
router.patch('/:orderId/status', updateOrderStatus);

export default router;
