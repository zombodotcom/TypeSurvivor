// src/game/ScoreManager.js
// Handles score, combo, and high score
// Modular and easy to extend

export class ScoreManager {
  constructor(config = {}) {
    this.config = config;
    this.score = 0;
    this.highScore = Number(localStorage.getItem('highScore') || '0');
    this.debug = (...args) => console.debug('[ScoreManager]', ...args);
  }

  /** Reset score state */
  reset() {
    this.score = 0;
    this.debug('Score reset');
  }

  /** Update score state (placeholder for future logic) */
  update(delta) {
    // No-op for now
  }

  /** Increment score */
  incrementScore(amount) {
    this.score += amount;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('highScore', String(this.highScore));
    }
    this.debug('Score incremented:', this.score);
  }

  /** Getters */
  getScore() { return this.score; }
  getHighScore() { return Number(localStorage.getItem('highScore') || this.highScore || 0); }
} 