# Milles Bornes Game Server

This is the server component for the Milles Bornes card game. It's designed to run on a Raspberry Pi 4.

## Requirements

- Node.js 14+ (tested on Raspberry Pi 4)
- npm

## Installation

1. Clone the repository
2. Navigate to the server directory
3. Install dependencies:

```bash
npm install
```

## Running the Server

To start the server in production mode:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

The server will run on port 3000 by default. You can change this by setting the `PORT` environment variable.

## API Endpoints

- `GET /api/status` - Check server status and number of active games

## WebSocket Events

### Client to Server

- `joinGame(gameId, playerName)` - Join or create a game
- `playCard({ gameId, playerId, cardIndex, targetPlayerId })` - Play a card
- `drawCard({ gameId, playerId })` - Draw a card

### Server to Client

- `joinedGame({ gameId, playerId, game })` - Successfully joined a game
- `waitingForOpponent` - Waiting for another player to join
- `playerJoined({ playerName, playerId })` - Another player joined the game
- `gameStarted(gameState)` - Game has started
- `gameUpdated(gameState)` - Game state has been updated
- `gameOver({ winner, finalState })` - Game is over
- `playerDisconnected({ playerName })` - A player disconnected
- `gameError(errorMessage)` - Error message
