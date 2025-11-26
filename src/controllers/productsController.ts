import { Request, Response } from 'express';
import { db } from '../db';
import { stall_items, images } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { stalls, reviews, vendors } from "../db/schema"


export async function getProducts(req: Request, res: Response) {
    try {
        const { stall_id } = req.query;
        const productImages = alias(images, 'product_images');

        let query = db
            .select({
                product_id: stall_items.item_id,
                product_name: stall_items.item_name,
                description: stall_items.item_description,
                price: stall_items.price,
                stock: stall_items.item_stocks,
                in_stock: stall_items.in_stock,
                stall_id: stall_items.stall_id,
                product_image: productImages.image_url,
            })
            .from(stall_items)
            .leftJoin(
                productImages,
                and(
                    eq(stall_items.item_id, productImages.item_id),
                    eq(productImages.image_type, 'thumbnail') // Assuming 'thumbnail' for product images
                )
            );

        if (stall_id) {
            // @ts-ignore
            query = query.where(eq(stall_items.stall_id, stall_id));
        }

        const products = await query;

        res.status(200).json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
}
      export async function createListing(req: Request, res: Response) {
  try {
    console.log("=== CREATE LISTING START ===");
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);
    console.log("Uploaded file:", req.file);
    
    const { stall_id, item_name, price, item_description, item_stocks, category } = req.body;
    const currentUser = (req as any).user;

    if (!currentUser) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // First, verify that the stall belongs to the current user
    const userStall = await db
      .select()
      .from(stalls)
      .where(
        and(
          eq(stalls.stall_id, Number(stall_id)),
          eq(stalls.user_id, currentUser.id)
        )
      )
      .limit(1);

    if (userStall.length === 0) {
      return res.status(403).json({ 
        error: "You don't have permission to add products to this stall or the stall doesn't exist" 
      });
    }

    // Validation
    if (!stall_id || !item_name || !price) {
      return res.status(400).json({ 
        error: "stall_id, item_name, and price are required." 
      });
    }

    // Convert and clean values
    const stocks = item_stocks ? parseInt(item_stocks) : 0;
    const priceDecimal = typeof price === "number" ? price.toString() : String(price);

    // Insert new product into stall_items table
    const inserted = await db
      .insert(stall_items)
      .values({
        stall_id: Number(stall_id),
        item_name,
        item_description: item_description || null,
        price: priceDecimal,
        item_stocks: stocks,
        in_stock: stocks > 0,
      })
      .returning({ item_id: stall_items.item_id });

    const itemId = inserted[0]!.item_id;
    console.log("✅ Product created with ID:", itemId);

    // ✅ Handle product image upload
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const productImage = files?.product_image?.[0] || req.file; // Check both locations

    console.log("📸 Image upload details:", {
      files: files,
      singleFile: req.file,
      productImage: productImage
    });

    if (productImage) {
      console.log("🖼️ Inserting image for product:", itemId);
      console.log("Image filename:", productImage.filename);
      console.log("Image path:", `uploads/${productImage.filename}`);
      
      await db.insert(images).values({
        item_id: itemId,
        image_url: `uploads/${productImage.filename}`,
        image_type: "thumbnail",
        entity_type: "product",
      });
      console.log("✅ Image inserted successfully");
    } else {
      console.log("❌ No image found in request");
    }

    // Success
    return res.status(201).json({
      message: "Product created successfully",
      product: {
        item_id: itemId,
        stall_id: Number(stall_id),
        item_name,
        item_description: item_description || null,
        price: priceDecimal,
        item_stocks: stocks,
        in_stock: stocks > 0,
        has_image: !!productImage
      },
    });
  } catch (err: any) {
    console.error("❌ Error creating product:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err.message || err,
    });
  }
}