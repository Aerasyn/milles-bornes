/**
 * Milles Bornes Game Implementation
 */

// Card types
const CardType = {
  DISTANCE: 'distance',
  HAZARD: 'hazard',
  REMEDY: 'remedy',
  SAFETY: 'safety'
};

// Card definitions
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
  { id: 'r_repairs', type: CardType.REMEDY, name: 'Repairs', remedies: 'Accident', count: 6 },
  { id: 'r_gasoline', type: CardType.REMEDY, name: 'Gasoline', remedies: 'Out of Gas', count: 6 },
  { id: 'r_sparetire', type: CardType.REMEDY, name: 'Spare Tire', remedies: 'Flat Tire', count: 6 },
  { id: 'r_endoflimit', type: CardType.REMEDY, name: 'End of Speed Limit', remedies: 'Speed Limit', count: 6 },
  { id: 'r_go', type: CardType.REMEDY, name: 'Go', remedies: 'Stop', count: 14 },

  // Safety cards
  { id: 's_drivingace', type: CardType.SAFETY, name: 'Driving Ace', protects: 'Accident', count: 1 },
  { id: 's_fueltank', type: CardType.SAFETY, name: 'Fuel Tank', protects: 'Out of Gas', count: 1 },
  { id: 's_punctureproof', type: CardType.SAFETY, name: 'Puncture-Proof', protects: 'Flat Tire', count: 1 },
  { id: 's_righofway', type: CardType.SAFETY, name: 'Right of Way', protects: ['Stop', 'Speed Limit'], count: 1 }
];

class Game {
  constructor(id) {
    this.id = id;
    this.players = [];
    this.deck = [];
    this.discardPile = [];
    this.currentPlayerIndex = 0;
    this.started = false;
    this.winner = null;
    this.pendingCoupFourre = null; // For Coup Fourré rule

    // Initialize the deck
    this.initializeDeck();
  }

  initializeDeck() {
    this.deck = [];

    // Add cards to the deck based on their count
    CARDS.forEach(card => {
      for (let i = 0; i < card.count; i++) {
        this.deck.push({
          ...card,
          id: `${card.id}_${i + 1}`
        });
      }
    });

    // Shuffle the deck
    this.shuffleDeck();
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  addPlayer(name, socketId) {
    if (this.players.length >= 2) {
      throw new Error('Game is full');
    }

    const playerId = `player_${this.players.length + 1}`;

    // Create player with empty hand
    const player = {
      id: playerId,
      name,
      socketId,
      hand: [],
      battle: {
        distance: 0,
        speedLimit: false,
        hazard: 'Stop', // Players start with a Stop hazard and need a Go card to begin
        safeties: []
      }
    };

    // Deal 6 cards to the player immediately
    // This ensures players have cards even before the game officially starts
    for (let i = 0; i < 6; i++) {
      player.hand.push(this.drawCardFromDeck());
    }

    this.players.push(player);

    return playerId;
  }

  start() {
    if (this.players.length !== 2) {
      throw new Error('Need exactly 2 players to start');
    }

    if (this.started) {
      throw new Error('Game already started');
    }

    // Players already have cards (dealt when they joined)
    // Just mark the game as started and choose first player

    this.started = true;
    this.currentPlayerIndex = Math.floor(Math.random() * 2); // Randomly choose first player

    return this.getState();
  }

  drawCardFromDeck() {
    if (this.deck.length === 0) {
      // Reshuffle discard pile if deck is empty
      if (this.discardPile.length === 0) {
        throw new Error('No cards left in the game');
      }

      this.deck = [...this.discardPile];
      this.discardPile = [];
      this.shuffleDeck();
    }

    return this.deck.pop();
  }

  drawCard(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);

    if (playerIndex === -1) {
      throw new Error('Player not found');
    }

    if (playerIndex !== this.currentPlayerIndex) {
      throw new Error('Not your turn');
    }

    const player = this.players[playerIndex];

    // Check if player's hand is already at maximum size
    if (player.hand.length >= 6) {
      // Don't draw a card, but set a flag indicating player needs to discard
      player.needsDiscard = true;
      return { needsDiscard: true };
    }

    // Draw a card and add it to the player's hand
    const card = this.drawCardFromDeck();
    player.hand.push(card);

    // Move to the next player only if we don't need to discard
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;

    return { card };
  }

