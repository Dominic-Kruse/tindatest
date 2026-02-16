import request from "supertest"
import app from "../src/index.ts"
import { clearDatabase } from "./utils/db.ts"
import { db } from "../src/db";
import { users, stalls, vendors, stall_items} from "../src/db/schema.ts";
import jwt from 'jsonwebtoken'
// import { Request, Response } from "express"




describe("POST /api/products", () => {
    beforeEach(async () =>{ 
        
        await clearDatabase()

        await db.insert(users).values({
            user_id: 1, 
            email: "vendortest@gmail.com",
            full_name: "Red The  destroyer",
            password_hash: "hashed",
            role: "vendor"
        })

        await db.insert(vendors).values({
            user_id: 1
        })

        await db.insert(stalls).values({
            stall_id: 1,
            user_id: 1,
            stall_name: "Test Stall",
            category: "walaa category",
            status: "active",
        })      
       
      
    });
   
    it('It creates a product for a vendor', async () => {
        const payload = {id: 1, email: "vendortest@gmail.com", role: "vendor"}
        const secret = process.env.JWT_SECRET || "testsecret"
        const token = jwt.sign(payload, secret, {expiresIn: "1h"})

        const res = await request(app)
        .post("/api/products")
        .set("authorization", `Bearer ${token}`)
        .field("stall_id", "1")
        .field("item_name", "test product")
        .field("price", "100")
        .field("category", "food")

        expect(res.status).toBe(201)
        expect(res.body.product.item_id).toBeDefined()
    })
    it("fails when required fields are missing", async () => {
        const payload = {id: 1, email: "vendortest@gmail.com", role: "vendor"}
        const secret = process.env.JWT_SECRET || "testsecret"
        const token = jwt.sign(payload, secret, {expiresIn: "1h"})

        const res = await request(app)
            .post("/api/products")
            .set("authorization", `Bearer ${token}`)
            .field("stall_id", "1");

            expect(res.status).toBe(400);
});

        it("fails when doesn't exist", async () => {
            const payload = {id: 1, email: "vendortest@gmail.com", role: "vendor"}
            const secret = process.env.JWT_SECRET || "testsecret"
            const token = jwt.sign(payload, secret, {expiresIn: "1h"})

            const res = await request(app)
            .post("/api/products")
            .set("authorization", `Bearer ${token}`)
            .field("stall_id", "3")
            .field("item_name", "test product")
            .field("price", "100")
            .field("category", "food")
            
            
            expect(res.status).toBe(403)
        })
})

describe("GET /api/products", () => {
    beforeEach(async () => {
        await clearDatabase()

        await db.insert(users).values({
            user_id: 1, 
            email: "vendortest@gmail.com",
            full_name: "Red The  destroyer",
            password_hash: "hashed",
            role: "vendor"
        })

        await db.insert(vendors).values({
            user_id: 1
        })

        await db.insert(stalls).values({
            stall_id: 1,
            user_id: 1,
            stall_name: "Test Stall",
            category: "walaa category",
            status: "active",
        })
        
        const payload = {id: 1, email: "vendortest@gmail.com", role: "vendor"}
        const secret = process.env.JWT_SECRET || "testsecret"
        const token = jwt.sign(payload, secret, {expiresIn: "1h"})

        const res = await request(app)
        .post("/api/products")
        .set("authorization", `Bearer ${token}`)
        .field("stall_id", "1")
        .field("item_name", "test product")
        .field("price", "100")
        .field("category", "food")

    }) 

    it("should retrieve items from stall with the id: 1", async () => {
        const res = await request(app)
        .get("/api/products")
        .query({stall_id: 1});
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].product_name).toBe("test product")
    })

    it("Should return a empty array when there is no product", async () => {
        await db.delete(stall_items)
        const res = await request(app)
        .get("/api/products")
        .query({stall_id: 1});
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
      
    })
})