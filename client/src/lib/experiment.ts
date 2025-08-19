import { type Question, type BranchingRule, type ResponseData } from "@shared/schema";

export interface ExperimentConfig {
  autoplay: boolean;
  fullscreen: boolean;
  collectEmail: boolean;
  branchingEnabled: boolean;
}

export class ExperimentEngine {
  private config: ExperimentConfig;
  private sessionData: Record<string, any> = {};

  constructor(config: ExperimentConfig) {
    this.config = config;
  }

  evaluateBranchingRule(rule: BranchingRule, responses: ResponseData[]): boolean {
    // Simple condition evaluation
    // In a full implementation, this would parse and evaluate complex conditions
    if (rule.condition === 'default') return true;
    
    // Example: "question_id:value" format
    const [questionId, expectedValue] = rule.condition.split(':');
    const response = responses.find(r => r.questionId === questionId);
    
    return response?.value === expectedValue;
  }

  determineNextPath(responses: ResponseData[], branchingRules: BranchingRule[]): string {
    for (const rule of branchingRules) {
      if (this.evaluateBranchingRule(rule, responses)) {
        return rule.targetPath;
      }
    }
    return 'default';
  }

  saveSessionData(key: string, data: any) {
    this.sessionData[key] = data;
    // In a real implementation, this would persist to localStorage or send to server
    if (typeof window !== 'undefined') {
      localStorage.setItem(`experiment_${key}`, JSON.stringify(data));
    }
  }

  getSessionData(key: string): any {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`experiment_${key}`);
      return stored ? JSON.parse(stored) : this.sessionData[key];
    }
    return this.sessionData[key];
  }

  clearSession() {
    this.sessionData = {};
    if (typeof window !== 'undefined') {
      // Clear all experiment-related localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('experiment_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  // Analytics and tracking helpers
  trackEvent(eventName: string, data?: Record<string, any>) {
    const event = {
      name: eventName,
      timestamp: new Date().toISOString(),
      data: data || {},
      session: this.getSessionData('sessionId'),
    };

    // In a real implementation, send to analytics service
    console.log('Experiment Event:', event);
  }

  // Accessibility helpers
  static setupKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
      // ESC to exit
      if (event.key === 'Escape') {
        const exitButton = document.querySelector('[aria-label="Exit experiment"]') as HTMLButtonElement;
        exitButton?.click();
      }
      
      // Space to play/pause video
      if (event.key === ' ') {
        const playButton = document.querySelector('[aria-label="Play"], [aria-label="Pause"]') as HTMLButtonElement;
        if (playButton) {
          event.preventDefault();
          playButton.click();
        }
      }
    });
  }

  // Screen reader announcements
  static announceToScreenReader(message: string) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}

// Default experiment configuration
export const defaultExperimentConfig: ExperimentConfig = {
  autoplay: true,
  fullscreen: true,
  collectEmail: true,
  branchingEnabled: true,
};

// Utility functions for file handling
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Video utility functions
export const checkVideoSupport = (): boolean => {
  const video = document.createElement('video');
  return !!(video.canPlayType && video.canPlayType('video/mp4').replace(/no/, ''));
};

export const preloadVideo = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = url;
  });
};