  playCard(playerId, cardIndex, targetPlayerId = null) {
    console.log(`Server: playCard called with playerId=${playerId}, cardIndex=${cardIndex}, targetPlayerId=${targetPlayerId}`);

    const playerIndex = this.players.findIndex(p => p.id === playerId);

    if (playerIndex === -1) {
      throw new Error('Player not found');
    }

    // Check for Coup Fourré situation
    if (this.pendingCoupFourre && this.pendingCoupFourre.playerId !== playerId) {
      throw new Error('Waiting for potential Coup Fourré response');
    }

    // Clear any pending Coup Fourré if the player whose turn it is plays
    if (this.pendingCoupFourre && this.pendingCoupFourre.playerId === playerId) {
      this.pendingCoupFourre = null;
    }

    // Normal turn check (skip for Coup Fourré)
    if (playerIndex !== this.currentPlayerIndex && !this.pendingCoupFourre) {
      throw new Error('Not your turn');
    }

    const player = this.players[playerIndex];
    console.log(`Server: Player found: ${player.name} (${player.id})`);

    if (cardIndex < 0 || cardIndex >= player.hand.length) {
      throw new Error('Invalid card index');
    }

    const card = player.hand[cardIndex];
    console.log(`Server: Card being played: ${card.type} ${card.name || card.value}`);

    let targetPlayer = player; // Default target is self

    // If targetPlayerId is provided, find the target player
    if (targetPlayerId) {
      const targetIndex = this.players.findIndex(p => p.id === targetPlayerId);
      if (targetIndex === -1) {
        throw new Error('Target player not found');
      }
      targetPlayer = this.players[targetIndex];
      console.log(`Server: Target player: ${targetPlayer.name} (${targetPlayer.id})`);
    } else {
      console.log(`Server: No target player ID provided, defaulting to self`);
    }

    // For hazard cards, make sure target is not self
    if (card.type === CardType.HAZARD && targetPlayer.id === player.id) {
      console.error(`Server: ERROR - Hazard card targeting self! Finding opponent...`);
      const opponentIndex = this.players.findIndex(p => p.id !== player.id);
      if (opponentIndex !== -1) {
        targetPlayer = this.players[opponentIndex];
        console.log(`Server: Fixed target to opponent: ${targetPlayer.name} (${targetPlayer.id})`);
      }
    }

    // Check if the card can be played
    this.validateCardPlay(player, targetPlayer, card);

    // Remove the card from the player's hand
    player.hand.splice(cardIndex, 1);

    // Apply the card effect
    this.applyCardEffect(player, targetPlayer, card);

    // Tag 200-mile cards with the player who played them
    if (card.type === CardType.DISTANCE && card.value === 200) {
      card.playedBy = player.id;
    }
    // Add the card to the discard pile
    this.discardPile.push(card);

    // Check if the game is over
    if (this.isGameOver()) {
      this.winner = this.getWinner();
    } else {
      // Move to the next player (unless it was a safety card which gives an extra turn)
      if (card.type !== CardType.SAFETY) {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      }

      // If a hazard was played, check for potential Coup Fourré
      if (card.type === CardType.HAZARD) {
        const opponentIndex = this.players.findIndex(p => p.id === targetPlayer.id);
        const opponent = this.players[opponentIndex];

        // Check if opponent has the corresponding safety card in hand
        let safetyCardIndex = -1;
        let safetyCard = null;

        if (card.name === 'Accident') {
          safetyCardIndex = opponent.hand.findIndex(c => c.name === 'Driving Ace');
        } else if (card.name === 'Out of Gas') {
          safetyCardIndex = opponent.hand.findIndex(c => c.name === 'Fuel Tank');
        } else if (card.name === 'Flat Tire') {
          safetyCardIndex = opponent.hand.findIndex(c => c.name === 'Puncture-Proof');
        } else if (card.name === 'Stop' || card.name === 'Speed Limit') {
          safetyCardIndex = opponent.hand.findIndex(c => c.name === 'Right of Way');
        }

        if (safetyCardIndex !== -1) {
          safetyCard = opponent.hand[safetyCardIndex];
          // Set up pending Coup Fourré
          this.pendingCoupFourre = {
            playerId: opponent.id,
            cardIndex: safetyCardIndex,
            hazard: card.name
          };
        }
      }
    }

    return this.getState();
  }

