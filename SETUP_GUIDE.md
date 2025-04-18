# Milles Bornes Setup Guide

## Server Setup (Raspberry Pi 4)

1. Copy the entire `server` directory to your Raspberry Pi 4
2. Install Node.js on your Raspberry Pi if not already installed:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. Navigate to the server directory and install dependencies:
   ```bash
   cd server
   npm install
   ```
4. Make the start script executable:
   ```bash
   chmod +x start-server.sh
   ```
5. Start the server:
   ```bash
   ./start-server.sh
   ```
   Or simply run:
   ```bash
   npm start
   ```
6. The server will run on port 3000 by default.
7. For local network play, note the local IP address of your Raspberry Pi (use `hostname -I` to find it)
8. For external network play (friends connecting from outside your network):
   - Make sure port 3000 is forwarded on your router to your Raspberry Pi
   - Use your public IP address (76.127.102.184) for external connections
   - You may want to set up a dynamic DNS service if your public IP changes frequently

## Client Setup (Windows)

### Option 1: Using the Executable (Recommended)

1. Copy the `dist\Milles Bornes 1.0.0.exe` file to your Windows machine
2. Double-click the executable to start the game
3. When the game starts, enter:
   - Your player name
   - Game ID (leave blank to create a new game, or enter an ID to join an existing game)
   - Server URL:
     - For local play: `http://raspberry-pi-local-ip:3000` (where raspberry-pi-local-ip is the local IP address of your Raspberry Pi)
     - For external play: `http://76.127.102.184:3000` (your public IP address)

### Option 2: Running from Source

1. Install Node.js on your Windows machine if not already installed (download from https://nodejs.org/)
2. Copy the entire `client` directory to your Windows machine
3. Navigate to the client directory and install dependencies:
   ```bash
   cd client
   npm install
   ```
4. Start the game:
   ```bash
   npm start
   ```

## Playing with a Friend

1. Start the server on your Raspberry Pi
2. Start the client on your Windows machine
3. Create a new game by leaving the Game ID field blank
4. Note the Game ID that appears on the waiting screen
5. Have your friend start their client and enter the same Game ID to join your game
6. Make sure both clients are connecting to the same server URL

## Game Rules

Milles Bornes is a French card racing game where players try to be the first to travel 1000 miles (milles bornes).

### Card Types

- **Distance Cards**: Used to advance your car (25, 50, 75, 100, and 200 miles)
- **Hazard Cards**: Used to stop your opponent (Accident, Out of Gas, Flat Tire, Speed Limit, Stop)
- **Remedy Cards**: Used to fix hazards (Repairs, Gasoline, Spare Tire, End of Speed Limit, Go)
- **Safety Cards**: Protect against specific hazards (Driving Ace, Fuel Tank, Puncture-Proof, Right of Way)
- **Attack Cards**: Special cards to hinder your opponent (Red Light)

### Basic Rules

1. Each player starts with 6 cards
2. On your turn, you can either play a card or draw a card
3. To win, be the first player to travel 1000 miles
4. You can't play distance cards if you have a hazard
5. You can't play a 200-mile card if you have a speed limit
6. Hazards and attacks can only be played on your opponent
7. Remedies and safeties can only be played on yourself

## Troubleshooting

- If you can't connect to the server, check that:

  - The server is running on the Raspberry Pi
  - You're using the correct IP address:
    - Local network: Use the Raspberry Pi's local IP address
    - External network: Use your public IP address (76.127.102.184)
  - Port 3000 is properly forwarded on your router to your Raspberry Pi
  - Your ISP is not blocking incoming connections on port 3000

- If the game doesn't start, check the browser console for errors (press F12 in the Electron window)

- If you need to restart the server, press Ctrl+C in the terminal where it's running, then run `npm start` again
