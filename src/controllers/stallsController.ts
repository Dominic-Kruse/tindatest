import { Request, Response } from "express"
import { db } from "../db"
import { stalls, images, reviews, vendors } from "../db/schema"
import { eq, avg, and } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"


// GET /api/stalls
export async function getStalls(req: Request, res: Response) {
  try {
    const bannerImages = alias(images, "banner_images")
    const iconImages = alias(images, "icon_images")

    const stallCards = await db
      .select({
        stall_id: stalls.stall_id,
        stall_name: stalls.stall_name,
        vendor_name: vendors.business_name,
        vendor_contact: vendors.vendor_contact,
        stall_description: stalls.stall_description,
        category: stalls.category,
        location: stalls.stall_address,
        banner_photo: bannerImages.image_url,
        stall_icon: iconImages.image_url,
        rating: avg(reviews.rating),
      })
      .from(stalls)
      .leftJoin(reviews, eq(stalls.stall_id, reviews.stall_id))
      .leftJoin(vendors, eq(stalls.user_id, vendors.user_id))
      .leftJoin(
        bannerImages,
        and(
          eq(stalls.stall_id, bannerImages.stall_id),
          eq(bannerImages.image_type, "banner")
        )
      )
      .leftJoin(
        iconImages,
        and(
          eq(stalls.stall_id, iconImages.stall_id),
          eq(iconImages.image_type, "icon")
        )
      )
      .groupBy(
        stalls.stall_id,
        vendors.business_name,
        vendors.vendor_contact,
        bannerImages.image_url,
        iconImages.image_url
      )

    res.status(200).json(stallCards)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Internal server error" })
  }
}

// POST /api/stallsimport { Request, Response } from "express";


export const createStall = async (req: Request, res: Response) => {
  try {
    const {
      stall_name,
      category,
      stall_description,
      stall_address,
      stall_city,
      stall_state,
      stall_zipcode,
      user_id,
    } = req.body;

    const authenticatedUserId = req.user?.id; 

    console.log('Authenticated user info:', req.user);
    console.log('Extracted user ID:', authenticatedUserId);

    if (!authenticatedUserId) {
      return res.status(401).json({ error: "User authentication required" });
    }

    if (!stall_name || !category || !stall_description || !stall_address || !user_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    
    // Files now have extensions! e.g., "1234567890.png"
    const bannerPath = files?.banner_image?.[0]?.filename || null;
    const iconPath = files?.icon_image?.[0]?.filename || null;

    console.log('Uploaded files:', {
      banner: bannerPath,
      icon: iconPath
    });

    // 1️⃣ Create stall
    const [newStall] = await db
      .insert(stalls)
      .values({
        stall_name,
        category,
        stall_description,
        stall_address,
        stall_city,
        stall_state,
        stall_zip_code: stall_zipcode,
        user_id: Number(user_id),
      })
      .returning({ stall_id: stalls.stall_id });

    const stallId = newStall!.stall_id;

    // 2️⃣ Insert images with correct paths
    if (bannerPath) {
      await db.insert(images).values({
        stall_id: stallId,
        image_url: `uploads/${bannerPath}`, // Now includes extension!
        image_type: "banner",
        entity_type: "stall",
      });
    }

    if (iconPath) {
      await db.insert(images).values({
        stall_id: stallId,
        image_url: `uploads/${iconPath}`, // Now includes extension!
        image_type: "icon",
        entity_type: "stall",
      });
    }

    res.status(201).json({
      message: "Stall created successfully",
      stall_id: stallId,
    });
  } catch (err) {
    console.error("Error creating stall:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateStall = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      stall_name,
      category,
      stall_description,
      stall_address,
      stall_city,
      stall_state,
      stall_zipcode,
      vendor_contact,
    } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const bannerPath = files?.banner_image?.[0]?.filename || null;
    const iconPath = files?.icon_image?.[0]?.filename || null;

    const [updatedStall] = await db
      .update(stalls)
      .set({
        stall_name,
        category,
        stall_description,
        stall_address,
        stall_city,
        stall_state,
        stall_zip_code: stall_zipcode,
      })
      .where(eq(stalls.stall_id, Number(id)))
      .returning();

    if (updatedStall && updatedStall.user_id && vendor_contact) {
      await db
        .update(vendors)
        .set({ vendor_contact })
        .where(eq(vendors.user_id, updatedStall.user_id));
    }

    if (updatedStall) {
      if (bannerPath) {
        const [existingBanner] = await db.select().from(images).where(and(eq(images.stall_id, updatedStall.stall_id), eq(images.image_type, "banner")));
        if (existingBanner) {
          await db.update(images).set({ image_url: `uploads/${bannerPath}` }).where(eq(images.image_id, existingBanner.image_id));
        } else {
          await db.insert(images).values({
            stall_id: updatedStall.stall_id,
            image_url: `uploads/${bannerPath}`,
            image_type: "banner",
            entity_type: "stall",
          });
        }
      }

      if (iconPath) {
        const [existingIcon] = await db.select().from(images).where(and(eq(images.stall_id, updatedStall.stall_id), eq(images.image_type, "icon")));
        if (existingIcon) {
          await db.update(images).set({ image_url: `uploads/${iconPath}` }).where(eq(images.image_id, existingIcon.image_id));
        } else {
          await db.insert(images).values({
            stall_id: updatedStall.stall_id,
            image_url: `uploads/${iconPath}`,
            image_type: "icon",
            entity_type: "stall",
          });
        }
      }
    }

    if (!updatedStall) {
      return res.status(404).json({ error: "Stall not found" });
    }

    res.status(200).json(updatedStall);
  } catch (err) {
    console.error("Error updating stall:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getStallById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bannerImages = alias(images, "banner_images");
    const iconImages = alias(images, "icon_images");
    const [stall] = await db
      .select({
        stall_id: stalls.stall_id,
        stall_name: stalls.stall_name,
        stall_description: stalls.stall_description,
        stall_address: stalls.stall_address,
        vendor_contact: vendors.vendor_contact,
        category: stalls.category,
        banner_url: bannerImages.image_url,
        icon_url: iconImages.image_url,
      })
      .from(stalls)
      .leftJoin(vendors, eq(stalls.user_id, vendors.user_id))
      .leftJoin(
        bannerImages,
        and(
          eq(stalls.stall_id, bannerImages.stall_id),
          eq(bannerImages.image_type, "banner")
        )
      )
      .leftJoin(
        iconImages,
        and(
          eq(stalls.stall_id, iconImages.stall_id),
          eq(iconImages.image_type, "icon")
        )
      )
      .where(eq(stalls.stall_id, Number(id)));

    if (!stall) {
      return res.status(404).json({ error: "Stall not found" });
    }

    res.status(200).json(stall);
  } catch (err) {
    console.error("Error fetching stall:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export async function getStallsByVendor(req: Request, res: Response) {
  try {
    const { vendorId } = req.params;
    console.log("Fetching stalls for vendorId:", vendorId);

    const stallList = await db
      .select({
        stall_id: stalls.stall_id,
        stall_name: stalls.stall_name,
        stall_description: stalls.stall_description,
        icon_url: images.image_url,
      })
      .from(stalls)
      .leftJoin(images, and(eq(stalls.stall_id, images.stall_id), eq(images.image_type, "icon")))
      .where(eq(stalls.user_id, Number(vendorId)));

    console.log("Found stalls:", stallList);

    res.status(200).json(stallList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}