  validateCardPlay(player, targetPlayer, card) {
    // Different validation based on card type
    switch (card.type) {
      case CardType.DISTANCE:
        // Can only play distance cards on yourself
        if (targetPlayer.id !== player.id) {
          throw new Error('Can only play distance cards on yourself');
        }

        // Can't play if you have a hazard
        if (targetPlayer.battle.hazard) {
          throw new Error('Cannot play distance cards while affected by a hazard');
        }

        // Speed Limit restricts distance cards to 50 miles or less
        if (targetPlayer.battle.speedLimit && card.value > 50) {
          throw new Error(`Cannot play ${card.value} miles while under speed limit. Maximum is 50 miles.`);
        }

        // Limit of two 200-mile cards PER PLAYER
        if (card.value === 200) {
          // Count 200-mile cards in discard pile played by this player
          let count200Miles = 0;
          this.discardPile.forEach(c => {
            if (c.type === CardType.DISTANCE && c.value === 200 && c.playedBy === player.id) {
              count200Miles++;
            }
          });
          if (count200Miles >= 2) {
            throw new Error('Cannot play more than two 200-mile cards');
          }
        }

        // Can't exceed 1000 miles
        if (targetPlayer.battle.distance + card.value > 1000) {
          throw new Error('Cannot exceed 1000 miles');
        }
        break;

      case CardType.HAZARD:
        // Can only play hazards on opponents
        if (targetPlayer.id === player.id) {
          throw new Error('Cannot play hazards on yourself');
        }

        // Can't play if opponent has a safety card that protects against this hazard
        if (card.name === 'Accident' && targetPlayer.battle.safeties.includes('Driving Ace')) {
          throw new Error('Target is protected by Driving Ace');
        }
        if (card.name === 'Out of Gas' && targetPlayer.battle.safeties.includes('Fuel Tank')) {
          throw new Error('Target is protected by Fuel Tank');
        }
        if (card.name === 'Flat Tire' && targetPlayer.battle.safeties.includes('Puncture-Proof')) {
          throw new Error('Target is protected by Puncture-Proof');
        }
        if ((card.name === 'Stop' || card.name === 'Speed Limit') &&
            targetPlayer.battle.safeties.includes('Right of Way')) {
          throw new Error('Target is protected by Right of Way');
        }

        // Can't play a hazard if opponent already has one (except Speed Limit)
        if (targetPlayer.battle.hazard && card.name !== 'Speed Limit') {
          throw new Error('Target already has a hazard');
        }
        break;

      case CardType.REMEDY:
        // Can only play remedies on yourself
        if (targetPlayer.id !== player.id) {
          throw new Error('Can only play remedies on yourself');
        }

        // Check if the remedy matches the hazard
        if (card.name === 'Repairs' && targetPlayer.battle.hazard !== 'Accident') {
          throw new Error('No accident to repair');
        }
        if (card.name === 'Gasoline' && targetPlayer.battle.hazard !== 'Out of Gas') {
          throw new Error('Not out of gas');
        }
        if (card.name === 'Spare Tire' && targetPlayer.battle.hazard !== 'Flat Tire') {
          throw new Error('No flat tire to fix');
        }
        if (card.name === 'End of Speed Limit' && !targetPlayer.battle.speedLimit) {
          throw new Error('No speed limit in effect');
        }
        if (card.name === 'Go' && targetPlayer.battle.hazard !== 'Stop') {
          throw new Error('Not stopped');
        }
        break;

      case CardType.SAFETY:
        // Can only play safeties on yourself
        if (targetPlayer.id !== player.id) {
          throw new Error('Can only play safeties on yourself');
        }
        break;

      case CardType.ATTACK:
        // Can only play attacks on opponents
        if (targetPlayer.id === player.id) {
          throw new Error('Cannot play attacks on yourself');
        }

        // Can't play if opponent has Right of Way
        if (targetPlayer.battle.safeties.includes('Right of Way')) {
          throw new Error('Target is protected by Right of Way');
        }
        break;
    }
  }

