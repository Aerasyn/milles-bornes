const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { setupSocketHandlers } = require('./socket');
const { Game } = require('./game/game');

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create Socket.io server
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store active games
const games = new Map();

// Setup socket handlers
setupSocketHandlers(io, games);

// API routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'Server is running', activeGames: games.size });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT}/api/status to check server status`);
});
