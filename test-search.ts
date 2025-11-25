import { db } from './src/db';
import { stalls, stall_items } from './src/db/schema';

async function test() {
  console.log('Testing database connection...');
  
  const stallsData = await db.select().from(stalls).limit(3);
  console.log('✅ Stalls:', stallsData);
  
  const itemsData = await db.select().from(stall_items).limit(3);
  console.log('✅ Items:', itemsData);
  
  process.exit(0);
}

test();