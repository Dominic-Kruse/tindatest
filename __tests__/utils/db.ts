// import { line } from "drizzle-orm/pg-core";
import {db} from "../../src/db"
import { line_items, shopping_carts, stall_items, stalls, users, vendors } from '../../src/db/schema';

export const clearDatabase = async () => {
    // await db.delete(vendors)
    await db.delete(users)
    await db.delete(stall_items)
    await db.delete(stalls)
}

