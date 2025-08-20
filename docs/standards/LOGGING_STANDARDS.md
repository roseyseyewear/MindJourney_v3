# MindJourney-v3 Logging Standards

## Overview

This document establishes consistent logging practices across the MindJourney-v3 codebase to ensure maintainability, debuggability, and operational visibility.

## Logging Philosophy

### Core Principles
1. **Consistency**: Use standardized formats and symbols across the application
2. **Clarity**: Logs should be immediately understandable by any team member
3. **Context**: Include relevant information for debugging and monitoring
4. **Performance**: Avoid excessive logging in hot paths
5. **Security**: Never log sensitive information (passwords, API keys, personal data)

### Log Levels

#### Success (`console.log`) - Green ✅
```typescript
console.log(`✅ User authenticated successfully: ${userId}`);
console.log(`✅ Assigned visitor number ${visitorNumber} to session ${sessionId}`);
console.log(`✅ File uploaded to Firebase: ${filePath}`);
```

#### Information (`console.log`) - Blue 🔥  
```typescript
console.log(`🔥 Session created:`, session);
console.log(`🔥 Visitor number set to:`, visitorNumber);
console.log(`🔥 Component render:`, { props, state });
```

#### Warning (`console.warn`) - Yellow ⚠️
```typescript
console.warn('⚠️ Session created without visitor number');
console.warn('⚠️ Firebase upload failed, using fallback storage');
console.warn('⚠️ Database connection slow, response time:', responseTime);
```

#### Error (`console.error`) - Red ❌
```typescript
console.error('❌ Database connection failed:', error);
console.error('❌ Failed to assign visitor number:', error.message);
console.error('❌ API request failed:', { url, status, error });
```

## Logging Patterns

### Database Operations

#### Session Management
```typescript
// Session creation
console.log(`✅ Session created: ${sessionId} for experiment ${experimentId}`);
console.log(`✅ Assigned visitor number ${visitorNumber} to session ${sessionId}`);

// Session updates
console.log(`✅ Session updated: ${sessionId}`, updates);

// Session errors
console.error('❌ Failed to create session:', error);
console.warn('⚠️ Session created without visitor number as fallback');
```

#### Response Handling
```typescript
// Response creation
console.log(`✅ Response created for visitor #${visitorNumber}`);
console.log(`✅ ${responseType} response saved: ${responseId}`);

// Response errors
console.error('❌ Failed to save response:', error);
console.warn('⚠️ Response created without visitor number');
```

#### Database Connectivity
```typescript
// Connection success
console.log(`✅ Database connected: ${databaseUrl.split('@')[1]}`);

// Connection issues
console.error('❌ Database connection failed:', error);
console.warn('⚠️ Database query slow:', { query, duration });
```

### File Upload Operations

#### Firebase Storage
```typescript
// Upload success
console.log(`✅ File uploaded to Firebase: ${filePath}`);
console.log(`✅ Text response uploaded for visitor #${visitorNumber}`);

// Upload warnings
console.warn('⚠️ Could not make file public, using signed URL instead');
console.warn('⚠️ Firebase upload failed, keeping local file');

// Upload errors
console.error('❌ Firebase Storage upload failed:', uploadError);
console.error('❌ Failed to generate signed URL:', error);
```

#### File Processing
```typescript
// Processing success
console.log(`✅ File processed: ${originalName} -> ${processedName}`);

// Processing warnings
console.warn('⚠️ File too large, compressing:', { originalSize, compressedSize });

// Processing errors
console.error('❌ File processing failed:', { fileName, error });
```

### API Operations

#### Request Handling
```typescript
// Request success
console.log(`✅ ${method} ${endpoint} - ${status} - ${duration}ms`);

// Request warnings  
console.warn(`⚠️ ${method} ${endpoint} - slow response: ${duration}ms`);

// Request errors
console.error(`❌ ${method} ${endpoint} - ${status}:`, error);
```

#### Authentication
```typescript
// Auth success
console.log(`✅ User authenticated: ${userId}`);

// Auth warnings
console.warn('⚠️ Anonymous user created for session');

// Auth errors  
console.error('❌ Authentication failed:', error);
```

### Frontend Operations

#### Component Lifecycle
```typescript
// Component mounting/updates
console.log('🔥 Component mounted:', componentName, props);
console.log('🔥 State updated:', { previousState, newState });

// Component warnings
console.warn('⚠️ Component received invalid props:', invalidProps);

// Component errors
console.error('❌ Component render failed:', error);
```

#### User Actions
```typescript
// User interactions
console.log(`✅ User action: ${actionName}`, actionData);
console.log(`✅ Welcome, Visitor #${visitorNumber}!`);

// User warnings
console.warn('⚠️ User attempted invalid action:', actionName);

// User errors
console.error('❌ User action failed:', { actionName, error });
```

### Third-Party Integrations

#### Klaviyo Integration
```typescript
// Klaviyo success
console.log('✅ User added to Klaviyo list successfully');
console.log('✅ Klaviyo triggered from Shopify integration');

// Klaviyo warnings
console.warn('⚠️ Klaviyo not configured, skipping email signup');

// Klaviyo errors
console.error('❌ Klaviyo integration failed:', error);
```

#### External APIs
```typescript
// API success
console.log(`✅ External API call successful: ${apiName}`);

// API warnings
console.warn(`⚠️ External API slow response: ${apiName} - ${duration}ms`);

// API errors  
console.error(`❌ External API failed: ${apiName}`, error);
```

## Structured Logging

### Context Objects
Always include relevant context in log messages:

```typescript
// Good: Structured context
console.log('✅ Session created:', {
  sessionId,
  userId, 
  visitorNumber,
  experimentId,
  timestamp: new Date().toISOString()
});

