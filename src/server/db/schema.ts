import {
  pgTableCreator,
  timestamp,
  text,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * This is the schema for the CV Verifier application.
 */

export const createTable = pgTableCreator(
  (name) => `socium-contango-aulia-test_${name}`,
);

export const users = createTable("users", () => ({
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  skills: jsonb("skills").notNull(), // array of strings
  experience: text("experience").notNull(),
}));

export const submissions = createTable("submissions", () => ({
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  pdfPath: text("pdf_path").notNull(),
  status: text("status")
    .default("PENDING")
    .$type<"PENDING" | "SUCCESS" | "FAILED">(),
  mismatches: jsonb("mismatches"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}));
