/**
 * Game logic for the client side
 */

// Card types
const CardType = {
  DISTANCE: 'distance',
  HAZARD: 'hazard',
  REMEDY: 'remedy',
  SAFETY: 'safety'
  // Removed ATTACK type to match server
};

// Card definitions (same as server)
const CARDS = [
  // Distance cards (in miles)
  { id: 'd25_1', type: CardType.DISTANCE, value: 25, count: 10 },
  { id: 'd50_1', type: CardType.DISTANCE, value: 50, count: 10 },
  { id: 'd75_1', type: CardType.DISTANCE, value: 75, count: 10 },
  { id: 'd100_1', type: CardType.DISTANCE, value: 100, count: 12 },
  { id: 'd200_1', type: CardType.DISTANCE, value: 200, count: 4 },

  // Hazards
  { id: 'h_accident', type: CardType.HAZARD, name: 'Accident', count: 3 },
  { id: 'h_outofgas', type: CardType.HAZARD, name: 'Out of Gas', count: 3 },
  { id: 'h_flattire', type: CardType.HAZARD, name: 'Flat Tire', count: 3 },
  { id: 'h_speedlimit', type: CardType.HAZARD, name: 'Speed Limit', count: 4 },
  { id: 'h_stop', type: CardType.HAZARD, name: 'Stop', count: 5 },

  // Remedies
  { id: 'r_repairs', type: CardType.REMEDY, name: 'Repairs', hazard: 'Accident', count: 6 },
  { id: 'r_gasoline', type: CardType.REMEDY, name: 'Gasoline', hazard: 'Out of Gas', count: 6 },
  { id: 'r_sparetire', type: CardType.REMEDY, name: 'Spare Tire', hazard: 'Flat Tire', count: 6 },
  { id: 'r_endofspeedlimit', type: CardType.REMEDY, name: 'End of Speed Limit', hazard: 'Speed Limit', count: 6 },
  { id: 'r_go', type: CardType.REMEDY, name: 'Go', hazard: 'Stop', count: 14 },

  // Safety cards
  { id: 's_drivingace', type: CardType.SAFETY, name: 'Driving Ace', protects: 'Accident', count: 1 },
  { id: 's_fueltank', type: CardType.SAFETY, name: 'Fuel Tank', protects: 'Out of Gas', count: 1 },
  { id: 's_punctureproof', type: CardType.SAFETY, name: 'Puncture-Proof', protects: 'Flat Tire', count: 1 },
  { id: 's_righofway', type: CardType.SAFETY, name: 'Right of Way', protects: ['Stop', 'Speed Limit'], count: 1 }
  // Removed Attack cards to match server
];

// Get card details by ID prefix
function getCardDetails(cardId) {
  const prefix = cardId.split('_')[0] + '_' + cardId.split('_')[1];
  return CARDS.find(card => card.id.startsWith(prefix));
}

// Game client class
class GameClient {
  constructor() {
    this.socket = null;
    this.gameId = null;
    this.playerId = null;
    this.playerName = null;
    this.gameState = null;
    this.hand = [];
    this.opponentId = null;
    this.isMyTurn = false;
    this.needsDiscard = false;
    this.serverUrl = 'http://localhost:3000';
  }

  // Connect to the server
  connect(serverUrl) {
    this.serverUrl = serverUrl;
    this.socket = io(serverUrl);
    this.setupSocketListeners();
    return this.socket;
  }

  // Setup socket event listeners
  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to server');

