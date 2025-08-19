# Klaviyo Email Automation Setup Guide

## Overview
This guide explains how to set up Klaviyo email automation for the MindJourney experiment application. When users submit their hypothesis and email, the system automatically triggers Klaviyo email flows.

## Prerequisites
1. Active Klaviyo account
2. Klaviyo Private API key with write permissions
3. MindJourney experiment app running

## Step 1: Get Your Klaviyo API Key

1. Log into your Klaviyo account
2. Go to **Settings** → **API Keys**
3. Create a new Private API Key with the following permissions:
   - **Profiles**: Full Access
   - **Events**: Full Access
   - **Lists**: Read Access (optional)
4. Copy the Private API key (starts with `pk_` or `sk_`)

## Step 2: Configure Environment Variables

Add your Klaviyo API key to your environment:

```bash
KLAVIYO_API_KEY=your_klaviyo_private_api_key_here
```

## Step 3: Test the Integration

### Method 1: Using the API Test Endpoint
```bash
curl -X POST http://localhost:5000/api/test/klaviyo \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "hypothesis": "This is a test hypothesis for Klaviyo integration"
  }'
```

### Method 2: Check Integration Status
```bash
curl http://localhost:5000/api/settings/status
```

Should return:
```json
{
  "klaviyo": {
    "configured": true
  }
}
```

## Step 4: Set Up Klaviyo Email Flow

1. In Klaviyo, go to **Flows** → **Create Flow**
2. Choose **Triggered Flow**
3. Set the trigger to **API/Custom Event**
4. Enter the event name: `Share Your Hypothesis`
5. Design your email sequence

### Available Event Properties
When setting up your flow, you can use these properties:

- `hypothesis` - The user's hypothesis text
- `experiment_id` - Unique experiment identifier
- `session_id` - User session identifier
- `completion_date` - When the hypothesis was submitted
- `source` - Always "mindjourney_experiment"
- `user_agent` - Browser/device information

### Email Personalization Examples
```
Hello {{ person.first_name|default:"there" }}!

Thank you for sharing your hypothesis: "{{ event.hypothesis }}"

Your experiment session: {{ event.session_id }}
Completed on: {{ event.completion_date|date:"F j, Y" }}
```

## Step 5: Verify Data Flow

1. Complete an experiment session in the MindJourney app
2. Submit your email when prompted
3. Submit your hypothesis
4. Check the server logs for success message:
   ```
   ✅ Klaviyo hypothesis event sent successfully
   ```
5. Verify the event appears in your Klaviyo dashboard under **Analytics** → **Events**

## Troubleshooting

### Common Issues

**1. "Klaviyo not configured" error**
- Verify `KLAVIYO_API_KEY` is set correctly
- Restart the application after setting environment variables

**2. "Invalid Klaviyo API key format" error**
- Ensure the API key starts with `pk_` or `sk_`
- Check for extra spaces or characters

**3. "Klaviyo event tracking failed" error**
- Verify your API key has the correct permissions
- Check Klaviyo account status and limits
- Review server logs for detailed error messages

**4. Events not triggering flows**
- Ensure flow trigger matches exactly: "Share Your Hypothesis"
- Check flow is published and active
- Verify email address format is valid

### Debug Logs
Monitor the server console for these messages:

- `✅ Klaviyo service initialized with API key` - Integration ready
- `✅ Klaviyo hypothesis event sent successfully` - Event sent
- `❌ Klaviyo integration failed (response still saved)` - Error occurred
- `Skipping Klaviyo - missing email or hypothesis too short` - Data validation failed

## Error Handling

The integration is designed to be non-blocking:

- If Klaviyo fails, user responses are still saved to Firebase
- Failed requests are retried automatically with exponential backoff
- All errors are logged without affecting the user experience
- Users never see Klaviyo-related errors

## Security Notes

- Never expose your Klaviyo API key in client-side code
- Store API keys as environment variables only
- Monitor API key usage in Klaviyo dashboard
- Rotate API keys regularly for security

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Test the integration using the provided API endpoints
4. Verify your Klaviyo account and API key permissions

The integration supports Klaviyo's REST API v2024-10-15 specification.