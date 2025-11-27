import express from 'express';
import multer from 'multer';
import path from 'path';
import { getStalls, createStall, updateStall, getStallById, getStallsByVendor } from '../controllers/stallsController';
import { verifyToken } from '../middleware/authMiddleware';
import { createListing } from '../controllers/productsController';
const router = express.Router();

// FIXED Multer configuration - preserves file extensions
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')  // Keep same destination
  },
  filename: function (req, file, cb) {
    // Generate unique name BUT PRESERVE EXTENSION
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname); // .png, .jpg, etc.
    cb(null, uniqueSuffix + extension); // e.g., "1234567890.png"
  }
});

const upload = multer({ 
  storage: storage,
  // Keep the same dest as fallback (optional)
  dest: 'uploads/'
});

// Routes remain exactly the same - no changes needed!
router.get('/', getStalls);
router.get('/:id', getStallById);


router.post("/items", verifyToken, createListing)

router.get('/vendor/:vendorId', verifyToken ,getStallsByVendor);
router.post('/', verifyToken, upload.fields([
  { name: 'banner_image', maxCount: 1 },
  { name: 'icon_image', maxCount: 1 },
]), createStall);
router.patch('/:id', upload.fields([
  { name: 'banner_image', maxCount: 1 },
  { name: 'icon_image', maxCount: 1 },
]), updateStall);

export default router;