// src/game/GameEngine.js
// Main game engine for Typing Survivors
// Handles game loop, state transitions, and delegates to managers
// Modular, debuggable, and easy to extend

export class GameEngine {
  /**
   * @param {Object} options - Injected managers and config
   * @param {EnemyManager} options.enemyManager - Handles enemy logic
   * @param {PlayerManager} options.playerManager - Handles player logic
   * @param {ScoreManager} options.scoreManager - Handles score/combos
   * @param {Function} options.onGameOver - Callback for game over
   * @param {Function} options.onScoreChange - Callback for score updates
   * @param {Function} options.onEnemyDefeated - Callback for enemy defeat
   * @param {Function} options.onFrame - Callback for every frame (UI update)
   * @param {Object} options.config - Game config (optional)
   */
  constructor({
    enemyManager,
    playerManager,
    scoreManager,
    onGameOver = () => {},
    onScoreChange = () => {},
    onEnemyDefeated = () => {},
    onFrame = null,
    config = {}
  }) {
    this.enemyManager = enemyManager;
    this.playerManager = playerManager;
    this.scoreManager = scoreManager;
    this.onGameOver = onGameOver;
    this.onScoreChange = onScoreChange;
    this.onEnemyDefeated = onEnemyDefeated;
    this.onFrame = onFrame;
    this.config = config;
    this.isRunning = false;
    this.isPaused = false;
    this.lastFrame = 0;
    this.debug = (...args) => console.debug('[GameEngine]', ...args);
  }

  /** Start the game loop */
  start() {
    this.debug('Game started');
    this.isRunning = true;
    this.isPaused = false;
    this.lastFrame = performance.now();
    this.enemyManager.reset();
    this.playerManager.reset();
    this.scoreManager.reset();
    requestAnimationFrame(this.loop.bind(this));
  }

  /** Main game loop */
  loop(now) {
    if (!this.isRunning || this.isPaused) return;
    const delta = now - this.lastFrame;
    this.lastFrame = now;
    // Update managers
    this.enemyManager.update(delta, this.playerManager, this.scoreManager);
    this.playerManager.update(delta, this.enemyManager, this.scoreManager);
    this.scoreManager.update(delta);
    // Check for game over
    if (this.playerManager.isGameOver()) {
      this.debug('Game over triggered');
      this.isRunning = false;
      this.onGameOver();
      return;
    }
    // Call onFrame for UI update
    if (typeof this.onFrame === 'function') {
      this.onFrame();
    }
    requestAnimationFrame(this.loop.bind(this));
  }

  /** Pause the game */
  pause() {
    this.debug('Game paused');
    this.isPaused = true;
  }

  /** Resume the game */
  resume() {
    this.debug('Game resumed');
    if (!this.isRunning) return;
    this.isPaused = false;
    this.lastFrame = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  /** End the game */
  end() {
    this.debug('Game ended');
    this.isRunning = false;
    this.onGameOver();
  }
} 