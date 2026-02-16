import request from "supertest"
import app from "../src/index.ts"
import { clearDatabase } from "./utils/db.ts"
import { db } from "../src/db";
import { users, stalls, vendors} from "../src/db/schema.ts";
import jwt from 'jsonwebtoken'
import { after } from "node:test";
// import { Request, Response } from "express"


describe("POST /api/stalls", () => {
    beforeEach(async () => {
        await clearDatabase()

        await db.insert(users).values({
                    user_id: 2, 
                    email: "vendortest2@gmail.com",
                    full_name: "Red The chair  destroyer",
                    password_hash: "hashed",
                    role: "vendor"
                })
        
        await db.insert(vendors).values({
            user_id: 2
        })
        
    })
        afterAll(async () => {
           await  clearDatabase()
        })
    it("Should be able to create a stall when a user is a vendor", async () => {
        const payload = {id: 2, email: "vendortest2@gmail.com", role: "vendor"}
        const secret = process.env.JWT_SECRET || "testsecret"
        const token = jwt.sign(payload, secret, {expiresIn: "1h"})

        const res = await request(app)
        .post("/api/stalls")
        .set("Authorization", `Bearer ${token}`)
        .field("stall_name", "test stall2")
        .field("category", "test Category")
        .field("status", "active")
        .field("stall_address", "123 Test Street")
        .field("stall_description", "This is a test stall")
        .field("user_id", "2")
       

        expect(res.status).toBe(201);
        expect(res.body.stall_id).toBeDefined()
    })
})