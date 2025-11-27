import {db} from "../db"
import { shopping_carts, line_items, orders, stall_items, buyers, stalls } from "../db/schema";
import {eq, and , sum} from "drizzle-orm"


export async function getCartWithItems(buyerId: number) {
  return await db
    .select({
      cart_id: shopping_carts.cart_id,
      line_item_id: line_items.line_item_id,
      item_id: line_items.item_id,
      quantity: line_items.quantity,
      product: {
        item_id: stall_items.item_id,
        item_name: stall_items.item_name,
        price: stall_items.price,
        item_stocks: stall_items.item_stocks,
        stall_id: stall_items.stall_id
      }
    })
    .from(shopping_carts)
    .leftJoin(line_items, eq(shopping_carts.cart_id, line_items.cart_id))
    .leftJoin(stall_items, eq(line_items.item_id, stall_items.item_id))
    .where(eq(shopping_carts.buyer_id, buyerId));
}


export async function checkStockAvailability(cartItems: any[]) {
  const insufficientStock = [];
  
  for (const item of cartItems) {
    if (item.product && item.quantity > item.product.item_stocks) {
      insufficientStock.push({
        item_id: item.item_id,
        item_name: item.product.item_name,
        requested: item.quantity,
        available: item.product.item_stocks
      });
    }
  }
  
  return insufficientStock;
}

// Calculate total amount
export function calculateTotalAmount(cartItems: any[]) {
  return cartItems.reduce((total, item) => {
    if (item.product) {
      return total + (Number(item.product.price) * item.quantity);
    }
    return total;
  }, 0);
}