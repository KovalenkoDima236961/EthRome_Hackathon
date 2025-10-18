#!/bin/bash

echo "Checking IPFS CORS configuration..."

# Check if IPFS is running
if ! curl -s http://127.0.0.1:5001/api/v0/version > /dev/null; then
    echo "❌ IPFS daemon is not running. Start it with: ipfs daemon"
    exit 1
fi

echo "✅ IPFS daemon is running"

# Test CORS headers
echo "Testing CORS headers..."
response=$(curl -s -X POST -H "Origin: http://localhost:5173" -I http://127.0.0.1:5001/api/v0/version)

if echo "$response" | grep -q "Access-Control-Allow-Origin: http://localhost:5173"; then
    echo "✅ CORS is properly configured for localhost:5173"
else
    echo "❌ CORS is not properly configured"
    echo "Run these commands to fix:"
    echo "  ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '[\"http://localhost:5173\", \"http://127.0.0.1:5173\"]'"
    echo "  ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '[\"PUT\", \"POST\", \"GET\"]'"
    echo "  pkill -f ipfs && ipfs daemon"
fi
