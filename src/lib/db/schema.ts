import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const ts = () => timestamp({ withTimezone: true });
const createdAt = () => ts().notNull().defaultNow();
const updatedAt = () => ts().notNull().defaultNow();

/* ───────────────────────── Auth (better-auth) ───────────────────────── */

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"), // user | admin (instance-level)
  storageQuota: bigint("storage_quota", { mode: "number" }), // bytes; null = unlimited
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: ts(),
  refreshTokenExpiresAt: ts(),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const twoFactors = pgTable("two_factor", {
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  verified: boolean("verified").default(true),
  failedVerificationCount: integer("failed_verification_count").default(0),
  lockedUntil: ts(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

/* ───────────────────────── Storage domain ───────────────────────── */

export const folders = pgTable(
  "folder",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id"),
    parentId: uuid("parent_id").references((): AnyPgColumn => folders.id, {
      onDelete: "cascade",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts(), // soft-delete → trash
  },
  (t) => [
    index("folder_owner_idx").on(t.ownerId),
    index("folder_parent_idx").on(t.parentId),
  ],
);

export const files = pgTable(
  "file",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id"),
    folderId: uuid("folder_id").references(() => folders.id, {
      onDelete: "cascade",
    }),
    size: bigint("size", { mode: "number" }).notNull().default(0),
    mimeType: text("mime_type").notNull().default("application/octet-stream"),
    storageKey: text("storage_key").notNull(),
    checksum: text("checksum"), // sha-256 hex
    thumbnailKey: text("thumbnail_key"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts(), // soft-delete → trash
  },
  (t) => [
    index("file_owner_idx").on(t.ownerId),
    index("file_folder_idx").on(t.folderId),
    index("file_deleted_idx").on(t.deletedAt),
  ],
);

export const fileVersions = pgTable(
  "file_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    storageKey: text("storage_key").notNull(),
    checksum: text("checksum"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("file_version_unique").on(t.fileId, t.versionNumber)],
);

export const tags = pgTable(
  "tag",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    color: text("color"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("tag_owner_name_unique").on(t.ownerId, t.name)],
);

export const fileTags = pgTable(
  "file_tag",
  {
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.fileId, t.tagId] })],
);

export const shareType = pgEnum("share_type", ["link", "user"]);
export const sharePermission = pgEnum("share_permission", ["read", "write"]);

export const shares = pgTable(
  "share",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fileId: uuid("file_id").references(() => files.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => folders.id, {
      onDelete: "cascade",
    }),
    type: shareType("type").notNull(),
    permission: sharePermission("permission").notNull().default("read"),
    token: text("token").unique(), // for public link shares
    passwordHash: text("password_hash"),
    sharedWithUserId: text("shared_with_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    expiresAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [
    index("share_owner_idx").on(t.ownerId),
    index("share_token_idx").on(t.token),
  ],
);

export const activityLogs = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    createdAt: createdAt(),
  },
  (t) => [index("activity_user_idx").on(t.userId)],
);

/* ───────────────────────── Relations ───────────────────────── */

export const usersRelations = relations(users, ({ many }) => ({
  files: many(files),
  folders: many(folders),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  owner: one(users, { fields: [folders.ownerId], references: [users.id] }),
  parent: one(folders, {
    fields: [folders.parentId],
    references: [folders.id],
    relationName: "folder_children",
  }),
  children: many(folders, { relationName: "folder_children" }),
  files: many(files),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  owner: one(users, { fields: [files.ownerId], references: [users.id] }),
  folder: one(folders, {
    fields: [files.folderId],
    references: [folders.id],
  }),
  versions: many(fileVersions),
  tags: many(fileTags),
}));

export const fileTagsRelations = relations(fileTags, ({ one }) => ({
  file: one(files, { fields: [fileTags.fileId], references: [files.id] }),
  tag: one(tags, { fields: [fileTags.tagId], references: [tags.id] }),
}));

/* ───────────────────────── Inferred types ───────────────────────── */

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type File = typeof files.$inferSelect;
export type FileVersion = typeof fileVersions.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Share = typeof shares.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
