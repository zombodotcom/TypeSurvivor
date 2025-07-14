# Typing Survivors - Modular Framework

A highly extensible and modular typing game framework that allows developers to easily create their own typing games.

## 🏗️ Architecture Overview

```
src/
├── components/          # Reusable UI components
├── core/              # Core game engine and systems
├── settings/          # Modular settings system
├── utils/             # Utility functions
├── plugins/           # Plugin system
├── styles/            # Modular CSS
└── main-new.js       # Entry point
```

## 🚀 Quick Start

### 1. Basic Setup

```javascript
import { TypingSurvivorsApp } from './src/main-new.js';

// Initialize the game
const app = new TypingSurvivorsApp();
```

### 2. Create a Custom Game Mode

```javascript
import { GameMode } from './src/core/GameMode.js';

class MyCustomMode extends GameMode {
    constructor() {
        super('My Custom Mode', 'A custom typing game mode');
        
        // Override default config
        this.config.spawnRate = 1500;
        this.config.maxEnemies = 6;
    }

    onEnemyDefeat(enemy, gameState) {
        // Custom scoring logic
        const baseScore = enemy.word.length * 15;
        const timeBonus = this.calculateTimeBonus(gameState);
        return baseScore * (1 + timeBonus);
    }

    calculateTimeBonus(gameState) {
        const elapsed = gameState.getElapsedTime();
        return Math.min(1.0, elapsed / 45000);
    }
}

// Register your custom mode
app.gameEngine.registerGameMode(new MyCustomMode());
```

### 3. Create a Plugin

```javascript
import { GameEvents } from './src/core/EventBus.js';

class MyPlugin {
    init(eventBus) {
        this.eventBus = eventBus;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventBus.on(GameEvents.ENEMY_DEFEAT, (data) => {
            console.log(`Enemy defeated: ${data.enemy.word}`);
            this.showCustomEffect(data.enemy);
        });
    }

    showCustomEffect(enemy) {
        // Custom visual effects
        const effect = document.createElement('div');
        effect.className = 'custom-effect';
        effect.textContent = 'BOOM!';
        document.body.appendChild(effect);
        
        setTimeout(() => effect.remove(), 1000);
    }

    cleanup() {
        // Cleanup when plugin is unloaded
    }
}

// Register your plugin
app.pluginManager.registerPlugin('myPlugin', new MyPlugin());
```

## 📦 Core Systems

### Game Modes

The `GameMode` class provides a base for creating different game experiences:

```javascript
class GameMode {
    // Override these methods in your custom mode
    onGameStart(gameState) { }
    onGameEnd(gameState) { }
    onEnemySpawn(enemy, gameState) { }
    onEnemyDefeat(enemy, gameState) { }
    calculateEnemySpeed(wordLength, gameState) { }
    getSpawnInterval(gameState) { }
    getMaxEnemies(gameState) { }
    getWordList(gameState) { }
    updateDifficulty(gameState) { }
}
```

### Event System

The event bus allows loose coupling between components:

```javascript
import { GameEvents, EventBus } from './src/core/EventBus.js';

const eventBus = new EventBus();

// Subscribe to events
eventBus.on(GameEvents.ENEMY_DEFEAT, (data) => {
    console.log(`Enemy defeated: ${data.enemy.word}`);
});

// Emit events
eventBus.emit(GameEvents.SCORE_ADD, {
    points: 100,
    reason: 'enemy_defeat',
    multiplier: 1.5
});
```

### Plugin System

Plugins can extend functionality without modifying core code:

```javascript
class AchievementPlugin {
    init(eventBus) {
        this.eventBus = eventBus;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventBus.on('enemy:defeat', (data) => {
            this.checkAchievements(data);
        });
    }

    cleanup() {
        // Cleanup resources
    }
}
```

### Configuration Management

Easy configuration management with validation:

```javascript
import { ConfigManager } from './src/core/ConfigManager.js';

const config = new ConfigManager();

// Get configuration
const audioConfig = config.getAudioConfig();
const gameConfig = config.getGameConfig();

// Set configuration
config.set('audio', 'musicVolume', 0.5);
config.set('game', 'debug', true);

// Export/Import configurations
const exported = config.exportConfig();
config.importConfig(exported);
```

## 🎨 Customization

### Themes

Create custom themes easily:

