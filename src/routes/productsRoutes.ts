
import express from 'express';
import { createListing, getProducts } from '../controllers/productsController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();
router.post('/',verifyToken,createListing)
router.get('/', getProducts);

export default router;
