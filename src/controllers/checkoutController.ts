// controllers/checkoutController.ts
import { Request, Response } from "express";
import { db } from "../db";
import { 
  orders, 
  line_items, 
  shopping_carts, 
  buyers,
  stall_items,
  stalls,
  payments 
} from "../db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

// Helper function for stock updates (moved outside the controller object)
async function updateStockAfterCheckout(orderItems: Array<{ item_id: number; quantity: number }>) {
  try {
    // Step 1: Reduce stock quantities for each item
    for (const item of orderItems) {
      await db.update(stall_items)
        .set({ 
          item_stocks: sql`${stall_items.item_stocks} - ${item.quantity}` 
        })
        .where(
          and(
            eq(stall_items.item_id, item.item_id),
            gte(stall_items.item_stocks, item.quantity)
          )
        );
    }

    // Step 2: Update in_stock status for items that reached zero
    await db.update(stall_items)
      .set({ in_stock: false })
      .where(
        and(
          lte(stall_items.item_stocks, 0),
          eq(stall_items.in_stock, true)
        )
      );

    return true;
  } catch (error) {
    console.error('Error updating stock:', error);
    throw error;
  }
}

export const checkoutController = {
  async createOrder(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { delivery_address, payment_method = "cod" } = req.body;

      if (!delivery_address) {
        return res.status(400).json({ error: "Delivery address is required" });
      }

      // Verify user is a buyer
      const buyer = await db
        .select()
        .from(buyers)
        .where(eq(buyers.user_id, userId))
        .limit(1);

      if (buyer.length === 0) {
        return res.status(403).json({ error: "Only buyers can checkout" });
      }

      // Get user's shopping cart
      const userCart = await db
        .select()
        .from(shopping_carts)
        .where(eq(shopping_carts.buyer_id, userId))
        .limit(1);

      if (userCart.length === 0) {
        return res.status(404).json({ error: "Cart not found" });
      }

      const cartId = userCart[0]!.cart_id;

      // Get all line items in the cart with product and stall info
      const cartItems = await db
        .select({
          line_item_id: line_items.line_item_id,
          item_id: line_items.item_id,
          quantity: line_items.quantity,
          unit_price: line_items.unit_price,
          product: {
            item_id: stall_items.item_id,
            stall_id: stall_items.stall_id,
            item_name: stall_items.item_name,
            price: stall_items.price,
          },
          stall: {
            stall_id: stalls.stall_id,
            stall_name: stalls.stall_name,
          }
        })
        .from(line_items)
        .leftJoin(stall_items, eq(line_items.item_id, stall_items.item_id!))
        .leftJoin(stalls, eq(stall_items.stall_id, stalls.stall_id))
        .where(eq(line_items.cart_id, cartId));

      if (cartItems.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      // Group items by stall (since one order per stall)
      const itemsByStall: { [stallId: number]: typeof cartItems } = {};
      
      cartItems.forEach(item => {
        // Assert that product and stall_id exist
        if (!item.product?.stall_id) {
          console.warn(`Item ${item.line_item_id} has no stall_id, skipping`);
          return;
        }
        
        const stallId = item.product.stall_id;
        if (!itemsByStall[stallId]) {
          itemsByStall[stallId] = [];
        }
        itemsByStall[stallId]!.push(item);
      });

      // Check if we have any valid items with stall_ids
      if (Object.keys(itemsByStall).length === 0) {
        return res.status(400).json({ error: "No items with valid stall information" });
      }

      const createdOrders = [];

      // Create one order and payment per stall
      for (const [stallId, stallItems] of Object.entries(itemsByStall)) {
        // Assert stallItems is defined
        if (!stallItems) continue;

        // Calculate total for this stall's order
        const totalAmount = stallItems.reduce((sum, item) => {
          return sum + (parseFloat(item.unit_price) * item.quantity);
        }, 0);

        // Create order for this stall
        const [newOrder] = await db
          .insert(orders)
          .values({
            buyer_id: userId,
            stall_id: parseInt(stallId),
            total_amount: totalAmount.toString(),
            status: 'pending'
          })
          .returning();

        // Assert newOrder is defined
        if (!newOrder) {
          throw new Error("Failed to create order");
        }

        // Create payment record for this order
        const [payment] = await db
          .insert(payments)
          .values({
            order_id: newOrder.order_id,
            payer_buyer_id: userId,
            stall_id: parseInt(stallId),
            amount: totalAmount.toString(),
            method: payment_method,
            status: 'pending'
          })
          .returning();

        // Assert payment is defined
        if (!payment) {
          throw new Error("Failed to create payment");
        }

        // Update line items to link them to this order
        for (const item of stallItems) {
          await db
            .update(line_items)
            .set({
              order_id: newOrder.order_id,
              cart_id: null // Remove from cart
            })
            .where(eq(line_items.line_item_id, item.line_item_id));
        }

        // Update stock levels for items in this stall's order
        const stockUpdateItems = stallItems.map(item => ({
          item_id: item.item_id!,
          quantity: item.quantity
        }));

        // FIX: Use the imported function directly instead of this.
        await updateStockAfterCheckout(stockUpdateItems);

        createdOrders.push({
          order_id: newOrder.order_id,
          stall_id: newOrder.stall_id,
          total_amount: newOrder.total_amount,
          status: newOrder.status,
          payment_id: payment.payment_id,
          payment_status: payment.status,
          items: stallItems
        });
      }

      res.json({
        message: "Order created successfully",
        orders: createdOrders,
        total_orders: createdOrders.length
      });

    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  },

  // Simple version - create single order for all items
  async createSimpleOrder(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { delivery_address, payment_method = "cod" } = req.body;

      if (!delivery_address) {
        return res.status(400).json({ error: "Delivery address is required" });
      }

      // Verify user is a buyer
      const buyer = await db
        .select()
        .from(buyers)
        .where(eq(buyers.user_id, userId))
        .limit(1);

      if (buyer.length === 0) {
        return res.status(403).json({ error: "Only buyers can checkout" });
      }

      // Get user's shopping cart
      const userCart = await db
        .select()
        .from(shopping_carts)
        .where(eq(shopping_carts.buyer_id, userId))
        .limit(1);

      if (userCart.length === 0) {
        return res.status(404).json({ error: "Cart not found" });
      }

      const cartId = userCart[0]!.cart_id;

      // Get all line items in the cart
      const cartItems = await db
        .select()
        .from(line_items)
        .where(eq(line_items.cart_id, cartId));

      if (cartItems.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      // Assert first cart item exists and has item_id
      const firstCartItem = cartItems[0];
      if (!firstCartItem?.item_id) {
        return res.status(400).json({ error: "First cart item is invalid" });
      }

      // For simple version, use the first item's stall
      const firstItem = await db
        .select({
          stall_id: stall_items.stall_id
        })
        .from(stall_items)
        .where(eq(stall_items.item_id, firstCartItem.item_id))
        .limit(1);

      if (firstItem.length === 0) {
        return res.status(400).json({ error: "Could not determine stall" });
      }

      const stallId = firstItem[0]!.stall_id;

      // Calculate total amount
      const totalAmount = cartItems.reduce((sum, item) => {
        return sum + (parseFloat(item.unit_price) * item.quantity);
      }, 0);

      // Create order
      const [newOrder] = await db
        .insert(orders)
        .values({
          buyer_id: userId,
          stall_id: stallId as number,
          total_amount: totalAmount.toString(),
          status: 'pending'
        })
        .returning();

      // Assert newOrder is defined
      if (!newOrder) {
        throw new Error("Failed to create order");
      }

      // Create payment record
      const [payment] = await db
        .insert(payments)
        .values({
          order_id: newOrder.order_id,
          payer_buyer_id: userId,
          stall_id: stallId,
          amount: totalAmount.toString(),
          method: payment_method,
          status: 'pending'
        })
        .returning();

      // Assert payment is defined
      if (!payment) {
        throw new Error("Failed to create payment");
      }

      // Update all line items to link to this order and remove from cart
      for (const item of cartItems) {
        await db
          .update(line_items)
          .set({
            order_id: newOrder.order_id,
            cart_id: null
          })
          .where(eq(line_items.line_item_id, item.line_item_id));
      }

      // Update stock levels
      const stockUpdateItems = cartItems.map(item => ({
        item_id: item.item_id!,
        quantity: item.quantity
      }));

      // FIX: Use the imported function directly instead of this.
      await updateStockAfterCheckout(stockUpdateItems);

      res.json({
        message: "Order created successfully",
        order: {
          order_id: newOrder.order_id,
          buyer_id: newOrder.buyer_id,
          stall_id: newOrder.stall_id,
          total_amount: newOrder.total_amount,
          status: newOrder.status
        },
        payment: {
          payment_id: payment.payment_id,
          amount: payment.amount,
          method: payment.method,
          status: payment.status
        },
        items_count: cartItems.length
      });

    } catch (error) {
      console.error("Simple checkout error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  }
};