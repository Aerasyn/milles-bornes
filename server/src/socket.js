const { Game } = require('./game/game');
const { Lobby } = require('./lobby');

// Helper function to broadcast games list to all clients in a room
function broadcastGamesList(io, games, room) {
  const gamesList = Array.from(games.entries()).map(([id, game]) => ({
    id,
    players: game.players.map(p => p.name),
    playerCount: game.players.length,
    inProgress: game.started
  }));

  io.to(room).emit('gamesList', gamesList);
}

function setupSocketHandlers(io, games) {
  // Create a lobby instance
  const lobby = new Lobby();

  // Create a room for the lobby
  const LOBBY_ROOM = 'lobby';
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Handle user login to lobby
    socket.on('loginUser', async (username) => {
      console.log(`User login attempt: ${username}`);

      // Add user to lobby
      const result = lobby.addUser(socket.id, username);

      if (result.success) {
        // Defensive: Remove from all rooms before joining lobby
        const rooms = Array.from(socket.rooms);
        for (const room of rooms) {
          if (room !== socket.id) {
            await socket.leave(room);
            console.log(`[SERVER] Socket ${socket.id} left room: ${room}`);
          }
        }
        // Join the lobby room
        await socket.join(LOBBY_ROOM);
        console.log(`[SERVER] Socket ${socket.id} joined room: ${LOBBY_ROOM}`);

        // Send success response with user info and chat history
        socket.emit('loginSuccess', {
          user: result.user,
          users: lobby.getAllUsers(),
          chatMessages: lobby.getChatMessages()
        });

        // Notify other users about the new user
        socket.to(LOBBY_ROOM).emit('userJoined', result.user);

        // Do not broadcast the latest system message here; it is included in chat history for all clients.

        // Broadcast full user list to all clients
        io.to(LOBBY_ROOM).emit('usersList', lobby.getAllUsers());
      } else {
        // Send error response
        socket.emit('loginError', result.error);
      }
    });

    // Handle chat messages
    socket.on('sendChatMessage', async (message) => {
      console.log(`[SERVER] Received sendChatMessage from ${socket.id}:`, message);
      // Defensive: Ensure socket is in the lobby room
      const rooms = Array.from(socket.rooms);
      if (!rooms.includes(LOBBY_ROOM)) {
        await socket.join(LOBBY_ROOM);
        console.log(`[SERVER] Socket ${socket.id} re-joined lobby for chat.`);
      }
      const chatMessage = lobby.addChatMessage(socket.id, message);
      if (chatMessage) {
        // Prevent duplicate emission: Only emit if not identical to last message in lobby
        const allMessages = lobby.getChatMessages();
        const lastMsg = allMessages[allMessages.length - 2]; // -1 is the just-added one
        if (!lastMsg || lastMsg.message !== chatMessage.message || lastMsg.username !== chatMessage.username || lastMsg.timestamp !== chatMessage.timestamp) {
          io.to(LOBBY_ROOM).emit('chatMessage', chatMessage);
          console.log('[SERVER] Emitting chatMessage to lobby:', chatMessage);
        } else {
          console.log('[SERVER] Skipped duplicate chatMessage emission:', chatMessage);
        }
      }
    });

    // Handle user requesting to create a game from lobby
    socket.on('createGame', (gameId) => {
      const user = lobby.getUserBySocketId(socket.id);
      if (!user) {
        socket.emit('gameError', 'You must be logged in to create a game');
        return;
      }

      // Update user status
      lobby.updateUserStatus(socket.id, 'in-game');

      // Notify lobby about status change
      io.to(LOBBY_ROOM).emit('userStatusChanged', {
        userId: socket.id,
        status: 'in-game'
      });

      // Leave lobby room
      socket.leave(LOBBY_ROOM);

      // Create game and join it
      const game = new Game(gameId);
      games.set(gameId, game);

      // Add player to game
      const playerId = game.addPlayer(user.username, socket.id);
      socket.join(gameId);

      // Send game state to the player
      socket.emit('joinedGame', { gameId, playerId, game: game.getState() });

      // Add system message to lobby
      const systemMessage = lobby.addSystemMessage(`${user.username} created game ${gameId}`);
      io.to(LOBBY_ROOM).emit('chatMessage', systemMessage);

      // Broadcast updated games list to all clients in the lobby
      broadcastGamesList(io, games, LOBBY_ROOM);
    });

    // Handle user requesting to join a game from lobby
    socket.on('joinGameFromLobby', (gameId) => {
      const user = lobby.getUserBySocketId(socket.id);
      if (!user) {
        socket.emit('gameError', 'You must be logged in to join a game');
        return;
      }

      // Check if game exists
      if (!games.has(gameId)) {
        socket.emit('gameError', 'Game does not exist');
        return;
      }

      const game = games.get(gameId);

      // Check if game is full
      if (game.players.length >= 2) {
        socket.emit('gameError', 'Game is full');
        return;
      }

      // Update user status
      lobby.updateUserStatus(socket.id, 'in-game');

      // Notify lobby about status change
      io.to(LOBBY_ROOM).emit('userStatusChanged', {
        userId: socket.id,
        status: 'in-game'
      });

      // Leave lobby room
      socket.leave(LOBBY_ROOM);

      // Add player to game
      const playerId = game.addPlayer(user.username, socket.id);
      socket.join(gameId);

      // Send game state to the player
      socket.emit('joinedGame', { gameId, playerId, game: game.getState() });

      // Send player's hand immediately
      try {
        const hand = game.getPlayerHand(playerId);
        console.log(`Sending initial hand to player ${playerId}: ${hand.length} cards`);
        socket.emit('handUpdated', hand);
      } catch (error) {
        console.error(`Error sending initial hand:`, error);
      }

      // Notify other players
      socket.to(gameId).emit('playerJoined', { playerName: user.username, playerId });

      // Add system message to lobby
      const systemMessage = lobby.addSystemMessage(`${user.username} joined game ${gameId}`);
      io.to(LOBBY_ROOM).emit('chatMessage', systemMessage);

      // If game is now full, start it
      if (game.players.length === 2) {
        game.start();
        io.to(gameId).emit('gameStarted', game.getState());
      }

      // Broadcast updated games list to all clients in the lobby
      broadcastGamesList(io, games, LOBBY_ROOM);
    });

    // Handle user requesting list of games
    socket.on('getGames', () => {
      const gamesList = Array.from(games.entries()).map(([id, game]) => ({
        id,
        players: game.players.map(p => p.name),
        playerCount: game.players.length,
        inProgress: game.started
      }));

      socket.emit('gamesList', gamesList);
    });

    // Handle player joining a game (legacy method, still supported)
    socket.on('joinGame', (gameId, playerName) => {
      console.log(`Legacy join game attempt: ${playerName} joining ${gameId}`);
      let game;

      // Check if this socket is already in the lobby
      const existingUser = lobby.getUserBySocketId(socket.id);
      if (existingUser) {
        // Update user status in lobby
        lobby.updateUserStatus(socket.id, 'in-game');

        // Notify lobby about status change
        io.to(LOBBY_ROOM).emit('userStatusChanged', {
          userId: socket.id,
          status: 'in-game'
        });

        // Leave lobby room
        socket.leave(LOBBY_ROOM);

        // Add system message to lobby
        const systemMessage = lobby.addSystemMessage(`${existingUser.username} joined game ${gameId}`);
        io.to(LOBBY_ROOM).emit('chatMessage', systemMessage);
      } else {
        // Add user to lobby with in-game status
        const result = lobby.addUser(socket.id, playerName);
        if (result.success) {
          lobby.updateUserStatus(socket.id, 'in-game');
        }
      }

      // If game exists, join it
      if (games.has(gameId)) {
        game = games.get(gameId);

        // Check if game is full
        if (game.players.length >= 2) {
          socket.emit('gameError', 'Game is full');
          return;
        }

        // Add player to game
        const playerId = game.addPlayer(playerName, socket.id);
        socket.join(gameId);

        // Send game state to the player
        socket.emit('joinedGame', { gameId, playerId, game: game.getState() });

        // Send player's hand immediately
        try {
          const hand = game.getPlayerHand(playerId);
          console.log(`Sending initial hand to player ${playerId}: ${hand.length} cards`);
          socket.emit('handUpdated', hand);
        } catch (error) {
          console.error(`Error sending initial hand:`, error);
        }

        // Notify other players
        socket.to(gameId).emit('playerJoined', { playerName, playerId });

        // If game is now full, start it
        if (game.players.length === 2) {
          game.start();
          io.to(gameId).emit('gameStarted', game.getState());
        }

        // Broadcast updated games list to all clients in the lobby
        broadcastGamesList(io, games, LOBBY_ROOM);
      } else {
        // Create new game
        console.log(`Creating new game: ${gameId}`);
        game = new Game(gameId);
        games.set(gameId, game);

        // Add player to game
        const playerId = game.addPlayer(playerName, socket.id);
        socket.join(gameId);

        // Send game state to the player
        socket.emit('joinedGame', { gameId, playerId, game: game.getState() });

        // Send player's hand immediately
        try {
          const hand = game.getPlayerHand(playerId);
          console.log(`Sending initial hand to player ${playerId}: ${hand.length} cards`);
          socket.emit('handUpdated', hand);
        } catch (error) {
          console.error(`Error sending initial hand:`, error);
        }

        // Add system message to lobby about game creation
        const username = existingUser ? existingUser.username : playerName;
        const systemMessage = lobby.addSystemMessage(`${username} created game ${gameId}`);
        io.to(LOBBY_ROOM).emit('chatMessage', systemMessage);

        // Notify player they're waiting for an opponent
        socket.emit('waitingForOpponent');

        // Broadcast updated games list to all clients in the lobby
        broadcastGamesList(io, games, LOBBY_ROOM);
      }
    });

    // Handle player making a move
    socket.on('playCard', ({ gameId, playerId, cardIndex, targetPlayerId }) => {
      if (!games.has(gameId)) {
        socket.emit('gameError', 'Game not found');
        return;
      }

      const game = games.get(gameId);
      try {
        // Play the card
        const result = game.playCard(playerId, cardIndex, targetPlayerId);

        // Update all players with new game state
        io.to(gameId).emit('gameUpdated', game.getState());

        // Send the updated hand to the player who played
        const player = game.players.find(p => p.id === playerId);
        if (player) {
          const hand = game.getPlayerHand(playerId);
          console.log(`Sending updated hand after play to player ${playerId}: ${hand.length} cards`);
          io.to(player.socketId).emit('handUpdated', hand);
        }

        // Check for Coup Fourré opportunity
        if (game.pendingCoupFourre) {
          const pendingPlayer = game.players.find(p => p.id === game.pendingCoupFourre.playerId);
          if (pendingPlayer) {
            // Notify the player who can perform Coup Fourré
            io.to(pendingPlayer.socketId).emit('coupFourreOpportunity', {
              hazard: game.pendingCoupFourre.hazard,
              cardIndex: game.pendingCoupFourre.cardIndex
            });
          }
        }

        // Check if game is over
        if (game.isGameOver()) {
          io.to(gameId).emit('gameOver', {
            winner: game.getWinner(),
            finalState: game.getState()
          });

          // Remove game after a delay
          setTimeout(() => {
            games.delete(gameId);
            // Broadcast updated games list to all clients in the lobby
            broadcastGamesList(io, games, LOBBY_ROOM);
          }, 60000); // Keep game data for 1 minute
        }
      } catch (error) {
        socket.emit('gameError', error.message);
      }
    });

    // Handle player drawing a card
    socket.on('drawCard', ({ gameId, playerId }) => {
      if (!games.has(gameId)) {
        socket.emit('gameError', 'Game not found');
        return;
      }

      const game = games.get(gameId);
      try {
        // Draw the card
        const result = game.drawCard(playerId);

        // Update all players with new game state
        io.to(gameId).emit('gameUpdated', game.getState());

        // Send the updated hand to the player who drew
        const player = game.players.find(p => p.id === playerId);
        if (player) {
          const hand = game.getPlayerHand(playerId);
          console.log(`Sending updated hand after draw to player ${playerId}: ${hand.length} cards`);
          io.to(player.socketId).emit('handUpdated', hand);

          // If player needs to discard, send a special message
          if (result.needsDiscard) {
            console.log(`Player ${playerId} needs to discard a card`);
            io.to(player.socketId).emit('needsDiscard');
          }
        }
      } catch (error) {
        socket.emit('gameError', error.message);
      }
    });

    // Handle player discarding a card
    socket.on('discardCard', ({ gameId, playerId, cardIndex }) => {
      if (!games.has(gameId)) {
        socket.emit('gameError', 'Game not found');
        return;
      }

      const game = games.get(gameId);
      try {
        // Discard the card and get the new card that was drawn
        const result = game.discardCard(playerId, cardIndex);

        // Update all players with new game state
        io.to(gameId).emit('gameUpdated', game.getState());

        // Send the updated hand to the player who discarded
        const player = game.players.find(p => p.id === playerId);
        if (player) {
          const hand = game.getPlayerHand(playerId);
          console.log(`Sending updated hand after discard to player ${playerId}: ${hand.length} cards`);
          io.to(player.socketId).emit('handUpdated', hand);

          // Send a message to the player about the card exchange
          io.to(player.socketId).emit('cardExchanged', {
            discarded: result.discardedCard,
            drawn: result.newCard
          });
        }
      } catch (error) {
        socket.emit('gameError', error.message);
      }
    });

    // Handle player requesting their hand - supports multiple formats
    socket.on('getHand', function(data) {
      console.log('getHand request received:', data);

      // Handle both object format and individual parameters
      let gameId, playerId;

      if (typeof data === 'object' && data !== null) {
        // Format: {gameId, playerId}
        gameId = data.gameId;
        playerId = data.playerId;
      } else if (arguments.length >= 2) {
        // Format: gameId, playerId as separate arguments
        gameId = data;
        playerId = arguments[1];
      }

      console.log(`Processing getHand for gameId: ${gameId}, playerId: ${playerId}`);

      if (!gameId || !playerId) {
        console.error('Invalid getHand parameters');
        socket.emit('gameError', 'Invalid getHand parameters');
        return;
      }

      if (!games.has(gameId)) {
        console.log(`Game not found: ${gameId}`);
        socket.emit('gameError', 'Game not found');
        return;
      }

      const game = games.get(gameId);
      try {
        console.log(`Getting hand for player ${playerId} in game ${gameId}`);
        const hand = game.getPlayerHand(playerId);
        console.log(`Hand retrieved, sending ${hand.length} cards`);
        socket.emit('handUpdated', hand);
      } catch (error) {
        console.error(`Error getting hand:`, error.message);
        socket.emit('gameError', error.message);
      }
    });

    // Also send hand when game starts or updates
    socket.on('gameStarted', (gameState) => {
      // Find the player in this game
      const player = gameState.players.find(p => p.socketId === socket.id);
      if (player) {
        try {
          const game = games.get(gameState.id);
          const hand = game.getPlayerHand(player.id);
          socket.emit('handUpdated', hand);
        } catch (error) {
          console.error('Error sending hand on game start:', error);
        }
      }
    });

    // Handle explicit game end request
    socket.on('endGame', ({ gameId }) => {
      console.log(`Received endGame request for game: ${gameId}`);

      if (games.has(gameId)) {
        const game = games.get(gameId);

        // Find the player in this game
        const player = game.players.find(p => p.socketId === socket.id);

        if (player) {
          const playerName = player.name;

          // Notify all players in the game that it's ending
          io.to(gameId).emit('gameEnded', {
            gameId,
            reason: 'Game ended by player',
            playerName
          });

          // Add system message to lobby
          const systemMessage = lobby.addSystemMessage(`Game ${gameId} has ended`);
          io.to(LOBBY_ROOM).emit('chatMessage', systemMessage);

          // Remove the game immediately
          games.delete(gameId);

          // Broadcast updated games list to all clients in the lobby
          broadcastGamesList(io, games, LOBBY_ROOM);

          console.log(`Game ${gameId} removed after endGame request`);
        }
      }
    });

    // Handle leave game request
    socket.on('leaveGame', ({ gameId, playerId }) => {
      console.log(`Received leaveGame request for game: ${gameId}, player: ${playerId}`);

      if (games.has(gameId)) {
        const game = games.get(gameId);

        // Find the player in this game
        const player = game.players.find(p => p.id === playerId);

        if (player) {
          const playerName = player.name;

          // Notify other players in the game
          socket.to(gameId).emit('playerLeft', { playerName, playerId });

          // Add system message to lobby
          const systemMessage = lobby.addSystemMessage(`${playerName} left game ${gameId}`);
          io.to(LOBBY_ROOM).emit('chatMessage', systemMessage);

          // Remove the player from the game room
          socket.leave(gameId);

          // Update user status in lobby if they exist
          const user = lobby.getUserBySocketId(socket.id);
          if (user) {
            lobby.updateUserStatus(socket.id, 'online');
            io.to(LOBBY_ROOM).emit('userStatusChanged', {
              userId: socket.id,
              status: 'online'
            });
          }

          // Only remove the game if it hasn't started and no players are left
          if (!game.started && game.players.length === 0) {
            games.delete(gameId);
            // Broadcast updated games list to all clients in the lobby
            broadcastGamesList(io, games, LOBBY_ROOM);
            console.log(`Game ${gameId} removed after last player left before start`);
          }
          // If the game has started and only one player is left, mark the game as ended, but keep it for possible reconnection
          if (game.started && game.players.length === 1) {
            io.to(gameId).emit('gameEnded', {
              gameId,
              reason: 'Opponent left, game ended.'
            });
            // Optionally, mark winner or handle as needed
            // Do not delete the game immediately; allow for reconnection or review
            console.log(`Game ${gameId} has only one player left after someone left. Not deleting immediately.`);
          }
        }
      }
    });

    // Handle player disconnecting
    socket.on('disconnect', () => {
      console.log(`[DISCONNECT] Client disconnected: ${socket.id}`);

      // Check if user was in the lobby
      const user = lobby.getUserBySocketId(socket.id);
      if (user) {
        console.log(`[DISCONNECT] User was in lobby: ${user.username} (${socket.id})`);
        // Remove user from lobby
        lobby.removeUser(socket.id);

        // Notify other users in lobby
        io.to(LOBBY_ROOM).emit('userLeft', socket.id);

        // Do not broadcast the system message here; it is included in chat history for all clients.

        // Broadcast full user list to all clients
        io.to(LOBBY_ROOM).emit('usersList', lobby.getAllUsers());

        // Broadcast full user list to all clients
        io.to(LOBBY_ROOM).emit('usersList', lobby.getAllUsers());
      } else {
        console.log(`[DISCONNECT] User not found in lobby for socket: ${socket.id}`);
      }

      // Find and handle any games the player was in
      for (const [gameId, game] of games.entries()) {
        const playerIndex = game.players.findIndex(p => p.socketId === socket.id);

        if (playerIndex !== -1) {
          const playerName = game.players[playerIndex].name;
          console.log(`[DISCONNECT] Player ${playerName} (${socket.id}) was in game ${gameId}`);
          io.to(gameId).emit('playerDisconnected', { playerName });

          // Add system message to lobby if user was in a game
          if (user) {
            const systemMessage = lobby.addSystemMessage(`${user.username} left game ${gameId}`);
            io.to(LOBBY_ROOM).emit('chatMessage', systemMessage);
          }

          // NOTE: The following timeout is ONLY for deleting the game if all players have disconnected.
          // It does NOT disconnect players or force disconnects. If you are seeing instant disconnects,
          // the cause is elsewhere (client-side or socket.io/network issue).
          setTimeout(() => {
            if (game.players.length === 0) {
              games.delete(gameId);
              // Broadcast updated games list to all clients in the lobby
              broadcastGamesList(io, games, LOBBY_ROOM);
              console.log(`[DISCONNECT] Game ${gameId} removed after all players disconnected (60s timeout).`);
            } else {
              console.log(`[DISCONNECT] Game ${gameId} still has players after disconnect. Not deleting.`);
            }
          }, 60000); // Keep game data for 1 minute

          break;
        }
      }
    });
  });
}

module.exports = { setupSocketHandlers };
