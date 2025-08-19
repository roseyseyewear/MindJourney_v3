# replit.md

## Overview

This is a React-based experiment application built with Express.js backend, designed to conduct interactive video-based psychological or behavioral experiments. The application features a modern, immersive interface with branching logic capabilities, multimedia response collection, and session management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with custom configuration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **File Uploads**: Multer with local file storage
- **Session Management**: In-memory storage with interface for future database integration

### Database Design
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` for type sharing between client and server
- **Tables**: users, experiments, experiment_levels, experiment_sessions, experiment_responses
- **Data Types**: JSON fields for flexible question storage and branching rules

## Key Components

### Experiment Flow Components
- **WelcomeScreen**: Initial landing page with experiment introduction
- **VideoPlayer**: Custom video player with fullscreen support and controls
- **QuestionOverlay**: Multi-modal response collection (text, audio, video, photos)
- **ProgressTracker**: Shows experiment progress and exit option

### Core Features
- **Branching Logic**: Dynamic experiment paths based on user responses
- **Multimedia Responses**: Support for text, audio, video, and image responses
- **Session Persistence**: Tracks user progress through experiment levels
- **Responsive Design**: Mobile-first approach with desktop optimization

### UI Components
- Complete shadcn/ui component library integration
- Custom experiment-themed styling with CSS variables
- Dark/light mode support infrastructure
- Consistent design system with neutral color palette

## Data Flow

### Experiment Execution Flow
1. User lands on welcome screen → fetch active experiment
2. Create session → load first experiment level
3. Play video → collect responses → evaluate branching rules
4. Navigate to next level based on responses → repeat until completion
5. Store all responses with session tracking

### API Endpoints
- `GET /api/experiment` - Fetch active experiment
- `GET /api/experiment/:id/levels` - Get experiment levels
- `POST /api/session` - Create new experiment session
- `POST /api/response` - Submit user response (with file upload support)

### Response Data Structure
- Flexible JSON storage for different response types
- File upload handling for media responses
- Session-based response tracking
- Branching path determination logic

### UI Design System
- **Color Palette**: Strict grayscale with #141414 backgrounds, #eeeeee for text/borders
- **Transparency**: Semi-transparent backgrounds (rgba(20, 20, 20, 0.7)) for all interface sections
- **Typography**: Magda Clean font throughout, consistent #eeeeee text color
- **Layout**: Unified background colors across visitor bar, chat area, and level navigation
- **Borders**: #eeeeee dividing lines between interface sections
- **Interactions**: Camera button opens video app, film button removed

## External Dependencies

### Core Dependencies
- **React Ecosystem**: React 18, React DOM, TanStack Query
- **UI Framework**: Radix UI primitives with shadcn/ui components
- **Database**: Drizzle ORM, Neon Database serverless client
- **File Handling**: Multer for uploads, file type validation
- **Validation**: Zod schemas with Drizzle integration
- **Utilities**: date-fns, clsx, class-variance-authority

### Development Dependencies
- **Build Tools**: Vite, esbuild for production builds
- **TypeScript**: Full type safety across client/server/shared code
- **Styling**: Tailwind CSS with PostCSS
- **Replit Integration**: Custom Vite plugins for Replit environment

### Media Support
- **Video**: MP4, WebM, QuickTime formats
- **Audio**: MP3, WAV, WebM, OGG formats  
- **Images**: JPEG, PNG, GIF, WebP formats
- **File Size**: 50MB upload limit with type validation

## Deployment Strategy

### Development Mode
- Vite dev server with HMR for frontend
- tsx for TypeScript execution in development
- Concurrent client/server development with proxy setup
- Replit-specific development banner and error handling

### Production Build
- Vite builds client to `dist/public`
- esbuild bundles server to `dist/index.js`
- Static file serving from Express
- Environment-based configuration (DATABASE_URL required)

### Environment Configuration
- **Database**: PostgreSQL connection via DATABASE_URL
- **File Storage**: Local filesystem with configurable upload directory
- **Email Automation**: Klaviyo integration for hypothesis submission events
- **Build Output**: Separate client/server build processes
- **Type Safety**: Shared schema types between client and server

### Scalability Considerations
- In-memory storage currently used (can be replaced with database persistence)
- File uploads stored locally (can be moved to cloud storage)
- Session management ready for Redis or database backends
- Modular architecture supports horizontal scaling

## Email Marketing Integration

### Klaviyo Email Automation
- **Purpose**: Automatically capture user hypothesis submissions for email marketing flows
- **Integration Method**: List-based subscription (adds users to Klaviyo email list)
- **Target List**: "shared-hypothesis" (ID: UHHRxV) with double opt-in process
- **Background Processing**: Seamless integration that doesn't affect user experience
- **Retry Logic**: Exponential backoff for failed API calls to ensure reliable delivery

### Profile Data Captured
- User email address (from session responses)
- Hypothesis text content (stored as profile property)
- Experiment ID and session ID for tracking
- Completion timestamp
- Source attribution ("mindjourney_experiment")
- All data stored as custom profile properties for email personalization

### API Endpoints
- `POST /api/settings/klaviyo` - Configure Klaviyo API credentials
- `POST /api/settings/klaviyo-list` - Configure target Klaviyo list ID
- `GET /api/settings/klaviyo-list` - Get current list configuration
- `GET /api/settings/status` - Check integration status
- `POST /api/test/klaviyo` - Test list subscription with sample data

### Error Handling
- Failed Klaviyo list subscriptions don't impact user experience
- Comprehensive logging for debugging and monitoring
- Graceful fallback ensures all data is still saved to Firebase
- Asynchronous processing prevents blocking response submission
- Configurable list targeting for different campaigns

### Configuration Requirements
- Set `KLAVIYO_API_KEY` environment variable with private API key
- Email collection must occur before hypothesis submission in experiment flow
- Event name "Share Your Hypothesis" should match Klaviyo flow configuration