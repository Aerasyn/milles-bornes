/**
 * Lobby functionality for Milles Bornes
 */

class LobbyClient {
  constructor(socket) {
    this.socket = socket;
    this.currentUser = null;
    this.users = [];
    this.games = [];
    this.chatMessages = [];
    this.autoRefreshInterval = null;
    this.AUTO_REFRESH_INTERVAL = 10000; // 10 seconds

    // DOM elements
    this.lobbyScreen = document.getElementById('lobby-screen');
    this.currentUserEl = document.getElementById('current-user');
    this.onlineUsersList = document.getElementById('online-users-list');
    this.gamesList = document.getElementById('games-list');
    this.chatMessagesEl = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.sendChatBtn = document.getElementById('send-chat-btn');
    this.clearChatBtn = document.getElementById('clear-chat-btn');
    this.createGameBtn = document.getElementById('create-game-btn');
    this.refreshGamesBtn = document.getElementById('refresh-games-btn');
    this.cleanGamesBtn = document.getElementById('clean-games-btn');
    this.newGameIdInput = document.getElementById('new-game-id');

    // Event handlers
    this.onLoginSuccess = null;
    this.onGameJoined = null;

    this.setupEventListeners();
  }

  // Initialize the lobby
  init(userData, allUsers, chatHistory) {
    this.currentUser = userData;
    this.users = allUsers;
    this.chatMessages = chatHistory;

    this.currentUserEl.textContent = this.currentUser.username;
    this.renderOnlineUsers();
    this.renderChatMessages();

    // Request list of games
    this.socket.emit('getGames');
  }

