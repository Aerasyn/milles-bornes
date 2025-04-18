/**
 * Audio Manager for Milles Bornes
 * Handles loading and playing sound effects
 */

class AudioManager {
  constructor() {
    this.sounds = {};
    this.enabled = true;
    this.volume = 0.5;
    
    // Define sound effects
    this.soundEffects = {
      // Card actions
      'play-hazard': 'hazard.mp3',
      'play-remedy': 'remedy.mp3',
      'play-distance': 'distance.mp3',
      'play-safety': 'safety.mp3',
      'draw-card': 'draw.mp3',
      'discard-card': 'discard.mp3',
      
      // Game events
      'turn-change': 'turn.mp3',
      'game-start': 'start.mp3',
      'game-win': 'win.mp3',
      'game-lose': 'lose.mp3',
      'error': 'error.mp3',
      'coup-fourre': 'coup-fourre.mp3'
    };
    
    // Initialize sounds
    this.init();
  }
  
  // Initialize audio
  init() {
    // Create audio elements for each sound
    Object.keys(this.soundEffects).forEach(key => {
      const audio = new Audio();
      audio.src = `assets/audio/${this.soundEffects[key]}`;
      audio.volume = this.volume;
      this.sounds[key] = audio;
    });
    
    // Try to preload sounds
    this.preloadSounds();
  }
  
  // Preload all sounds
  preloadSounds() {
    Object.values(this.sounds).forEach(audio => {
      try {
        audio.load();
      } catch (error) {
        console.warn('Error preloading sound:', error);
      }
    });
  }
  
  // Play a sound effect
  play(soundName) {
    if (!this.enabled) return;
    
    const sound = this.sounds[soundName];
    if (sound) {
      // Reset the audio to the beginning if it's already playing
      sound.currentTime = 0;
      
      // Play the sound
      sound.play().catch(error => {
        console.warn(`Error playing sound ${soundName}:`, error);
      });
    } else {
      console.warn(`Sound not found: ${soundName}`);
    }
  }
  
  // Enable/disable all sounds
  setEnabled(enabled) {
    this.enabled = enabled;
  }
  
  // Set volume for all sounds (0.0 to 1.0)
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    
    // Update volume for all sounds
    Object.values(this.sounds).forEach(audio => {
      audio.volume = this.volume;
    });
  }
  
  // Play sound for specific card type
  playCardSound(card) {
    if (!card || !card.type) return;
    
    switch (card.type) {
      case 'hazard':
        this.play('play-hazard');
        break;
      case 'remedy':
        this.play('play-remedy');
        break;
      case 'distance':
        this.play('play-distance');
        break;
      case 'safety':
        this.play('play-safety');
        break;
      default:
        // Generic card sound
        this.play('draw-card');
    }
  }
}

// Export for use in other files
window.AudioManager = AudioManager;