  applyCardEffect(player, targetPlayer, card) {
    switch (card.type) {
      case CardType.DISTANCE:
        targetPlayer.battle.distance += card.value;
        break;

      case CardType.HAZARD:
        if (card.name === 'Speed Limit') {
          targetPlayer.battle.speedLimit = true;
        } else {
          targetPlayer.battle.hazard = card.name;
        }
        break;

      case CardType.REMEDY:
        if (card.name === 'End of Speed Limit') {
          targetPlayer.battle.speedLimit = false;
        } else {
          targetPlayer.battle.hazard = null;
        }
        break;

      case CardType.SAFETY:
        targetPlayer.battle.safeties.push(card.name);

        // REMOVED: The incorrect 100 miles safety bonus
        // Safety cards should NOT add distance miles

        // Remove any corresponding hazard
        if (card.name === 'Driving Ace' && targetPlayer.battle.hazard === 'Accident') {
          targetPlayer.battle.hazard = null;
        }
        if (card.name === 'Fuel Tank' && targetPlayer.battle.hazard === 'Out of Gas') {
          targetPlayer.battle.hazard = null;
        }
        if (card.name === 'Puncture-Proof' && targetPlayer.battle.hazard === 'Flat Tire') {
          targetPlayer.battle.hazard = null;
        }
        if (card.name === 'Right of Way' &&
            (targetPlayer.battle.hazard === 'Stop' || targetPlayer.battle.speedLimit)) {
          // Right of Way only removes Stop hazard and Speed Limit
          if (targetPlayer.battle.hazard === 'Stop') {
            targetPlayer.battle.hazard = null;
          }
          targetPlayer.battle.speedLimit = false;
        }

        // Player gets another turn after playing a safety
        this.currentPlayerIndex = this.players.findIndex(p => p.id === player.id);

        // If this was a Coup Fourré, clear the pending state
        if (this.pendingCoupFourre && this.pendingCoupFourre.playerId === player.id) {
          this.pendingCoupFourre = null;
        }
        break;
    }
  }

  isGameOver() {
    return this.players.some(player => player.battle.distance >= 1000);
  }

  getWinner() {
    if (!this.isGameOver()) {
      return null;
    }

    const winnerIndex = this.players.findIndex(player => player.battle.distance >= 1000);
    return this.players[winnerIndex].id;
  }

  getState() {
    return {
      id: this.id,
      players: this.players.map(player => ({
        id: player.id,
        name: player.name,
        handSize: player.hand.length,
        battle: player.battle,
        needsDiscard: player.needsDiscard || false
      })),
      currentPlayerId: this.players[this.currentPlayerIndex]?.id,
      deckSize: this.deck.length,
      discardPileSize: this.discardPile.length,
      started: this.started,
      winner: this.winner
    };
  }

  // Discard a card from player's hand
  discardCard(playerId, cardIndex) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);

    if (playerIndex === -1) {
      throw new Error('Player not found');
    }

    const player = this.players[playerIndex];

    // Check if player needs to discard
    if (!player.needsDiscard) {
      throw new Error('Player does not need to discard');
    }

    if (cardIndex < 0 || cardIndex >= player.hand.length) {
      throw new Error('Invalid card index');
    }

    // Remove the card from the player's hand
    const discardedCard = player.hand.splice(cardIndex, 1)[0];

    // Add the card to the discard pile
    this.discardPile.push(discardedCard);

    // Clear the needsDiscard flag
    player.needsDiscard = false;

    // Draw a new card to replace the discarded one
    // This ensures the player maintains 6 cards after discarding
    const newCard = this.drawCardFromDeck();
    player.hand.push(newCard);

    // Move to the next player
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;

    return { discardedCard, newCard };
  }

  // Get player's hand (only for the specific player)
  getPlayerHand(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    return player.hand;
  }
}

module.exports = { Game, CardType, CARDS };