```javascript
const customTheme = {
    id: 'my-theme',
    name: 'My Theme',
    primary: '#ff6b6b',
    secondary: '#4ecdc4'
};

config.setTheme('my-theme');
```

### Word Sources

Support different word sources:

```javascript
class CustomWordSource extends GameMode {
    getWordList(gameState) {
        return [
            'javascript',
            'typescript',
            'react',
            'vue',
            'angular'
        ];
    }
}
```

### Visual Effects

Add custom visual effects:

```javascript
class ParticleEffectPlugin {
    init(eventBus) {
        eventBus.on('enemy:defeat', (data) => {
            this.createParticles(data.enemy.x, data.enemy.y);
        });
    }

    createParticles(x, y) {
        // Create particle effects
    }
}
```

## 🔧 Advanced Features

### Custom Input Handling

```javascript
class CustomInputHandler {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.setupInput();
    }

    setupInput() {
        const input = document.getElementById('typing-input');
        input.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
        });
    }

    handleInput(value) {
        // Custom input processing
        if (this.isValidWord(value)) {
            this.eventBus.emit('input:complete', {
                word: value,
                time: Date.now(),
                accuracy: this.calculateAccuracy(value)
            });
        }
    }
}
```

### Custom Scoring Systems

```javascript
class ComboScoringPlugin {
    constructor() {
        this.currentCombo = 0;
        this.maxCombo = 0;
    }

    init(eventBus) {
        eventBus.on('enemy:defeat', () => {
            this.currentCombo++;
            this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
            this.updateComboDisplay();
        });

        eventBus.on('enemy:hit_player', () => {
            this.currentCombo = 0;
            this.updateComboDisplay();
        });
    }

    updateComboDisplay() {
        // Update combo UI
    }
}
```

### Custom Audio Systems

```javascript
class CustomAudioPlugin {
    constructor() {
        this.sounds = new Map();
    }

    init(eventBus) {
        this.loadSounds();
        this.setupEventListeners();
    }

    loadSounds() {
        this.sounds.set('enemy_defeat', new Audio('/sounds/custom/defeat.mp3'));
        this.sounds.set('combo_break', new Audio('/sounds/custom/combo.mp3'));
    }

    setupEventListeners() {
        this.eventBus.on('enemy:defeat', () => {
            this.playSound('enemy_defeat');
        });
    }

    playSound(soundName) {
        const sound = this.sounds.get(soundName);
        if (sound) {
            sound.currentTime = 0;
            sound.play();
        }
    }
}
```

## 📚 API Reference

### GameState

```javascript
class GameState {
    getScore() { }
    addScore(points) { }
    getElapsedTime() { }
    updatePlayerSkin(skinName) { }
    loadEmotes() { }
    getEmoteList() { }
}
```

### EventBus

```javascript
class EventBus {
    on(event, callback) { }
    once(event, callback) { }
    off(event, callback) { }
    emit(event, data) { }
    clear() { }
}
```

### ConfigManager

```javascript
class ConfigManager {
    get(category, key) { }
    set(category, key, value) { }
    setCategory(category, values) { }
    reset(category) { }
    exportConfig() { }
    importConfig(configString) { }
}
```

## 🎯 Best Practices

### 1. Plugin Development

- Always implement `init()` and `cleanup()` methods
- Use the event bus for communication
- Don't modify core systems directly
- Handle errors gracefully

### 2. Game Mode Development

- Override only the methods you need
- Use the configuration system for settings
- Test your mode thoroughly
- Document your custom features

### 3. Performance

- Use object pooling for frequently created objects
- Debounce event handlers when appropriate
- Clean up event listeners in `cleanup()`
- Use `requestAnimationFrame` for animations

### 4. Accessibility

- Provide keyboard navigation
- Include ARIA labels
- Support screen readers
- Test with different input methods

## 🚀 Deployment

### Production Build

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Serve the built files
npm run serve
```

### Custom Deployment

```javascript
// Custom initialization
const app = new TypingSurvivorsApp({
    config: {
        debug: false,
        plugins: ['achievements', 'statistics'],
        theme: 'dark'
    }
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add your custom game mode or plugin
4. Write tests for your code
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

This modular framework makes it easy to create custom typing games while maintaining clean, maintainable code. The plugin system allows for endless extensibility without modifying core functionality. 