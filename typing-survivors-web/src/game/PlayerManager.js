// src/game/PlayerManager.js
// Handles player state, input buffer, and game over logic
// Modular and easy to extend

export class PlayerManager {
  constructor(config = {}) {
    this.config = config;
    this.inputBuffer = '';
    this.lives = config.lives || 3;
    this.debug = (...args) => console.debug('[PlayerManager]', ...args);
  }

  /** Reset player state */
  reset() {
    this.inputBuffer = '';
    this.lives = this.config.lives || 3;
    this.debug('Player reset');
  }

  /** Update player state (placeholder for future logic) */
  update(delta, enemyManager, scoreManager) {
    // No-op for now
  }

  /** Handle player input */
  handleInput(char, enemyManager, scoreManager) {
    this.inputBuffer += char;
    // Check if input matches any enemy
    const enemies = enemyManager.getEnemies();
    for (const enemy of enemies) {
      if (enemy.word === this.inputBuffer) {
        enemyManager.defeatEnemy(enemy.word);
        scoreManager.incrementScore(enemy.word.length * 10);
        this.inputBuffer = '';
        this.debug('Enemy defeated by input:', enemy.word);
        return true;
      }
    }
    // Optionally handle incorrect input, lives, etc.
    return false;
  }

  /** Check if game is over */
  isGameOver() {
    return this.lives <= 0;
  }
} 