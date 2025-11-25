import { Request, Response } from "express";
import { db } from "../db";
import {
  users,
  vendors,
  buyers,
  shopping_carts,
  shoppingCartsRelations,
} from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { Sign } from "crypto";

function createToken(payload: object) {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  } as SignOptions);
}

export async function registerUser(req: Request, res: Response) {
  try {
    const { full_name, email, password, role } = req.body;

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ message: "Missing Fields" });
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [newUser] = await db
      .insert(users)
      .values({
        full_name,
        email,
        password_hash: hashed,
        role,
      })
      .returning();

    const validRoles = ["vendor", "buyer"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password too short" });
    }

    if (role === "vendor") {
      await db.insert(vendors).values({ user_id: newUser!.user_id });
    } else if (role === "buyer") {
      await db.insert(buyers).values({ user_id: newUser!.user_id });
    }

    await db.insert(shopping_carts).values({
      buyer_id: newUser!.user_id,
    });
    console.log(`✅ Created shopping cart for new buyer: ${newUser!.user_id}`);

    const token = createToken({ id: newUser?.user_id, email, role });

    res.status(201).json({
      message: "User registered successfully!",
      token,
      user: { id: newUser?.user_id, full_name, email, role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function loginUser(req: Request, res: Response) {
  try {
    const { email, password, role } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: "Invalid password" });
    }

    if (user.role === "buyer") {
      const existingCart = await db
        .select()
        .from(shopping_carts)
        .where(eq(shopping_carts.buyer_id, user.user_id))
        .limit(1);
    }

    const token = createToken({
      id: user.user_id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUserById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "no Id is found for this User" });
    }
    const userId = parseInt(id);

    const user = await db
      .select()
      .from(users)
      .where(eq(users.user_id, userId))
      .limit(1);

    if (!user || user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const userData = user[0];
    res.json({
      id: userData?.user_id,
      username: userData?.full_name,
      email: userData?.email,
    });
  } catch (err) {
    console.error("Error Fethcing user", err);
    res.status(500).json({ error: "internal server error" });
  }
}

export async function getUserByUsername(req: Request, res: Response) {
  try {
    const { username } = req.params; // This will be the full_name

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.full_name, username))
      .limit(1);

    if (!user || user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = user[0];
    res.json({
      id: userData!.user_id,
      username: userData!.full_name,
      email: userData!.email,
      role: userData!.role,
    });
  } catch (err) {
    console.error("Error fetching user by username:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAllUsers(req: Request, res: Response) {
  try {
    const allUsers = await db
      .select({
        id: users.user_id,
        full_name: users.full_name,
        email: users.email,
        role: users.role,
        created_at: users.created_at,
      })
      .from(users);

    res.json(allUsers);
  } catch (err) {
    console.error("Error fetching all users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Get current user (requires authentication middleware)
export async function getCurrentUser(req: Request, res: Response) {
  try {
    // Assuming your auth middleware adds user to req object
    const userId = (req as any).user?.id; // Adjust based on your auth middleware

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await db
      .select({
        id: users.user_id,
        full_name: users.full_name,
        email: users.email,
        role: users.role,
        created_at: users.created_at,
      })
      .from(users)
      .where(eq(users.user_id, userId))
      .limit(1);

    if (!user || user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user[0]);
  } catch (err) {
    console.error("Error fetching current user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
