# Distributing and Running Milles Bornes

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
6. The server will run on port 3000 by default. Make sure this port is accessible from your network.
7. Note the IP address of your Raspberry Pi (use `hostname -I` to find it)

## Client Setup (Windows)

1. Install Node.js on your Windows machine if not already installed (download from https://nodejs.org/)
2. Copy the entire `client` directory to your Windows machine
3. Navigate to the client directory and install dependencies:
   ```bash
   cd client
   npm install
   ```
4. Double-click the `start-milles-bornes.bat` file to start the game
5. When the game starts, enter:
   - Your player name
   - Game ID (leave blank to create a new game, or enter an ID to join an existing game)
   - Server URL (e.g., `http://raspberry-pi-ip:3000` where raspberry-pi-ip is the IP address of your Raspberry Pi)

## Playing with a Friend

1. Start the server on your Raspberry Pi
2. Start the client on your Windows machine
3. Create a new game by leaving the Game ID field blank
4. Note the Game ID that appears on the waiting screen
5. Have your friend start their client and enter the same Game ID to join your game
6. Make sure both clients are connecting to the same server URL

## Troubleshooting

- If you can't connect to the server, check that:
  - The server is running on the Raspberry Pi
  - You're using the correct IP address for the Raspberry Pi
  - Port 3000 is not blocked by a firewall
  - Both computers are on the same network

- If the game doesn't start, check the browser console for errors (press F12 in the Electron window)

- If you need to restart the server, press Ctrl+C in the terminal where it's running, then run `./start-server.sh` again
