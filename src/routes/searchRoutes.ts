import { Router } from "express";
import { db } from "../db";
import { stalls, stall_items, images } from "../db/schema";
import { sql, or, and, eq, ilike } from "drizzle-orm";

const router = Router();

router.get("/suggest", async (req, res) => {
  try {
    const query = (req.query.q as string)?.trim();
    if (!query || query.length < 2) {
      return res.json({ results: [], query, count: 0 });
    }

    const searchTerm = `%${query.toLowerCase()}%`;

    // --- Search stalls ---
    const stallResults = await db
      .select({
        id: stalls.stall_id,
        name: stalls.stall_name,
        type: sql`'stall'`,
        category: stalls.category,
        image_url: images.image_url,
      })
      .from(stalls)
      .leftJoin(
        images,
        and(eq(images.stall_id, stalls.stall_id), eq(images.image_type, "profile"))
      )
      .where(
        or(
          ilike(stalls.stall_name, searchTerm),
          ilike(stalls.category, searchTerm)
        )
      )
      .limit(10);

    // --- Search products ---
    const productResults = await db
      .select({
        id: stall_items.item_id,
        name: stall_items.item_name,
        type: sql`'item'`,
        price: stall_items.price,
        inStock: stall_items.in_stock,
        stallId: stalls.stall_id,
        stallName: stalls.stall_name,
        image_url: images.image_url,
      })
      .from(stall_items)
      .leftJoin(stalls, eq(stall_items.stall_id, stalls.stall_id))
      .leftJoin(
        images,
        and(eq(images.item_id, stall_items.item_id), eq(images.image_type, "thumbnail"))
      )
      .where(
        or(
          ilike(stall_items.item_name, searchTerm),
          ilike(stall_items.item_description, searchTerm)
        )
      )
      .limit(10);

    // --- Map to unified format ---
    const results = [
      ...stallResults.map((s) => ({
        id: s.id,
        name: s.name,
        type: "stall",
        category: s.category,
        imageUrl: s.image_url || null,
      })),
      ...productResults.map((p) => ({
        id: p.id,
        name: p.name,
        type: "item",
        price: p.price ?? null,
        inStock: p.inStock,
        stallId: p.stallId,
        stallName: p.stallName,
        imageUrl: p.image_url || null,
      })),
    ];

    res.json({ results, query, count: results.length });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
