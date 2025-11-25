import { Router } from 'express';
import { db } from '../db';
import { stalls, stall_items, images } from '../db/schema';
import { sql, or, eq, and } from 'drizzle-orm';

const router = Router();

router.get('/search/suggest', async (req, res) => {
  try {
    const query = req.query.q as string;
    
    if (!query || query.length < 2) {
      return res.json({ results: [], query, count: 0 });
    }

    const searchTerm = `%${query.toLowerCase()}%`;

    // Search stalls
    const stallResults = await db
      .select({
        stall_id: stalls.stall_id,
        stall_name: stalls.stall_name,
        stall_description: stalls.stall_description,
        category: stalls.category,
        image_url: images.image_url,
      })
      .from(stalls)
      .leftJoin(
        images,
        and(
          eq(images.stall_id, stalls.stall_id),
          eq(images.image_type, 'profile')
        )
      )
      .where(
        or(
          sql`LOWER(${stalls.stall_name}) LIKE ${searchTerm}`,
          sql`LOWER(${stalls.category}) LIKE ${searchTerm}`
        )
      )
      .limit(10);

    const results = stallResults.map(row => ({
      id: row.stall_id,
      name: row.stall_name,
      type: 'stall',
      category: row.category,
      imageUrl: row.image_url || null,
    }));

    res.json({ results, query, count: results.length });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;