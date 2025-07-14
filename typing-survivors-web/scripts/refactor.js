#!/usr/bin/env node

/**
 * Typing Survivors Refactoring Script
 * 
 * This script helps implement the refactoring plan by:
 * 1. Creating the new directory structure
 * 2. Moving files to their new locations
 * 3. Updating imports and references
 * 4. Generating new modular files
 */

const fs = require('fs');
const path = require('path');

// Create new directory structure
const directories = [
    'src/components',
    'src/core', 
    'src/settings',
    'src/utils',
    'src/styles'
];

console.log('Creating directory structure...');
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created ${dir}`);
    }
});

// Copy existing files to new structure
const fileMoves = [
    { from: 'src/ui.js', to: 'src/components/UI.js' },
    { from: 'src/gameLoop.js', to: 'src/core/GameLoop.js' },
    { from: 'src/settings.js', to: 'src/settings/SettingsManager.js' },
    { from: 'src/audio.js', to: 'src/core/AudioManager.js' },
    { from: 'src/game.js', to: 'src/core/Game.js' },
    { from: 'src/state.js', to: 'src/core/StateManager.js' },
    { from: 'src/input.js', to: 'src/core/InputManager.js' },
    { from: 'src/data.js', to: 'src/utils/DataManager.js' },
    { from: 'src/utils.js', to: 'src/utils/helpers.js' }
];

console.log('\nMoving files to new structure...');
fileMoves.forEach(({ from, to }) => {
    if (fs.existsSync(from)) {
        const content = fs.readFileSync(from, 'utf8');
        fs.writeFileSync(to, content);
        console.log(`✅ Moved ${from} → ${to}`);
    }
});

// Create new modular files
const newFiles = [
    {
        path: 'src/components/Overlay.js',
        content: `// Base Overlay Component
export class Overlay {
    constructor() {
        this.element = null;
        this.isVisible = false;
    }

    show() {
        if (this.element) {
            this.element.style.display = 'flex';
            this.isVisible = true;
        }
    }

    hide() {
        if (this.element) {
            this.element.style.display = 'none';
            this.isVisible = false;
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
}`
    },
    {
        path: 'src/utils/dom.js',
        content: `// DOM Utility Functions
export const createElement = (tag, className, innerHTML = '') => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
};

export const getElement = (selector) => document.querySelector(selector);

export const getAllElements = (selector) => document.querySelectorAll(selector);

export const addEventListeners = (element, events) => {
    Object.entries(events).forEach(([event, handler]) => {
        element.addEventListener(event, handler);
    });
};

export const removeEventListeners = (element, events) => {
    Object.entries(events).forEach(([event, handler]) => {
        element.removeEventListener(event, handler);
    });
};`
    },
    {
        path: 'src/utils/math.js',
        content: `// Math Utility Functions
export const distance = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
};

export const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};

export const random = (min, max) => {
    return Math.random() * (max - min) + min;
};

export const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const lerp = (start, end, factor) => {
    return start + (end - start) * factor;
};`
    },
    {
        path: 'src/utils/storage.js',
        content: `// LocalStorage Utility Functions
export const storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Failed to get item from localStorage:', key, error);
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Failed to set item in localStorage:', key, error);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Failed to remove item from localStorage:', key, error);
            return false;
        }
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.warn('Failed to clear localStorage:', error);
            return false;
        }
    }
};`
    }
];

console.log('\nCreating new modular files...');
newFiles.forEach(({ path: filePath, content }) => {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created ${filePath}`);
});

// Create CSS modules
const cssFiles = [
    {
        path: 'src/styles/components.css',
        content: `/* Component Styles */
@import './theme.css';

/* Button Components */
.btn {
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--radius-full);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: var(--font-size-base);
}

.btn-primary {
    background: linear-gradient(90deg, var(--primary-light) 40%, var(--primary) 100%);
    color: white;
}

.btn-secondary {
    background: linear-gradient(90deg, var(--secondary) 40%, var(--secondary-light) 100%);
    color: black;
}

.btn-danger {
    background: linear-gradient(90deg, var(--danger) 60%, var(--danger-dark) 100%);
    color: white;
}

/* Card Components */
.card {
    background: var(--bg-card);
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
}

/* Modal Components */
.modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: var(--z-modal);
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-content {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    box-shadow: var(--shadow-lg);
}

.modal-title {
    color: var(--text-primary);
    font-size: var(--font-size-xl);
    font-weight: bold;
    margin-bottom: var(--spacing-md);
    text-align: center;
}

.modal-message {
    color: var(--text-secondary);
    font-size: var(--font-size-base);
    margin-bottom: var(--spacing-lg);
    text-align: center;
}

.modal-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: center;
    flex-wrap: wrap;
}`
    },
    {
        path: 'src/styles/game.css',
        content: `/* Game-specific Styles */
@import './theme.css';

/* Player */
.player-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: var(--z-fixed);
    pointer-events: none;
}

.player-img {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-full);
    border: 3px solid var(--secondary);
    box-shadow: var(--shadow-glow);
    object-fit: contain;
    background: var(--bg-primary);
    padding: 2px;
}

/* Enemies */
.enemy-container {
    position: absolute;
    z-index: var(--z-dropdown);
    pointer-events: none;
}

.enemy-img {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
    border: 2px solid var(--danger);
    object-fit: contain;
    background: var(--bg-primary);
    padding: 2px;
}

.enemy-label {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-secondary);
    color: var(--text-primary);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    white-space: nowrap;
    border: 1px solid var(--border-secondary);
}

/* HUD */
.hud {
    position: fixed;
    top: var(--spacing-md);
    left: var(--spacing-md);
    z-index: var(--z-fixed);
    color: var(--text-primary);
    font-size: var(--font-size-base);
    font-weight: bold;
}

.score {
    color: var(--secondary);
    font-size: var(--font-size-lg);
}

.timer {
    color: var(--text-secondary);
    font-size: var(--font-size-base);
}

/* Input */
.input-container {
    position: fixed;
    bottom: var(--spacing-md);
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-fixed);
}

.input-field {
    background: var(--bg-secondary);
    border: 2px solid var(--border-secondary);
    border-radius: var(--radius-full);
    color: var(--text-primary);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-base);
    text-align: center;
    min-width: 200px;
}

.input-field:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
}`
    }
];

console.log('\nCreating CSS modules...');
cssFiles.forEach(({ path: filePath, content }) => {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created ${filePath}`);
});

console.log('\n🎉 Refactoring setup complete!');
console.log('\nNext steps:');
console.log('1. Update imports in main.js');
console.log('2. Test the new modular structure');
console.log('3. Gradually migrate functionality');
console.log('4. Remove old files once migration is complete'); 