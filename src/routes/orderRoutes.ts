import { Router } from 'express';
import { getVendorOrders } from '../controllers/orderController';

const router = Router();

router.get('/vendor', getVendorOrders);

export default router;
