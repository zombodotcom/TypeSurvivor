// src/game/GridPartition.js
// Efficient spatial partitioning for enemy avoidance using grid-based system
// Handles visual bubble overlap prevention with O(n) performance

export class GridPartition {
  constructor(cellSize = 120) {
    this.cellSize = cellSize;
    this.grid = new Map(); // Map<string, Array<enemy>>
    this.enemies = new Map(); // Map<enemy, {x, y, radius}>
  }

  // Convert world coordinates to grid cell key
  _getCellKey(x, y) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  // Get all neighboring cell keys (including diagonal)
  _getNeighborKeys(x, y) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    const keys = [];
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        keys.push(`${cellX + dx},${cellY + dy}`);
      }
    }
    return keys;
  }

  // Calculate visual bubble radius for an enemy
  _calculateVisualRadius(enemy) {
    let radius = (enemy.size || 60) / 2;
    
    // Add label height if label is above the enemy
    if (enemy.labelAbove) {
      radius += 22; // Increase label height padding
    }
    
    // Add more padding for visual clarity
    radius += 10;
    
    return radius;
  }

  // Add enemy to grid
  addEnemy(enemy) {
    const radius = this._calculateVisualRadius(enemy);
    const cellKey = this._getCellKey(enemy.x, enemy.y);
    
    // Store enemy data
    this.enemies.set(enemy, {
      x: enemy.x,
      y: enemy.y,
      radius: radius
    });
    
    // Add to grid cell
    if (!this.grid.has(cellKey)) {
      this.grid.set(cellKey, []);
    }
    this.grid.get(cellKey).push(enemy);
  }

  // Update enemy position in grid
  updateEnemy(enemy) {
    if (!this.enemies.has(enemy)) {
      this.addEnemy(enemy);
      return;
    }

    const oldData = this.enemies.get(enemy);
    const newRadius = this._calculateVisualRadius(enemy);
    const oldCellKey = this._getCellKey(oldData.x, oldData.y);
    const newCellKey = this._getCellKey(enemy.x, enemy.y);

    // Update stored data
    this.enemies.set(enemy, {
      x: enemy.x,
      y: enemy.y,
      radius: newRadius
    });

    // Move to new cell if position changed significantly
    if (oldCellKey !== newCellKey) {
      // Remove from old cell
      const oldCell = this.grid.get(oldCellKey);
      if (oldCell) {
        const index = oldCell.indexOf(enemy);
        if (index !== -1) {
          oldCell.splice(index, 1);
        }
        // Clean up empty cells
        if (oldCell.length === 0) {
          this.grid.delete(oldCellKey);
        }
      }

      // Add to new cell
      if (!this.grid.has(newCellKey)) {
        this.grid.set(newCellKey, []);
      }
      this.grid.get(newCellKey).push(enemy);
    }
  }

  // Remove enemy from grid
  removeEnemy(enemy) {
    if (!this.enemies.has(enemy)) return;

    const data = this.enemies.get(enemy);
    const cellKey = this._getCellKey(data.x, data.y);
    
    // Remove from grid
    const cell = this.grid.get(cellKey);
    if (cell) {
      const index = cell.indexOf(enemy);
      if (index !== -1) {
        cell.splice(index, 1);
      }
      // Clean up empty cells
      if (cell.length === 0) {
        this.grid.delete(cellKey);
      }
    }

    // Remove from enemies map
    this.enemies.delete(enemy);
  }

  // Get all enemies that could potentially overlap with the given enemy
  getPotentialOverlaps(enemy) {
    if (!this.enemies.has(enemy)) return [];

    const data = this.enemies.get(enemy);
    const neighborKeys = this._getNeighborKeys(data.x, data.y);
    const potentialOverlaps = [];

    for (const cellKey of neighborKeys) {
      const cell = this.grid.get(cellKey);
      if (cell) {
        for (const otherEnemy of cell) {
          if (otherEnemy !== enemy && !otherEnemy.defeated) {
            potentialOverlaps.push(otherEnemy);
          }
        }
      }
    }

    return potentialOverlaps;
  }

  // Check if two enemies overlap and return separation vector
  checkOverlap(enemyA, enemyB) {
    if (!this.enemies.has(enemyA) || !this.enemies.has(enemyB)) {
      return null;
    }

    const dataA = this.enemies.get(enemyA);
    const dataB = this.enemies.get(enemyB);
    
    const minDist = dataA.radius + dataB.radius;
    const dx = dataB.x - dataA.x;
    const dy = dataB.y - dataA.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0 && dist < minDist) {
      // Return separation vector (half the overlap in each direction)
      const overlap = (minDist - dist) / 2;
      return {
        x: (dx / dist) * overlap,
        y: (dy / dist) * overlap
      };
    }

    return null;
  }

  // Clear all data
  clear() {
    this.grid.clear();
    this.enemies.clear();
  }

  // Get grid statistics for debugging
  getStats() {
    return {
      gridCells: this.grid.size,
      totalEnemies: this.enemies.size,
      averageEnemiesPerCell: this.enemies.size / Math.max(1, this.grid.size)
    };
  }

  // Calculate bounding box for an enemy (includes emote and label)
  static getBoundingBox(enemy) {
    const size = enemy.size || 60;
    const labelHeight = 18;
    const labelPad = 8;
    let x = enemy.x - size / 2;
    let y = enemy.y - size / 2;
    let w = size;
    let h = size;
    if (enemy.labelAbove) {
      y -= (labelHeight + labelPad);
      h += labelHeight + labelPad;
    } else {
      h += labelHeight + labelPad;
    }
    return { x, y, w, h };
  }

  // Check for axis-aligned bounding box overlap and return separation vector
  static getBoxSeparation(a, b) {
    const boxA = GridPartition.getBoundingBox(a);
    const boxB = GridPartition.getBoundingBox(b);
    const ax2 = boxA.x + boxA.w;
    const bx2 = boxB.x + boxB.w;
    const ay2 = boxA.y + boxA.h;
    const by2 = boxB.y + boxB.h;
    // Check for overlap
    if (boxA.x < bx2 && ax2 > boxB.x && boxA.y < by2 && ay2 > boxB.y) {
      // Find minimum translation vector
      const dx1 = bx2 - boxA.x; // b right to a left
      const dx2 = ax2 - boxB.x; // a right to b left
      const dy1 = by2 - boxA.y; // b bottom to a top
      const dy2 = ay2 - boxB.y; // a bottom to b top
      const minX = Math.min(dx1, dx2);
      const minY = Math.min(dy1, dy2);
      // Push apart along axis of greatest overlap
      if (minX < minY) {
        // Push along X
        const sep = minX / 2;
        if (boxA.x < boxB.x) {
          return { x: -sep, y: 0 };
        } else {
          return { x: sep, y: 0 };
        }
      } else {
        // Push along Y
        const sep = minY / 2;
        if (boxA.y < boxB.y) {
          return { x: 0, y: -sep };
        } else {
          return { x: 0, y: sep };
        }
      }
    }
    return null;
  }
} 