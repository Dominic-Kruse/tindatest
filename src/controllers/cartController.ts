import { db } from "../db";
import {
  shopping_carts,
  line_items,
  stall_items,
  stalls,
  users,
  buyers,
} from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Request, Response } from "express";

export const cartController = {
  async getCart(req: Request, res: Response) {
    try {
      const userId = req.user?.id; // Use user_id instead of id
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized User" });
      }

      const buyer = await db
        .select()
        .from(buyers)
        .where(eq(buyers.user_id, userId))
        .limit(1);

      if (buyer.length === 0) {
        return res.status(403).json({
          error: "Only buyers can access shopping cart",
        });
      }

      // ✅ FIXED: Get or create cart for buyer
      let cart = await db
        .select()
        .from(shopping_carts)
        .where(eq(shopping_carts.buyer_id, userId)) // Fixed syntax
        .limit(1);

      if (cart.length === 0) {
        // ✅ FIXED: Create cart if it doesn't exist
        const newCart = await db
          .insert(shopping_carts)
          .values({ buyer_id: userId })
          .returning();
        cart = newCart;
      }

      // ✅ FIXED: Get cart items with product details
      const cartItems = await db
        .select({
          line_item_id: line_items.line_item_id,
          cart_id: line_items.cart_id,
          item_id: line_items.item_id,
          quantity: line_items.quantity,
          unit_price: line_items.unit_price,
          created_at: line_items.created_at,
          product: {
            item_id: stall_items.item_id,
            item_name: stall_items.item_name,
            item_description: stall_items.item_description,
            price: stall_items.price,
            item_stocks: stall_items.item_stocks,
            in_stock: stall_items.in_stock,
          },
          stall: {
            stall_id: stalls.stall_id,
            stall_name: stalls.stall_name,
            user_id: stalls.user_id,
          },
        })
        .from(line_items)
        .leftJoin(stall_items, eq(line_items.item_id, stall_items.item_id))
        .leftJoin(stalls, eq(stall_items.stall_id, stalls.stall_id))
        .where(
          and(
            eq(line_items.cart_id, cart[0]!.cart_id)
            // eq(line_items.order_id, null)
          )
        )
        .orderBy(desc(line_items.created_at));

      res.json({
        cart: cart[0],
        items: cartItems,
      });
    } catch (error) {
      console.error("Get cart error:", error);
      res.status(500).json({ error: "Failed to get cart" });
    }
  },

  async addToCart(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { item_id, quantity = 1 } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const buyer = await db
        .select()
        .from(buyers)
        .where(eq(buyers.user_id, userId))
        .limit(1);

      if (buyer.length === 0) {
        return res.status(403).json({
          error: "Only buyers can add items to cart",
        });
      }

      if (!item_id) {
        return res.status(400).json({ error: "Item ID is required" });
      }

      // Get or create cart
      let cart = await db
        .select()
        .from(shopping_carts)
        .where(eq(shopping_carts.buyer_id, userId))
        .limit(1);

      if (cart.length === 0) {
        const newCart = await db
          .insert(shopping_carts)
          .values({ buyer_id: userId })
          .returning();
        cart = newCart;
      }

      // Check if item exists and is in stock
      const item = await db
        .select()
        .from(stall_items)
        .where(eq(stall_items.item_id, item_id))
        .limit(1);

      if (item.length === 0) {
        return res.status(404).json({ error: "Item not found" });
      }

      if (!item[0]!.in_stock) {
        return res.status(400).json({ error: "Item is out of stock" });
      }
      if (item[0]?.item_stocks === null) {
        return res.status(400).json({ error: "Item not found" });
      }
      if (item[0]!.item_stocks < quantity) {
        return res.status(400).json({
          error: `Only ${item[0]!.item_stocks} items available in stock`,
        });
      }

      // Check if item already in cart
      const existingItem = await db
        .select()
        .from(line_items)
        .where(
          and(
            eq(line_items.cart_id, cart[0]!.cart_id),
            eq(line_items.item_id, item_id)
            // eq(line_items.order_id, null)
          )
        )
        .limit(1);

      if (existingItem.length > 0) {
        const newQuantity = existingItem[0]!.quantity + quantity;

        if (item[0]!.item_stocks < newQuantity) {
          return res.status(400).json({
            error: `Cannot add more items. Only ${
              item[0]!.item_stocks
            } available in stock`,
          });
        }

        const updatedItem = await db
          .update(line_items)
          .set({
            quantity: newQuantity,
            unit_price: item[0]!.price,
          })
          .where(eq(line_items.line_item_id, existingItem[0]!.line_item_id))
          .returning();

        return res.json({ item: updatedItem[0], action: "updated" });
      } else {
        const newItem = await db
          .insert(line_items)
          .values({
            cart_id: cart[0]!.cart_id,
            item_id: item_id,
            quantity: quantity,
            unit_price: item[0]!.price,
          })
          .returning();

        return res.json({ item: newItem[0], action: "added" });
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      res.status(500).json({ error: "Failed to add item to cart" });
    }
  },

  async updateCartItem(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { line_item_id } = req.params;
      const { quantity } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!line_item_id) {
        return res.status(400).json({ error: "No lineItem id Found" });
      }

      const buyer = await db
        .select()
        .from(buyers)
        .where(eq(buyers.user_id, userId))
        .limit(1);

      if (buyer.length === 0) {
        return res.status(403).json({
          error: "Only buyers can update cart items",
        });
      }

      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({ error: "Valid quantity is required" });
      }

      const lineItemId = parseInt(line_item_id);
      if (isNaN(lineItemId)) {
        return res.status(400).json({ error: "Invalid line item Id" });
      }

      const cartItem = await db
        .select()
        .from(line_items)
        .leftJoin(
          shopping_carts,
          eq(line_items.cart_id, shopping_carts.cart_id)
        )
        .leftJoin(stall_items, eq(line_items.item_id, stall_items.item_id))
        .where(
          and(
            eq(line_items.line_item_id, parseInt(line_item_id)),
            eq(shopping_carts.buyer_id, userId)
          )
        )
        .limit(1);

      if (cartItem.length === 0) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      if (quantity === 0) {
        await db
          .delete(line_items)
          .where(eq(line_items.line_item_id, parseInt(line_item_id)));

        return res.json({ message: "Item removed from cart" });
      }

      if (!cartItem[0]) {
        return res.status(404).json({ error: "cartItem is null" });
      }

      const itemStock = cartItem[0].stall_items?.item_stocks;
      if (itemStock === undefined || itemStock === null) {
        return res
          .status(400)
          .json({ error: "Item stock information not available" });
      }

      // ✅ Fixed: Correct stock comparison (removed the !)
      if (itemStock < quantity) {
        return res.status(400).json({
          error: `Only ${itemStock} items available in stock`,
        });
      }
      const updatedItem = await db
        .update(line_items)
        .set({ quantity: quantity })
        .where(eq(line_items.line_item_id, lineItemId))
        .returning();

      res.json({ item: updatedItem[0] });
    } catch (error) {
      console.error("Update cart item error:", error);
      res.status(500).json({ error: "Failed to update cart item" });
    }
  },

  async removeFromCart(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { line_item_id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!line_item_id) {
        return res.status(401).json({ error: "no line items found" });
      }

      const buyer = await db
        .select()
        .from(buyers)
        .where(eq(buyers.user_id, userId))
        .limit(1);

      if (buyer.length === 0) {
        return res.status(403).json({
          error: "Only buyers can remove items from cart",
        });
      }

      const cartItem = await db
        .select()
        .from(line_items)
        .leftJoin(
          shopping_carts,
          eq(line_items.cart_id, shopping_carts.cart_id)
        )
        .where(
          and(
            eq(line_items.line_item_id, parseInt(line_item_id)),
            eq(shopping_carts.buyer_id, userId)
          )
        )
        .limit(1);

      if (cartItem.length === 0) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      await db
        .delete(line_items)
        .where(eq(line_items.line_item_id, parseInt(line_item_id)));

      res.json({ message: "Item removed from cart" });
    } catch (error) {
      console.error("Remove from cart error:", error);
      res.status(500).json({ error: "Failed to remove item from cart" });
    }
  },

  async clearCart(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const buyer = await db
        .select()
        .from(buyers)
        .where(eq(buyers.user_id, userId))
        .limit(1);

      if (buyer.length === 0) {
        return res.status(403).json({
          error: "Only buyers can clear cart",
        });
      }

      const cart = await db
        .select()
        .from(shopping_carts)
        .where(eq(shopping_carts.buyer_id, userId))
        .limit(1);

      if (cart.length === 0) {
        return res.status(404).json({ error: "Cart not found" });
      }

      await db.delete(line_items).where(
        and(
          eq(line_items.cart_id, cart[0]!.cart_id)
          // eq(line_items.order_id, null)
        )
      );

      res.json({ message: "Cart cleared" });
    } catch (error) {
      console.error("Clear cart error:", error);
      res.status(500).json({ error: "Failed to clear cart" });
    }
  },
};