      // Call the onConnected callback if it exists
      if (typeof this.onConnected === 'function') {
        console.log('Calling onConnected callback');
        this.onConnected();
      } else {
        console.log('No onConnected callback defined');
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server. Reason:', reason);

      // If we were in a game, store the game info for potential reconnection
      if (this.gameId && this.playerId) {
        console.log('Storing game info for reconnection');
        localStorage.setItem('lastGameId', this.gameId);
        localStorage.setItem('lastPlayerId', this.playerId);
        localStorage.setItem('lastPlayerName', this.playerName);
        // Always use millesbornes.ddns.net
        localStorage.setItem('lastServerUrl', 'http://millesbornes.ddns.net:3000');
      }

      // Call the onDisconnected callback if it exists
      if (typeof this.onDisconnected === 'function') {
        console.log('Calling onDisconnected callback');
        this.onDisconnected(reason);
      }
    });

    this.socket.on('joinedGame', ({ gameId, playerId, game }) => {
      console.log('Joined game:', gameId, 'as player:', playerId);
      this.gameId = gameId;
      this.playerId = playerId;
      this.gameState = game;
      this.updateOpponentId();

      // Notify UI
      if (this.onJoinedGame) {
        this.onJoinedGame(gameId, playerId, game);
      }
    });

    // Handle rejoining a game
    this.socket.on('rejoinedGame', ({ gameId, playerId, game }) => {
      console.log('Rejoined game:', gameId, 'as player:', playerId);
      this.gameId = gameId;
      this.playerId = playerId;
      this.gameState = game;
      this.updateOpponentId();

      // Clear stored game info since we've successfully rejoined
      localStorage.removeItem('lastGameId');
      localStorage.removeItem('lastPlayerId');

      // Notify UI
      if (this.onJoinedGame) {
        this.onJoinedGame(gameId, playerId, game);
      }
    });

    this.socket.on('waitingForOpponent', () => {
      console.log('Waiting for opponent to join');

      // Notify UI
      if (this.onWaitingForOpponent) {
        this.onWaitingForOpponent(this.gameId);
      }
    });

    this.socket.on('playerJoined', ({ playerName, playerId }) => {
      console.log('Player joined:', playerName, playerId);
      this.updateOpponentId();

      // Notify UI
      if (this.onPlayerJoined) {
        this.onPlayerJoined(playerName, playerId);
      }
    });

    this.socket.on('gameStarted', (gameState) => {
      console.log('Game started:', gameState);
      this.gameState = gameState;
      this.isMyTurn = gameState.currentPlayerId === this.playerId;

      // Make sure opponent ID is set when game starts
      this.updateOpponentId();

      // Request hand
      this.requestHand();

      // Notify UI
      if (this.onGameStarted) {
        this.onGameStarted(gameState);
      }
    });

    this.socket.on('gameUpdated', (gameState) => {
      console.log('Game updated:', gameState);
      this.gameState = gameState;
      this.isMyTurn = gameState.currentPlayerId === this.playerId;

      // Check if player needs to discard
      const player = gameState.players.find(p => p.id === this.playerId);
      if (player && player.needsDiscard) {
        this.needsDiscard = true;
      } else {
        this.needsDiscard = false;
      }

      // Update opponent ID whenever game state changes
      this.updateOpponentId();

      // Request hand if it's my turn
      if (this.isMyTurn) {
        this.requestHand();
      }

      // Notify UI
      if (this.onGameUpdated) {
        this.onGameUpdated(gameState);
      }
    });

    this.socket.on('gameOver', ({ winner, finalState }) => {
      console.log('Game over. Winner:', winner);

      // Store the final state and game ID before cleanup
      this.gameState = finalState;
      const gameIdToRemove = this.gameId;

      // Immediately tell the server to close the game
      if (this.socket) {
        console.log('Notifying server that game is over, sending endGame event');
        this.socket.emit('endGame', { gameId: gameIdToRemove });
      }

      // Notify UI
      if (this.onGameOver) {
        this.onGameOver(winner, finalState, gameIdToRemove);
      }

      // Clear game state but keep socket connection
      // We don't call leaveGame() here because we want to keep the socket connection
      // for the game over screen
      this.gameId = null;
      this.playerId = null;
      this.hand = [];
      this.opponentId = null;
    });

    this.socket.on('playerDisconnected', ({ playerName }) => {
      console.log('Player disconnected:', playerName);

      // Notify UI
      if (this.onPlayerDisconnected) {
        this.onPlayerDisconnected(playerName);
      }
    });

    this.socket.on('gameError', (errorMessage) => {
      console.error('Game error:', errorMessage);

      // Notify UI
      if (this.onGameError) {
        this.onGameError(errorMessage);
      }
    });

    this.socket.on('handUpdated', (hand) => {
      console.log('Hand updated from server:', hand);
      this.hand = hand;

      // Notify UI
      if (this.onHandUpdated) {
        console.log('Calling onHandUpdated with hand:', hand);
        this.onHandUpdated(hand);
      } else {
        console.error('onHandUpdated callback is not set!');
      }
    });

    // Add a manual request for hand after a short delay
    setTimeout(() => {
      console.log('Requesting hand data from server...');
      if (this.gameId && this.playerId) {
        this.requestHand();
      } else {
        console.warn('Cannot request hand: gameId or playerId not set');
      }
    }, 3000);

    this.socket.on('coupFourreOpportunity', ({ hazard, cardIndex }) => {
      console.log('Coup Fourré opportunity:', hazard, 'Card index:', cardIndex);

      // Notify UI
      if (this.onCoupFourreOpportunity) {
        this.onCoupFourreOpportunity(hazard, cardIndex);
      }
    });

    this.socket.on('needsDiscard', () => {
      console.log('Player needs to discard a card');
      this.needsDiscard = true;

      // Notify UI
      if (this.onNeedsDiscard) {
        this.onNeedsDiscard();
      }
    });

    this.socket.on('cardExchanged', ({ discarded, drawn }) => {
      console.log('Card exchanged - Discarded:', discarded, 'Drew:', drawn);

      // Notify UI
      if (this.onCardExchanged) {
        this.onCardExchanged(discarded, drawn);
      }
    });

    this.socket.on('gameEnded', ({ gameId, reason, playerName }) => {
      console.log(`Game ended: ${gameId}, Reason: ${reason}, Player: ${playerName}`);

      // Notify UI
      if (this.onGameEnded) {
        this.onGameEnded(gameId, reason, playerName);
      }

      // Clear game state but keep socket connection
      this.gameId = null;
      this.playerId = null;
      this.gameState = null;
      this.hand = [];
      this.opponentId = null;
    });

    this.socket.on('playerLeft', ({ playerName, playerId }) => {
      console.log(`Player left: ${playerName} (${playerId})`);

      // Notify UI
      if (this.onPlayerLeft) {
        this.onPlayerLeft(playerName, playerId);
      }
    });
  }

  // Join a game
  joinGame(playerName, gameId = null) {
    this.playerName = playerName;
    if (!gameId) {
      // Generate a random game ID if none provided
      gameId = 'game_' + Math.random().toString(36).substring(2, 8);
    }
    this.socket.emit('joinGame', gameId, playerName);
  }

  // Play a card
  playCard(cardIndex, targetPlayerId = null) {
    if (!this.isMyTurn) {
      console.error('Not your turn');
      return false;
    }

    // Get the card being played
    const card = this.hand[cardIndex];
    if (!card) {
      console.error('Invalid card index');
      return false;
    }

    console.log('Playing card:', card);
    console.log('Current player ID:', this.playerId);
    console.log('Current opponent ID:', this.opponentId);

    // Make sure opponent ID is set
    if (!this.opponentId) {
      console.warn('Opponent ID not set, updating now...');
      this.updateOpponentId();

      if (!this.opponentId) {
        console.error('Failed to determine opponent ID');
        return false;
      }
    }

    // Determine the correct target based on card type
    let finalTargetId = targetPlayerId;

    if (card.type === 'distance' || card.type === 'remedy' || card.type === 'safety') {
      // These cards can only be played on yourself
      finalTargetId = this.playerId;
      console.log(`Card type ${card.type} must target self: ${finalTargetId}`);
    } else if (card.type === 'hazard') {
      // Hazard cards can only be played on opponent
      finalTargetId = this.opponentId;
      console.log(`Card type ${card.type} must target opponent: ${finalTargetId}`);
    }

    console.log(`Playing card ${cardIndex} (${card.type}) on target: ${finalTargetId}`);

    // Double check that hazards are not targeting self
    if (card.type === 'hazard' && finalTargetId === this.playerId) {
      console.error('ERROR: Hazard card targeting self! Fixing target to opponent.');
      finalTargetId = this.opponentId;
    }

    this.socket.emit('playCard', {
      gameId: this.gameId,
      playerId: this.playerId,
      cardIndex,
      targetPlayerId: finalTargetId
    });

    return true;
  }

  // Draw a card
  drawCard() {
    if (!this.isMyTurn) {
      console.error('Not your turn');
      return false;
    }

    this.socket.emit('drawCard', {
      gameId: this.gameId,
      playerId: this.playerId
    });

    return true;
  }

  // Discard a card
  discardCard(cardIndex) {
    if (!this.needsDiscard) {
      console.error('No need to discard');
      return false;
    }

    if (cardIndex < 0 || cardIndex >= this.hand.length) {
      console.error('Invalid card index');
      return false;
    }

    this.socket.emit('discardCard', {
      gameId: this.gameId,
      playerId: this.playerId,
      cardIndex
    });

    return true;
  }

  // Request current hand from server
  requestHand() {
    console.log(`Requesting hand with gameId: ${this.gameId}, playerId: ${this.playerId}`);
    if (!this.gameId || !this.playerId) {
      console.error('Cannot request hand: gameId or playerId not set');
      return;
    }

    this.socket.emit('getHand', {
      gameId: this.gameId,
      playerId: this.playerId
    });
  }

  // Leave a game
  leaveGame() {
    if (!this.gameId) {
      console.error('Cannot leave game: gameId not set');
      return false;
    }

    console.log(`Leaving game: ${this.gameId}`);

    // Send both leaveGame and endGame events to ensure the server cleans up
    this.socket.emit('leaveGame', {
      gameId: this.gameId,
      playerId: this.playerId
    });

    // Also send an explicit endGame event
    this.socket.emit('endGame', {
      gameId: this.gameId
    });

    // Clear game state
    const gameIdToRemove = this.gameId;
    this.gameId = null;
    this.playerId = null;
    this.gameState = null;
    this.hand = [];
    this.opponentId = null;

    return gameIdToRemove;
  }

  // Update opponent ID
  updateOpponentId() {
    console.log('Updating opponent ID. Current state:', {
      gameState: this.gameState ? 'exists' : 'null',
      players: this.gameState?.players?.length || 0,
      playerId: this.playerId,
      currentOpponentId: this.opponentId
    });

    if (this.gameState && this.gameState.players && this.gameState.players.length > 1) {
      const opponent = this.gameState.players.find(p => p.id !== this.playerId);
      if (opponent) {
        this.opponentId = opponent.id;
        console.log(`Found opponent: ${opponent.name} (${opponent.id})`);
      } else {
        console.warn('No opponent found in players list:', this.gameState.players);
      }
    } else {
      console.warn('Cannot update opponent ID: gameState or players not available');
    }

    console.log('Updated opponentId to:', this.opponentId);
  }

  // Get player by ID
  getPlayer(playerId) {
    if (!this.gameState || !this.gameState.players) return null;
    return this.gameState.players.find(p => p.id === playerId);
  }

  // Get current player
  getCurrentPlayer() {
    return this.getPlayer(this.playerId);
  }

  // Get opponent player
  getOpponent() {
    return this.getPlayer(this.opponentId);
  }

  // Check if it's my turn
  isMyTurn() {
    return this.gameState && this.gameState.currentPlayerId === this.playerId;
  }
}

// Export for use in other files
window.GameClient = GameClient;
window.CardType = CardType;
window.getCardDetails = getCardDetails;
