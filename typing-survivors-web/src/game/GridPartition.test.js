// src/game/GridPartition.test.js
// Tests for grid-based spatial partitioning system

import { describe, it, expect, beforeEach } from 'vitest';
import { GridPartition } from './GridPartition.js';

describe('GridPartition', () => {
  let grid;

  beforeEach(() => {
    grid = new GridPartition(120);
  });

  describe('constructor', () => {
    it('should initialize with default cell size', () => {
      const defaultGrid = new GridPartition();
      expect(defaultGrid.cellSize).toBe(120);
    });

    it('should initialize with custom cell size', () => {
      const customGrid = new GridPartition(200);
      expect(customGrid.cellSize).toBe(200);
    });
  });

  describe('_getCellKey', () => {
    it('should convert coordinates to cell keys', () => {
      expect(grid._getCellKey(0, 0)).toBe('0,0');
      expect(grid._getCellKey(120, 120)).toBe('1,1');
      expect(grid._getCellKey(240, 360)).toBe('2,3');
      expect(grid._getCellKey(-120, -120)).toBe('-1,-1');
    });
  });

  describe('_getNeighborKeys', () => {
    it('should return all 9 neighboring cell keys', () => {
      const keys = grid._getNeighborKeys(120, 120);
      expect(keys).toHaveLength(9);
      expect(keys).toContain('0,0');
      expect(keys).toContain('1,1');
      expect(keys).toContain('2,2');
      expect(keys).toContain('0,1');
      expect(keys).toContain('1,0');
      expect(keys).toContain('2,1');
      expect(keys).toContain('1,2');
      expect(keys).toContain('0,2');
      expect(keys).toContain('2,0');
    });
  });

  describe('_calculateVisualRadius', () => {
    it('should calculate radius for basic enemy', () => {
      const enemy = { size: 60, labelAbove: false };
      const radius = grid._calculateVisualRadius(enemy);
      expect(radius).toBe(34); // 30 + 4 padding
    });

    it('should add label height when label is above', () => {
      const enemy = { size: 60, labelAbove: true };
      const radius = grid._calculateVisualRadius(enemy);
      expect(radius).toBe(52); // 30 + 18 + 4 padding
    });

    it('should handle different enemy sizes', () => {
      const enemy = { size: 108, labelAbove: false };
      const radius = grid._calculateVisualRadius(enemy);
      expect(radius).toBe(58); // 54 + 4 padding
    });
  });

  describe('addEnemy', () => {
    it('should add enemy to grid', () => {
      const enemy = { x: 100, y: 100, size: 60, labelAbove: false };
      grid.addEnemy(enemy);
      
      expect(grid.enemies.has(enemy)).toBe(true);
      expect(grid.grid.has('0,0')).toBe(true);
      expect(grid.grid.get('0,0')).toContain(enemy);
    });

    it('should store enemy data correctly', () => {
      const enemy = { x: 100, y: 100, size: 60, labelAbove: true };
      grid.addEnemy(enemy);
      
      const data = grid.enemies.get(enemy);
      expect(data.x).toBe(100);
      expect(data.y).toBe(100);
      expect(data.radius).toBe(52); // 30 + 18 + 4
    });
  });

  describe('updateEnemy', () => {
    it('should add enemy if not already in grid', () => {
      const enemy = { x: 100, y: 100, size: 60, labelAbove: false };
      grid.updateEnemy(enemy);
      
      expect(grid.enemies.has(enemy)).toBe(true);
    });

    it('should update enemy position within same cell', () => {
      const enemy = { x: 100, y: 100, size: 60, labelAbove: false };
      grid.addEnemy(enemy);
      
      enemy.x = 110;
      enemy.y = 110;
      grid.updateEnemy(enemy);
      
      const data = grid.enemies.get(enemy);
      expect(data.x).toBe(110);
      expect(data.y).toBe(110);
      expect(grid.grid.get('0,0')).toContain(enemy);
    });

    it('should move enemy to new cell when position changes significantly', () => {
      const enemy = { x: 100, y: 100, size: 60, labelAbove: false };
      grid.addEnemy(enemy);
      
      enemy.x = 250;
      enemy.y = 250;
      grid.updateEnemy(enemy);
      
      const oldCell = grid.grid.get('0,0');
      const newCell = grid.grid.get('2,2');
      if (oldCell) {
        expect(oldCell).not.toContain(enemy);
      } else {
        expect(grid.grid.has('0,0')).toBe(false);
      }
      expect(newCell).toContain(enemy);
    });
  });

  describe('removeEnemy', () => {
    it('should remove enemy from grid', () => {
      const enemy = { x: 100, y: 100, size: 60, labelAbove: false };
      grid.addEnemy(enemy);
      
      grid.removeEnemy(enemy);
      
      expect(grid.enemies.has(enemy)).toBe(false);
      const cell = grid.grid.get('0,0');
      if (cell) {
        expect(cell).not.toContain(enemy);
      }
    });

    it('should clean up empty cells', () => {
      const enemy = { x: 100, y: 100, size: 60, labelAbove: false };
      grid.addEnemy(enemy);
      
      grid.removeEnemy(enemy);
      
      expect(grid.grid.has('0,0')).toBe(false);
    });
  });

  describe('getPotentialOverlaps', () => {
    it('should return empty array for enemy not in grid', () => {
      const enemy = { x: 100, y: 100, size: 60, labelAbove: false };
      const overlaps = grid.getPotentialOverlaps(enemy);
      expect(overlaps).toEqual([]);
    });

    it('should return enemies in neighboring cells', () => {
      const enemy1 = { x: 100, y: 100, size: 60, labelAbove: false };
      const enemy2 = { x: 200, y: 200, size: 60, labelAbove: false };
      const enemy3 = { x: 400, y: 400, size: 60, labelAbove: false }; // Far away
      
      grid.addEnemy(enemy1);
      grid.addEnemy(enemy2);
      grid.addEnemy(enemy3);
      
      const overlaps = grid.getPotentialOverlaps(enemy1);
      expect(overlaps).toContain(enemy2);
      expect(overlaps).not.toContain(enemy3);
    });

    it('should not include defeated enemies', () => {
      const enemy1 = { x: 100, y: 100, size: 60, labelAbove: false };
      const enemy2 = { x: 200, y: 200, size: 60, labelAbove: false, defeated: true };
      
      grid.addEnemy(enemy1);
      grid.addEnemy(enemy2);
      
      const overlaps = grid.getPotentialOverlaps(enemy1);
      expect(overlaps).not.toContain(enemy2);
    });
  });

  describe('checkOverlap', () => {
    it('should return null for enemies not in grid', () => {
      const enemy1 = { x: 100, y: 100, size: 60, labelAbove: false };
      const enemy2 = { x: 200, y: 200, size: 60, labelAbove: false };
      
      const overlap = grid.checkOverlap(enemy1, enemy2);
      expect(overlap).toBeNull();
    });

    it('should return null when enemies do not overlap', () => {
      const enemy1 = { x: 100, y: 100, size: 60, labelAbove: false };
      const enemy2 = { x: 300, y: 300, size: 60, labelAbove: false };
      
      grid.addEnemy(enemy1);
      grid.addEnemy(enemy2);
      
      const overlap = grid.checkOverlap(enemy1, enemy2);
      expect(overlap).toBeNull();
    });

    it('should return separation vector when enemies overlap', () => {
      const enemy1 = { x: 100, y: 100, size: 60, labelAbove: false };
      const enemy2 = { x: 120, y: 100, size: 60, labelAbove: false };
      
      grid.addEnemy(enemy1);
      grid.addEnemy(enemy2);
      
      const overlap = grid.checkOverlap(enemy1, enemy2);
      expect(overlap).not.toBeNull();
      expect(overlap.x).toBeGreaterThan(0);
      expect(overlap.y).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      const enemy = { x: 100, y: 100, size: 60, labelAbove: false };
      grid.addEnemy(enemy);
      
      grid.clear();
      
      expect(grid.enemies.size).toBe(0);
      expect(grid.grid.size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const enemy1 = { x: 100, y: 100, size: 60, labelAbove: false };
      const enemy2 = { x: 200, y: 200, size: 60, labelAbove: false };
      
      grid.addEnemy(enemy1);
      grid.addEnemy(enemy2);
      
      const stats = grid.getStats();
      expect(stats.gridCells).toBe(2);
      expect(stats.totalEnemies).toBe(2);
      expect(stats.averageEnemiesPerCell).toBe(1);
    });
  });

  describe('performance', () => {
    it('should handle many enemies efficiently', () => {
      // Add 100 enemies in a small area
      for (let i = 0; i < 100; i++) {
        const enemy = {
          x: 100 + (i % 10) * 10,
          y: 100 + Math.floor(i / 10) * 10,
          size: 60,
          labelAbove: false
        };
        grid.addEnemy(enemy);
      }
      
      const stats = grid.getStats();
      expect(stats.totalEnemies).toBe(100);
      expect(stats.gridCells).toBeLessThan(100); // Should be much fewer cells
    });
  });
}); 