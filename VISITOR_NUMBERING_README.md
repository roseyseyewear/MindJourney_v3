# Visitor Numbering System

This implementation adds unique sequential visitor numbers to the MindJourney-v3 experiment platform.

## Features

✅ **Atomic Sequential Numbering** - PostgreSQL sequence ensures no duplicates  
✅ **Concurrent User Support** - Handles multiple simultaneous visitors safely  
✅ **Data Consistency** - Visitor numbers linked across all records  
✅ **Firebase Integration** - Visitor numbers included in file metadata  
✅ **Graceful Degradation** - System continues working if numbering fails  
✅ **Recovery Tools** - Admin endpoints to fix missing visitor numbers  

## How It Works

### 1. Database Schema
- **Sequence**: `visitor_counter_sequence` for atomic incrementing
- **Users Table**: `visitor_number` column (unique)
- **Sessions Table**: `visitor_number` column  
- **Responses Table**: `visitor_number` column
- **Firebase Storage**: Visitor number in metadata

### 2. Assignment Flow
1. User clicks "Press Play to Begin"
2. `createSession()` gets next number from sequence (atomic)
3. Creates/updates user record with visitor number
4. Creates session with visitor number
5. All responses inherit visitor number
6. Firebase uploads include visitor number in metadata

### 3. Frontend Display
- Visitor number shown in progress tracker: "Visitor #123 • Level 1 • 25% Complete"
- Toast notification welcomes user with their number

## Installation

### 1. Database Migration
```bash
# The schema has been updated - push changes when DATABASE_URL is configured
npm run db:push
```

### 2. Environment Setup
Ensure your `.env` has:
```
DATABASE_URL=your_postgres_connection_string
FIREBASE_SERVICE_ACCOUNT_KEY=your_firebase_key
FIREBASE_STORAGE_BUCKET=your_bucket_name
```

### 3. No Code Changes Required
The visitor numbering system is now integrated and will work automatically.

## Testing

### Test Concurrent Users
```bash
# Test with 10 concurrent users (default)
node test_concurrent_visitors.js

# Test with custom number of users
CONCURRENT_USERS=25 node test_concurrent_visitors.js

# Test with custom API URL
API_URL=https://your-app.com/api CONCURRENT_USERS=10 node test_concurrent_visitors.js
```

### Expected Results
- ✅ All users get unique visitor numbers
- ✅ Numbers are sequential (accounting for existing data)
- ✅ No duplicates
- ✅ Firebase metadata includes visitor numbers
- ✅ System handles race conditions

## Admin Tools

### Recovery Endpoint
If some sessions are missing visitor numbers:

```bash
curl -X POST http://localhost:5000/api/admin/assign-visitor-numbers
```

This will:
- Find sessions without visitor numbers
- Assign sequential numbers to them
- Update associated users and responses
- Provide summary of changes

## Error Handling

### Backend
- **Sequence Failure**: Falls back to creating session without visitor number
- **Database Issues**: Logs errors, continues operation
- **Firebase Errors**: Warns but doesn't block file uploads

### Frontend  
- **Success**: Shows welcome toast with visitor number
- **Fallback**: Shows session started notification without number
- **Failure**: Standard error handling with retry option

## Architecture Decisions

### Why PostgreSQL Sequence?
- **Atomic Operations**: Thread-safe increments prevent duplicates
- **High Performance**: Optimized for concurrent access
- **Crash Safe**: Survives server restarts
- **Scalable**: Works with multiple server instances

### Why Not Firebase Counter?
- Firebase counters have race condition issues
- PostgreSQL sequence is more reliable for this use case
- Keeps visitor numbering with main database

### Fallback Strategy
- User experience is never blocked by visitor numbering issues
- System degrades gracefully if numbering fails
- Logs provide visibility into any issues
- Recovery tools fix missing numbers retroactively

## File Organization

```
Firebase Storage Structure:
experiment-responses/
  YYYY-MM-DD/
    session-abc123/
      text/
        timestamp_response.txt (metadata includes visitorNumber)
      video/  
        timestamp_video.mp4 (metadata includes visitorNumber)
```

## Monitoring

### Console Logs
```
✅ Assigned visitor number 123 to session abc-def-123
✅ Response created for visitor #123
✅ Welcome, Visitor #123!
```

### Error Logs
```
❌ Error creating session with visitor number: [details]
⚠️ Session created without visitor number as fallback
```

## API Changes

### Session Creation Response
```json
{
  "id": "session-uuid",
  "userId": "user-uuid", 
  "experimentId": "exp-uuid",
  "visitorNumber": 123,
  "currentLevel": 1,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### Response Records
```json
{
  "id": "response-uuid",
  "sessionId": "session-uuid",
  "visitorNumber": 123,
  "responseData": {...},
  "createdAt": "2025-01-01T00:00:00Z"
}
```

## Performance Impact

- **Sequence Operations**: ~0.1ms per visitor number assignment
- **Database Queries**: +2 queries per session creation (user update + visitor number)
- **Memory**: Negligible additional memory usage
- **Storage**: +4 bytes per record (integer visitor number)

## Compatibility

- ✅ Backward Compatible: Existing sessions continue working
- ✅ Optional Feature: System works without visitor numbers
- ✅ Progressive Enhancement: Numbers added as users create new sessions

## Support

For issues with the visitor numbering system:
1. Check console logs for error messages
2. Verify database sequence exists: `SELECT * FROM visitor_counter_sequence;`
3. Use recovery endpoint to fix missing numbers
4. Review this documentation for troubleshooting steps