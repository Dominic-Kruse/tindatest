// middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Define the user structure
interface JwtUser {
  id: number
  full_name: string
  email: string
  role: string
}

// Extend the Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtUser
    }
  }
}

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  console.log("=== 🔐 AUTH MIDDLEWARE START ===");
  
  const authHeader = req.headers.authorization;
  console.log("Authorization header:", authHeader);

  if (!authHeader) {
    console.log("❌ NO AUTHORIZATION HEADER");
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  console.log("Token extracted, length:", token?.length);

  if (!token) {
    console.log("❌ NO TOKEN EXTRACTED");
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    console.log("🔑 Verifying token...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtUser;
    console.log("✅ TOKEN VERIFIED SUCCESSFULLY");
    console.log("Decoded user:", decoded);
    
    // ✅ This should now work with the extended Request type
    req.user = decoded;
    console.log("=== 🔐 AUTH MIDDLEWARE END ===");
    next();
  } catch (err: any) {
    console.error("❌ TOKEN VERIFICATION FAILED:", err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}