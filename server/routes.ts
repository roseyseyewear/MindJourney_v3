import type { Express, Request } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { users, experimentSessions, experimentResponses } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertExperimentSessionSchema, insertExperimentResponseSchema } from "@shared/schema";
import { googleDriveService } from "./google-drive";
import { firebaseStorageService } from "./firebase-storage";
import { klaviyoService } from "./klaviyo-service";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get active experiment
  app.get("/api/experiment", async (req, res) => {
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

  // Get experiment levels
  app.get("/api/experiment/:experimentId/levels", async (req, res) => {
    try {
      const { experimentId } = req.params;
      const levels = await storage.getExperimentLevels(experimentId);
      res.json(levels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch experiment levels" });
    }
  });

  // Get specific level
  app.get("/api/level/:levelId", async (req, res) => {
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

  // Create new session
  app.post("/api/session", async (req, res) => {
    try {
      const validatedData = insertExperimentSessionSchema.parse(req.body);
      const session = await storage.createSession(validatedData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: "Invalid session data" });
    }
  });

  // Get session
  app.get("/api/session/:sessionId", async (req, res) => {
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

  // Update session
  app.patch("/api/session/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.updateSession(sessionId, req.body);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: "Failed to update session" });
    }
  });

  // Submit response with file upload
  app.post("/api/response", upload.single('file'), async (req: Request & { file?: any }, res) => {
    try {
      const { sessionId, levelId, questionId, responseType, responseData, experimentId, userId } = req.body;
      
      let parsedResponseData;
      try {
        parsedResponseData = JSON.parse(responseData);
      } catch {
        parsedResponseData = responseData;
      }

      let filePath = req.file ? req.file.path : undefined;
      let googleDriveInfo = null;

      // Upload file to Firebase Storage if available and we have a file
      if (req.file && firebaseStorageService.isConfigured()) {
        try {
          const fileBuffer = fs.readFileSync(req.file.path);
          const fileName = req.file.originalname || `file_${Date.now()}`;
          
          // Get visitor number from session
          let visitorNumber: number | undefined;
          if (sessionId) {
            try {
              const session = await storage.getSession(sessionId);
              visitorNumber = session?.visitorNumber || undefined;
            } catch (error) {
              console.warn('Could not fetch session for visitor number:', error);
            }
          }
          
          const uploadResult = await firebaseStorageService.uploadFile(
            fileName,
            fileBuffer,
            req.file.mimetype,
            {
              sessionId,
              userId,
              experimentId,
              responseType,
              visitorNumber,
              timestamp: new Date().toISOString()
            }
          );

          if (uploadResult) {
            googleDriveInfo = uploadResult;
            console.log(`File uploaded to Firebase Storage: ${uploadResult.filePath}`);
          }

          // Clean up local file after uploading to Google Drive
          try {
            fs.unlinkSync(req.file.path);
          } catch (cleanupError) {
            console.warn('Could not clean up local file:', cleanupError);
          }
        } catch (uploadError) {
          console.error('Firebase Storage upload failed, keeping local file:', uploadError);
        }
      }

      // Also upload text responses to Firebase Storage if configured
      if (responseType === 'text' && parsedResponseData && firebaseStorageService.isConfigured()) {
        try {
          const textContent = typeof parsedResponseData === 'string' ? parsedResponseData : JSON.stringify(parsedResponseData);
          
          // Get visitor number from session if not already fetched
          let textVisitorNumber: number | undefined;
          if (sessionId) {
            try {
              const session = await storage.getSession(sessionId);
              textVisitorNumber = session?.visitorNumber || undefined;
            } catch (error) {
              console.warn('Could not fetch session for visitor number in text upload:', error);
            }
          }
          
          const textUploadResult = await firebaseStorageService.uploadTextResponse(
            textContent,
            {
              sessionId,
              userId,
              experimentId,
              responseType: 'text',
              visitorNumber: textVisitorNumber
            }
          );

          if (textUploadResult && !googleDriveInfo) {
            googleDriveInfo = textUploadResult;
          }
        } catch (textError) {
          console.error('Failed to upload text response to Firebase Storage:', textError);
        }
      }

      const responsePayload = {
        sessionId,
        levelId,
        questionId,
        responseType,
        responseData: parsedResponseData,
        filePath,
        fileUrl: googleDriveInfo?.downloadURL || filePath,
        fileId: googleDriveInfo?.filePath || filePath,
        metadata: googleDriveInfo ? { firebaseStorage: googleDriveInfo } : undefined,
      };

      const validatedData = insertExperimentResponseSchema.parse(responsePayload);
      const response = await storage.createResponse(validatedData);

      // Send data to Klaviyo if configured and this is a text/email response containing hypothesis
      if (klaviyoService.isConfigured() && responseType === 'text' && parsedResponseData) {
        try {
          // Check if this looks like a hypothesis submission (contains meaningful text)
          const hypothesisText = typeof parsedResponseData === 'string' ? parsedResponseData : 
                                typeof parsedResponseData === 'object' && parsedResponseData.value ? parsedResponseData.value :
                                JSON.stringify(parsedResponseData);

          // Get user email from session or response data
          let userEmail: string | null = null;
          
          // Try to get email from current session responses
          if (sessionId) {
            try {
              const sessionResponses = await storage.getSessionResponses(sessionId);
              const emailResponse = sessionResponses.find(r => r.responseType === 'email');
              if (emailResponse && emailResponse.responseData) {
                if (typeof emailResponse.responseData === 'string') {
                  userEmail = emailResponse.responseData;
                } else if (typeof emailResponse.responseData === 'object' && (emailResponse.responseData as any).value) {
                  userEmail = (emailResponse.responseData as any).value;
                }
              }

              // Also check session data for userEmail (from Shopify integration)
              if (!userEmail) {
                const session = await storage.getSession(sessionId);
                if (session && session.sessionData && typeof session.sessionData === 'object') {
                  const sessionData = session.sessionData as any;
                  if (sessionData.userEmail) {
                    userEmail = sessionData.userEmail;
                    console.log('Found email in session data:', userEmail);
                  }
                }
              }
            } catch (sessionError) {
              console.log('Could not fetch session data for email:', sessionError);
            }
          }

          // Also check if the current response contains email data
          if (!userEmail && typeof parsedResponseData === 'object' && (parsedResponseData as any).email) {
            userEmail = (parsedResponseData as any).email;
          }

          console.log('Klaviyo check - Email:', userEmail, 'Hypothesis:', hypothesisText, 'Length:', hypothesisText?.length);
          
          if (userEmail && hypothesisText && hypothesisText.length > 2) {
            const klaviyoListData = {
              email: userEmail,
              hypothesis: hypothesisText,
              experimentId: experimentId || 'unknown',
              sessionId: sessionId || 'unknown',
              completionDate: new Date().toISOString(),
            };

            // Add to Klaviyo list asynchronously with retry logic
            klaviyoService.addToHypothesisListWithRetry(klaviyoListData).then(() => {
              console.log('✅ User added to Klaviyo hypothesis list successfully');
            }).catch((klaviyoError) => {
              console.error('❌ Klaviyo list subscription failed (response still saved):', klaviyoError);
            });
          } else {
            console.log('Skipping Klaviyo - missing email or hypothesis too short. Email:', !!userEmail, 'Hypothesis length:', hypothesisText?.length);
          }
        } catch (klaviyoError) {
          console.error('Klaviyo integration error (response still saved):', klaviyoError);
        }
      }
      
      res.json({
        ...response,
        firebaseInfo: googleDriveInfo
      });
    } catch (error) {
      console.error('Response submission error:', error);
      res.status(400).json({ error: "Failed to submit response" });
    }
  });

  // Get session responses
  app.get("/api/session/:sessionId/responses", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const responses = await storage.getSessionResponses(sessionId);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    // Add security headers for file serving
    res.set({
      'Cache-Control': 'public, max-age=31536000',
      'X-Content-Type-Options': 'nosniff',
    });
    next();
  }, express.static(uploadDir));

  // Settings endpoint for Google Drive configuration
  app.post("/api/settings/google-drive", async (req, res) => {
    try {
      const { serviceAccountKey, folderId } = req.body;
      
      if (!serviceAccountKey || !folderId) {
        return res.status(400).json({ error: "Missing service account key or folder ID" });
      }

      // Validate JSON format
      try {
        const parsed = JSON.parse(serviceAccountKey);
        if (parsed.type !== 'service_account' || !parsed.private_key || !parsed.client_email) {
          return res.status(400).json({ error: "Invalid service account key format" });
        }
      } catch {
        return res.status(400).json({ error: "Invalid JSON in service account key" });
      }

      // Store credentials (in a real app, these would be encrypted)
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = serviceAccountKey;
      process.env.GOOGLE_DRIVE_FOLDER_ID = folderId;

      // Reinitialize the Google Drive service
      googleDriveService.constructor();

      console.log('Google Drive credentials updated successfully');
      res.json({ success: true, message: "Google Drive configuration saved" });
    } catch (error) {
      console.error('Settings update error:', error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // Settings endpoint for Klaviyo configuration
  app.post("/api/settings/klaviyo", async (req, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ error: "Missing Klaviyo API key" });
      }

      // Basic validation - Klaviyo API keys should start with certain prefixes
      if (!apiKey.startsWith('pk_') && !apiKey.startsWith('sk_')) {
        return res.status(400).json({ error: "Invalid Klaviyo API key format" });
      }

      // Store API key
      process.env.KLAVIYO_API_KEY = apiKey;

      console.log('Klaviyo API key updated successfully');
      res.json({ success: true, message: "Klaviyo configuration saved" });
    } catch (error) {
      console.error('Klaviyo settings update error:', error);
      res.status(500).json({ error: "Failed to save Klaviyo settings" });
    }
  });

  // Get current integration status
  app.get("/api/settings/status", async (req, res) => {
    try {
      res.json({
        googleDrive: {
          configured: googleDriveService ? true : false,
        },
        firebaseStorage: {
          configured: firebaseStorageService.isConfigured(),
        },
        klaviyo: {
          configured: klaviyoService.isConfigured(),
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  // Configure Klaviyo list ID
  app.post("/api/settings/klaviyo-list", async (req, res) => {
    try {
      const { listId } = req.body;
      
      if (!listId) {
        return res.status(400).json({ error: "List ID is required" });
      }

      if (!klaviyoService.isConfigured()) {
        return res.status(400).json({ error: "Klaviyo not configured. Set API key first." });
      }

      klaviyoService.setListId(listId);
      
      res.json({ 
        success: true, 
        message: "Klaviyo list ID updated successfully",
        listId 
      });
    } catch (error) {
      console.error('Klaviyo list configuration error:', error);
      res.status(500).json({ 
        error: "Failed to configure Klaviyo list", 
        details: (error as Error).message 
      });
    }
  });

  // Get current Klaviyo list ID
  app.get("/api/settings/klaviyo-list", async (req, res) => {
    try {
      if (!klaviyoService.isConfigured()) {
        return res.status(400).json({ error: "Klaviyo not configured" });
      }

      res.json({ 
        listId: klaviyoService.getListId(),
        configured: true
      });
    } catch (error) {
      console.error('Get Klaviyo list error:', error);
      res.status(500).json({ 
        error: "Failed to get list configuration", 
        details: (error as Error).message 
      });
    }
  });

  // Manual trigger Klaviyo for existing session
  app.post("/api/klaviyo/trigger-session", async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!klaviyoService.isConfigured()) {
        return res.status(400).json({ error: "Klaviyo not configured" });
      }

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID required" });
      }

      // Get session data and responses
      const session = await storage.getSession(sessionId);
      const sessionResponses = await storage.getSessionResponses(sessionId);

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Find email from session data or responses
      let userEmail: string | null = null;
      if (session.sessionData && typeof session.sessionData === 'object') {
        const sessionData = session.sessionData as any;
        if (sessionData.userEmail) {
          userEmail = sessionData.userEmail;
        }
      }

      // Find hypothesis text from responses
      let hypothesisText: string | null = null;
      const textResponses = sessionResponses.filter(r => r.responseType === 'text');
      for (const response of textResponses) {
        if (response.responseData) {
          const text = typeof response.responseData === 'string' ? response.responseData : 
                      typeof response.responseData === 'object' && (response.responseData as any).value ? 
                      (response.responseData as any).value : '';
          if (text && text.length > 2) {
            hypothesisText = text;
            break;
          }
        }
      }

      if (!userEmail || !hypothesisText) {
        return res.status(400).json({ 
          error: "Missing email or hypothesis in session", 
          details: { hasEmail: !!userEmail, hasHypothesis: !!hypothesisText }
        });
      }

      const klaviyoListData = {
        email: userEmail,
        hypothesis: hypothesisText,
        experimentId: session.experimentId || 'manual-trigger',
        sessionId: sessionId,
        completionDate: new Date().toISOString(),
      };

      const result = await klaviyoService.addToHypothesisListWithRetry(klaviyoListData);
      
      res.json({ 
        success: true, 
        message: "User manually added to Klaviyo list successfully",
        result,
        data: { email: userEmail, hypothesis: hypothesisText },
        listId: klaviyoService.getListId()
      });
    } catch (error) {
      console.error('Manual Klaviyo trigger error:', error);
      res.status(500).json({ 
        error: "Failed to trigger Klaviyo", 
        details: (error as Error).message 
      });
    }
  });

  // Test Klaviyo list integration endpoint
  app.post("/api/test/klaviyo", async (req, res) => {
    try {
      const { email, hypothesis } = req.body;
      
      if (!klaviyoService.isConfigured()) {
        return res.status(400).json({ error: "Klaviyo not configured" });
      }

      if (!email || !hypothesis) {
        return res.status(400).json({ error: "Email and hypothesis required for testing" });
      }

      const testListData = {
        email,
        hypothesis,
        experimentId: 'test-experiment',
        sessionId: 'test-session',
        completionDate: new Date().toISOString(),
      };

      const result = await klaviyoService.addToHypothesisListWithRetry(testListData);
      
      res.json({ 
        success: true, 
        message: "Test user added to Klaviyo list successfully",
        result,
        listId: klaviyoService.getListId()
      });
    } catch (error) {
      console.error('Klaviyo test error:', error);
      res.status(500).json({ 
        error: "Klaviyo test failed", 
        details: (error as Error).message 
      });
    }
  });

  // Direct download endpoint for Firebase files
  app.get("/api/download/:responseId", async (req, res) => {
    try {
      const { responseId } = req.params;
      
      // Get the response from database
      const responses = await storage.getAllResponses();
      const response = responses.find(r => r.id === responseId);
      
      if (!response) {
        return res.status(404).json({ error: "Response not found" });
      }

      // Check for file URL in either metadata or fileUrl field
      let downloadURL = response.fileUrl;
      let fileName = response.fileId?.split('/').pop();
      
      if (response.metadata && typeof response.metadata === 'object') {
        const metadata = response.metadata as any;
        if (metadata.firebaseStorage?.downloadURL) {
          downloadURL = metadata.firebaseStorage.downloadURL;
          fileName = metadata.firebaseStorage.filePath?.split('/').pop();
        }
      }
      
      if (!downloadURL) {
        return res.status(404).json({ error: "File not found" });
      }
      fileName = fileName || 'download';
      
      // Fetch the file from Firebase Storage
      const fileResponse = await fetch(downloadURL);
      if (!fileResponse.ok) {
        return res.status(404).json({ error: "File not accessible" });
      }
      
      // Set appropriate headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', fileResponse.headers.get('content-type') || 'application/octet-stream');
      
      // Stream the file to the response
      const buffer = await fileResponse.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ error: "Download failed" });
    }
  });

  // Shopify integration webhook
  app.post("/api/shopify/customer", async (req, res) => {
    try {
      const { email, name, sessionId } = req.body;
      
      // In a real implementation, this would integrate with Shopify's API
      // For now, we'll just update the session with customer info
      if (sessionId) {
        await storage.updateSession(sessionId, {
          sessionData: { userEmail: email, userName: name }
        });
      }

      // TODO: Implement actual Shopify API integration
      // This would create a customer profile in Shopify
      console.log('Customer data for Shopify:', { email, name });
      
      // Try to trigger Klaviyo integration now that we have email
      if (sessionId && email && klaviyoService.isConfigured()) {
        try {
          const sessionResponses = await storage.getSessionResponses(sessionId);
          
          // Find hypothesis text from responses
          let hypothesisText: string | null = null;
          const textResponses = sessionResponses.filter(r => r.responseType === 'text');
          for (const response of textResponses) {
            if (response.responseData) {
              const text = typeof response.responseData === 'string' ? response.responseData : 
                          typeof response.responseData === 'object' && (response.responseData as any).value ? 
                          (response.responseData as any).value : '';
              if (text && text.length > 2) {
                hypothesisText = text;
                break;
              }
            }
          }

          if (hypothesisText) {
            console.log('✅ Klaviyo trigger from Shopify - Email:', email, 'Hypothesis:', hypothesisText);
            
            const klaviyoListData = {
              email: email,
              hypothesis: hypothesisText,
              experimentId: sessionId,
              sessionId: sessionId,
              completionDate: new Date().toISOString(),
            };

            // Trigger Klaviyo asynchronously to not block the response
            klaviyoService.addToHypothesisListWithRetry(klaviyoListData).then(() => {
              console.log('✅ User added to Klaviyo hypothesis list from Shopify integration');
            }).catch((klaviyoError) => {
              console.error('❌ Klaviyo list subscription failed from Shopify (customer data still saved):', klaviyoError);
            });
          } else {
            console.log('🔍 Shopify integration: Email captured but no hypothesis found yet');
          }
        } catch (error) {
          console.error('Error checking for Klaviyo trigger from Shopify:', error);
        }
      }
      
      res.json({ success: true, message: "Customer data processed" });
    } catch (error) {
      res.status(500).json({ error: "Failed to process customer data" });
    }
  });

  // Contact form submission for unlock page
  app.post("/api/contact/submit", async (req, res) => {
    try {
      const { name, email, sms, sessionId, visitorNumber, submissionType } = req.body;

      if (!email || !name) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      // Store contact information in Firebase Storage
      const contactData = {
        name,
        email,
        sms: sms || null,
        sessionId: sessionId || null,
        visitorNumber: visitorNumber || null,
        submissionType: submissionType || 'unlock_benefits',
        timestamp: new Date().toISOString(),
      };

      try {
        // Upload contact data to Firebase Storage
        const contactUploadResult = await firebaseStorageService.uploadFile(
          Buffer.from(JSON.stringify(contactData, null, 2)),
          `contact_submissions/${visitorNumber || 'unknown'}_${Date.now()}.json`,
          'application/json',
          {
            sessionId: sessionId || 'unknown',
            submissionType: submissionType || 'unlock_benefits',
            visitorNumber: visitorNumber?.toString() || 'unknown'
          }
        );

        console.log('✅ Contact data uploaded to Firebase:', contactUploadResult.filePath);
      } catch (firebaseError) {
        console.error('❌ Failed to upload contact data to Firebase:', firebaseError);
        // Continue processing even if Firebase fails
      }

      // Also store in database if we have a session
      if (sessionId) {
        try {
          // Store as experiment response for tracking
          const responsePayload = {
            sessionId,
            levelId: 'unlock_benefits',
            questionId: 'contact_submission',
            responseType: 'contact',
            responseData: contactData,
            visitorNumber: visitorNumber || null,
          };

          const validatedData = insertExperimentResponseSchema.parse(responsePayload);
          await storage.createResponse(validatedData);
          console.log('✅ Contact data stored in database');
        } catch (dbError) {
          console.error('❌ Failed to store contact data in database:', dbError);
          // Continue processing even if DB fails
        }
      }

      // Integrate with Klaviyo if configured
      if (klaviyoService.isConfigured()) {
        try {
          // Get hypothesis from session responses if available
          let hypothesisText = null;
          if (sessionId) {
            try {
              const sessionResponses = await storage.getSessionResponses(sessionId);
              for (const response of sessionResponses) {
                const text = typeof response.responseData === 'string' ? response.responseData : 
                            typeof response.responseData === 'object' && (response.responseData as any).value ? 
                            (response.responseData as any).value : '';
                if (text && text.length > 2) {
                  hypothesisText = text;
                  break;
                }
              }
            } catch (sessionError) {
              console.log('Could not fetch session responses for hypothesis:', sessionError);
            }
          }

          const klaviyoListData = {
            email: email,
            name: name,
            sms: sms || undefined,
            hypothesis: hypothesisText || undefined,
            experimentId: sessionId || 'unlock_benefits',
            sessionId: sessionId || 'unknown',
            visitorNumber: visitorNumber?.toString() || undefined,
            completionDate: new Date().toISOString(),
            submissionType: submissionType || 'unlock_benefits'
          };

          // Add to Klaviyo asynchronously
          klaviyoService.addToHypothesisListWithRetry(klaviyoListData).then(() => {
            console.log('✅ Contact data sent to Klaviyo successfully');
          }).catch((klaviyoError) => {
            console.error('❌ Klaviyo integration failed (contact data still saved):', klaviyoError);
          });
        } catch (klaviyoError) {
          console.error('Klaviyo integration error:', klaviyoError);
        }
      }

      res.json({ 
        success: true, 
        message: "Contact information saved successfully",
        visitorNumber: visitorNumber 
      });
    } catch (error) {
      console.error('Contact submission error:', error);
      res.status(500).json({ error: "Failed to save contact information" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
