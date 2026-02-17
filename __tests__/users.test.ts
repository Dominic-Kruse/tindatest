import request from "supertest";
import app from "../src/index.ts";
import { clearDatabase } from "./utils/db.ts";

describe("POST /api/users/register", () => {
  beforeEach(async () => {
    await clearDatabase();
  });
//happy paths
  it("registers a new user", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({
        full_name: "Dom the Kruse",
        email: "dominickruse@gmail.com",
        password: "german123",
        role: "buyer",
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({
      full_name: "Dom the Kruse",
      email: "dominickruse@gmail.com",
      role: "buyer",
    });
  });

   it("registers a new vendor", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({
        full_name: "Dom not Kruse",
        email: "domnotkruse@gmail.com",
        password: "domnotkruse123",
        role: "vendor",
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({
      full_name: "Dom not Kruse",
      email: "domnotkruse@gmail.com",
      role: "vendor",
    });
  });
 // sad paths
  it("fails when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({
        email: "domdom@gmail.com",
      });

    expect(res.status).toBe(400);
  });

  it("fails when email already exists", async () => {
    await request(app)
      .post("/api/users/register")
      .send({
        full_name: "Dom Kruse Kruse",
        email: "DK@gmail.com",
        password: "DK123",
        role: "buyer",
      });

    const res = await request(app)
      .post("/api/users/register")
      .send({
        full_name: "Dom Kruse Kruse",
        email: "DK@gmail.com",
        password: "password123",
        role: "buyer",
      });

    expect(res.status).toBe(400);
  });
});
