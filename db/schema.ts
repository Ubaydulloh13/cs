import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("player"),
    coins: integer("coins").notNull().default(1000),
    profile: text("profile").notNull(),
    revision: integer("revision").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [uniqueIndex("users_username_unique").on(t.username)],
);
export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(),
});
export const matchTickets = sqliteTable(
  "match_tickets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    issuedAt: integer("issued_at").notNull(),
    duration: integer("duration").notNull(),
    completed: integer("completed").notNull().default(0),
  },
  (t) => [index("tickets_user_idx").on(t.userId)],
);
export const purchases = sqliteTable(
  "purchases",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").notNull(),
    itemId: text("item_id").notNull(),
    price: integer("price").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [uniqueIndex("purchase_owned_unique").on(t.userId, t.kind, t.itemId)],
);
export const adminAudit = sqliteTable("admin_audit", {
  id: text("id").primaryKey(),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id),
  amount: integer("amount").notNull(),
  createdAt: integer("created_at").notNull(),
});
