import { Request, Response } from 'express';
import { db } from '../db';
import { orders, stalls, line_items, stall_items } from '../db/schema';
import { and, eq, desc, asc, inArray, count } from 'drizzle-orm';

export const getVendorOrders = async (req: Request, res: Response) => {
  const { stallId, sortBy, limit = '10', page = '1', category } = req.query;

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  const offset = (pageNumber - 1) * limitNumber;

  const whereClauses = [];

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
      orderBy = asc(orders.created_at);
      break;
    case 'date-updated':
      orderBy = desc(orders.updated_at);
      break;
    case 'newest':
    default:
      orderBy = desc(orders.created_at);
      break;
  }

  try {
    const filteredOrders = await db
      .select()
      .from(orders)
      .leftJoin(stalls, eq(orders.stall_id, stalls.stall_id))
      .where(and(...whereClauses))
      .orderBy(orderBy)
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