  // Setup event listeners for UI elements
  setupEventListeners() {
    // Send chat message
    if (this.sendChatBtn) {
      this.sendChatBtn.addEventListener('click', () => {
        this.sendChatMessage();
      });
    }

    // Send chat on Enter key
    if (this.chatInput) {
      this.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendChatMessage();
        }
      });
    }

    // Clear chat button
    if (this.clearChatBtn) {
      this.clearChatBtn.addEventListener('click', () => {
        this.clearChat();
      });
    }

    // Create new game
    if (this.createGameBtn) {
      this.createGameBtn.addEventListener('click', () => {
        if (!this.newGameIdInput) {
          console.error('Game ID input not found');
          if (window.gameUI && typeof window.gameUI.showErrorModal === 'function') {
            window.gameUI.showErrorModal('Error: Game ID input not found');
          }
          return;
        }

        const gameId = this.newGameIdInput.value.trim();
        if (!gameId) {
          if (window.gameUI && typeof window.gameUI.showErrorModal === 'function') {
            window.gameUI.showErrorModal('Please enter a game name', 'new-game-id');
          }
          return;
        }

        if (!this.socket) {
          console.error('Cannot create game: socket is null');
          if (window.gameUI && typeof window.gameUI.showErrorModal === 'function') {
            window.gameUI.showErrorModal('Connection error. Please refresh the page.');
          }
          return;
        }

        console.log('Creating game with ID:', gameId);
        this.socket.emit('createGame', gameId);
      });
    } else {
      console.error('Create game button not found');
    }

    // Refresh games list
    if (this.refreshGamesBtn) {
      this.refreshGamesBtn.addEventListener('click', () => {
        this.refreshGamesList();
      });
    } else {
      console.error('Refresh games button not found');
    }

    // Clean games button
    if (this.cleanGamesBtn) {
      this.cleanGamesBtn.addEventListener('click', () => {
        this.cleanAllGames();
      });
    } else {
      console.error('Clean games button not found');
    }
  }

  // Setup socket event listeners
  setupSocketListeners() {
  if (!this.socket) {
    console.error('Cannot set up socket listeners: socket is null');
    return;
  }

  // --- Robust socket error/disconnect logging for debugging ---
  this.socket.on('disconnect', (reason) => {
    console.error('[CLIENT] Disconnected from server. Reason:', reason);
    if (window.gameUI && typeof window.gameUI.showErrorModal === 'function') {
      window.gameUI.showErrorModal('Disconnected from server. Reason: ' + reason);
    }
  });
  this.socket.on('error', (err) => {
    console.error('[CLIENT] Socket error:', err);
    if (window.gameUI && typeof window.gameUI.showErrorModal === 'function') {
      window.gameUI.showErrorModal('Socket error: ' + err);
    }
  });
  this.socket.on('connect_error', (err) => {
    console.error('[CLIENT] Connect error:', err);
    if (window.gameUI && typeof window.gameUI.showErrorModal === 'function') {
      window.gameUI.showErrorModal('Connect error: ' + err);
    }
  });
  // --- End robust logging ---

    if (!this.socket) {
      console.error('Cannot set up socket listeners: socket is null');
      return;
    }

    console.log('Setting up lobby socket listeners');

    // User joined lobby
    this.socket.on('userJoined', (user) => {
      if (!this.users.some(u => u.id === user.id)) {
        this.users.push(user);
        console.log('[Lobby] User joined:', user);
      } else {
        console.log('[Lobby] User already in list:', user);
      }
      this.renderOnlineUsers();
    });

    // Listen for full user list updates
    this.socket.on('usersList', (users) => {
      this.users = users;
      this.renderOnlineUsers();
    });

    // Listen for chat messages
    this.socket.off('chatMessage'); // Prevent duplicate listeners
    this.socket.off('chatMessage');
    this.socket.on('chatMessage', (msg) => {
      // Prevent duplicates: Only add if not identical to last message
      const lastMsg = this.chatMessages[this.chatMessages.length - 1];
      if (!lastMsg || lastMsg.message !== msg.message || lastMsg.username !== msg.username || lastMsg.timestamp !== msg.timestamp) {
        this.chatMessages.push(msg);
        this.renderChatMessages();
      }
    });

    // User left lobby
    this.socket.on('userLeft', (userId) => {
      const before = this.users.length;
      this.users = this.users.filter(user => user.id !== userId);
      const after = this.users.length;
      console.log(`[Lobby] User left: ${userId}. Users before: ${before}, after: ${after}`);
      this.renderOnlineUsers();
    });

    // User status changed
    this.socket.on('userStatusChanged', ({ userId, status }) => {
      const user = this.users.find(u => u.id === userId);
      if (user) {
        user.status = status;
        console.log(`[Lobby] User status changed: ${user.username} (${userId}) -> ${status}`);
        this.renderOnlineUsers();
      } else {
        console.log(`[Lobby] userStatusChanged: user not found: ${userId}`);
      }
    });

    // Chat message received
    this.socket.on('chatMessage', (message) => {
      this.chatMessages.push(message);
      this.renderChatMessages();
    });

    // Games list received
    this.socket.on('gamesList', (games) => {
      console.log('Received games list:', games);
      this.games = games;
      this.renderGamesList();
    });

    // Game removed
    this.socket.on('gameRemoved', (gameId) => {
      console.log('Game removed:', gameId);
      // Update the games list
      this.socket.emit('getGames');
    });

    // Joined game
    this.socket.on('joinedGame', (data) => {
      if (this.onGameJoined) {
        this.onGameJoined(data);
      }
      // Defensive: Do not disconnect if event is missing, just warn
      console.warn('Joined game event received, but no callback set');
    });

    // Game error
    this.socket.on('gameError', (error) => {
      console.error('Game error in lobby:', error);
      // Use the modal dialog instead of alert
      if (window.gameUI && typeof window.gameUI.showErrorModal === 'function') {
        window.gameUI.showErrorModal(error);
      }
    });
  }

  // Send a chat message
  sendChatMessage() {
    const message = this.chatInput.value.trim();
    if (!message) {
      return; // Empty message, do nothing
    }

    if (!this.socket) {
      console.error('Cannot send message: socket is null');
      if (window.gameUI && typeof window.gameUI.showErrorModal === 'function') {
        window.gameUI.showErrorModal('Connection error. Please refresh the page.');
      }
      return;
    }

    console.log('Sending chat message:', message);
    console.log('Socket ID:', this.socket.id);

    try {
      this.socket.emit('sendChatMessage', message);
      this.chatInput.value = '';

      // We don't add the message locally anymore since the server will echo it back
      // and we don't want duplicates
    } catch (error) {
      console.error('Error sending chat message:', error);
      if (window.gameUI && typeof window.gameUI.showErrorModal === 'function') {
        window.gameUI.showErrorModal('Could not send message. Please try again.');
      }
    }
  }

  // Join a game
  joinGame(gameId) {
    this.socket.emit('joinGameFromLobby', gameId);
  }

  // Render online users list
  renderOnlineUsers() {
    this.onlineUsersList.innerHTML = '';

    this.users.forEach(user => {
      const li = document.createElement('li');

      const statusSpan = document.createElement('span');
      statusSpan.className = `user-status status-${user.status}`;

      const nameSpan = document.createElement('span');
      nameSpan.textContent = user.username;

      const userInfoDiv = document.createElement('div');
      userInfoDiv.appendChild(statusSpan);
      userInfoDiv.appendChild(nameSpan);

      li.appendChild(userInfoDiv);

      // Add "You" indicator if this is the current user
      if (user.id === this.currentUser.id) {
        const youSpan = document.createElement('span');
        youSpan.textContent = '(You)';
        youSpan.className = 'user-you';
        li.appendChild(youSpan);
      }

      this.onlineUsersList.appendChild(li);
    });
  }

  // Render games list
  renderGamesList() {
    this.gamesList.innerHTML = '';

    if (this.games.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No active games. Create one!';
      li.className = 'no-games';
      this.gamesList.appendChild(li);
      return;
    }

    this.games.forEach(game => {
      const li = document.createElement('li');

      const gameInfoDiv = document.createElement('div');

      const gameNameSpan = document.createElement('span');
      gameNameSpan.textContent = game.id;
      gameNameSpan.className = 'game-name';

      const playersSpan = document.createElement('span');
      playersSpan.textContent = `Players: ${game.playerCount}/2`;
      playersSpan.className = 'game-players';

      gameInfoDiv.appendChild(gameNameSpan);
      gameInfoDiv.appendChild(document.createTextNode(' - '));
      gameInfoDiv.appendChild(playersSpan);

      li.appendChild(gameInfoDiv);

      // Add join button if game is not full and not in progress
      if (game.playerCount < 2 && !game.inProgress) {
        const joinBtn = document.createElement('button');
        joinBtn.textContent = 'Join';
        joinBtn.className = 'join-game-btn';
        joinBtn.addEventListener('click', () => {
          this.joinGame(game.id);
        });
        li.appendChild(joinBtn);
      } else if (game.inProgress) {
        const statusSpan = document.createElement('span');
        statusSpan.textContent = 'In Progress';
        statusSpan.className = 'game-in-progress';
        li.appendChild(statusSpan);
      } else {
        const statusSpan = document.createElement('span');
        statusSpan.textContent = 'Full';
        statusSpan.className = 'game-full';
        li.appendChild(statusSpan);
      }

      this.gamesList.appendChild(li);
    });
  }

  // Render chat messages
  renderChatMessages() {
    if (!this.chatMessagesEl) {
      console.error('Chat messages element not found');
      return;
    }

    this.chatMessagesEl.innerHTML = '';

    this.chatMessages.forEach(msg => {
      const messageDiv = document.createElement('div');

      if (msg.isSystem) {
        messageDiv.className = 'chat-message chat-message-system';

        // Add message content
        const messageContent = document.createElement('span');
        messageContent.className = 'chat-content';
        messageContent.textContent = msg.message;

        // Add timestamp to system messages
        const timestamp = new Date(msg.timestamp);
        const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const timeSpan = document.createElement('span');
        timeSpan.className = 'chat-timestamp chat-timestamp-system';
        timeSpan.textContent = timeString;

        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(timeSpan);
      } else {
        // Determine if this is the current user's message
        const isSelf = this.currentUser && msg.userId === this.currentUser.id;
        messageDiv.className = `chat-message ${isSelf ? 'chat-message-self' : 'chat-message-user'}`;

        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'chat-username';
        usernameSpan.textContent = isSelf ? 'You' : msg.username;

        const messageContent = document.createElement('span');
        messageContent.className = 'chat-content';
        messageContent.textContent = msg.message;

        const timestamp = new Date(msg.timestamp);
        const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const timeSpan = document.createElement('span');
        timeSpan.className = 'chat-timestamp';
        timeSpan.textContent = timeString;

        messageDiv.appendChild(usernameSpan);
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(timeSpan);
      }

      this.chatMessagesEl.appendChild(messageDiv);
    });

    // Scroll to bottom
    this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;
  }

  // Clear chat messages
  clearChat() {
    if (!this.chatMessagesEl) {
      console.error('Chat messages element not found');
      return;
    }

    // Keep only system messages about the current user
    if (this.currentUser) {
      this.chatMessages = this.chatMessages.filter(msg =>
        msg.isSystem && msg.message && msg.message.includes(this.currentUser.username));
    } else {
      this.chatMessages = [];
    }

    // Re-render the chat
    this.renderChatMessages();

    console.log('Chat cleared');
  }

  // Refresh games list
  refreshGamesList() {
    if (!this.socket) {
      console.error('Cannot refresh games: socket is null');
      if (window.gameUI && typeof window.gameUI.showErrorModal === 'function') {
        window.gameUI.showErrorModal('Connection error. Please refresh the page.');
      }
      return;
    }

    console.log('Refreshing games list');

    // Clear any stale games first
    this.games = [];
    this.renderGamesList();

    // First, try to clean any potentially stale games
    this.socket.emit('cleanAllGames');

    // Then request fresh list from server
    setTimeout(() => {
      this.socket.emit('getGames');
    }, 200);

    // Add a visual indicator that refresh is happening
    if (this.refreshGamesBtn) {
      const originalText = this.refreshGamesBtn.textContent;
      this.refreshGamesBtn.textContent = 'Refreshing...';
      this.refreshGamesBtn.disabled = true;

      // Reset button after a short delay
      setTimeout(() => {
        this.refreshGamesBtn.textContent = originalText;
        this.refreshGamesBtn.disabled = false;

        // Do one more refresh after button is re-enabled
        setTimeout(() => {
          this.socket.emit('getGames');
        }, 200);
      }, 1000);
    }
  }

  // Force remove a game from the server
  forceRemoveGame(gameId) {
    if (!this.socket) {
      console.error('Cannot remove game: socket is null');
      return false;
    }

    if (!gameId) {
      console.error('Cannot remove game: gameId is null');
      return false;
    }

    console.log('Forcing server to remove game:', gameId);

    // Send a direct command to the server to remove the game
    this.socket.emit('forceRemoveGame', { gameId });

    // Also remove it from our local list
    if (this.games) {
      this.games = this.games.filter(g => g.id !== gameId);
      this.renderGamesList();
    }

    return true;
  }

  // Clean all games from the server
  cleanAllGames() {
    if (!this.socket) {
      console.error('Cannot clean games: socket is null');
      if (window.gameUI && typeof window.gameUI.showErrorModal === 'function') {
        window.gameUI.showErrorModal('Connection error. Please refresh the page.');
      }
      return;
    }

    console.log('Cleaning all games');

    // First, remove all games from our local list
    if (this.games && this.games.length > 0) {
      // Make a copy of the games array to avoid modification during iteration
      const gamesToRemove = [...this.games];

      // Show confirmation dialog
      if (confirm(`Are you sure you want to clean ${gamesToRemove.length} games?`)) {
        console.log(`Removing ${gamesToRemove.length} games`);

        // Send a command to remove each game
        gamesToRemove.forEach(game => {
          this.forceRemoveGame(game.id);
        });

        // Also send a cleanAllGames command to the server
        this.socket.emit('cleanAllGames');

        // Clear our local list
        this.games = [];
        this.renderGamesList();

        // Add a visual indicator that cleaning is happening
        if (this.cleanGamesBtn) {
          const originalText = this.cleanGamesBtn.textContent;
          this.cleanGamesBtn.textContent = 'Cleaning...';
          this.cleanGamesBtn.disabled = true;

          // Reset button after a short delay
          setTimeout(() => {
            this.cleanGamesBtn.textContent = originalText;
            this.cleanGamesBtn.disabled = false;

            // Refresh the games list
            this.refreshGamesList();
          }, 2000);
        }
      }
    } else {
      if (window.gameUI && typeof window.gameUI.showErrorModal === 'function') {
        window.gameUI.showErrorModal('No games to clean.');
      }
    }
  }

  // Start auto-refresh of games list
  startAutoRefresh() {
    // Clear any existing interval first
    this.stopAutoRefresh();

    console.log(`Starting auto-refresh of games list every ${this.AUTO_REFRESH_INTERVAL/1000} seconds`);

    // Set up new interval
    this.autoRefreshInterval = setInterval(() => {
      if (this.socket && !this.lobbyScreen.classList.contains('hidden')) {
        console.log('Auto-refreshing games list');
        this.socket.emit('getGames');
      }
    }, this.AUTO_REFRESH_INTERVAL);
  }

  // Stop auto-refresh of games list
  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      console.log('Stopping auto-refresh of games list');
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  // Show the lobby screen
  show() {
    this.lobbyScreen.classList.remove('hidden');

    // Refresh games list when showing the lobby
    if (this.socket) {
      console.log('Refreshing games list on lobby show');
      this.refreshGamesList();

      // Start auto-refresh
      this.startAutoRefresh();
    }
  }

  // Hide the lobby screen
  hide() {
    this.lobbyScreen.classList.add('hidden');

    // Stop auto-refresh when hiding the lobby
    this.stopAutoRefresh();
  }

  // Set login success handler
  setLoginSuccessHandler(handler) {
    this.onLoginSuccess = handler;
  }

  // Set game joined handler
  setGameJoinedHandler(handler) {
    this.onGameJoined = handler;
  }
}

// Export the LobbyClient class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LobbyClient };
} else {
  window.LobbyClient = LobbyClient;
}
