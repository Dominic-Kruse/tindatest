// routes/productRoutes.ts
import express from 'express';
import multer from 'multer';
import path from 'path';
import { getProducts, createListing } from '../controllers/productsController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

// Add multer configuration for product images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + extension); // Note: added 'product-' prefix
  }
});

const upload = multer({ storage });

// Your product routes
router.get('/', getProducts);
router.post('/', verifyToken, upload.single('product_image'), createListing); // Add multer here

export default router;