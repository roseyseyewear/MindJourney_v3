# Klaviyo List-Based Email Automation Setup

## Overview
This integration automatically adds users to a Klaviyo email list when they submit their hypothesis in the MindJourney experiment. This approach is much simpler than custom events and works reliably with Klaviyo's flow system.

## How It Works
1. When a user submits their hypothesis (text response), the system:
   - Creates/updates their profile in Klaviyo with custom properties
   - Adds them to your "Email List" 
   - Stores their hypothesis data as profile properties for personalization

## Setup Steps

### Step 1: Verify Your API Key is Working
✅ Already done - your API key is configured and working

### Step 2: Create Your Email Flow in Klaviyo
1. Go to **Flows** in your Klaviyo dashboard
2. Click **Create Flow**
3. Choose **List-Triggered Flow**
4. Select your **"shared-hypothesis"** list as the trigger
5. Configure your email sequence

### Step 3: Personalize Your Emails
You can use these custom properties in your email templates:
- `{{ person.hypothesis }}` - The user's submitted hypothesis
- `{{ person.experiment_id }}` - Which experiment they completed  
- `{{ person.completion_date }}` - When they finished
- `{{ person.source }}` - Will always be "mindjourney_experiment"

### Step 4: Test the Integration
1. Complete the MindJourney experiment
2. Submit your email and hypothesis
3. Check your Klaviyo "shared-hypothesis" list to see the new subscriber
4. Verify the flow triggers correctly

## Current Configuration
- **Target List**: "shared-hypothesis" (ID: UHHRxV)
- **Opt-in Process**: Double opt-in (users need to confirm via email)
- **Trigger**: When someone is added to the list
- **Data Stored**: Email, hypothesis, experiment details, completion date

## Testing
Use this endpoint to test without going through the full experiment:
```bash
curl -X POST "http://localhost:5000/api/test/klaviyo" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "hypothesis": "My test hypothesis"
  }'
```

## Changing the Target List
If you want to use a different list, you have these options:
- **"SMS List"** (ID: TknukZ) - double opt-in
- **"Secret Group Waitlist"** (ID: UrZbRt) - double opt-in  
- **"Preview List"** (ID: XZZPUr) - double opt-in

To change the list:
```bash
curl -X POST "http://localhost:5000/api/settings/klaviyo-list" \
  -H "Content-Type: application/json" \
  -d '{"listId": "TknukZ"}'
```

## Advantages of List-Based Approach
- ✅ Simple setup in Klaviyo (just select a list as trigger)
- ✅ Reliable delivery and flow triggering
- ✅ Easy to see subscribers in Klaviyo dashboard
- ✅ All user data available for email personalization
- ✅ Works with Klaviyo's standard flow system
- ✅ No custom metric creation needed

## Next Steps
1. Create your email flow in Klaviyo using "Email List" as the trigger
2. Design your email sequence with personalized content
3. Test with a real submission through the experiment
4. Monitor deliverability and engagement in Klaviyo analytics