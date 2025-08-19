import { 
  type User, 
  type UpsertUser,
  type InsertUser,
  type Experiment,
  type InsertExperiment,
  type ExperimentLevel,
  type InsertExperimentLevel,
  type ExperimentSession,
  type InsertExperimentSession,
  type ExperimentResponse,
  type InsertExperimentResponse,
  type ParticipationSetting,
  type InsertParticipationSetting,
  type ActivityTrackingEvent,
  type InsertActivityTracking,
  type Question
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  users, 
  experiments, 
  experimentLevels, 
  experimentSessions, 
  experimentResponses,
  participationSettings,
  activityTracking,
  visitorCounterSequence
} from "@shared/schema";

export interface IStorage {
  // User methods (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createAnonymousUser(): Promise<User>;

  // Privacy settings methods
  getParticipationSettings(userId: string): Promise<ParticipationSetting | undefined>;
  setParticipationSettings(settings: InsertParticipationSetting): Promise<ParticipationSetting>;

  // Experiment methods
  getExperiment(id: string): Promise<Experiment | undefined>;
  getActiveExperiment(): Promise<Experiment | undefined>;
  createExperiment(experiment: InsertExperiment): Promise<Experiment>;
  getExperimentLevels(experimentId: string): Promise<ExperimentLevel[]>;
  getExperimentLevel(levelId: string): Promise<ExperimentLevel | undefined>;
  createExperimentLevel(level: InsertExperimentLevel): Promise<ExperimentLevel>;

  // Session methods
  createSession(session: InsertExperimentSession): Promise<ExperimentSession>;
  getSession(sessionId: string): Promise<ExperimentSession | undefined>;
  updateSession(sessionId: string, updates: Partial<ExperimentSession>): Promise<ExperimentSession>;

  // Response methods
  createResponse(response: InsertExperimentResponse): Promise<ExperimentResponse>;
  getSessionResponses(sessionId: string): Promise<ExperimentResponse[]>;
  getAllResponses(): Promise<ExperimentResponse[]>;
  getAllSessions(): Promise<ExperimentSession[]>;

  // Activity tracking methods
  trackActivity(activity: InsertActivityTracking): Promise<ActivityTrackingEvent>;
  getUserActivity(userId: string): Promise<ActivityTrackingEvent[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize with default experiment data if needed
    this.initializeDefaultExperiment();
  }

