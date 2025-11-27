import { Request, Response } from 'express';
import { db } from '../db';
import { orders, stalls, line_items, stall_items } from '../db/schema';
import { and, eq, desc, asc, inArray, count, gte } from 'drizzle-orm';

export const getVendorOrders = async (req: Request, res: Response) => {
  const { stallId, sortBy, limit = '10', page = '1', category } = req.query;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  const offset = (pageNumber - 1) * limitNumber;

  const whereClauses = [eq(stalls.user_id, userId)];

  if (stallId) {
    whereClauses.push(eq(orders.stall_id, Number(stallId)));
  }

  if (category) {
    const categories = Array.isArray(category) ? category : [category];
    if (categories.length > 0) {
      whereClauses.push(inArray(stalls.category, categories as string[]));
    }
  }

  let orderBy;
  switch (sortBy) {
    case 'oldest':
      orderBy = [asc(orders.created_at)];
      break;
    case 'date-updated':
      orderBy = [desc(orders.updated_at), desc(orders.created_at)];
      break;
    case 'newest':
    default:
      orderBy = [desc(orders.created_at)];
      break;
  }

  try {
    const filteredOrders = await db
      .select()
      .from(orders)
      .leftJoin(stalls, eq(orders.stall_id, stalls.stall_id))
      .where(and(...whereClauses))
      .orderBy(...orderBy)
      .limit(limitNumber)
      .offset(offset);

    const totalCountResult = await db
      .select({ count: count() })
      .from(orders)
      .leftJoin(stalls, eq(orders.stall_id, stalls.stall_id))
      .where(and(...whereClauses));

    const totalCount = totalCountResult[0]?.count ? Number(totalCountResult[0].count) : 0;

    res.status(200).json({ orders: filteredOrders, totalCount });
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getVendorOrderStats = async (req: Request, res: Response) => {
  const { stallId } = req.query;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const whereClauses = [eq(stalls.user_id, userId)];
    if (stallId) {
      whereClauses.push(eq(orders.stall_id, Number(stallId)));
    }

    // Calculate total orders for the stall(s)
    const totalOrdersResult = await db
      .select({ count: count() })
      .from(orders)
      .leftJoin(stalls, eq(orders.stall_id, stalls.stall_id))
      .where(and(...whereClauses));

    const totalOrders = totalOrdersResult[0]?.count ? Number(totalOrdersResult[0].count) : 0;

    // Calculate orders this week
    const now = new Date();
    const dayOfWeek = now.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday of current week
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyOrdersResult = await db
      .select({ count: count() })
      .from(orders)
      .leftJoin(stalls, eq(orders.stall_id, stalls.stall_id))
      .where(and(
        ...whereClauses,
        gte(orders.created_at, startOfWeek)
      ));

    const weeklyOrders = weeklyOrdersResult[0]?.count ? Number(weeklyOrdersResult[0].count) : 0;

    res.status(200).json({ totalOrders, weeklyOrders });
  } catch (error) {
    console.error('Error fetching vendor order stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status: status, updated_at: new Date() })
      .where(eq(orders.order_id, Number(orderId)))
      .returning();

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
