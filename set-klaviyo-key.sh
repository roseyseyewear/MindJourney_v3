#!/bin/bash
# Replace YOUR_KLAVIYO_API_KEY with your actual API key
curl -X POST http://localhost:5000/api/settings/klaviyo \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "YOUR_KLAVIYO_API_KEY"}'