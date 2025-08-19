import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean, pgSequence } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Visitor counter sequence for atomic numbering
export const visitorCounterSequence = pgSequence("visitor_counter_sequence", {
  startWith: 1,
  increment: 1,
  cache: 1,
});

// Session storage table for authentication
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAnonymous: boolean("is_anonymous").default(false),
  visitorNumber: integer("visitor_number").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Privacy settings for participation
export const participationSettings = pgTable("participation_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  participationType: varchar("participation_type").notNull(), // 'public', 'private', 'anonymous'
  showName: boolean("show_name").default(true),
  shareResponses: boolean("share_responses").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const experiments = pgTable("experiments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  totalLevels: integer("total_levels").notNull().default(5),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const experimentLevels = pgTable("experiment_levels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experimentId: varchar("experiment_id").notNull(),
  levelNumber: integer("level_number").notNull(),
  videoUrl: text("video_url").notNull(),
  backgroundVideoUrl: text("background_video_url"), // Video that loops during questions
  completionVideoUrl: text("completion_video_url"), // Video that plays during completion phase
  postSubmissionVideoUrl: text("post_submission_video_url"), // Video that plays after chat submission
  videoThumbnail: text("video_thumbnail"),
  questions: jsonb("questions").notNull(), // Array of question objects
  branchingRules: jsonb("branching_rules"), // Logic for next level selection
});

export const experimentSessions = pgTable("experiment_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  experimentId: varchar("experiment_id").notNull(),
  currentLevel: integer("current_level").notNull().default(1),
  branchingPath: text("branching_path").notNull().default("default"),
  isCompleted: boolean("is_completed").notNull().default(false),
  sessionData: jsonb("session_data"), // Store temporary session info
  visitorNumber: integer("visitor_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const experimentResponses = pgTable("experiment_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => experimentSessions.id),
  userId: varchar("user_id").references(() => users.id),
  levelId: varchar("level_id").notNull(),
  questionId: text("question_id").notNull(),
  responseType: text("response_type").notNull(), // text, voice, video, photo, email
  responseData: jsonb("response_data").notNull(), // Flexible storage for different response types
  fileUrl: text("file_url"), // Firebase Storage or Google Drive URL for media files
  fileId: text("file_id"), // Firebase Storage path or Google Drive file ID
  metadata: jsonb("metadata"), // Additional metadata for Firebase storage info
  isScanned: boolean("is_scanned").default(false), // Virus scan status
  scanResult: text("scan_result"), // 'clean', 'infected', 'pending'
  visitorNumber: integer("visitor_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity tracking pixels
export const activityTracking = pgTable("activity_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id").references(() => experimentSessions.id),
  eventType: text("event_type").notNull(), // 'page_view', 'video_start', 'video_end', 'question_shown', 'response_submitted'
  eventData: jsonb("event_data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas
export const insertExperimentSchema = createInsertSchema(experiments).omit({
  id: true,
  createdAt: true,
});

export const insertExperimentLevelSchema = createInsertSchema(experimentLevels).omit({
  id: true,
});

export const insertExperimentSessionSchema = createInsertSchema(experimentSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExperimentResponseSchema = createInsertSchema(experimentResponses).omit({
  id: true,
  createdAt: true,
});

// Additional insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertParticipationSettingSchema = createInsertSchema(participationSettings).omit({ id: true, createdAt: true });
export const insertActivityTrackingSchema = createInsertSchema(activityTracking).omit({ id: true, createdAt: true });

// Types
export type InsertExperiment = z.infer<typeof insertExperimentSchema>;
export type Experiment = typeof experiments.$inferSelect;

export type InsertExperimentLevel = z.infer<typeof insertExperimentLevelSchema>;
export type ExperimentLevel = typeof experimentLevels.$inferSelect;

export type InsertExperimentSession = z.infer<typeof insertExperimentSessionSchema>;
export type ExperimentSession = typeof experimentSessions.$inferSelect;

export type InsertExperimentResponse = z.infer<typeof insertExperimentResponseSchema>;
export type ExperimentResponse = typeof experimentResponses.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

export type ParticipationSetting = typeof participationSettings.$inferSelect;
export type InsertParticipationSetting = z.infer<typeof insertParticipationSettingSchema>;

export type ActivityTrackingEvent = typeof activityTracking.$inferSelect;
export type InsertActivityTracking = z.infer<typeof insertActivityTrackingSchema>;



// Question and response types
export interface Question {
  id: string;
  type: 'text' | 'multiple_choice' | 'scale' | 'media_upload';
  title: string;
  text: string;
  required: boolean;
  options?: string[]; // For multiple choice
  scaleRange?: { min: number; max: number; labels?: string[] }; // For scale questions
  allowedMediaTypes?: ('photo' | 'video' | 'audio')[]; // For media uploads
}

export interface ResponseData {
  questionId: string;
  type: 'text' | 'audio' | 'photo' | 'video' | 'email' | 'name';
  value: string | number | File;
  metadata?: Record<string, any>;
}

export interface BranchingRule {
  condition: string; // Simple condition string
  targetPath: string;
  nextLevelId?: string;
}
