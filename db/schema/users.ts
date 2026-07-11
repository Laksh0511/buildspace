//Defines users table, storing profile,auth,gameification data

import { integer, pgTable,text,timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users= pgTable(
    "users",
    {
        id: text("id")
        .primaryKey()
        .default(sql`gen_random_uuid()`),

        clerkId: text("clerk_id").notNull().unique(),
        email: text("email").notNull().unique(),
        name: text("name"),
        username: text("username").unique(),
        avatarUrl: text("avatar_url"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),


        //Gameification
        points : integer("points").default(0).notNull(),
        level : integer("level").default(1).notNull(),
        currentStreak : integer("currentStreak").default(0).notNull(),
        longestStreak : integer("longestStreak").default(0).notNull(),
        lastActive: timestamp("lastActive"),
    },(table)=>{ //column to create index
        return {
            clerkIdIdx:uniqueIndex("clerk_id_idx").on(table.clerkId),
            emailIdx:uniqueIndex("email_idx").on(table.email),
            usernameIdx:uniqueIndex("username_idx").on(table.username),
        }
    },
);

