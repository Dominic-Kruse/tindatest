import { Router } from 'express';
import { getVendorOrders, updateOrderStatus } from '../controllers/orderController';

const router = Router();

router.get('/vendor', getVendorOrders);
router.patch('/:orderId/status', updateOrderStatus);

export default router;
