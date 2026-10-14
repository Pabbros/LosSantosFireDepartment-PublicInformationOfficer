import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { Post, SiteConfig } from "./validation.js";

export const posts = pgTable("cms_posts", {
  id: text("id").primaryKey(),
  data: jsonb("data").$type<Post>().notNull(),
});

export const siteSettings = pgTable("cms_site_settings", {
  id: integer("id").primaryKey(),
  config: jsonb("config").$type<SiteConfig>().notNull(),
  revision: integer("revision").notNull().default(0),
});

export const adminSessions = pgTable("cms_admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const adminLoginAttempts = pgTable("cms_admin_login_attempts", {
  id: text("id").primaryKey(),
  attempts: integer("attempts").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
