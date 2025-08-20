var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  activityTracking: () => activityTracking,
  experimentLevels: () => experimentLevels,
  experimentResponses: () => experimentResponses,
  experimentSessions: () => experimentSessions,
  experiments: () => experiments,
  insertActivityTrackingSchema: () => insertActivityTrackingSchema,
  insertExperimentLevelSchema: () => insertExperimentLevelSchema,
  insertExperimentResponseSchema: () => insertExperimentResponseSchema,
  insertExperimentSchema: () => insertExperimentSchema,
  insertExperimentSessionSchema: () => insertExperimentSessionSchema,
  insertParticipationSettingSchema: () => insertParticipationSettingSchema,
  insertUserSchema: () => insertUserSchema,
  participationSettings: () => participationSettings,
  sessions: () => sessions,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull()
});
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var participationSettings = pgTable("participation_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  participationType: varchar("participation_type").notNull(),
  // 'public', 'private', 'anonymous'
  showName: boolean("show_name").default(true),
  shareResponses: boolean("share_responses").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var experiments = pgTable("experiments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  totalLevels: integer("total_levels").notNull().default(5),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var experimentLevels = pgTable("experiment_levels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experimentId: varchar("experiment_id").notNull(),
  levelNumber: integer("level_number").notNull(),
  videoUrl: text("video_url").notNull(),
  backgroundVideoUrl: text("background_video_url"),
  // Video that loops during questions
  videoThumbnail: text("video_thumbnail"),
  questions: jsonb("questions").notNull(),
  // Array of question objects
  branchingRules: jsonb("branching_rules")
  // Logic for next level selection
});
var experimentSessions = pgTable("experiment_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  experimentId: varchar("experiment_id").notNull(),
  currentLevel: integer("current_level").notNull().default(1),
  branchingPath: text("branching_path").notNull().default("default"),
  isCompleted: boolean("is_completed").notNull().default(false),
  sessionData: jsonb("session_data"),
  // Store temporary session info
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var experimentResponses = pgTable("experiment_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => experimentSessions.id),
  userId: varchar("user_id").references(() => users.id),
  levelId: varchar("level_id").notNull(),
  questionId: text("question_id").notNull(),
  responseType: text("response_type").notNull(),
  // text, voice, video, photo, email
  responseData: jsonb("response_data").notNull(),
  // Flexible storage for different response types
  fileUrl: text("file_url"),
  // Google Drive URL for media files
  fileId: text("file_id"),
  // Google Drive file ID
  isScanned: boolean("is_scanned").default(false),
  // Virus scan status
  scanResult: text("scan_result"),
  // 'clean', 'infected', 'pending'
  createdAt: timestamp("created_at").defaultNow()
});
var activityTracking = pgTable("activity_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id").references(() => experimentSessions.id),
  eventType: text("event_type").notNull(),
  // 'page_view', 'video_start', 'video_end', 'question_shown', 'response_submitted'
  eventData: jsonb("event_data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertExperimentSchema = createInsertSchema(experiments).omit({
  id: true,
  createdAt: true
});
var insertExperimentLevelSchema = createInsertSchema(experimentLevels).omit({
  id: true
});
var insertExperimentSessionSchema = createInsertSchema(experimentSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertExperimentResponseSchema = createInsertSchema(experimentResponses).omit({
  id: true,
  createdAt: true
});
var insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
var insertParticipationSettingSchema = createInsertSchema(participationSettings).omit({ id: true, createdAt: true });
var insertActivityTrackingSchema = createInsertSchema(activityTracking).omit({ id: true, createdAt: true });

// server/db.ts
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc } from "drizzle-orm";
var DatabaseStorage = class {
  constructor() {
    this.initializeDefaultExperiment();
  }
  async initializeDefaultExperiment() {
    try {
      const existingExperiment = await this.getActiveExperiment();
      if (existingExperiment) return;
      const experiment = await this.createExperiment({
        title: "The Experiment - A Study on Perception",
        description: "An immersive journey through perception and consciousness",
        totalLevels: 5,
        isActive: true
      });
      const levelConfigs = [
        {
          videoUrl: "/videos/level1.mp4",
          backgroundVideoUrl: "/videos/level1.mp4",
          questions: [{
            id: "q1_level1",
            type: "text",
            title: "Visual Scanning Experience",
            text: "What response would you like to share about this experience?",
            required: false
          }]
        },
        {
          videoUrl: "/videos/level2.mp4",
          backgroundVideoUrl: "/videos/level2.mp4",
          questions: [{
            id: "q1_level2",
            type: "text",
            title: "Digital Void Contemplation",
            text: "What response would you like to share about this experience?",
            required: false
          }]
        },
        {
          videoUrl: "/videos/level3.mp4",
          backgroundVideoUrl: "/videos/level3.mp4",
          questions: [{
            id: "q1_level3",
            type: "text",
            title: "Embodied Field Recognition",
            text: "What response would you like to share about this experience?",
            required: false
          }]
        },
        {
          videoUrl: "/videos/level4.mp4",
          backgroundVideoUrl: "/videos/level4.mp4",
          questions: [{
            id: "q1_level4",
            type: "text",
            title: "Interface Integration",
            text: "What response would you like to share about this experience?",
            required: false
          }]
        },
        {
          videoUrl: "/videos/level5.mp4",
          backgroundVideoUrl: "/videos/level5.mp4",
          questions: [{
            id: "q1_level5",
            type: "text",
            title: "Final Synthesis",
            text: "What response would you like to share about this experience?",
            required: false
          }]
        }
      ];
      for (let i = 0; i < levelConfigs.length; i++) {
        const config = levelConfigs[i];
        await this.createExperimentLevel({
          experimentId: experiment.id,
          levelNumber: i + 1,
          videoUrl: config.videoUrl,
          backgroundVideoUrl: config.backgroundVideoUrl,
          videoThumbnail: null,
          questions: config.questions,
          branchingRules: [{ condition: "default", targetPath: "default" }]
        });
      }
    } catch (error) {
      console.log("Default experiment may already exist:", error);
    }
  }
  // User methods (mandatory for Replit Auth)
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  async createAnonymousUser() {
    const [user] = await db.insert(users).values({
      isAnonymous: true,
      firstName: "Anonymous",
      lastName: "User"
    }).returning();
    return user;
  }
  // Privacy settings methods
  async getParticipationSettings(userId) {
    const [settings] = await db.select().from(participationSettings).where(eq(participationSettings.userId, userId));
    return settings;
  }
  async setParticipationSettings(settings) {
    const [result] = await db.insert(participationSettings).values(settings).onConflictDoUpdate({
      target: participationSettings.userId,
      set: {
        ...settings
      }
    }).returning();
    return result;
  }
  // Experiment methods
  async getExperiment(id) {
    const [experiment] = await db.select().from(experiments).where(eq(experiments.id, id));
    return experiment;
  }
  async getActiveExperiment() {
    const [experiment] = await db.select().from(experiments).where(eq(experiments.isActive, true)).limit(1);
    return experiment;
  }
  async createExperiment(insertExperiment) {
    const [experiment] = await db.insert(experiments).values(insertExperiment).returning();
    return experiment;
  }
  async getExperimentLevels(experimentId) {
    const levels = await db.select().from(experimentLevels).where(eq(experimentLevels.experimentId, experimentId)).orderBy(experimentLevels.levelNumber);
    return levels;
  }
  async getExperimentLevel(levelId) {
    const [level] = await db.select().from(experimentLevels).where(eq(experimentLevels.id, levelId));
    return level;
  }
  async createExperimentLevel(insertLevel) {
    const [level] = await db.insert(experimentLevels).values(insertLevel).returning();
    return level;
  }
  // Session methods
  async createSession(insertSession) {
    const [session] = await db.insert(experimentSessions).values(insertSession).returning();
    return session;
  }
  async getSession(sessionId) {
    const [session] = await db.select().from(experimentSessions).where(eq(experimentSessions.id, sessionId));
    return session;
  }
  async updateSession(sessionId, updates) {
    const [session] = await db.update(experimentSessions).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(experimentSessions.id, sessionId)).returning();
    if (!session) {
      throw new Error("Session not found");
    }
    return session;
  }
  // Response methods
  async createResponse(insertResponse) {
    const [response] = await db.insert(experimentResponses).values(insertResponse).returning();
    return response;
  }
  async getSessionResponses(sessionId) {
    const responses = await db.select().from(experimentResponses).where(eq(experimentResponses.sessionId, sessionId)).orderBy(experimentResponses.createdAt);
    return responses;
  }
  // Activity tracking methods
  async trackActivity(activity) {
    const [event] = await db.insert(activityTracking).values(activity).returning();
    return event;
  }
  async getUserActivity(userId) {
    const activities = await db.select().from(activityTracking).where(eq(activityTracking.userId, userId)).orderBy(desc(activityTracking.createdAt));
    return activities;
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import multer from "multer";
import path from "path";
import fs from "fs";
var uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
var upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 50 * 1024 * 1024
    // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "audio/mpeg",
      "audio/wav",
      "audio/webm",
      "audio/ogg"
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"), false);
    }
  }
});
async function registerRoutes(app2) {
  app2.get("/api/experiment", async (req, res) => {
    try {
      const experiment = await storage.getActiveExperiment();
      if (!experiment) {
        return res.status(404).json({ error: "No active experiment found" });
      }
      res.json(experiment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch experiment" });
    }
  });
  app2.get("/api/experiment/:experimentId/levels", async (req, res) => {
    try {
      const { experimentId } = req.params;
      const levels = await storage.getExperimentLevels(experimentId);
      res.json(levels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch experiment levels" });
    }
  });
  app2.get("/api/level/:levelId", async (req, res) => {
    try {
      const { levelId } = req.params;
      const level = await storage.getExperimentLevel(levelId);
      if (!level) {
        return res.status(404).json({ error: "Level not found" });
      }
      res.json(level);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch level" });
    }
  });
  app2.post("/api/session", async (req, res) => {
    try {
      const validatedData = insertExperimentSessionSchema.parse(req.body);
      const session = await storage.createSession(validatedData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: "Invalid session data" });
    }
  });
  app2.get("/api/session/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });
  app2.patch("/api/session/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.updateSession(sessionId, req.body);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: "Failed to update session" });
    }
  });
  app2.post("/api/response", upload.single("file"), async (req, res) => {
    try {
      const { sessionId, levelId, questionId, responseType, responseData } = req.body;
      let parsedResponseData;
      try {
        parsedResponseData = JSON.parse(responseData);
      } catch {
        parsedResponseData = responseData;
      }
      const responsePayload = {
        sessionId,
        levelId,
        questionId,
        responseType,
        responseData: parsedResponseData,
        filePath: req.file ? req.file.path : void 0
      };
      const validatedData = insertExperimentResponseSchema.parse(responsePayload);
      const response = await storage.createResponse(validatedData);
      res.json(response);
    } catch (error) {
      console.error("Response submission error:", error);
      res.status(400).json({ error: "Failed to submit response" });
    }
  });
  app2.get("/api/session/:sessionId/responses", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const responses = await storage.getSessionResponses(sessionId);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  });
  app2.use("/uploads", (req, res, next) => {
    res.set({
      "Cache-Control": "public, max-age=31536000",
      "X-Content-Type-Options": "nosniff"
    });
    next();
  }, express.static(uploadDir));
  app2.post("/api/shopify/customer", async (req, res) => {
    try {
      const { email, name, sessionId } = req.body;
      if (sessionId) {
        await storage.updateSession(sessionId, {
          sessionData: { userEmail: email, userName: name }
        });
      }
      console.log("Customer data for Shopify:", { email, name });
      res.json({ success: true, message: "Customer data processed" });
    } catch (error) {
      res.status(500).json({ error: "Failed to process customer data" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
