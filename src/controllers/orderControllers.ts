import {db} from "../db";
import {orders,
    line_items,
    stall_items,
    shopping_carts,
    buyers,
    payments,
    sales,
} from "../db/schema"
import {eq, and, inArray} from "drizzle-orm";
import { Request, Response } from "express";


export const orderController = {
    async checkout(req: Request, res: Response) {
        try {
            
        }
    }
}