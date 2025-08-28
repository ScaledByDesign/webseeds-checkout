#!/bin/bash

# Test the checkout/process API endpoint with a valid sample payload
# This script tests the API with all required fields properly filled

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing /api/checkout/process endpoint...${NC}"
echo "----------------------------------------"

# Sample valid payload matching the schema requirements
PAYLOAD='{
  "customerInfo": {
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "512 917 9292",
    "address": "123 Test Street",
    "city": "Austin",
    "state": "TX",
    "zipCode": "78758",
    "country": "US"
  },
  "paymentToken": "test-token-123456789",
  "products": [
    {
      "id": "fitspresso-6-pack",
      "name": "Fitspresso 6 Bottle Super Pack",
      "price": 294,
      "quantity": 1
    }
  ],
  "billingInfo": {
    "address": "123 Test Street",
    "city": "Austin",
    "state": "TX",
    "zipCode": "78758",
    "country": "US"
  },
  "couponCode": "",
  "metadata": {
    "source": "checkout-page",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
  }
}'

echo -e "${GREEN}Sending POST request to http://localhost:3255/api/checkout/process${NC}"
echo ""
echo "Request payload:"
echo "$PAYLOAD" | jq '.'
echo ""
echo "Response:"
echo "----------------------------------------"

# Send the request and capture the response
RESPONSE=$(curl -X POST http://localhost:3255/api/checkout/process \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s)

# Pretty print the response if jq is available
if command -v jq &> /dev/null; then
    echo "$RESPONSE" | sed '$d' | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo "$RESPONSE"
fi

echo ""
echo "----------------------------------------"

# Extract HTTP status code
HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1 | sed 's/HTTP Status: //')

if [[ "$HTTP_STATUS" == "200" ]]; then
    echo -e "${GREEN}✓ Request successful (HTTP 200)${NC}"
elif [[ "$HTTP_STATUS" == "400" ]]; then
    echo -e "${RED}✗ Bad Request (HTTP 400) - Check validation errors above${NC}"
elif [[ "$HTTP_STATUS" == "500" ]]; then
    echo -e "${RED}✗ Internal Server Error (HTTP 500) - Check server logs${NC}"
else
    echo -e "${YELLOW}⚠ Unexpected status code: $HTTP_STATUS${NC}"
fi

echo ""
echo "To test with different data, edit this script and modify the PAYLOAD variable."
echo ""
echo "Required fields:"
echo "  - customerInfo: email, firstName, lastName, address, city, state, zipCode"
echo "  - paymentToken: Any non-empty string (use real token from CollectJS in production)"
echo "  - products: Array with at least one product (id, name, price, quantity)"
echo ""
echo "Optional fields:"
echo "  - phone: Customer phone number"
echo "  - billingInfo: Separate billing address (if different from shipping)"
echo "  - couponCode: Discount code"
echo "  - metadata: Additional data"