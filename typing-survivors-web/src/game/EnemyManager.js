// src/game/EnemyManager.js
// Handles enemy spawning, updating, movement, and defeat logic
// Modular and easy to extend

import audioSystem from '../audio.js';
import { GridPartition } from './GridPartition.js';

function getTier(word) {
  if (word.length > 10) return 3;
  if (word.length > 6) return 2;
  return 1;
}

function getTierSpeed(tier) {
  // Lower tier = faster, but slow tier 1 further for better balance
  if (tier === 1) return 32; // was 50, now slower
  if (tier === 2) return 30; // was 55
  return 16; // was 30, bosses are slowest
}

function getTierSize(tier) {
  if (tier === 3) return 108; // boss: largest
  if (tier === 2) return 80;  // mid: medium
  return 60; // tier 1: small
}

function getTierStyle(tier) {
  if (tier === 3) return 'enemy-boss';
  if (tier === 2) return 'enemy-mid';
  return '';
}

function randomEdgePosition(width, height) {
  // Returns {x, y} at a random edge of the screen
  const edge = Math.floor(Math.random() * 4);
  if (edge === 0) return { x: Math.random() * width, y: 0 };
  if (edge === 1) return { x: Math.random() * width, y: height };
  if (edge === 2) return { x: 0, y: Math.random() * height };
  return { x: width, y: Math.random() * height };
}

export class EnemyManager {
  constructor(config = {}) {
    this.config = config;
    this.enemies = [];
    this.spawnInterval = config.spawnInterval || 2000;
    this.lastSpawn = 0;
    this.emoteList = [];
    this.tier1 = [];
    this.tier2 = [];
    this.tier3 = [];
    this.debug = (...args) => console.debug('[EnemyManager]', ...args);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.defeatedCount = 0;
    this.grid = new GridPartition(120); // Cell size matches typical enemy+label size
  }

  updateCenter() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  setEmoteList(emoteList) {
    this.emoteList = emoteList;
    // Classify emotes by tier
    this.tier1 = emoteList.filter(e => e.replace(/\.[^/.]+$/, '').length <= 6);
    this.tier2 = emoteList.filter(e => {
      const l = e.replace(/\.[^/.]+$/, '').length;
      return l > 6 && l <= 10;
    });
    this.tier3 = emoteList.filter(e => e.replace(/\.[^/.]+$/, '').length > 10);
  }

  reset() {
    this.enemies = [];
    this.lastSpawn = 0;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.grid.clear();
    this.debug('Enemies reset');
  }

  update(delta, playerManager, scoreManager) {
    // Prevent auto-spawning in wave mode
    if (this.config.mode !== 'wave') {
      this.lastSpawn += delta;
      if (this.lastSpawn >= this.spawnInterval) {
        this.spawnEnemy(scoreManager ? scoreManager.getScore() : 0);
        this.lastSpawn = 0;
      }
    }
    // Move enemies
    for (const enemy of this.enemies) {
      if (!enemy.defeated) {
        const dx = enemy.targetX - enemy.x;
        const dy = enemy.targetY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          enemy.x += (dx / dist) * enemy.speed * (delta / 1000);
          enemy.y += (dy / dist) * enemy.speed * (delta / 1000);
        }
      }
    }
    // Remove defeated enemies
    this.enemies = this.enemies.filter(e => !e.defeated);
  }

  spawnEnemy(score = 0) {
    // Tier probabilities based on score
    let tierProb = [0.85, 0.15, 0];
    if (score >= 100 && score < 250) tierProb = [0.6, 0.35, 0.05];
    if (score >= 250) tierProb = [0.25, 0.45, 0.3];
    let tier = 1;
    const r = Math.random();
    if (r < tierProb[0]) tier = 1;
    else if (r < tierProb[0] + tierProb[1]) tier = 2;
    else tier = 3;
    let emote = null;
    if (tier === 1 && this.tier1.length) emote = this.tier1[Math.floor(Math.random() * this.tier1.length)];
    else if (tier === 2 && this.tier2.length) emote = this.tier2[Math.floor(Math.random() * this.tier2.length)];
    else if (tier === 3 && this.tier3.length) emote = this.tier3[Math.floor(Math.random() * this.tier3.length)];
    else emote = this.emoteList[Math.floor(Math.random() * this.emoteList.length)];
    const word = emote.replace(/\.[^/.]+$/, '');
    let x, y;
    let tries = 0;
    let overlap;
    do {
      ({ x, y } = randomEdgePosition(this.width, this.height));
      x += (Math.random() - 0.5) * 24;
      y += (Math.random() - 0.5) * 24;
      // Check for overlap with existing enemies
      overlap = false;
      for (const other of this.enemies) {
        if (other.defeated) continue;
        const boxA = this.grid.constructor.getBoundingBox({ x, y, size: getTierSize(tier), labelAbove: y > this.height * 0.7 });
        const boxB = this.grid.constructor.getBoundingBox(other);
        const ax2 = boxA.x + boxA.w;
        const bx2 = boxB.x + boxB.w;
        const ay2 = boxA.y + boxA.h;
        const by2 = boxB.y + boxB.h;
        if (boxA.x < bx2 && ax2 > boxB.x && boxA.y < by2 && ay2 > boxB.y) {
          overlap = true;
          break;
        }
      }
      tries++;
    } while (overlap && tries < 10);
    // Determine if label should be above (if near bottom)
    const labelAbove = y > this.height * 0.7;
    const enemy = {
      word,
      emote,
      x,
      y,
      targetX: this.width / 2,
      targetY: this.height / 2,
      speed: getTierSpeed(tier),
      size: getTierSize(tier),
      tier,
      style: getTierStyle(tier),
      labelAbove,
      defeated: false,
      update: (delta) => {},
    };
    this.enemies.push(enemy);
    this.grid.addEnemy(enemy); // Add to grid immediately
    this.debug('Spawned enemy:', word, emote, 'tier', tier);
  }

  async defeatEnemy(word) {
    const idx = this.enemies.findIndex(e => e.word === word && !e.defeated);
    if (idx !== -1) {
      this.enemies[idx].defeated = true;
      // Unlock skin for this emote
      const emote = this.enemies[idx].emote;
      let unlocked = JSON.parse(localStorage.getItem('unlockedSkins') || '[]');
      if (!unlocked.includes(emote)) {
        unlocked.push(emote);
        localStorage.setItem('unlockedSkins', JSON.stringify(unlocked));
      }
      // Simple tiered death sound effects
      const tier = this.enemies[idx].tier;
      if (tier === 2) {
        audioSystem.playDeathSoundTier2();
      } else if (tier === 3) {
        audioSystem.playDeathSoundTier3();
      } else {
        audioSystem.playDeathSound();
      }
      this.defeatedCount++;
      this.grid.removeEnemy(this.enemies[idx]); // Remove from grid
      this.debug('Enemy defeated:', word);
      return true;
    }
    return false;
  }

  getEnemies() {
    return this.enemies.filter(e => !e.defeated);
  }

  getEnemiesDefeated() {
    return this.defeatedCount;
  }

  checkCollision(centerX, centerY, radius = 44) {
    // Always use current window center
    centerX = window.innerWidth / 2;
    centerY = window.innerHeight / 2;
    for (const enemy of this.getEnemies()) {
      const dx = enemy.x - centerX;
      const dy = enemy.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) return true;
    }
    return false;
  }
} 