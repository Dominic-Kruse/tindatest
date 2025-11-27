import { Router } from "express";
import { cartController } from "../controllers/cartController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

// All cart routes require authentication
router.use(verifyToken);

router.get("/", cartController.getCart);
router.post("/items", cartController.addToCart);
router.put("/items/:line_item_id", cartController.updateCartItem);
router.delete("/items/:line_item_id", cartController.removeFromCart);
router.delete("/clear", cartController.clearCart);

export default router;