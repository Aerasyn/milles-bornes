# Milles Bornes Card Game

A 2-player implementation of the classic French card game Milles Bornes. This project consists of:

1. A server component designed to run on a Raspberry Pi 4
2. A client component that can be packaged as a Windows executable

## Overview

Milles Bornes is a racing card game where players try to be the first to travel 1000 miles (milles bornes). Players use distance cards to advance, but can be stopped by hazards like flat tires or accidents. Players need safety cards to protect against hazards and remedy cards to fix problems.

## Project Structure

- `server/`: Node.js server for game logic and communication
- `client/`: Electron application for Windows clients

## Server (Raspberry Pi 4)

The server is built with:
- Node.js
- Express
- Socket.io

### Running the Server

1. Navigate to the server directory
2. Install dependencies: `npm install`
3. Start the server: `npm start`

The server will run on port 3000 by default.

## Client (Windows)

The client is built with:
- Electron
- HTML/CSS/JavaScript
- Socket.io client

### Running the Client

1. Navigate to the client directory
2. Install dependencies: `npm install`
3. Start the client: `npm start`

### Building the Executable

To build the Windows executable:

```bash
cd client
npm run build
```

This will create a portable executable in the `dist` directory.

## Game Rules

### Card Types

- **Distance Cards**: Used to advance your car (25, 50, 75, 100, and 200 miles)
- **Hazard Cards**: Used to stop your opponent (Accident, Out of Gas, Flat Tire, Speed Limit, Stop)
- **Remedy Cards**: Used to fix hazards (Repairs, Gasoline, Spare Tire, End of Speed Limit, Go)
- **Safety Cards**: Protect against specific hazards (Driving Ace, Fuel Tank, Puncture-Proof, Right of Way)
- **Attack Cards**: Special cards to hinder your opponent (Red Light)

### Gameplay

1. Each player starts with 6 cards
2. On your turn, you can either play a card or draw a card
3. To win, be the first player to travel 1000 miles

### Playing Cards

- Distance cards can only be played on yourself
- Hazard cards can only be played on your opponent
- Remedy cards can only be played on yourself
- Safety cards can only be played on yourself
- You can't play a distance card if you have a hazard
- You can't play a 200-mile card if you have a speed limit