  private async initializeDefaultExperiment() {
    try {
      // Check if we already have an active experiment
      const existingExperiment = await this.getActiveExperiment();
      if (existingExperiment) return;

      // Create the default experiment
      const experiment = await this.createExperiment({
        title: "The Experiment - A Study on Perception",
        description: "An immersive journey through perception and consciousness",
        totalLevels: 5,
        isActive: true,
      });

      // Create levels with unique questions for each
      const levelConfigs = [
        {
          videoUrl: "/videos/level1-welcome.mp4",
          backgroundVideoUrl: "/videos/level1-chat-loop.mp4",
          completionVideoUrl: "/videos/level1-forest.mp4",
          postSubmissionVideoUrl: "/videos/hypothesis-post-submission.mp4",
          questions: [{
            id: "q1_level1",
            type: "text" as const,
            title: "Visual Scanning Experience",
            text: "What response would you like to share about this experience?",
            required: false,
          }]
        },
        {
          videoUrl: "/videos/level2.mp4",
          backgroundVideoUrl: "/videos/level2.mp4",
          completionVideoUrl: "/videos/level3.mp4",
          postSubmissionVideoUrl: "/videos/hypothesis-post-submission.mp4",
          questions: [{
            id: "q1_level2",
            type: "text" as const,
            title: "Digital Void Contemplation",
            text: "What response would you like to share about this experience?",
            required: false,
          }]
        },
        {
          videoUrl: "/videos/level3.mp4",
          backgroundVideoUrl: "/videos/level3.mp4",
          completionVideoUrl: "/videos/level4.mp4",
          postSubmissionVideoUrl: "/videos/hypothesis-post-submission.mp4",
          questions: [{
            id: "q1_level3",
            type: "text" as const,
            title: "Embodied Field Recognition",
            text: "What response would you like to share about this experience?",
            required: false,
          }]
        },
        {
          videoUrl: "/videos/level4.mp4",
          backgroundVideoUrl: "/videos/level4.mp4",
          completionVideoUrl: "/videos/level5.mp4",
          postSubmissionVideoUrl: "/videos/hypothesis-post-submission.mp4",
          questions: [{
            id: "q1_level4",
            type: "text" as const,
            title: "Interface Integration",
            text: "What response would you like to share about this experience?",
            required: false,
          }]
        },
        {
          videoUrl: "/videos/level5.mp4",
          backgroundVideoUrl: "/videos/level5.mp4",
          completionVideoUrl: "/videos/level1.mp4",
          postSubmissionVideoUrl: "/videos/hypothesis-post-submission.mp4",
          questions: [{
            id: "q1_level5",
            type: "text" as const,
            title: "Final Synthesis",
            text: "What response would you like to share about this experience?",
            required: false,
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
          completionVideoUrl: config.completionVideoUrl,
          postSubmissionVideoUrl: config.postSubmissionVideoUrl,
          videoThumbnail: null,
          questions: config.questions,
          branchingRules: [{ condition: "default", targetPath: "default" }],
        });
      }
    } catch (error) {
      console.log("Default experiment may already exist:", error);
    }
  }

  // User methods (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createAnonymousUser(): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        isAnonymous: true,
        firstName: "Anonymous",
        lastName: "User",
      })
      .returning();
    return user;
  }

  // Privacy settings methods
  async getParticipationSettings(userId: string): Promise<ParticipationSetting | undefined> {
    const [settings] = await db
      .select()
      .from(participationSettings)
      .where(eq(participationSettings.userId, userId));
    return settings;
  }

  async setParticipationSettings(settings: InsertParticipationSetting): Promise<ParticipationSetting> {
    const [result] = await db
      .insert(participationSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: participationSettings.userId,
        set: {
          ...settings,
        },
      })
      .returning();
    return result;
  }

  // Experiment methods
  async getExperiment(id: string): Promise<Experiment | undefined> {
    const [experiment] = await db.select().from(experiments).where(eq(experiments.id, id));
    return experiment;
  }

  async getActiveExperiment(): Promise<Experiment | undefined> {
    const [experiment] = await db
      .select()
      .from(experiments)
      .where(eq(experiments.isActive, true))
      .limit(1);
    return experiment;
  }

  async createExperiment(insertExperiment: InsertExperiment): Promise<Experiment> {
    const [experiment] = await db
      .insert(experiments)
      .values(insertExperiment)
      .returning();
    return experiment;
  }

  async getExperimentLevels(experimentId: string): Promise<ExperimentLevel[]> {
    const levels = await db
      .select()
      .from(experimentLevels)
      .where(eq(experimentLevels.experimentId, experimentId))
      .orderBy(experimentLevels.levelNumber);
    return levels;
  }

  async getExperimentLevel(levelId: string): Promise<ExperimentLevel | undefined> {
    const [level] = await db.select().from(experimentLevels).where(eq(experimentLevels.id, levelId));
    return level;
  }

  async createExperimentLevel(insertLevel: InsertExperimentLevel): Promise<ExperimentLevel> {
    const [level] = await db
      .insert(experimentLevels)
      .values(insertLevel)
      .returning();
    return level;
  }

  // Session methods
  async createSession(insertSession: InsertExperimentSession): Promise<ExperimentSession> {
    try {
      // Get next visitor number from sequence (atomic operation)
      const result = await db.execute(sql`SELECT nextval('visitor_counter_sequence') as next_value`);
      const visitorNumber = Number(result.rows[0].next_value);
      
      // If userId is provided, update the user with visitor number
      let user: User | undefined;
      if (insertSession.userId) {
        user = await this.getUser(insertSession.userId);
        
        // Update user with visitor number if not already set
        if (user && !user.visitorNumber) {
          await db
            .update(users)
            .set({ visitorNumber, updatedAt: new Date() })
            .where(eq(users.id, insertSession.userId));
        }
      } else {
        // Create anonymous user with visitor number
        user = await this.createAnonymousUser();
        if (user) {
          await db
            .update(users)
            .set({ visitorNumber, updatedAt: new Date() })
            .where(eq(users.id, user.id));
          
          // Update insertSession to include the userId
          insertSession.userId = user.id;
        }
      }
      
      // Create session with visitor number
      const [session] = await db
        .insert(experimentSessions)
        .values({
          ...insertSession,
          visitorNumber
        })
        .returning();
      
      console.log(`✅ Assigned visitor number ${visitorNumber} to session ${session.id}`);
      return session;
      
    } catch (error) {
      console.error('❌ Error creating session with visitor number:', error);
      
      // Fallback: create session without visitor number to not break user flow
      const [session] = await db
        .insert(experimentSessions)
        .values(insertSession)
        .returning();
      
      console.log('⚠️ Session created without visitor number as fallback');
      return session;
    }
  }

  async getSession(sessionId: string): Promise<ExperimentSession | undefined> {
    const [session] = await db.select().from(experimentSessions).where(eq(experimentSessions.id, sessionId));
    return session;
  }

  async updateSession(sessionId: string, updates: Partial<ExperimentSession>): Promise<ExperimentSession> {
    const [session] = await db
      .update(experimentSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(experimentSessions.id, sessionId))
      .returning();
    
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  }

  // Response methods
  async createResponse(insertResponse: InsertExperimentResponse): Promise<ExperimentResponse> {
    try {
      let visitorNumber: number | null = null;
      
      // Get visitor number from session if sessionId is provided
      if (insertResponse.sessionId) {
        const session = await this.getSession(insertResponse.sessionId);
        if (session) {
          visitorNumber = session.visitorNumber || null;
        }
      }
      
      // Create response with visitor number
      const [response] = await db
        .insert(experimentResponses)
        .values({
          ...insertResponse,
          visitorNumber
        })
        .returning();
      
      if (visitorNumber) {
        console.log(`✅ Response created for visitor #${visitorNumber}`);
      }
      
      return response;
      
    } catch (error) {
      console.error('❌ Error creating response with visitor number:', error);
      
      // Fallback: create response without visitor number
      const [response] = await db
        .insert(experimentResponses)
        .values(insertResponse)
        .returning();
      
      console.log('⚠️ Response created without visitor number as fallback');
      return response;
    }
  }

  async getSessionResponses(sessionId: string): Promise<ExperimentResponse[]> {
    const responses = await db
      .select()
      .from(experimentResponses)
      .where(eq(experimentResponses.sessionId, sessionId))
      .orderBy(experimentResponses.createdAt);
    return responses;
  }

  async getAllResponses(): Promise<ExperimentResponse[]> {
    const responses = await db
      .select()
      .from(experimentResponses)
      .orderBy(desc(experimentResponses.createdAt));
    return responses;
  }

  async getAllSessions(): Promise<ExperimentSession[]> {
    const sessions = await db
      .select()
      .from(experimentSessions)
      .orderBy(desc(experimentSessions.createdAt));
    return sessions;
  }

  // Activity tracking methods
  async trackActivity(activity: InsertActivityTracking): Promise<ActivityTrackingEvent> {
    const [event] = await db
      .insert(activityTracking)
      .values(activity)
      .returning();
    return event;
  }

  async getUserActivity(userId: string): Promise<ActivityTrackingEvent[]> {
    const activities = await db
      .select()
      .from(activityTracking)
      .where(eq(activityTracking.userId, userId))
      .orderBy(desc(activityTracking.createdAt));
    return activities;
  }
}

export const storage = new DatabaseStorage();