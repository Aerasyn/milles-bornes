/**
 * UI handling for the Milles Bornes game
 */

// Card descriptions for tooltips
const CardDescriptions = {
  // Distance cards
  '25': 'Adds 25 miles to your distance.',
  '50': 'Adds 50 miles to your distance.',
  '75': 'Adds 75 miles to your distance.',
  '100': 'Adds 100 miles to your distance.',
  '200': 'Adds 200 miles to your distance. Cannot be played under Speed Limit.',

  // Hazards
  'Accident': 'Stops opponent\'s movement until they play Repairs.',
  'Out of Gas': 'Stops opponent\'s movement until they play Gasoline.',
  'Flat Tire': 'Stops opponent\'s movement until they play Spare Tire.',
  'Speed Limit': 'Limits opponent to playing only 25 and 50 mile cards until they play End of Speed Limit.',
  'Stop': 'Stops opponent\'s movement until they play Go.',

  // Remedies
  'Repairs': 'Removes an Accident hazard, allowing you to move again.',
  'Gasoline': 'Removes an Out of Gas hazard, allowing you to move again.',
  'Spare Tire': 'Removes a Flat Tire hazard, allowing you to move again.',
  'End of Speed Limit': 'Removes a Speed Limit, allowing you to play any distance card.',
  'Go': 'Removes a Stop hazard, allowing you to move again.',

  // Safety cards
  'Driving Ace': 'Protects against Accident hazards for the rest of the game.',
  'Fuel Tank': 'Protects against Out of Gas hazards for the rest of the game.',
  'Puncture-Proof': 'Protects against Flat Tire hazards for the rest of the game.',
  'Right of Way': 'Protects against Stop and Speed Limit hazards for the rest of the game.'
};

class GameUI {
  constructor() {
    // Screens
    this.loginScreen = document.getElementById('login-screen');
    this.waitingScreen = document.getElementById('waiting-screen');
    this.gameScreen = document.getElementById('game-screen');
    this.gameOverScreen = document.getElementById('game-over-screen');

    // Login form elements
    this.playerNameInput = document.getElementById('player-name');
    this.gameIdInput = document.getElementById('game-id');
    this.serverUrlInput = document.getElementById('server-url');
    this.joinBtn = document.getElementById('join-btn'); // Legacy button
    this.loginBtn = document.getElementById('login-btn'); // New lobby login button

    // Initialize audio manager
    this.audioManager = new AudioManager();

    // Card tooltip element
    this.cardTooltip = document.createElement('div');
    this.cardTooltip.className = 'card-tooltip';
    this.cardTooltip.style.display = 'none';
    document.body.appendChild(this.cardTooltip);

    // Discard modal
    this.discardModal = document.getElementById('discard-modal');
    this.discardCardsContainer = document.getElementById('discard-cards');
    this.closeDiscardBtn = document.querySelector('.close-discard-btn');
    this.discardCancelBtn = document.getElementById('discard-cancel-btn');

    // Exit game elements
    this.exitGameBtn = document.getElementById('exit-game-btn');
    this.exitConfirmModal = document.getElementById('exit-confirm-modal');
    this.closeExitBtn = document.querySelector('.close-exit-btn');
    this.exitCancelBtn = document.getElementById('exit-cancel-btn');
    this.exitConfirmBtn = document.getElementById('exit-confirm-btn');

    // Waiting screen elements
    this.waitingGameId = document.getElementById('waiting-game-id');

    // Game screen elements
    this.opponentAreaEl = document.getElementById('opponent-area');
    this.opponentNameEl = document.getElementById('opponent-name');
    this.opponentCardsEl = document.getElementById('opponent-cards');
    this.opponentDistanceEl = document.getElementById('opponent-distance');
    this.opponentSafetiesEl = document.getElementById('opponent-safeties');
    this.opponentHazardEl = document.getElementById('opponent-hazard');
    this.opponentSpeedLimitEl = document.getElementById('opponent-speed-limit');
    this.opponentTurnIndicatorEl = document.getElementById('opponent-turn-indicator');

    this.deckEl = document.getElementById('deck');
    this.deckCountEl = document.getElementById('deck-count');
    this.discardPileEl = document.getElementById('discard-pile');
    this.discardCountEl = document.getElementById('discard-count');
    this.gameStatusEl = document.getElementById('game-status');

    this.playerAreaEl = document.getElementById('player-area');
    this.playerNameEl = document.getElementById('player-name');
    this.playerCardsEl = document.getElementById('player-cards');
    this.playerDistanceEl = document.getElementById('player-distance');
    this.playerSafetiesEl = document.getElementById('player-safeties');
    this.playerHazardEl = document.getElementById('player-hazard');
    this.playerSpeedLimitEl = document.getElementById('player-speed-limit');
    this.playerHandEl = document.getElementById('player-hand');
    this.playerTurnIndicatorEl = document.getElementById('player-turn-indicator');
    this.drawBtn = document.getElementById('draw-btn');

    // Track the current player's turn for animation
    this.currentTurnPlayerId = null;

    // Game over screen elements
    this.winnerTextEl = document.getElementById('winner-text');
    this.newGameBtn = document.getElementById('new-game-btn');

    // Error modal elements
    this.errorModal = document.getElementById('error-modal');
    this.errorMessageEl = document.getElementById('error-message');
    this.closeBtn = document.querySelector('.close-btn');

    // Message modal elements
    this.messageModal = document.getElementById('message-modal');
    this.messageTextEl = document.getElementById('message-text');
    this.closeMessageBtn = document.querySelector('.close-message-btn');
    this.messageOkBtn = document.getElementById('message-ok-btn');

    // Initialize event listeners
    this.initEventListeners();
  }

