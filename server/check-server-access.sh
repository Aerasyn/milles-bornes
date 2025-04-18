#!/bin/bash
echo "Checking if Milles Bornes server is accessible..."
echo "Local server status:"
curl -s http://localhost:3000/api/status || echo "Failed to connect to local server"

echo -e "\nChecking public IP accessibility..."
echo "Your public IP is: $(curl -s https://api.ipify.org)"
echo "Ask a friend to try accessing: http://$(curl -s https://api.ipify.org):3000/api/status"
echo "Or test yourself using a mobile data connection (not WiFi)"
