import fetch from 'node-fetch';

interface KlaviyoProfile {
  type: string;
  attributes: {
    email: string;
    first_name?: string;
    last_name?: string;
    properties?: Record<string, any>;
  };
}

interface KlaviyoEvent {
  type: string;
  attributes: {
    profile: KlaviyoProfile;
    metric: {
      data: {
        type: string;
        attributes: {
          name: string;
        };
      };
    };
    properties: Record<string, any>;
    time: string;
  };
}

interface KlaviyoEventData {
  email: string;
  hypothesis: string;
  experimentId: string;
  sessionId: string;
  completionDate: string;
  userAgent?: string;
  firstName?: string;
  lastName?: string;
}

interface KlaviyoListData {
  email: string;
  hypothesis: string;
  experimentId: string;
  sessionId: string;
  completionDate: string;
  firstName?: string;
  lastName?: string;
}

class KlaviyoService {
  private apiKey: string | null = null;
  private baseUrl = 'https://a.klaviyo.com/api';
  private apiVersion = '2024-10-15';
  private listId: string = 'UHHRxV'; // shared-hypothesis list - double opt-in

  constructor() {
    this.apiKey = process.env.KLAVIYO_API_KEY || null;
    if (this.apiKey) {
      console.log('✅ Klaviyo service initialized with API key');
    } else {
      console.log('⚠️  Klaviyo service initialized without API key');
    }
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private getHeaders() {
    if (!this.apiKey) {
      throw new Error('Klaviyo API key not configured');
    }

    return {
      'Authorization': `Klaviyo-API-Key ${this.apiKey}`,
      'Content-Type': 'application/json',
      'revision': this.apiVersion,
    };
  }

  async createOrUpdateProfile(email: string, firstName?: string, lastName?: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Klaviyo service not configured');
    }

    const profileData = {
      data: {
        type: 'profile',
        attributes: {
          email,
          ...(firstName && { first_name: firstName }),
          ...(lastName && { last_name: lastName }),
        },
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/profile-import/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Klaviyo profile creation failed:', response.status, errorText);
        throw new Error(`Klaviyo profile creation failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Klaviyo profile created/updated successfully:', result);
      return result;
    } catch (error) {
      console.error('Klaviyo profile creation error:', error);
      throw error;
    }
  }

  async trackHypothesisEvent(eventData: KlaviyoEventData): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Klaviyo service not configured');
    }

    const eventPayload = {
      data: {
        type: 'event',
        attributes: {
          profile: {
            data: {
              type: 'profile',
              attributes: {
                email: eventData.email,
                ...(eventData.firstName && { first_name: eventData.firstName }),
                ...(eventData.lastName && { last_name: eventData.lastName }),
              },
            },
          },
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: 'Share Your Hypothesis',
              },
            },
          },
          properties: {
            hypothesis: eventData.hypothesis,
            experiment_id: eventData.experimentId,
            session_id: eventData.sessionId,
            completion_date: eventData.completionDate,
            source: 'mindjourney_experiment',
            ...(eventData.userAgent && { user_agent: eventData.userAgent }),
          },
          time: eventData.completionDate,
        },
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/events/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(eventPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Klaviyo event tracking failed:', response.status, errorText);
        throw new Error(`Klaviyo event tracking failed: ${response.status}`);
      }

      // Klaviyo events API may return empty body for 202 responses
      const responseText = await response.text();
      let result = null;
      
      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.log('Klaviyo event API returned non-JSON response:', responseText);
        }
      }
      
      console.log('Klaviyo hypothesis event tracked successfully:', result || 'Event submitted');
      return result || { success: true, status: response.status };
    } catch (error) {
      console.error('Klaviyo event tracking error:', error);
      throw error;
    }
  }

  async addToHypothesisList(listData: KlaviyoListData): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Klaviyo service not configured');
    }

    // First create/update the profile with hypothesis data as custom properties
    const profileData = {
      data: {
        type: 'profile',
        attributes: {
          email: listData.email,
          ...(listData.firstName && { first_name: listData.firstName }),
          ...(listData.lastName && { last_name: listData.lastName }),
          properties: {
            hypothesis: listData.hypothesis,
            experiment_id: listData.experimentId,
            session_id: listData.sessionId,
            completion_date: listData.completionDate,
            source: 'mindjourney_experiment'
          }
        }
      }
    };

    try {
      // Create or update the profile
      const profileResponse = await fetch(`${this.baseUrl}/profile-import/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(profileData),
      });

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error('Klaviyo profile creation failed:', profileResponse.status, errorText);
        throw new Error(`Klaviyo profile creation failed: ${profileResponse.status}`);
      }

      const profileResult = await profileResponse.json() as any;
      console.log('Klaviyo profile created/updated successfully:', profileResult);

      // Get the profile ID from the result
      const profileId = profileResult.data.id;

      // Add profile to the list
      const listSubscription = {
        data: [
          {
            type: 'profile',
            id: profileId
          }
        ]
      };

      const listResponse = await fetch(`${this.baseUrl}/lists/${this.listId}/relationships/profiles/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(listSubscription),
      });

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        console.error('Klaviyo list subscription failed:', listResponse.status, errorText);
        throw new Error(`Klaviyo list subscription failed: ${listResponse.status}`);
      }

      console.log('Profile successfully added to Klaviyo list');
      return { profileResult, listSubscribed: true };
    } catch (error) {
      console.error('Klaviyo list subscription error:', error);
      throw error;
    }
  }

  async addToHypothesisListWithRetry(listData: KlaviyoListData, maxRetries = 3): Promise<any> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
      try {
        return await this.addToHypothesisList(listData);
      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Klaviyo list subscription attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`Klaviyo list subscription failed after ${maxRetries} attempts:`, lastError);
    throw lastError;
  }

  // Keep the existing event tracking method for backward compatibility
  async trackHypothesisWithRetry(eventData: KlaviyoEventData, maxRetries = 3): Promise<any> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
      try {
        // First ensure profile exists
        await this.createOrUpdateProfile(
          eventData.email,
          eventData.firstName,
          eventData.lastName
        );

        // Then track the event
        return await this.trackHypothesisEvent(eventData);
      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Klaviyo attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`Klaviyo tracking failed after ${maxRetries} attempts:`, lastError);
    throw lastError;
  }

  setListId(listId: string): void {
    this.listId = listId;
    console.log(`Klaviyo list ID updated to: ${listId}`);
  }

  getListId(): string {
    return this.listId;
  }
}

export const klaviyoService = new KlaviyoService();