// Bad: Unstructured message
console.log('Session created successfully');
```

### Error Context
Include comprehensive error information:

```typescript
// Good: Full error context
console.error('❌ Database operation failed:', {
  operation: 'createSession',
  error: error.message,
  stack: error.stack,
  sessionData: insertSession,
  timestamp: new Date().toISOString()
});

// Bad: Minimal error info
console.error('Database error:', error);
```

### Performance Context
Include timing and performance metrics:

```typescript
// Good: Performance context
const startTime = Date.now();
// ... operation
const duration = Date.now() - startTime;
console.log(`✅ Operation completed: ${operationName}`, {
  duration,
  recordsProcessed,
  memoryUsage: process.memoryUsage()
});
```

## Security Guidelines

### What NOT to Log

#### Sensitive Data
```typescript
// ❌ NEVER log sensitive information
console.log('User login:', { email, password }); // BAD
console.log('API key:', process.env.FIREBASE_API_KEY); // BAD
console.log('Credit card:', paymentData.cardNumber); // BAD
```

#### Personal Information
```typescript
// ❌ Avoid logging PII
console.log('User data:', userData); // BAD if contains PII

// ✅ Log sanitized versions
console.log('User data saved:', {
  userId: userData.id,
  recordCount: userData.responses.length,
  hasEmail: !!userData.email
});
```

### Safe Logging Practices

#### Sanitize Objects
```typescript
const sanitizeUser = (user) => ({
  id: user.id,
  isAnonymous: user.isAnonymous,
  hasEmail: !!user.email,
  createdAt: user.createdAt
});

console.log('✅ User created:', sanitizeUser(user));
```

#### Truncate Large Objects
```typescript
const truncateForLogging = (obj, maxLength = 1000) => {
  const str = JSON.stringify(obj);
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
};

console.log('🔥 Large response:', truncateForLogging(responseData));
```

## Production Logging Considerations

### Log Levels in Production
```typescript
// Environment-based logging
const isDevelopment = process.env.NODE_ENV === 'development';

// Debug logs only in development
if (isDevelopment) {
  console.log('🔥 Debug info:', debugData);
}

// Always log errors and warnings
console.error('❌ Production error:', error);
console.warn('⚠️ Production warning:', warning);
```

### Performance Impact
```typescript
// Avoid expensive operations in logs
// Bad: Expensive serialization in production
console.log('State:', JSON.stringify(complexState, null, 2));

// Good: Conditional detailed logging
if (isDevelopment) {
  console.log('State:', JSON.stringify(complexState, null, 2));
} else {
  console.log('State updated:', { keyCount: Object.keys(complexState).length });
}
```

## Monitoring Integration

### Structured Logs for Analysis
```typescript
// Use consistent structure for monitoring tools
const logEntry = {
  level: 'error',
  message: 'Database connection failed',
  error: error.message,
  service: 'database',
  operation: 'connection',
  timestamp: new Date().toISOString(),
  metadata: {
    connectionString: sanitizedConnectionString,
    retryCount,
    duration
  }
};

console.error('❌ Database connection failed:', logEntry);
```

### Metrics and KPIs
```typescript
// Log data that can be analyzed for metrics
console.log('✅ Visitor session created:', {
  visitorNumber,
  sessionDuration: Duration,
  experimentId,
  timestamp: new Date().toISOString(),
  userAgent: req.headers['user-agent'],
  metrics: {
    responseTime: duration,
    memoryUsage: process.memoryUsage().heapUsed
  }
});
```

## Debugging Workflows

### Development Debugging
```typescript
// Use consistent debug markers
console.log('🔍 DEBUG: Function entry:', { functionName, params });
console.log('🔍 DEBUG: Intermediate state:', intermediateState);
console.log('🔍 DEBUG: Function exit:', { functionName, result });
```

### Production Debugging
```typescript
// Include correlation IDs for tracing
const correlationId = generateCorrelationId();

console.log(`✅ Request processed [${correlationId}]:`, {
  endpoint,
  duration,
  visitorNumber
});

console.error(`❌ Request failed [${correlationId}]:`, {
  endpoint,
  error: error.message,
  visitorNumber
});
```

## Log Rotation and Retention

### File-Based Logging Setup
```javascript
// Example Winston configuration for production
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'combined.log',
      maxsize: 5242880, // 5MB  
      maxFiles: 10
    })
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

## Code Review Checklist

### Logging Review Points
- [ ] Are log levels appropriate (error/warn/info)?
- [ ] Are log messages clear and actionable?
- [ ] Is sensitive information properly excluded?
- [ ] Are structured objects used for context?
- [ ] Are performance-impacting logs conditional?
- [ ] Are error logs comprehensive enough for debugging?
- [ ] Are success logs meaningful and not excessive?

### Example Reviews

#### Good Logging
```typescript
✅ // Clear, structured, secure
try {
  const session = await createSession(sessionData);
  console.log('✅ Session created:', {
    sessionId: session.id,
    visitorNumber: session.visitorNumber,
    experimentId: session.experimentId
  });
} catch (error) {
  console.error('❌ Session creation failed:', {
    error: error.message,
    sessionData: sanitizeSessionData(sessionData),
    timestamp: new Date().toISOString()
  });
}
```

#### Poor Logging
```typescript
❌ // Unclear, unstructured, potentially insecure
try {
  const session = await createSession(sessionData);
  console.log('Session done');
} catch (error) {
  console.log('Error:', error);
}
```

---

**Document Version**: 1.0  
**Last Updated**: January 19, 2025  
**Next Review**: March 19, 2025  
**Owner**: MindJourney-v3 Development Team