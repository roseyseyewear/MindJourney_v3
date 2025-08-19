import admin from 'firebase-admin';

interface FirebaseConfig {
  serviceAccountKey: string;
  storageBucket: string;
}

class FirebaseStorageService {
  private storage: admin.storage.Storage | null = null;
  private config: FirebaseConfig | null = null;

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    try {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

      if (!serviceAccountKey || !storageBucket) {
        console.log('Firebase credentials not configured');
        return;
      }

      const credentials = JSON.parse(serviceAccountKey);
      
      // Initialize Firebase Admin if not already initialized
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(credentials),
          storageBucket: storageBucket
        });
      }

      this.storage = admin.storage();
      this.config = { serviceAccountKey, storageBucket };
      
      console.log('Firebase Storage service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Storage service:', error);
    }
  }

  async uploadFile(
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string,
    metadata: {
      sessionId?: string;
      userId?: string;
      experimentId?: string;
      responseType?: string;
      timestamp?: string;
      visitorNumber?: number;
    } = {}
  ): Promise<{ downloadURL: string; filePath: string } | null> {
    if (!this.storage || !this.config) {
      console.error('Firebase Storage service not initialized');
      return null;
    }

    try {
      const timestamp = metadata.timestamp || new Date().toISOString();
      const sessionStr = metadata.sessionId ? `session-${metadata.sessionId.slice(0, 8)}/` : '';
      const typeStr = metadata.responseType ? `${metadata.responseType}/` : '';
      const dateStr = timestamp.split('T')[0]; // YYYY-MM-DD
      
      // Organize files: experiment-responses/YYYY-MM-DD/session-xxx/type/filename
      const filePath = `experiment-responses/${dateStr}/${sessionStr}${typeStr}${timestamp}_${fileName}`;

      const bucket = this.storage.bucket();
      const file = bucket.file(filePath);

      // Upload file with metadata
      await file.save(fileBuffer, {
        metadata: {
          contentType: mimeType,
          metadata: {
            sessionId: metadata.sessionId || '',
            userId: metadata.userId || '',
            experimentId: metadata.experimentId || '',
            responseType: metadata.responseType || '',
            visitorNumber: metadata.visitorNumber?.toString() || '',
            uploadedAt: timestamp,
            originalName: fileName
          }
        }
      });

      // Get a signed URL that works for downloads
      const [downloadURL] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2030' // Long-term access for research data
      });
      
      // Also try to make it public for direct access
      try {
        await file.makePublic();
      } catch (publicError) {
        console.log('Could not make file public, using signed URL instead');
      }

      console.log(`File uploaded to Firebase Storage: ${filePath}`);
      
      return {
        downloadURL,
        filePath
      };
    } catch (error) {
      console.error('Error uploading file to Firebase Storage:', error);
      return null;
    }
  }

  async uploadTextResponse(
    content: string,
    metadata: {
      sessionId?: string;
      userId?: string;
      experimentId?: string;
      responseType?: string;
      visitorNumber?: number;
    } = {}
  ): Promise<{ downloadURL: string; filePath: string } | null> {
    const timestamp = new Date().toISOString();
    const fileName = `text-response-${timestamp}.txt`;
    const fileBuffer = Buffer.from(content, 'utf-8');
    
    return this.uploadFile(fileName, fileBuffer, 'text/plain', {
      ...metadata,
      timestamp,
      responseType: 'text'
    });
  }

  async createStructuredResponse(
    responses: Record<string, any>,
    metadata: {
      sessionId?: string;
      userId?: string;
      experimentId?: string;
      visitorNumber?: number;
    } = {}
  ): Promise<{ downloadURL: string; filePath: string } | null> {
    const timestamp = new Date().toISOString();
    const fileName = `session-summary-${timestamp}.json`;
    
    const responseData = {
      sessionId: metadata.sessionId,
      userId: metadata.userId,
      experimentId: metadata.experimentId,
      visitorNumber: metadata.visitorNumber,
      timestamp,
      responses,
      metadata: {
        userAgent: 'experiment-platform',
        version: '1.0'
      }
    };
    
    const fileBuffer = Buffer.from(JSON.stringify(responseData, null, 2), 'utf-8');
    
    return this.uploadFile(fileName, fileBuffer, 'application/json', {
      ...metadata,
      timestamp,
      responseType: 'session-summary'
    });
  }

  isConfigured(): boolean {
    return this.config !== null;
  }

  // Method to reinitialize after credentials update
  reinitialize() {
    this.storage = null;
    this.config = null;
    this.initializeService();
  }
}

export const firebaseStorageService = new FirebaseStorageService();