import { db } from "./src/server/db/index.js";
import { users } from "./src/server/db/schema.js";

async function testDb() {
  try {
    console.log("Testing database connection...");
    const result = await db.select().from(users).limit(1);
    console.log("Database connection successful!");
    console.log("Result:", result);
  } catch (error) {
    console.error("Database connection failed:", error);
  }
}

testDb();
