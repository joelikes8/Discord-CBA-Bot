import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Discord servers the bot is in
export const discordServers = pgTable("discord_servers", {
  id: text("id").primaryKey(), // Discord server ID
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull(),
  memberCount: integer("member_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDiscordServerSchema = createInsertSchema(discordServers).omit({
  createdAt: true,
  updatedAt: true,
});

// Security settings for each server
export const securitySettings = pgTable("security_settings", {
  id: serial("id").primaryKey(),
  serverId: text("server_id").notNull().references(() => discordServers.id),
  antiNuke: boolean("anti_nuke").notNull().default(true),
  antiHack: boolean("anti_hack").notNull().default(true),
  antiRaid: boolean("anti_raid").notNull().default(true),
  websiteFilter: boolean("website_filter").notNull().default(true),
  allowedDomains: text("allowed_domains").array().notNull().default(['roblox.com', 'docs.google.com']),
  verifiedRoleId: text("verified_role_id"),
  logChannelId: text("log_channel_id"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSecuritySettingsSchema = createInsertSchema(securitySettings).omit({
  id: true,
  updatedAt: true,
});

// Roblox verification records
export const robloxVerifications = pgTable("roblox_verifications", {
  id: serial("id").primaryKey(),
  discordUserId: text("discord_user_id").notNull(),
  robloxUserId: text("roblox_user_id").notNull(),
  robloxUsername: text("roblox_username").notNull(),
  serverId: text("server_id").notNull().references(() => discordServers.id),
  verifiedAt: timestamp("verified_at").notNull().defaultNow(),
});

export const insertRobloxVerificationSchema = createInsertSchema(robloxVerifications).omit({
  id: true,
  verifiedAt: true,
});

// Pending verifications (temporary storage)
export const pendingVerifications = pgTable("pending_verifications", {
  id: serial("id").primaryKey(),
  discordUserId: text("discord_user_id").notNull(),
  verificationCode: text("verification_code").notNull(),
  serverId: text("server_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertPendingVerificationSchema = createInsertSchema(pendingVerifications).omit({
  id: true,
  createdAt: true,
});

// Security logs
export const securityLogs = pgTable("security_logs", {
  id: serial("id").primaryKey(),
  serverId: text("server_id").notNull().references(() => discordServers.id),
  eventType: text("event_type").notNull(),
  action: text("action").notNull(),
  userId: text("user_id"),
  details: text("details"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertSecurityLogSchema = createInsertSchema(securityLogs).omit({
  id: true,
  timestamp: true,
});

// Support tickets
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  serverId: text("server_id").notNull().references(() => discordServers.id),
  channelId: text("channel_id").notNull(),
  userId: text("user_id").notNull(),
  issue: text("issue").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
  closedBy: text("closed_by"),
  closedReason: text("closed_reason"),
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  closedAt: true,
});

// Server stats
export const serverStats = pgTable("server_stats", {
  id: serial("id").primaryKey(),
  serverId: text("server_id").notNull().references(() => discordServers.id),
  date: timestamp("date").notNull().defaultNow(),
  securityScore: integer("security_score").notNull().default(0),
  threatsBlocked: integer("threats_blocked").notNull().default(0),
  verifiedMembers: integer("verified_members").notNull().default(0),
  totalMembers: integer("total_members").notNull().default(0),
  openTickets: integer("open_tickets").notNull().default(0),
});

export const insertServerStatsSchema = createInsertSchema(serverStats).omit({
  id: true,
  date: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDiscordServer = z.infer<typeof insertDiscordServerSchema>;
export type DiscordServer = typeof discordServers.$inferSelect;

export type InsertSecuritySettings = z.infer<typeof insertSecuritySettingsSchema>;
export type SecuritySettings = typeof securitySettings.$inferSelect;

export type InsertRobloxVerification = z.infer<typeof insertRobloxVerificationSchema>;
export type RobloxVerification = typeof robloxVerifications.$inferSelect;

export type InsertPendingVerification = z.infer<typeof insertPendingVerificationSchema>;
export type PendingVerification = typeof pendingVerifications.$inferSelect;

export type InsertSecurityLog = z.infer<typeof insertSecurityLogSchema>;
export type SecurityLog = typeof securityLogs.$inferSelect;

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export type InsertServerStats = z.infer<typeof insertServerStatsSchema>;
export type ServerStats = typeof serverStats.$inferSelect;
