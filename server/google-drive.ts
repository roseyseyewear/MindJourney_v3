import { google } from 'googleapis';
import { Readable } from 'stream';

interface GoogleDriveConfig {
  serviceAccountKey: string;
  folderId: string;
}

class GoogleDriveService {
  private drive: any;
  private config: GoogleDriveConfig | null = null;

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    try {
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

      if (!serviceAccountKey || !folderId) {
        console.log('Google Drive credentials not configured');
        return;
      }

      const credentials = JSON.parse(serviceAccountKey);
      
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.config = { serviceAccountKey, folderId };
      
      console.log('Google Drive service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Drive service:', error);
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
    } = {}
  ): Promise<{ fileId: string; webViewLink: string } | null> {
    if (!this.drive || !this.config) {
      console.error('Google Drive service not initialized');
      return null;
    }

    try {
      // Create a readable stream from the buffer
      const stream = new Readable();
      stream.push(fileBuffer);
      stream.push(null);

      // Add metadata to the filename
      const timestampStr = metadata.timestamp || new Date().toISOString();
      const sessionStr = metadata.sessionId ? `_session-${metadata.sessionId.slice(0, 8)}` : '';
      const typeStr = metadata.responseType ? `_${metadata.responseType}` : '';
      const finalFileName = `${timestampStr}${sessionStr}${typeStr}_${fileName}`;

      const fileMetadata = {
        name: finalFileName,
        parents: [this.config.folderId],
        description: JSON.stringify({
          originalName: fileName,
          sessionId: metadata.sessionId,
          userId: metadata.userId,
          experimentId: metadata.experimentId,
          responseType: metadata.responseType,
          uploadedAt: timestampStr
        })
      };

      const media = {
        mimeType,
        body: stream
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink'
      });

      console.log(`File uploaded to Google Drive: ${finalFileName} (ID: ${response.data.id})`);
      
      return {
        fileId: response.data.id,
        webViewLink: response.data.webViewLink
      };
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
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
    } = {}
  ): Promise<{ fileId: string; webViewLink: string } | null> {
    const timestamp = new Date().toISOString();
    const fileName = `text-response-${timestamp}.txt`;
    const fileBuffer = Buffer.from(content, 'utf-8');
    
    return this.uploadFile(fileName, fileBuffer, 'text/plain', {
      ...metadata,
      timestamp,
      responseType: 'text'
    });
  }

  isConfigured(): boolean {
    return this.config !== null;
  }
}

export const googleDriveService = new GoogleDriveService();