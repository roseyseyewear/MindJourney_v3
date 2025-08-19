#!/bin/bash

echo "Testing Klaviyo integration..."

# Test the integration status
echo "1. Checking integration status:"
curl -s http://localhost:5000/api/settings/status | grep klaviyo

echo -e "\n\n2. Testing event submission:"
# Test sending a hypothesis event
curl -X POST http://localhost:5000/api/test/klaviyo \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "hypothesis": "This is a test hypothesis to verify Klaviyo integration is working correctly."
  }'

echo -e "\n\nTest completed!"