  // Initialize event listeners
  initEventListeners() {
    // Close error modal when clicking the close button
    this.closeBtn.addEventListener('click', () => {
      this.hideErrorModal();
    });

    // Close error modal when clicking anywhere on the modal background
    this.errorModal.addEventListener('click', (event) => {
      if (event.target === this.errorModal) {
        this.hideErrorModal();
      }
    });

    // Close error modal when pressing Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.errorModal.classList.contains('hidden')) {
        this.hideErrorModal();
      }
    });

    // Message modal event listeners
    this.closeMessageBtn.addEventListener('click', () => {
      this.hideMessageModal();
    });

    this.messageOkBtn.addEventListener('click', () => {
      this.hideMessageModal();
    });

    // Close message modal when clicking anywhere on the modal background
    this.messageModal.addEventListener('click', (event) => {
      if (event.target === this.messageModal) {
        this.hideMessageModal();
      }
    });

    // Close message modal when pressing Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.messageModal.classList.contains('hidden')) {
        this.hideMessageModal();
      }
    });

    // New game button
    this.newGameBtn.addEventListener('click', () => {
      this.showScreen('login');
    });
  }

  // Show a specific screen
  showScreen(screenName) {
    // Hide all screens
    this.loginScreen.classList.add('hidden');
    this.waitingScreen.classList.add('hidden');
    this.gameScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');

    // Also hide lobby screen if it exists
    const lobbyScreen = document.getElementById('lobby-screen');
    if (lobbyScreen) {
      lobbyScreen.classList.add('hidden');
    }

    // Show the requested screen
    switch (screenName) {
      case 'login':
        this.loginScreen.classList.remove('hidden');
        break;
      case 'waiting':
        this.waitingScreen.classList.remove('hidden');
        break;
      case 'game':
        this.gameScreen.classList.remove('hidden');
        break;
      case 'gameOver':
        this.gameOverScreen.classList.remove('hidden');
        break;
      case 'lobby':
        if (lobbyScreen) {
          lobbyScreen.classList.remove('hidden');
        }
        break;
    }
  }

  // Hide a specific screen
  hideScreen(screenName) {
    switch (screenName) {
      case 'login':
        this.loginScreen.classList.add('hidden');
        break;
      case 'waiting':
        this.waitingScreen.classList.add('hidden');
        break;
      case 'game':
        this.gameScreen.classList.add('hidden');
        break;
      case 'gameOver':
        this.gameOverScreen.classList.add('hidden');
        break;
      case 'lobby':
        const lobbyScreen = document.getElementById('lobby-screen');
        if (lobbyScreen) {
          lobbyScreen.classList.add('hidden');
        }
        break;
    }
  }

  // Show waiting screen with game ID
  showWaitingScreen(gameId) {
    this.waitingGameId.textContent = gameId;
    this.showScreen('waiting');
  }

  // Show game screen and initialize UI
  showGameScreen(gameState, playerId) {
    this.showScreen('game');
    this.updateGameUI(gameState, playerId);
  }

  // Show game over screen
  showGameOverScreen(winner, playerName, opponentName) {
    if (winner === 'draw') {
      this.winnerTextEl.textContent = "It's a draw!";
    } else if (winner === playerName) {
      this.winnerTextEl.textContent = "You won! Congratulations!";
    } else {
      this.winnerTextEl.textContent = `${opponentName} won!`;
    }
    this.showScreen('gameOver');
  }

  // Show error modal
  showErrorModal(message, focusElementId = null) {
    this.errorMessageEl.textContent = message;
    this.errorModal.classList.remove('hidden');

    // Store the ID of the element to focus after closing the modal
    this.pendingFocusElementId = focusElementId;
  }

  // Hide error modal
  hideErrorModal() {
    this.errorModal.classList.add('hidden');

    // If there's a pending element to focus, focus it
    if (this.pendingFocusElementId) {
      const elementToFocus = document.getElementById(this.pendingFocusElementId);
      if (elementToFocus) {
        // Use a small timeout to ensure the modal is fully hidden
        setTimeout(() => {
          elementToFocus.focus();
        }, 100);
      }
      this.pendingFocusElementId = null;
    }
  }

  // Show message modal
  showMessageModal(message, focusElementId = null) {
    this.messageTextEl.textContent = message;
    this.messageModal.classList.remove('hidden');

    // Store the ID of the element to focus after closing the modal
    this.pendingFocusElementId = focusElementId;
  }

  // Hide message modal
  hideMessageModal() {
    this.messageModal.classList.add('hidden');

    // Hide the card exchange container
    const cardExchangeContainer = document.getElementById('card-exchange-container');
    if (cardExchangeContainer) {
      cardExchangeContainer.classList.add('hidden');
    }

    // If there's a pending element to focus, focus it
    if (this.pendingFocusElementId) {
      const elementToFocus = document.getElementById(this.pendingFocusElementId);
      if (elementToFocus) {
        // Use a small timeout to ensure the modal is fully hidden
        setTimeout(() => {
          elementToFocus.focus();
        }, 100);
      }
      this.pendingFocusElementId = null;
    }
  }

  // Update the game UI based on game state
  updateGameUI(gameState, playerId, animations = {}) {
    if (!gameState || !gameState.players) return;

    // Find player and opponent
    const player = gameState.players.find(p => p.id === playerId);
    const opponent = gameState.players.find(p => p.id !== playerId);

    if (!player || !opponent) return;

    // Update player info
    this.playerNameEl.textContent = player.name;
    this.playerCardsEl.textContent = `Cards: ${player.handSize}`;
    this.playerDistanceEl.textContent = player.battle.distance;

    // Update opponent info
    this.opponentNameEl.textContent = opponent.name;
    this.opponentCardsEl.textContent = `Cards: ${opponent.handSize}`;
    this.opponentDistanceEl.textContent = opponent.battle.distance;

    // Update deck and discard pile
    this.deckCountEl.textContent = gameState.deckSize;
    this.discardCountEl.textContent = gameState.discardPileSize;

    // Check if turn has changed
    const turnChanged = this.currentTurnPlayerId !== gameState.currentPlayerId;
    this.currentTurnPlayerId = gameState.currentPlayerId;

    // Play turn change sound if turn changed
    if (turnChanged && this.audioManager) {
      this.audioManager.play('turn-change');
    }

    // Update game status and turn indicators
    if (gameState.winner) {
      // Game over state
      const winner = gameState.players.find(p => p.id === gameState.winner);
      this.gameStatusEl.textContent = `Game over! ${winner.name} wins!`;

      // Reset turn indicators
      this.playerTurnIndicatorEl.classList.remove('active');
      this.opponentTurnIndicatorEl.classList.remove('active');

      // Reset player area highlights
      this.playerAreaEl.classList.remove('active-turn', 'turn-changed');
      this.opponentAreaEl.classList.remove('active-turn', 'turn-changed');

      this.drawBtn.disabled = true;
    } else if (gameState.currentPlayerId === playerId) {
      // Player's turn
      this.gameStatusEl.textContent = "YOUR TURN";
      this.drawBtn.disabled = false;

      // Update draw button text if player needs to discard
      if (player.needsDiscard) {
        this.drawBtn.textContent = 'Discard & Draw';
      } else {
        this.drawBtn.textContent = 'Draw Card';
      }

      // Update turn indicators
      this.playerTurnIndicatorEl.classList.add('active');
      this.opponentTurnIndicatorEl.classList.remove('active');

      // Update player area highlights
      this.playerAreaEl.classList.add('active-turn');
      this.opponentAreaEl.classList.remove('active-turn');

      // Add turn change animation if turn just changed
      if (turnChanged) {
        // Remove any existing animation classes
        this.playerAreaEl.classList.remove('turn-changed');

        // Force a reflow to restart the animation
        void this.playerAreaEl.offsetWidth;

        // Add the animation class
        this.playerAreaEl.classList.add('turn-changed');
      }
    } else {
      // Opponent's turn
      this.gameStatusEl.textContent = `${opponent.name.toUpperCase()}'S TURN`;
      this.drawBtn.disabled = true;

      // Update turn indicators
      this.playerTurnIndicatorEl.classList.remove('active');
      this.opponentTurnIndicatorEl.classList.add('active');

      // Update player area highlights
      this.playerAreaEl.classList.remove('active-turn');
      this.opponentAreaEl.classList.add('active-turn');

      // Add turn change animation if turn just changed
      if (turnChanged) {
        // Remove any existing animation classes
        this.opponentAreaEl.classList.remove('turn-changed');

        // Force a reflow to restart the animation
        void this.opponentAreaEl.offsetWidth;

        // Add the animation class
        this.opponentAreaEl.classList.add('turn-changed');
      }
    }

    // Update hazards and speed limits with animations if needed
    this.updateBattleArea(player, this.playerHazardEl, this.playerSpeedLimitEl, animations.animatePlayerRemedy);
    this.updateBattleArea(opponent, this.opponentHazardEl, this.opponentSpeedLimitEl, animations.animateOpponentHazard);

    // Update safety cards with animations if needed
    this.updateSafetyCards(player, this.playerSafetiesEl, true, animations.newPlayerSafety);
    this.updateSafetyCards(opponent, this.opponentSafetiesEl, true, animations.newOpponentSafety);
  }

  // Update battle area (hazards and speed limit)
  updateBattleArea(player, hazardEl, speedLimitEl, animate = false) {
    // Update hazard
    if (player.battle.hazard) {
      hazardEl.innerHTML = '';
      hazardEl.classList.remove('hidden');

      const hazardCard = document.createElement('div');
      hazardCard.className = 'card card-hazard';
      hazardCard.dataset.name = player.battle.hazard;

      const nameEl = document.createElement('div');
      nameEl.className = 'card-name';
      nameEl.textContent = player.battle.hazard;
      hazardCard.appendChild(nameEl);

      // Add animation class if requested
      if (animate) {
        hazardCard.classList.add('animate-hazard');
        // Play sound effect
        if (this.audioManager) {
          this.audioManager.play('play-hazard');
        }
      }

      hazardEl.appendChild(hazardCard);
    } else {
      hazardEl.innerHTML = '';
      hazardEl.classList.add('hidden');
    }

    // Update speed limit
    if (player.battle.speedLimit) {
      speedLimitEl.innerHTML = '';
      speedLimitEl.classList.remove('hidden');

      const speedLimitCard = document.createElement('div');
      speedLimitCard.className = 'card card-hazard';
      speedLimitCard.dataset.name = 'Speed Limit';

      const nameEl = document.createElement('div');
      nameEl.className = 'card-name';
      nameEl.textContent = 'Speed Limit';
      speedLimitCard.appendChild(nameEl);

      // Add animation class if requested
      if (animate) {
        speedLimitCard.classList.add('animate-hazard');
        // Play sound effect
        if (this.audioManager) {
          this.audioManager.play('play-hazard');
        }
      }

      speedLimitEl.appendChild(speedLimitCard);
    } else {
      speedLimitEl.innerHTML = '';
      speedLimitEl.classList.add('hidden');
    }
  }

  // Update safety cards display
  updateSafetyCards(player, safetyEl, animate = false, newSafety = null) {
    safetyEl.innerHTML = '';

    if (player.battle.safeties && player.battle.safeties.length > 0) {
      player.battle.safeties.forEach(safety => {
        const safetyCard = document.createElement('div');
        safetyCard.className = 'card card-safety';
        safetyCard.dataset.name = safety;

        const nameEl = document.createElement('div');
        nameEl.className = 'card-name';
        nameEl.textContent = safety;
        safetyCard.appendChild(nameEl);

        // Add animation class if this is the new safety card
        if (animate && newSafety === safety) {
          safetyCard.classList.add('animate-safety');
          // Play sound effect
          if (this.audioManager) {
            this.audioManager.play('play-safety');
          }
        }

        safetyEl.appendChild(safetyCard);
      });
    }
  }

  // Update player's hand
  updatePlayerHand(hand) {
    console.log('Updating player hand with:', hand);
    this.playerHandEl.innerHTML = '';

    if (!hand || hand.length === 0) {
      console.warn('Hand is empty or undefined');
      const placeholderEl = document.createElement('div');
      placeholderEl.className = 'card-placeholder';
      placeholderEl.textContent = 'Waiting for cards...';
      this.playerHandEl.appendChild(placeholderEl);
      return;
    }

    // Group identical cards for stacking
    const cardGroups = [];
    const processed = new Set();

    // Group identical cards
    hand.forEach((card, index) => {
      if (processed.has(index)) return;

      const cards = [card];
      const indices = [index];

      // Find matching cards
      for (let i = index + 1; i < hand.length; i++) {
        if (processed.has(i)) continue;

        const otherCard = hand[i];
        if (card.type === otherCard.type) {
          if (card.type === CardType.DISTANCE && card.value === otherCard.value) {
            cards.push(otherCard);
            indices.push(i);
            processed.add(i);
          } else if (card.type !== CardType.DISTANCE && card.name === otherCard.name) {
            cards.push(otherCard);
            indices.push(i);
            processed.add(i);
          }
        }
      }

      processed.add(index);
      cardGroups.push({ cards, indices });
    });

    console.log('Card groups for stacking:', cardGroups);

    // Render each card group
    cardGroups.forEach(group => {
      const { cards, indices } = group;
      const firstCard = cards[0];
      const firstIndex = indices[0];

      // Create a container for stacked cards
      const stackContainer = document.createElement('div');
      stackContainer.className = 'card-stack-container';
      stackContainer.style.position = 'relative';
      stackContainer.style.display = 'inline-block';
      stackContainer.style.width = '90px';
      stackContainer.style.height = '130px';
      stackContainer.style.margin = '0 5px';

      // Create cards in reverse order (so first card is on top)
      for (let i = cards.length - 1; i >= 0; i--) {
        const card = cards[i];
        const index = indices[i];
        const isTopCard = i === 0;

        const cardEl = document.createElement('div');
        cardEl.className = `card card-${card.type}`;

        // Set data attributes for CSS styling
        if (card.type === CardType.DISTANCE) {
          cardEl.dataset.value = card.value;
        } else {
          cardEl.dataset.name = card.name;
        }

        // Position the card absolutely within the container
        cardEl.style.position = 'absolute';
        cardEl.style.top = `${i * 3}px`;
        cardEl.style.left = `${i * 3}px`;
        cardEl.style.zIndex = `${cards.length - i}`;

        // Add text overlay only to top card
        if (isTopCard) {
          if (card.type === CardType.DISTANCE) {
            const valueEl = document.createElement('div');
            valueEl.className = 'card-value';
            valueEl.textContent = card.value;
            cardEl.appendChild(valueEl);

            const nameEl = document.createElement('div');
            nameEl.className = 'card-name';
            nameEl.textContent = 'Miles';
            cardEl.appendChild(nameEl);
          } else {
            const nameEl = document.createElement('div');
            nameEl.className = 'card-name';
            nameEl.textContent = card.name;
            cardEl.appendChild(nameEl);
          }

          // Add click event only to top card
          cardEl.addEventListener('click', () => {
            console.log(`Playing card at index ${firstIndex} from stack of ${cards.length}`);
            this.onCardClick(firstIndex, firstCard);
          });

          // Add shift+right-click event for card description
          cardEl.addEventListener('contextmenu', (event) => {
            // Only show tooltip if shift key is pressed
            if (event.shiftKey) {
              event.preventDefault();
              this.showCardTooltip(firstCard, event.clientX + 10, event.clientY + 10);

              // Hide tooltip when mouse moves away or after a timeout
              const hideTooltip = () => {
                this.hideCardTooltip();
                document.removeEventListener('mousemove', hideTooltipOnMove);
              };

              const hideTooltipOnMove = (moveEvent) => {
                // Calculate distance from tooltip position
                const dx = moveEvent.clientX - event.clientX;
                const dy = moveEvent.clientY - event.clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Hide if mouse moved more than 100px away
                if (distance > 100) {
                  hideTooltip();
                }
              };

              // Hide tooltip after 5 seconds
              setTimeout(hideTooltip, 5000);

              // Hide tooltip when mouse moves away
              document.addEventListener('mousemove', hideTooltipOnMove);

              // Hide tooltip on any click
              document.addEventListener('click', hideTooltip, { once: true });
            }
          });
        }

        stackContainer.appendChild(cardEl);
      }

      this.playerHandEl.appendChild(stackContainer);
    });
  }

  // Set card click handler
  setCardClickHandler(handler) {
    this.onCardClick = handler;
  }

  // Play animation for a card being played
  animateCardPlay(card, targetPlayerId, playerId) {
    if (!card) return;

    // Determine if this is a card played on self or opponent
    const isOpponentTarget = targetPlayerId !== playerId;

    // Play appropriate sound effect
    if (this.audioManager) {
      this.audioManager.playCardSound(card);
    }

    // For hazard and remedy cards, we'll animate the battle area
    // This will be handled in the updateGameUI method

    // For distance cards, we can animate the distance pile
    if (card.type === 'distance') {
      const distancePile = isOpponentTarget ? this.opponentDistanceEl : this.playerDistanceEl;
      distancePile.parentElement.classList.add('animate-distance');

      // Remove animation class after animation completes
      setTimeout(() => {
        distancePile.parentElement.classList.remove('animate-distance');
      }, 500);
    }
  }

  // Set draw button click handler
  setDrawButtonHandler(handler) {
    this.drawBtn.addEventListener('click', handler);
  }

  // Set join button click handler (legacy method)
  setJoinButtonHandler(handler) {
    // Skip if the join button doesn't exist (using new lobby system)
    if (!this.joinBtn) {
      console.log('Join button not found - using lobby system instead');
      return;
    }

    this.joinBtn.addEventListener('click', () => {
      const playerName = this.playerNameInput.value.trim();
      const gameId = this.gameIdInput.value.trim();
      const serverUrl = this.serverUrlInput.value.trim();

      if (!playerName) {
        this.showErrorModal('Please enter your name');
        return;
      }

      handler(playerName, gameId, serverUrl);
    });
  }

  // Show card description tooltip
  showCardTooltip(card, x, y) {
    let description = '';

    if (card.type === CardType.DISTANCE) {
      description = CardDescriptions[card.value];
    } else {
      description = CardDescriptions[card.name];
    }

    if (!description) {
      description = 'No description available';
    }

    this.cardTooltip.textContent = description;
    this.cardTooltip.style.display = 'block';
    this.cardTooltip.style.left = `${x}px`;
    this.cardTooltip.style.top = `${y}px`;
  }

  // Hide card description tooltip
  hideCardTooltip() {
    this.cardTooltip.style.display = 'none';
  }

  // Show discard modal
  showDiscardModal(hand, onDiscard) {
    // Clear previous cards
    this.discardCardsContainer.innerHTML = '';

    // Check if card text should be shown (respect the toggle setting)
    const showCardTextCheckbox = document.getElementById('show-card-text');
    const shouldShowCardText = showCardTextCheckbox ? showCardTextCheckbox.checked : true;

    // Create a container for the cards that will respect the text toggle
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'discard-cards-wrapper';
    if (!shouldShowCardText) {
      cardsContainer.classList.add('hide-card-text');
    }

    // Add each card to the container
    hand.forEach((card, index) => {
      const cardEl = document.createElement('div');
      cardEl.className = `card card-${card.type}`;
      
      // Set data attributes for styling
      if (card.type === CardType.DISTANCE) {
        cardEl.dataset.value = card.value;
      } else {
        cardEl.dataset.name = card.name;
      }

      // Add text overlay
      if (card.type === CardType.DISTANCE) {
        const valueEl = document.createElement('div');
        valueEl.className = 'card-value';
        valueEl.textContent = card.value;
        cardEl.appendChild(valueEl);

        const nameEl = document.createElement('div');
        nameEl.className = 'card-name';
        nameEl.textContent = 'Miles';
        cardEl.appendChild(nameEl);
      } else {
        const nameEl = document.createElement('div');
        nameEl.className = 'card-name';
        nameEl.textContent = card.name;
        cardEl.appendChild(nameEl);
      }

      // Add click event to discard this card
      cardEl.addEventListener('click', () => {
        onDiscard(index);
        this.hideDiscardModal();
      });

      cardsContainer.appendChild(cardEl);
    });

    // Add the cards container to the discard modal
    this.discardCardsContainer.appendChild(cardsContainer);

    // Add event listener to update text visibility if toggle changes while modal is open
    if (showCardTextCheckbox) {
      const updateTextVisibility = () => {
        if (showCardTextCheckbox.checked) {
          cardsContainer.classList.remove('hide-card-text');
        } else {
          cardsContainer.classList.add('hide-card-text');
        }
      };

      // Store the current listener to remove it when modal closes
      this.textToggleListener = updateTextVisibility;
      showCardTextCheckbox.addEventListener('change', this.textToggleListener);
    }

    // Set up cancel button functionality
    const cancelClickHandler = () => {
      this.hideDiscardModal();
    };
    
    // Store the handlers so we can remove them when the modal is closed
    this.cancelClickHandler = cancelClickHandler;
    
    // Add event listeners for cancel buttons
    this.closeDiscardBtn.addEventListener('click', this.cancelClickHandler);
    this.discardCancelBtn.addEventListener('click', this.cancelClickHandler);

    // Show the modal
    this.discardModal.classList.remove('hidden');
  }

  // Hide discard modal
  hideDiscardModal() {
    this.discardModal.classList.add('hidden');

    // Remove the event listeners
    if (this.cancelClickHandler) {
      this.closeDiscardBtn.removeEventListener('click', this.cancelClickHandler);
      this.discardCancelBtn.removeEventListener('click', this.cancelClickHandler);
      this.cancelClickHandler = null;
    }

    // Remove the event listener for the text toggle if it exists
    if (this.textToggleListener) {
      const showCardTextCheckbox = document.getElementById('show-card-text');
      if (showCardTextCheckbox) {
        showCardTextCheckbox.removeEventListener('change', this.textToggleListener);
      }
      this.textToggleListener = null;
    }
  }

  // Show exit confirmation modal
  showExitConfirmModal() {
    this.exitConfirmModal.classList.remove('hidden');
  }

  // Hide exit confirmation modal
  hideExitConfirmModal() {
    this.exitConfirmModal.classList.add('hidden');
  }

  // Show card exchange message
  showCardExchangeMessage(discardedCard, drawnCard) {
    let discardName = '';
    let drawnName = '';

    // Format card names
    if (discardedCard.type === 'distance') {
      discardName = `${discardedCard.value} Miles`;
    } else {
      discardName = discardedCard.name;
    }

    if (drawnCard.type === 'distance') {
      drawnName = `${drawnCard.value} Miles`;
    } else {
      drawnName = drawnCard.name;
    }

    // Show text message
    this.messageTextEl.textContent = `You discarded ${discardName} and drew ${drawnName}.`;
  
    // Get the card display containers
    const cardExchangeContainer = document.getElementById('card-exchange-container');
    const discardedCardDisplay = document.getElementById('discarded-card-display');
    const drawnCardDisplay = document.getElementById('drawn-card-display');
  
    // Clear previous card displays
    discardedCardDisplay.innerHTML = '';
    drawnCardDisplay.innerHTML = '';
  
    // Create and display the discarded card
    discardedCardDisplay.className = 'card';
    if (discardedCard.type === 'distance') {
      discardedCardDisplay.classList.add('card-distance');
      discardedCardDisplay.dataset.value = discardedCard.value;
    
      const valueEl = document.createElement('div');
      valueEl.className = 'card-value';
      valueEl.textContent = discardedCard.value;
      discardedCardDisplay.appendChild(valueEl);
    } else {
      discardedCardDisplay.classList.add(`card-${discardedCard.type.toLowerCase()}`);
      discardedCardDisplay.dataset.name = discardedCard.name;
    
      const nameEl = document.createElement('div');
      nameEl.className = 'card-name';
      nameEl.textContent = discardedCard.name;
      discardedCardDisplay.appendChild(nameEl);
    }
  
    // Create and display the drawn card
    drawnCardDisplay.className = 'card';
    if (drawnCard.type === 'distance') {
      drawnCardDisplay.classList.add('card-distance');
      drawnCardDisplay.dataset.value = drawnCard.value;
    
      const valueEl = document.createElement('div');
      valueEl.className = 'card-value';
      valueEl.textContent = drawnCard.value;
      drawnCardDisplay.appendChild(valueEl);
    } else {
      drawnCardDisplay.classList.add(`card-${drawnCard.type.toLowerCase()}`);
      drawnCardDisplay.dataset.name = drawnCard.name;
    
      const nameEl = document.createElement('div');
      nameEl.className = 'card-name';
      nameEl.textContent = drawnCard.name;
      drawnCardDisplay.appendChild(nameEl);
    }
  
    // Show the card exchange container
    cardExchangeContainer.classList.remove('hidden');
  
    // Show the message modal
    this.messageModal.classList.remove('hidden');
  
    // Store the ID of the element to focus after closing the modal
    this.pendingFocusElementId = null;
  }

  // Set exit game button handler
  setExitGameButtonHandler(handler) {
    // Show confirmation modal when exit button is clicked
    this.exitGameBtn.addEventListener('click', () => {
      this.showExitConfirmModal();
    });

    // Hide modal when close button is clicked
    this.closeExitBtn.addEventListener('click', () => {
      this.hideExitConfirmModal();
    });

    // Hide modal when cancel button is clicked
    this.exitCancelBtn.addEventListener('click', () => {
      this.hideExitConfirmModal();
    });

    // Call handler when confirm button is clicked
    this.exitConfirmBtn.addEventListener('click', () => {
      this.hideExitConfirmModal();
      handler();
    });

    // Hide modal when clicking outside the content
    this.exitConfirmModal.addEventListener('click', (event) => {
      if (event.target === this.exitConfirmModal) {
        this.hideExitConfirmModal();
      }
    });

    // Hide modal when Escape key is pressed
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.exitConfirmModal.classList.contains('hidden')) {
        this.hideExitConfirmModal();
      }
    });
  }
}

// Export for use in other files
window.GameUI = GameUI;
