import dotenv from 'dotenv';

dotenv.config();

import { clearDatabase } from "./__tests__/utils/db";
import { db } from "./src/db";


afterAll(async () => {
    await clearDatabase()
    await db.$client.end();
})