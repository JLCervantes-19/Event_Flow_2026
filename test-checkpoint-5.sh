#!/bin/bash

echo "🧪 Checkpoint 5: Testing Error Handling and Health Check"
echo "=========================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
if ! curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${RED}❌ Server is not running on http://localhost:3000${NC}"
    echo "Please start the server with: npm run dev"
    exit 1
fi

echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check Endpoint"
echo "------------------------------"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
echo "Response: $HEALTH_RESPONSE"

# Check if response contains expected fields
if echo "$HEALTH_RESPONSE" | grep -q '"ok":true' && \
   echo "$HEALTH_RESPONSE" | grep -q '"status":"running"' && \
   echo "$HEALTH_RESPONSE" | grep -q '"environment"' && \
   echo "$HEALTH_RESPONSE" | grep -q '"database"' && \
   echo "$HEALTH_RESPONSE" | grep -q '"timestamp"'; then
    echo -e "${GREEN}✅ Health check returns all required fields${NC}"
else
    echo -e "${RED}❌ Health check missing required fields${NC}"
fi
echo ""

# Test 2: Database Status
echo "Test 2: Database Status"
echo "-----------------------"
DB_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
echo "Database status: $DB_STATUS"

if [ "$DB_STATUS" = "connected" ]; then
    echo -e "${GREEN}✅ Database is connected${NC}"
elif [ "$DB_STATUS" = "disconnected" ]; then
    echo -e "${YELLOW}⚠️  Database is disconnected${NC}"
else
    echo -e "${RED}❌ Invalid database status${NC}"
fi
echo ""

# Test 3: Environment
echo "Test 3: Environment Detection"
echo "------------------------------"
ENV=$(echo "$HEALTH_RESPONSE" | grep -o '"environment":"[^"]*"' | cut -d'"' -f4)
echo "Environment: $ENV"

if [ -n "$ENV" ]; then
    echo -e "${GREEN}✅ Environment is set${NC}"
else
    echo -e "${RED}❌ Environment not detected${NC}"
fi
echo ""

# Test 4: Timestamp Format
echo "Test 4: Timestamp Format"
echo "------------------------"
TIMESTAMP=$(echo "$HEALTH_RESPONSE" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4)
echo "Timestamp: $TIMESTAMP"

if echo "$TIMESTAMP" | grep -qE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}'; then
    echo -e "${GREEN}✅ Timestamp is in ISO format${NC}"
else
    echo -e "${RED}❌ Invalid timestamp format${NC}"
fi
echo ""

# Test 5: Error Handling (Invalid ID)
echo "Test 5: Error Handling"
echo "----------------------"
ERROR_RESPONSE=$(curl -s http://localhost:3000/api/events/invalid-id-format)
echo "Response: $ERROR_RESPONSE"

if echo "$ERROR_RESPONSE" | grep -q '"ok":false'; then
    echo -e "${GREEN}✅ Error handler returns ok:false${NC}"
else
    echo -e "${RED}❌ Error handler not working correctly${NC}"
fi

if echo "$ERROR_RESPONSE" | grep -q '"message"'; then
    echo -e "${GREEN}✅ Error handler includes message${NC}"
else
    echo -e "${RED}❌ Error handler missing message${NC}"
fi
echo ""

# Test 6: API Endpoints
echo "Test 6: API Endpoints"
echo "---------------------"
EVENTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/events)
echo "GET /api/events: HTTP $EVENTS_STATUS"

if [ "$EVENTS_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Events endpoint working${NC}"
else
    echo -e "${RED}❌ Events endpoint failed${NC}"
fi
echo ""

echo "=========================================================="
echo "🎉 Checkpoint 5 testing complete!"
echo "=========================================================="
