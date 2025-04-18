/**
 * Main application logic for Milles Bornes
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize game client and UI
  const gameClient = new GameClient();
  const gameUI = new GameUI();
  let lobbyClient = null;

  // Show login screen initially
  gameUI.showScreen('login');

  // Set up event handlers
  setupEventHandlers(gameClient, gameUI);

  // Set up custom dropdown
  setupCustomDropdown();

  // Set up card text toggle
  setupCardTextToggle();

  // Set up sound toggle
  setupSoundToggle();

  // Set up rules modal
  setupRulesModal();

  // Set up cards guide modal
  setupCardsModal();

  // Set up login button handler
  setupLoginHandler(gameClient, gameUI);
});

// Set up login handler for lobby
function setupLoginHandler(gameClient, gameUI) {
  const loginBtn = document.getElementById('login-btn');
  const playerNameInput = document.getElementById('player-name');
  const serverUrlInput = document.getElementById('server-url');
  const loginErrorEl = document.getElementById('login-error');

  // Make sure the login button is properly initialized
  if (!loginBtn) {
    console.error('Login button not found!');
    return;
  }

  // Check for stored game info for reconnection
  const lastPlayerName = localStorage.getItem('lastPlayerName');
  const lastGameId = localStorage.getItem('lastGameId');
  const lastPlayerId = localStorage.getItem('lastPlayerId');
  
  // Always use millesbornes.ddns.net regardless of what's stored
  const millesbornesUrl = "http://millesbornes.ddns.net:3000";
  
  // Clear any stored server URL and set to millesbornes.ddns.net
  localStorage.removeItem('lastServerUrl');
  serverUrlInput.value = millesbornesUrl;
  console.log('Server URL set to:', millesbornesUrl);

  if (lastPlayerName) {
    console.log('Found stored player name:', lastPlayerName);
    playerNameInput.value = lastPlayerName;
  }

  // Add reconnect button if we have game info
  if (lastGameId && lastPlayerId && lastPlayerName) {
    console.log('Found stored game info, adding reconnect button');
    const reconnectBtn = document.createElement('button');
    reconnectBtn.id = 'reconnect-btn';
    reconnectBtn.className = 'btn';
    reconnectBtn.textContent = 'Reconnect to Game';
    reconnectBtn.style.marginLeft = '10px';

    reconnectBtn.addEventListener('click', () => {
      console.log('Reconnecting to game:', lastGameId, 'as player:', lastPlayerId);

      // Disable buttons
      loginBtn.disabled = true;
      reconnectBtn.disabled = true;

      // Connect to server
      gameClient.connect(millesbornesUrl);

      // Set up reconnection handler
      gameClient.onConnected = () => {
        console.log('Connected to server, attempting to rejoin game...');
        gameClient.socket.emit('rejoinGame', { gameId: lastGameId, playerId: lastPlayerId });
      };
    });

    // Add the reconnect button next to the login button
    loginBtn.parentNode.insertBefore(reconnectBtn, loginBtn.nextSibling);
  }

  console.log('Setting up login button handler');

  // Use both methods for maximum compatibility
  const loginHandler = function() {
    console.log('Login button clicked');

    // Prevent multiple clicks
    loginBtn.disabled = true;
    loginBtn.textContent = 'Connecting...';

    const playerName = playerNameInput.value.trim();
    const serverUrl = serverUrlInput.value.trim();

    if (!playerName) {
      loginErrorEl.textContent = 'Please enter your name';
      loginBtn.disabled = false;
      loginBtn.textContent = 'Enter Lobby';
      return;
    }

    if (!serverUrl) {
      loginErrorEl.textContent = 'Please select a server';
      loginBtn.disabled = false;
      loginBtn.textContent = 'Enter Lobby';
      return;
    }

    // Clear any previous errors
    loginErrorEl.textContent = '';

    console.log(`Connecting to server: ${serverUrl} as ${playerName}`);

    // Store the player name in the game client
    gameClient.playerName = playerName;

    // Disconnect any existing socket
    if (gameClient.socket) {
      console.log('Disconnecting existing socket');
      gameClient.socket.disconnect();
      gameClient.socket = null;
    }

    // Create a new lobby client or reset the existing one
    if (!window.lobbyClient) {
      console.log('Creating new lobby client');
      window.lobbyClient = new LobbyClient(null);
    } else {
      console.log('Resetting existing lobby client');
      window.lobbyClient.socket = null;
    }

    const lobbyClient = window.lobbyClient;

    // Set handler for when game is joined from lobby
    lobbyClient.setGameJoinedHandler((data) => {
      console.log('Joined game from lobby:', data);

      // Update game client with game data
      gameClient.gameId = data.gameId;
      gameClient.playerId = data.playerId;
      gameClient.gameState = data.game;

      // Hide lobby screen
      lobbyClient.hide();

      // Show game screen
      gameUI.showScreen('game');

      // Update game UI
      gameUI.updateGameUI(data.game, gameClient.playerId);
    });

    // Set up the connection callback before connecting
    gameClient.onConnected = () => {
      console.log('Connected to server, logging in to lobby...');
      console.log('Sending loginUser event with name:', playerName);

      // Set up event handlers after connection
      gameClient.socket.on('loginSuccess', (data) => {
        console.log('Login success:', data);

        // Set the socket in the lobby client
        lobbyClient.socket = gameClient.socket;
        console.log('Socket set in lobby client:', lobbyClient.socket.id);

        // Set up lobby socket listeners
        lobbyClient.setupSocketListeners();

        // Initialize lobby with user data
        lobbyClient.init(data.user, data.users, data.chatMessages);

        // Hide login screen
        gameUI.hideScreen('login');

        // Show lobby screen
        lobbyClient.show();
      });

      // Handle login error
      gameClient.socket.on('loginError', (error) => {
        console.error('Login error:', error);
        loginErrorEl.textContent = error;

        // Re-enable the login button
        loginBtn.disabled = false;
        loginBtn.textContent = 'Enter Lobby';

        // Disconnect the socket to clean up
        if (gameClient.socket) {
          gameClient.socket.disconnect();
        }
      });

      // Send login request
      gameClient.socket.emit('loginUser', playerName);
    };

    // Connect to server after setting up the callback
    gameClient.connect(serverUrl);
  };

  // Add the handler in multiple ways for maximum compatibility
  loginBtn.onclick = loginHandler;
  loginBtn.addEventListener('click', loginHandler);
}

// Set up event handlers
function setupEventHandlers(gameClient, gameUI) {
  console.log('Setting up event handlers');

  try {
    // Legacy join button handler (kept for backward compatibility)
    gameUI.setJoinButtonHandler((playerName, gameId, serverUrl) => {
      console.log('Legacy join button clicked');
      // Connect to server
      gameClient.connect(serverUrl);

      // Join game
      gameClient.joinGame(playerName, gameId);
    });
  } catch (error) {
    console.error('Error setting up join button handler:', error);
  }

  // Set up disconnect handler
  gameClient.onDisconnected = (reason) => {
    console.log('Handling disconnection. Reason:', reason);

    // If we were in a game, show a reconnect message
    if (gameClient.gameId && gameClient.playerId) {
      // Show a message to the user
      gameUI.showErrorModal('Connection Error: You have been disconnected from the game. Please refresh the page to reconnect.');

      // Return to login screen after a delay
      setTimeout(() => {
        gameUI.showScreen('login');
      }, 3000);
    }
  };

  // Draw button handler
  gameUI.setDrawButtonHandler(() => {
    // Check if player needs to discard first
    if (gameClient.needsDiscard) {
      gameUI.showDiscardModal(gameClient.hand, (cardIndex) => {
        gameClient.discardCard(cardIndex);
      });
    } else {
      gameClient.drawCard();
    }
  });

  // Exit game button handler
  gameUI.setExitGameButtonHandler(() => {
    console.log('Exit game confirmed');

    // Get the current game ID before we clean up
    const gameIdToRemove = gameClient.gameId;

    // Leave the game
    if (gameClient.leaveGame()) {
      console.log(`Left game: ${gameIdToRemove}`);

      // Return to the lobby screen
      gameUI.showScreen('lobby');

      // Refresh the games list
      if (window.lobbyClient && window.lobbyClient.socket) {
        window.lobbyClient.socket.emit('getGamesList');
      }
    }
  });

  // Debug button handler
  try {
    const debugBtn = document.getElementById('debug-btn');
    if (debugBtn) {
      debugBtn.addEventListener('click', () => {
        console.log('Debug button clicked, requesting hand...');
        gameClient.requestHand();

        // Also log current game state
        console.log('Current game state:', gameClient.gameState);
        console.log('Current hand:', gameClient.hand);
        console.log('Game ID:', gameClient.gameId);
        console.log('Player ID:', gameClient.playerId);
      });
    }
  } catch (error) {
    console.error('Error setting up debug button handler:', error);
  }

  // Card click handler
  gameUI.setCardClickHandler((cardIndex, card) => {
    // The game client will determine the correct target based on card type
    // Store the card being played for animation purposes
    gameClient.lastPlayedCard = gameClient.hand[cardIndex];
    gameClient.playCard(cardIndex);
  });

  // Game client event handlers
  gameClient.onJoinedGame = (gameId, playerId, game) => {
    console.log('Joined game:', gameId, 'as player:', playerId);

    // Request hand data immediately after joining
    setTimeout(() => {
      console.log('Requesting initial hand data...');
      gameClient.requestHand();
    }, 1000);

    if (game.started) {
      // Game already started, show game screen
      gameUI.showGameScreen(game, playerId);
    } else {
      // Game not started, show waiting screen
      gameUI.showWaitingScreen(gameId);
    }
  };

  gameClient.onWaitingForOpponent = (gameId) => {
    gameUI.showWaitingScreen(gameId);
  };

  gameClient.onPlayerJoined = (playerName, playerId) => {
    console.log('Player joined:', playerName, playerId);
  };

  gameClient.onGameStarted = (gameState) => {
    gameUI.showGameScreen(gameState, gameClient.playerId);

    // Request hand data when game starts
    setTimeout(() => {
      console.log('Requesting hand data after game start...');
      gameClient.requestHand();
    }, 1000);
  };

  gameClient.onGameUpdated = (gameState) => {
    // Check for changes in battle area to animate
    const previousState = gameClient.previousGameState;
    const currentState = gameState;

    // Initialize previous state if it doesn't exist
    if (!previousState) {
      gameClient.previousGameState = JSON.parse(JSON.stringify(gameState));
      gameUI.updateGameUI(gameState, gameClient.playerId);
      return;
    }

    // Find player and opponent in both states
    const currentPlayer = currentState.players.find(p => p.id === gameClient.playerId);
    const previousPlayer = previousState.players.find(p => p.id === gameClient.playerId);
    const currentOpponent = currentState.players.find(p => p.id !== gameClient.playerId);
    const previousOpponent = previousState.players.find(p => p.id !== gameClient.playerId);

    // Check for new hazards on opponent
    let animateOpponentHazard = false;
    if (currentOpponent && previousOpponent) {
      // Check if a new hazard was played on opponent
      if (currentOpponent.battle.hazard !== previousOpponent.battle.hazard && currentOpponent.battle.hazard) {
        animateOpponentHazard = true;
        console.log('New hazard played on opponent:', currentOpponent.battle.hazard);
      }

      // Check if speed limit was added to opponent
      if (currentOpponent.battle.speedLimit && !previousOpponent.battle.speedLimit) {
        animateOpponentHazard = true;
        console.log('Speed limit played on opponent');
      }
    }

    // Check for new remedies on player
    let animatePlayerRemedy = false;
    if (currentPlayer && previousPlayer) {
      // Check if a hazard was removed from player
      if (previousPlayer.battle.hazard && !currentPlayer.battle.hazard) {
        animatePlayerRemedy = true;
        console.log('Remedy played by player');
      }

      // Check if speed limit was removed from player
      if (previousPlayer.battle.speedLimit && !currentPlayer.battle.speedLimit) {
        animatePlayerRemedy = true;
        console.log('Speed limit removed from player');
      }
    }

    // Check for new safety cards
    let newPlayerSafety = null;
    let newOpponentSafety = null;

    if (currentPlayer && previousPlayer && currentPlayer.battle.safeties && previousPlayer.battle.safeties) {
      // Find any new safety card for player
      for (const safety of currentPlayer.battle.safeties) {
        if (!previousPlayer.battle.safeties.includes(safety)) {
          newPlayerSafety = safety;
          console.log('New safety played by player:', safety);
          break;
        }
      }
    }

    if (currentOpponent && previousOpponent && currentOpponent.battle.safeties && previousOpponent.battle.safeties) {
      // Find any new safety card for opponent
      for (const safety of currentOpponent.battle.safeties) {
        if (!previousOpponent.battle.safeties.includes(safety)) {
          newOpponentSafety = safety;
          console.log('New safety played by opponent:', safety);
          break;
        }
      }
    }

    // Update the UI with animation flags
    gameUI.updateGameUI(
      gameState,
      gameClient.playerId,
      {
        animateOpponentHazard,
        animatePlayerRemedy,
        newPlayerSafety,
        newOpponentSafety
      }
    );

    // If we have a lastPlayedCard, animate it
    if (gameClient.lastPlayedCard) {
      // Determine target player ID based on card type
      let targetPlayerId = gameClient.playerId; // Default to self
      if (gameClient.lastPlayedCard.type === 'hazard') {
        targetPlayerId = gameClient.opponentId;
      }

      // Animate the card play
      gameUI.animateCardPlay(gameClient.lastPlayedCard, targetPlayerId, gameClient.playerId);

      // Clear the last played card
      gameClient.lastPlayedCard = null;
    }

    // Store the current state for next comparison
    gameClient.previousGameState = JSON.parse(JSON.stringify(gameState));
  };

  gameClient.onHandUpdated = (hand) => {
    gameUI.updatePlayerHand(hand);
  };

  gameClient.onGameOver = (winnerId, finalState, gameIdToRemove) => {
    const player = gameClient.getCurrentPlayer();
    const opponent = gameClient.getOpponent();

    if (player && opponent) {
      // Determine if the current player is the winner
      const isPlayerWinner = winnerId === gameClient.playerId;
      const winnerName = isPlayerWinner ? player.name : opponent.name;

      console.log('Game over. Winner ID:', winnerId);
      console.log('Current player ID:', gameClient.playerId);
      console.log('Is player winner:', isPlayerWinner);
      console.log('Winner name:', winnerName);

      // Force remove the game from both server and local list immediately
      if (window.lobbyClient && gameIdToRemove) {
        console.log('Forcing removal of game from lobby:', gameIdToRemove);
        window.lobbyClient.forceRemoveGame(gameIdToRemove);

        // Double-check by sending a direct server command
        if (window.lobbyClient.socket) {
          window.lobbyClient.socket.emit('forceRemoveGame', { gameId: gameIdToRemove });
        }
      }

      // Set up a refresh attempt to ensure the server list is updated
      setTimeout(() => {
        if (window.lobbyClient && window.lobbyClient.socket) {
          console.log('Refreshing games list after game over');
          window.lobbyClient.socket.emit('getGames');

          // Force another refresh after a longer delay
          setTimeout(() => {
            window.lobbyClient.refreshGamesList();
          }, 1000);
        }
      }, 500);

      // Show game over screen (limbo screen disconnected from the game)
      gameUI.showGameOverScreen(winnerName, player.name, opponent.name);

      // Set up the new game button to return to lobby
      const newGameBtn = document.getElementById('new-game-btn');
      if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
          console.log('New game button clicked, returning to lobby');

          // Return to lobby if we have a lobby client
          if (window.lobbyClient && window.lobbyClient.socket) {
            console.log('Returning to lobby');

            // Force a final cleanup of the game
            if (gameIdToRemove) {
              console.log('Final cleanup of game:', gameIdToRemove);
              window.lobbyClient.socket.emit('forceRemoveGame', { gameId: gameIdToRemove });
            }

            // Force refresh the games list
            window.lobbyClient.refreshGamesList();

            // Schedule another refresh after a delay
            setTimeout(() => {
              window.lobbyClient.refreshGamesList();
            }, 1000);

            gameUI.hideScreen('game-over');
            window.lobbyClient.show();
          } else {
            // Return to login screen if no lobby client
            console.log('No lobby client, returning to login');
            gameUI.showScreen('login');
          }
        });
      }
    }
  };

  gameClient.onPlayerDisconnected = (playerName) => {
    gameUI.showMessageModal(`${playerName} has disconnected from the game.`);

    // Get the current game ID before we clean up
    const gameIdToRemove = gameClient.gameId;

    // Immediately tell the server to close the game
    if (gameClient.socket && gameClient.gameId) {
      console.log('Cleaning up after player disconnection');
      gameClient.socket.emit('endGame', { gameId: gameIdToRemove });

      // Clear game state but keep socket connection
      gameClient.gameId = null;
      gameClient.playerId = null;
      gameClient.hand = [];
      gameClient.opponentId = null;
    }

    // Force remove the game from the server
    if (window.lobbyClient && gameIdToRemove) {
      console.log('Forcing removal of game after player disconnection:', gameIdToRemove);
      window.lobbyClient.forceRemoveGame(gameIdToRemove);

      // Double-check by sending a direct server command
      if (window.lobbyClient.socket) {
        window.lobbyClient.socket.emit('forceRemoveGame', { gameId: gameIdToRemove });
      }
    }

    // Return to lobby after a delay
    setTimeout(() => {
      if (window.lobbyClient && window.lobbyClient.socket) {
        console.log('Returning to lobby after player disconnection');
        gameUI.hideScreen('game');
        window.lobbyClient.refreshGamesList();
        window.lobbyClient.show();
      } else {
        // Fall back to login screen if lobby isn't available
        console.log('Returning to login after player disconnection');
        gameUI.showScreen('login');
      }
    }, 3000);
  };

  gameClient.onGameError = (errorMessage) => {
    gameUI.showErrorModal(errorMessage);
  };

  gameClient.onCoupFourreOpportunity = (hazard, cardIndex) => {
    if (confirm(`You have a Safety card that protects against ${hazard}! Play it now as a Coup Fourré?`)) {
      gameClient.playCard(cardIndex);
    }
  };

  gameClient.onNeedsDiscard = () => {
    gameUI.showDiscardModal(gameClient.hand, (cardIndex) => {
      gameClient.discardCard(cardIndex);
    });
  };

  gameClient.onCardExchanged = (discardedCard, drawnCard) => {
    gameUI.showCardExchangeMessage(discardedCard, drawnCard);
  };

  gameClient.onGameEnded = (gameId, reason, playerName) => {
    if (playerName !== gameClient.playerName) {
      gameUI.showMessageModal(`${playerName} has left the game.`);
    }

    // Return to the lobby screen
    setTimeout(() => {
      if (window.lobbyClient && window.lobbyClient.socket) {
        console.log('Returning to lobby after game ended');
        gameUI.hideScreen('game');
        window.lobbyClient.refreshGamesList();
        window.lobbyClient.show();
      } else {
        // Fall back to login screen if lobby isn't available
        console.log('Returning to login after game ended');
        gameUI.showScreen('login');
      }
    }, 3000);
  };

  gameClient.onPlayerLeft = (playerName, playerId) => {
    gameUI.showErrorModal(`${playerName} has left the game.`);

    // Get the current game ID before we clean up
    const gameIdToRemove = gameClient.gameId;

    // Immediately tell the server to close the game
    if (gameClient.socket && gameClient.gameId) {
      console.log('Cleaning up after player left');
      gameClient.socket.emit('endGame', { gameId: gameIdToRemove });
    }

    // Return to lobby after a delay
    setTimeout(() => {
      if (window.lobbyClient && window.lobbyClient.socket) {
        console.log('Returning to lobby after player left');
        gameUI.hideScreen('game');
        window.lobbyClient.refreshGamesList();
        window.lobbyClient.show();
      } else {
        // Fall back to login screen if lobby isn't available
        console.log('Returning to login after player left');
        gameUI.showScreen('login');
      }
    }, 3000);
  };
}

// Set up custom dropdown for server URL selection
function setupCustomDropdown() {
  const dropdownItems = document.querySelectorAll('.dropdown-item');
  const serverUrlInput = document.getElementById('server-url');
  const customDropdown = document.querySelector('.custom-dropdown');
  const dropdownContent = document.querySelector('.dropdown-content');

  console.log('Setting up custom dropdown');
  console.log('Found dropdown items:', dropdownItems.length);

  // Direct click handlers for each dropdown item
  dropdownItems.forEach(item => {
    // Use both onclick and addEventListener for maximum compatibility
    const clickHandler = function() {
      // Get the value from the data attribute
      const value = this.getAttribute('data-value');

      // Set the input value
      serverUrlInput.value = value;

      // Update selected styling
      dropdownItems.forEach(i => i.classList.remove('selected'));
      this.classList.add('selected');

      // Hide the dropdown
      dropdownContent.style.display = 'none';

      console.log('Selected server URL:', value);

      // Prevent default and stop propagation
      return false;
    };

    // Add the handler in multiple ways for maximum compatibility
    item.onclick = clickHandler;
    item.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      clickHandler.call(this);
    });

    // Also add mousedown handler for better mobile support
    item.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();
      clickHandler.call(this);
    });
  });

  // Toggle dropdown when clicking on the input
  serverUrlInput.onclick = function(e) {
    e.stopPropagation();
    dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
  };

  // Also allow clicking on the dropdown container
  customDropdown.onclick = function(e) {
    if (e.target === this) { // Only if clicking the container itself
      dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    }
  };

  // Close dropdown when clicking elsewhere on the page
  document.addEventListener('click', function() {
    dropdownContent.style.display = 'none';
  });

  // Initialize with first option selected (millesbornes.ddns.net)
  if (dropdownItems.length > 0) {
    // Add selected class to first item
    dropdownItems[0].classList.add('selected');
    
    // Get the value from the first dropdown item
    const defaultValue = dropdownItems[0].getAttribute('data-value');
    
    // Set the input value to match
    serverUrlInput.value = defaultValue;
    
    console.log('Default server URL set to:', defaultValue);
  }
}

  // This section was moved into the setupCustomDropdown function

// Set up card text toggle
function setupCardTextToggle() {
  const showCardTextCheckbox = document.getElementById('show-card-text');
  const gameContainer = document.querySelector('.game-container');

  // Initialize based on checkbox state
  if (!showCardTextCheckbox.checked) {
    gameContainer.classList.add('hide-card-text');
  }

  // Add change event listener
  showCardTextCheckbox.addEventListener('change', () => {
    if (showCardTextCheckbox.checked) {
      gameContainer.classList.remove('hide-card-text');
      console.log('Card text shown');
    } else {
      gameContainer.classList.add('hide-card-text');
      console.log('Card text hidden');
    }
  });
}

// Set up sound toggle
function setupSoundToggle() {
  const enableSoundCheckbox = document.getElementById('enable-sound');

  // Add change event listener
  enableSoundCheckbox.addEventListener('change', () => {
    // Find all instances of AudioManager
    const gameUI = window.gameUI;
    if (gameUI && gameUI.audioManager) {
      gameUI.audioManager.setEnabled(enableSoundCheckbox.checked);
      console.log('Sound effects ' + (enableSoundCheckbox.checked ? 'enabled' : 'disabled'));
    }
  });
}

// Set up rules modal
function setupRulesModal() {
  const rulesBtn = document.getElementById('rules-btn');
  const rulesModal = document.getElementById('rules-modal');
  const closeRulesBtn = document.querySelector('.close-rules-btn');

  if (!rulesBtn || !rulesModal || !closeRulesBtn) {
    console.error('Rules modal elements not found');
    return;
  }

  // Show modal when rules button is clicked
  rulesBtn.addEventListener('click', () => {
    rulesModal.classList.remove('hidden');
  });

  // Hide modal when close button is clicked
  closeRulesBtn.addEventListener('click', () => {
    rulesModal.classList.add('hidden');
  });

  // Hide modal when clicking outside the content
  rulesModal.addEventListener('click', (event) => {
    if (event.target === rulesModal) {
      rulesModal.classList.add('hidden');
    }
  });

  // Hide modal when Escape key is pressed
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !rulesModal.classList.contains('hidden')) {
      rulesModal.classList.add('hidden');
    }
  });
}

// Set up cards guide modal
function setupCardsModal() {
  const cardsBtn = document.getElementById('cards-btn');
  const cardsModal = document.getElementById('cards-modal');
  const closeCardsBtn = document.querySelector('.close-cards-btn');

  if (!cardsBtn || !cardsModal || !closeCardsBtn) {
    console.error('Cards modal elements not found');
    return;
  }

  // Show modal when cards button is clicked
  cardsBtn.addEventListener('click', () => {
    cardsModal.classList.remove('hidden');
  });

  // Hide modal when close button is clicked
  closeCardsBtn.addEventListener('click', () => {
    cardsModal.classList.add('hidden');
  });

  // Hide modal when clicking outside the content
  cardsModal.addEventListener('click', (event) => {
    if (event.target === cardsModal) {
      cardsModal.classList.add('hidden');
    }
  });

  // Hide modal when Escape key is pressed
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !cardsModal.classList.contains('hidden')) {
      cardsModal.classList.add('hidden');
    }
  });
}
