import { Router } from 'express';
import { db } from '../db';
import { stalls, images } from '../db/schema';
import { sql, or, and } from 'drizzle-orm';

const router = Router();

router.get('/suggest', async (req, res) => {
  try {
    const query = (req.query.q as string)?.trim();

    if (!query || query.length < 2) {
      return res.json({ results: [], query, count: 0 });
    }

    const searchTerm = `%${query}%`;

    // Safe case-insensitive search using parameterized query
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
          sql`${images.stall_id} = ${stalls.stall_id}`,
          sql`${images.image_type} = 'profile'`
        )
      )
      .where(
        or(
          sql`LOWER(${stalls.stall_name}) LIKE LOWER(${searchTerm})`,
          sql`LOWER(${stalls.category}) LIKE LOWER(${searchTerm})`
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