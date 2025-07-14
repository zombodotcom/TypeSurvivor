// Entry point for TypeSurvivor (clean slate)
import { showMainMenu, setStartGameHandler } from './ui/Overlay.js';
import './styles/main.css';
import { GameEngine } from './game/GameEngine.js';
import { EnemyManager } from './game/EnemyManager.js';
import { PlayerManager } from './game/PlayerManager.js';
import { ScoreManager } from './game/ScoreManager.js';
import { renderHUD } from './ui/HUD.js';
import { renderEnemies } from './ui/EnemyDisplay.js';
import { renderTypingInput } from './ui/TypingInput.js';
import { showPauseMenu, hidePauseMenu } from './ui/PauseMenu.js';
import audioSystem from './audio.js';

// Ensure at least one skin is always unlocked and selected
function ensureDefaultSkin() {
  let unlocked = JSON.parse(localStorage.getItem('unlockedSkins') || '[]');
  if (!unlocked.includes('moon2Believer.png')) {
    unlocked.push('moon2Believer.png');
    localStorage.setItem('unlockedSkins', JSON.stringify(unlocked));
  }
  if (!localStorage.getItem('selectedSkin')) {
    localStorage.setItem('selectedSkin', 'moon2Believer.png');
  }
}

// Glow unlockables definition
const GLOW_UNLOCKS = [
  {
    id: 'default',
    name: 'Default',
    css: '0 0 12px #22ff7e, 0 2px 8px rgba(0,0,0,0.3)',
    filter: 'drop-shadow(0 0 7px #22ff7e)',
    unlock: () => true,
    desc: 'Always unlocked',
  },
  {
    id: 'gold',
    name: 'Gold',
    css: '0 0 24px 6px #ffd700, 0 2px 8px #ffd70099',
    filter: 'drop-shadow(0 0 7px gold)',
    unlock: (time) => time >= 60,
    desc: 'Survive 1 minute',
  },
  {
    id: 'blue',
    name: 'Blue',
    css: '0 0 24px 6px #00bfff, 0 2px 8px #00bfff99',
    filter: 'drop-shadow(0 0 7px #00bfff)',
    unlock: (time) => time >= 120,
    desc: 'Survive 2 minutes',
  },
  {
    id: 'red',
    name: 'Red',
    css: '0 0 24px 6px #ff3b3b, 0 2px 8px #ff3b3b99',
    filter: 'drop-shadow(0 0 7px #ff3b3b)',
    unlock: (time) => time >= 180,
    desc: 'Survive 3 minutes',
  },
  {
    id: 'purple',
    name: 'Purple',
    css: '0 0 24px 6px #a259ff, 0 2px 8px #a259ff99',
    filter: 'drop-shadow(0 0 7px #a259ff)',
    unlock: (time) => time >= 240,
    desc: 'Survive 4 minutes',
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    css: '0 0 24px 6px #fff, 0 0 32px 8px #a259ff, 0 0 48px 12px #22ff7e',
    filter: 'drop-shadow(0 0 7px #a259ff) drop-shadow(0 0 14px #22ff7e) drop-shadow(0 0 21px #fff)',
    unlock: (time) => time >= 300,
    desc: 'Survive 5 minutes',
  },
];

function getUnlockedGlows() {
  return JSON.parse(localStorage.getItem('unlockedGlows') || '["default"]');
}
function setUnlockedGlows(arr) {
  localStorage.setItem('unlockedGlows', JSON.stringify(arr));
}
function getSelectedGlow() {
  return localStorage.getItem('selectedGlow') || 'default';
}
function setSelectedGlow(id) {
  localStorage.setItem('selectedGlow', id);
}

function getBestTime() {
  return Number(localStorage.getItem('bestTime') || '0');
}
function setBestTime(t) {
  localStorage.setItem('bestTime', String(t));
}

function getHighestWave() {
  return parseInt(localStorage.getItem('highestWave') || '1', 10);
}
function setHighestWave(wave) {
  localStorage.setItem('highestWave', String(Math.max(1, Math.min(30, wave))));
}

// --- Wave Mode State ---
let isWaveMode = false;
let currentWave = 1;
let waveInProgress = false;
let wavePauseTimer = 0;

function startWave() {
  waveInProgress = true;
  const numEnemies = 5 + 2 * (currentWave - 1);
  for (let i = 0; i < numEnemies; i++) {
    enemyManager.spawnEnemy(0); // Score doesn't affect tier in wave mode
  }
}

function checkWaveComplete() {
  if (isWaveMode && waveInProgress && enemyManager.getEnemies().length === 0) {
    waveInProgress = false;
    wavePauseTimer = 180; // 3 seconds at 60fps (or ms if using setTimeout)
  }
}

export function showWaveSelectModal(onStart) {
  const highest = getHighestWave();
  let selected = 1;
  const modal = document.createElement('div');
  modal.className = 'wave-select-modal-bg';
  modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div class="wave-select-modal" style="background:#231a35;padding:2.2em 2.2em 1.2em 2.2em;border-radius:22px;max-width:400px;width:90vw;box-shadow:0 0 32px #000a;display:flex;flex-direction:column;align-items:center;">
      <h2 style="color:#fff;text-align:center;margin-bottom:1.2em;">Select Starting Wave</h2>
      <div style="display:flex;align-items:center;gap:18px;margin-bottom:1.5em;">
        <button id="wave-dec" style="font-size:2em;padding:0 0.5em;border-radius:50%;border:none;background:#a259ff;color:#fff;cursor:pointer;">&#8592;</button>
        <div id="wave-num" style="font-size:2.2em;width:2.5em;text-align:center;color:#ffd700;">1</div>
        <button id="wave-inc" style="font-size:2em;padding:0 0.5em;border-radius:50%;border:none;background:#a259ff;color:#fff;cursor:pointer;">&#8594;</button>
      </div>
      <button id="wave-start" style="font-size:1.2em;padding:0.6em 2.2em;border-radius:12px;border:none;background:#a259ff;color:#fff;cursor:pointer;">Start</button>
      </div>
    `;
  document.body.appendChild(modal);
  const numBox = modal.querySelector('#wave-num');
  const decBtn = modal.querySelector('#wave-dec');
  const incBtn = modal.querySelector('#wave-inc');
  decBtn.onclick = () => {
    if (selected > 1) {
      selected--;
      numBox.textContent = selected;
    }
  };
  incBtn.onclick = () => {
    if (selected < Math.min(30, highest)) {
      selected++;
      numBox.textContent = selected;
    }
  };
  modal.querySelector('#wave-start').onclick = () => {
    document.body.removeChild(modal);
    onStart(selected);
  };
}

// Create game container and overlay root
const container = document.createElement('div');
container.id = 'game-container';
document.body.appendChild(container);

const overlayRoot = document.createElement('div');
overlayRoot.id = 'overlay-root';
container.appendChild(overlayRoot);

// Game managers and engine (initialized on start)
let engine, enemyManager, playerManager, scoreManager;
let emoteList = [];
let lastResumeTime = 0;
let ignoreNextEscape = false;
let caseSensitive = false; // <-- Add global caseSensitive
let lastKiller = null;
let enemiesDefeated = 0;
let roundStartTime = 0;
let totalPausedTime = 0;
let pauseStartTime = 0;

// Fetch emote list before starting the game
fetch('/emotes/emotes.json')
  .then(res => res.json())
  .then(list => {
    emoteList = list;
    showMainMenu(startGame);
  });

// Handler to start the game
function startGame(options = {}) {
  // options: { mode, caseSensitive }
  overlayRoot.style.display = 'none';
  document.body.classList.remove('overlay-visible');
  // Initialize managers and engine
  if (typeof options.caseSensitive === 'boolean') caseSensitive = options.caseSensitive;
  isWaveMode = options.mode === 'wave';
  currentWave = options.startWave || 1;
  waveInProgress = false;
  wavePauseTimer = 0;
  enemyManager = new EnemyManager({ mode: options.mode });
  enemyManager.setEmoteList(emoteList);
  playerManager = new PlayerManager({ caseSensitive });
  scoreManager = new ScoreManager();
  lastKiller = null;
  enemiesDefeated = 0;
  roundStartTime = Date.now();
  totalPausedTime = 0;
  pauseStartTime = 0;
  engine = new GameEngine({
    enemyManager,
    playerManager,
    scoreManager,
    onGameOver: () => {
      console.log('[main] onGameOver called', {abandoned: window._abandonedGame});
      audioSystem.stopMusic();
      audioSystem.playDeathSound(); // Play game over sound at death sound volume
      const now = Date.now();
      const timeSurvived = Math.round((now - roundStartTime - totalPausedTime) / 1000);
      // Unlock glows
      let unlockedGlows = getUnlockedGlows();
      let changed = false;
      for (const glow of GLOW_UNLOCKS) {
        if (!unlockedGlows.includes(glow.id) && glow.unlock(timeSurvived)) {
          unlockedGlows.push(glow.id);
          changed = true;
        }
      }
      if (changed) setUnlockedGlows(unlockedGlows);
      // Update best time
      if (timeSurvived > getBestTime()) setBestTime(timeSurvived);
      if (isWaveMode && currentWave > getHighestWave()) {
        setHighestWave(currentWave);
      }
      let killerHtml = '';
      let quitMode = false;
      if (window._abandonedGame) {
        quitMode = true;
        window._abandonedGame = false;
        killerHtml = `<div style="margin-bottom:1em;">You Quit<br><img src='/emotes/NOTED.png' alt='You Quit' style='width:64px;height:64px;display:block;margin:0.5em auto 0.2em auto;'><div style='font-size:1.2em;font-weight:bold;color:#fff;text-shadow:0 2px 8px #000a;'>Quit</div></div>`;
      } else if (lastKiller) {
        killerHtml = `<div style="margin-bottom:1em;">Killed by:<br><img src='/emotes/${lastKiller.emote}' alt='${lastKiller.word}' style='width:64px;height:64px;display:block;margin:0.5em auto 0.2em auto;'><div style='font-size:1.2em;font-weight:bold;color:#fff;text-shadow:0 2px 8px #000a;'>${lastKiller.word}</div></div>`;
      }
      overlayRoot.innerHTML = `<div class="overlay-content"><h2>Game Over</h2>${killerHtml}<div style='margin-bottom:0.7em;'>Score: <b>${scoreManager.getScore()}</b></div><div style='margin-bottom:0.7em;'>Enemies Defeated: <b>${enemiesDefeated}</b></div><div style='margin-bottom:1.2em;'>Time Survived: <b>${timeSurvived}s</b></div><button id="restart-btn" class="gameover-btn gameover-btn-restart">Restart</button>${quitMode ? '<button id="mainmenu-btn" class="gameover-btn gameover-btn-main">Main Menu</button>' : ''}</div>`;
      overlayRoot.style.display = 'flex';
      document.body.classList.add('overlay-visible');
      document.getElementById('restart-btn').onclick = () => {
        overlayRoot.style.display = 'none';
        document.body.classList.remove('overlay-visible');
        // Reset timer for new run
        roundStartTime = Date.now();
        totalPausedTime = 0;
        // Always start at wave 1 on restart
        currentWave = 1;
        engine.start();
        setupUI();
        audioSystem.playMusic();
      };
      if (quitMode) {
        document.getElementById('mainmenu-btn').onclick = () => {
          overlayRoot.style.display = 'none';
          document.body.classList.remove('overlay-visible');
          showMainMenu(startGame);
        };
      }
    },
    onScoreChange: () => updateUI(),
    onEnemyDefeated: () => { enemiesDefeated++; updateUI(); },
    onFrame: () => {
      // --- Wave Mode Logic ---
      if (isWaveMode) {
        if (!waveInProgress && wavePauseTimer > 0) {
          wavePauseTimer--;
          if (wavePauseTimer === 0) {
            currentWave++;
            startWave();
          }
        } else if (!waveInProgress && wavePauseTimer === 0) {
          startWave();
        } else {
          checkWaveComplete();
        }
      }
      updateUI();
      // Player center
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      // Check for collision and store killer
      const killer = enemyManager.getEnemies().find(e => {
        const dx = e.x - centerX;
        const dy = e.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < 44;
      });
      if (killer) {
        lastKiller = killer;
        engine.end();
      }
    },
  });
  window.engine = engine;
  engine.start();
  setupUI();
  renderPlayerAvatar();
  audioSystem.playMusic();
  console.debug('[main] Game started', options);
}
window.startGame = startGame;

// Add a function to show the skin selector modal
function showSkinSelector() {
  ensureDefaultSkin();
  // Get all emotes and unlocked skins
  const allEmotes = emoteList;
  const unlocked = JSON.parse(localStorage.getItem('unlockedSkins') || '[]');
  const selected = localStorage.getItem('selectedSkin') || 'moon2Believer.png';
  const unlockedGlows = getUnlockedGlows();
  const selectedGlow = getSelectedGlow();
  // Build glow unlockables row
  let html = `<div class="skin-modal-bg" style="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;">
    <div class="skin-modal" style="background:#231a35;padding:2.2em 2.2em 1.2em 2.2em;border-radius:22px;max-width:900px;width:90vw;max-height:90vh;overflow:hidden;box-shadow:0 0 32px #000a;position:relative;">
      <button id="close-skin-x" class="skin-x-btn" aria-label="Close">&times;</button>
      <h2 style="color:#fff;text-align:center;margin-bottom:1.2em;">Select Your Skin</h2>
      <div class="glow-row" style="display:flex;gap:18px;overflow-x:auto;justify-content:center;margin-bottom:1.5em;">`;
  for (const glow of GLOW_UNLOCKS) {
    const isUnlocked = unlockedGlows.includes(glow.id);
    const isSelected = selectedGlow === glow.id;
    html += `<div class="glow-card${isUnlocked ? '' : ' glow-locked'}${isSelected ? ' glow-selected' : ''}" data-glow="${glow.id}" title="${glow.desc}" style="background:#2d2340;border-radius:12px;padding:10px 18px;display:flex;flex-direction:column;align-items:center;box-shadow:0 2px 12px #0006;cursor:${isUnlocked ? 'pointer' : 'not-allowed'};opacity:${isUnlocked ? 1 : 0.4};border:${isSelected ? '3px solid #ffd700' : '2px solid #a259ff33'};min-width:80px;">
      <div class="glow-preview" style="width:36px;height:36px;border-radius:50%;background:#231a35;margin-bottom:0.5em;border:2px solid #fff;box-shadow:${glow.css};"></div>
      <div style="color:#fff;font-size:13px;text-align:center;">${glow.name}</div>
      ${!isUnlocked ? `<div style="margin-top:0.3em;color:#ffd700;font-size:12px;">${glow.desc}</div>` : ''}
    </div>`;
  }
  html += '</div>';
  // Build grid
  html += `<div class="skin-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,120px));gap:18px;width:100%;max-height:60vh;overflow-y:auto;justify-items:center;">
  `;
  for (const emote of allEmotes) {
    const isUnlocked = unlocked.includes(emote) || emote === 'moon2Believer.png';
    const isSelected = selected === emote;
    html += `<div class="skin-card${isUnlocked ? '' : ' skin-locked'}${isSelected ? ' skin-selected' : ''}" data-emote="${emote}">
      <img src="/emotes/${emote}" alt="${emote}" class="skin-img">
      <div class="skin-label">${emote.replace(/\.[^/.]+$/, '')}</div>
      ${!isUnlocked ? '<div class="skin-locked-label">Locked</div>' : ''}
    </div>`;
  }
  html += '</div><div style="text-align:center;margin-top:1.5em;"><button id="close-skin-modal" class="skin-close-btn">Close</button></div></div></div>';
  // Show modal
  const modal = document.createElement('div');
  modal.innerHTML = html;
  document.body.appendChild(modal);
  // Glow card click handler
  modal.querySelectorAll('.glow-card').forEach(card => {
    card.classList.remove('glow-selected');
    // Always update the preview to match the glow's effect
    const glowId = card.getAttribute('data-glow');
    const glowObj = GLOW_UNLOCKS.find(g => g.id === glowId);
    const preview = card.querySelector('.glow-preview');
    if (preview && glowObj) preview.style.boxShadow = glowObj.css;
    if (!card.classList.contains('glow-locked')) {
      card.onclick = () => {
        const glow = card.getAttribute('data-glow');
        setSelectedGlow(glow);
        // Update selection UI immediately
        const newSelectedGlow = glow;
        modal.querySelectorAll('.glow-card').forEach(c => {
          const cid = c.getAttribute('data-glow');
          const isSelected = cid === newSelectedGlow;
          c.classList.toggle('glow-selected', isSelected);
          // Also update preview for all cards
          const cglow = GLOW_UNLOCKS.find(g => g.id === cid);
          const cpreview = c.querySelector('.glow-preview');
          if (cpreview && cglow) cpreview.style.boxShadow = cglow.css;
          // Update border style inline for instant feedback
          if (isSelected) {
            c.style.border = '3px solid #ffd700';
            c.style.background = '#a259ff';
          } else {
            c.style.border = '2px solid #a259ff33';
            c.style.background = '#2d2340';
          }
        });
        // Update player avatar immediately if in game
        const player = document.getElementById('player-avatar');
        if (player) {
          const selected = newSelectedGlow;
          const glowObj = GLOW_UNLOCKS.find(g => g.id === selected);
          player.style.boxShadow = 'none';
          player.innerHTML = `<img src="/emotes/${localStorage.getItem('selectedSkin') || 'moon2Believer.png'}" alt="player" style="width:100%;height:100%;border-radius:50%;object-fit:contain;${glowObj ? `filter:${glowObj.filter};` : ''}" onerror="this.onerror=null;this.src='/emotes/moon2Believer.png'" />`;
        }
      };
    }
  });
  // Card click handler
  modal.querySelectorAll('.skin-card').forEach(card => {
    if (!card.classList.contains('skin-locked')) {
      card.onclick = () => {
        const emote = card.getAttribute('data-emote');
        localStorage.setItem('selectedSkin', emote);
        // Remove highlight from others
        modal.querySelectorAll('.skin-card').forEach(c => c.classList.remove('skin-selected'));
        card.classList.add('skin-selected');
        // Update player avatar immediately if in game
        const player = document.getElementById('player-avatar');
        if (player) {
          player.innerHTML = `<img src="/emotes/${emote}" alt="player" style="width:100%;height:100%;border-radius:50%;object-fit:contain;" />`;
        }
      };
    }
  });
  // Close handlers
  function closeModal() {
    document.body.removeChild(modal);
    window.removeEventListener('keydown', escListener);
  }
  modal.querySelector('#close-skin-modal').onclick = closeModal;
  modal.querySelector('#close-skin-x').onclick = closeModal;
  modal.querySelector('.skin-modal-bg').addEventListener('mousedown', (e) => {
    if (e.target === modal.querySelector('.skin-modal-bg')) {
      closeModal();
    }
  });
  function escListener(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }
  window.addEventListener('keydown', escListener);
  // Add/override CSS for card structure and modal
  const style = document.createElement('style');
  style.textContent = `
    .skin-modal { position: relative; }
    .skin-x-btn {
      position: absolute;
      top: 14px;
      right: 18px;
      background: none;
      border: none;
      color: #fff;
      font-size: 2.2em;
      font-weight: bold;
      cursor: pointer;
      z-index: 10;
      line-height: 1;
      padding: 0 0.2em;
      transition: color 0.18s;
    }
    .skin-x-btn:hover {
      color: #ffd700;
    }
    .skin-grid {
      grid-template-columns: repeat(auto-fit, minmax(80px, 120px));
      width: 100%;
      max-height: 60vh;
      overflow-y: auto;
      justify-items: center;
    }
    .skin-card {
      background: #2d2340;
      border-radius: 14px;
      padding: 10px 6px 8px 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 2px 12px #0006;
      cursor: pointer;
      opacity: 1;
      border: 2px solid #a259ff33;
      margin: 0;
      transition: border 0.18s, box-shadow 0.18s, background 0.18s;
      position: relative;
    }
    .skin-card.skin-selected {
      border: 3px solid #ffd700;
      background: #a259ff;
      box-shadow: 0 2px 16px #ffd70055;
    }
    .skin-card.skin-locked {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .skin-img {
      width: 64px;
      height: 64px;
      object-fit: contain;
      border-radius: 8px;
      margin-bottom: 0.5em;
      box-shadow: 0 0 8px #000a;
      background: #1a102a;
    }
    .skin-label {
      color: #fff;
      font-size: 14px;
      text-align: center;
      word-break: break-all;
    }
    .skin-locked-label {
      margin-top: 0.4em;
      color: #ffd700;
      font-size: 13px;
    }
    .skin-card:not(.skin-locked):hover {
      background: #3a2e5a;
      box-shadow: 0 4px 18px #a259ff77;
      border: 3px solid #a259ff;
    }
    .glow-row { display: flex; gap: 18px; overflow-x: auto; justify-content: center; margin-bottom: 1.5em; }
    .glow-card { background: #2d2340; border-radius: 12px; padding: 10px 18px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 2px 12px #0006; cursor: pointer; opacity: 1; border: 2px solid #a259ff33; min-width: 80px; transition: border 0.18s, box-shadow 0.18s, background 0.18s; position: relative; }
    .glow-card.glow-selected { border: 3px solid #ffd700; background: #a259ff; box-shadow: 0 2px 16px #ffd70055; }
    .glow-card.glow-locked { opacity: 0.4; cursor: not-allowed; }
    .glow-preview { width: 36px; height: 36px; border-radius: 50%; background: #231a35; margin-bottom: 0.5em; border: 2px solid #fff; }
    .glow-card:not(.glow-locked):hover { background: #3a2e5a; box-shadow: 0 4px 18px #a259ff77; border: 3px solid #a259ff; }
    .skin-close-btn {
      background: #a259ff;
      color: #fff;
      font-weight: 700;
      font-size: 1.1em;
      padding: 0.6em 2.2em;
      border: none;
      border-radius: 12px;
      box-shadow: 0 2px 12px #a259ff44;
      cursor: pointer;
      margin-top: 1.2em;
      transition: background 0.18s, box-shadow 0.18s;
    }
    .skin-close-btn:hover {
      background: #b47aff;
      box-shadow: 0 4px 18px #a259ff77;
    }
    @media (max-width: 1000px) {
      .skin-modal { max-width: 98vw; }
      .skin-grid { max-width: 98vw; }
    }
  `;
  document.head.appendChild(style);
}
window.showSkinSelector = showSkinSelector;

// Add Skins button to main menu and pause/settings overlays
// (Assume showMainMenu and showPauseMenu are modular and can be extended)
// Main menu: after rendering, add Skins button
const origShowMainMenu = window.showMainMenu || showMainMenu;
window.showMainMenu = function(...args) {
  origShowMainMenu.apply(this, args);
  // Add Skins button
  const overlayRoot = document.getElementById('overlay-root');
  if (overlayRoot && !document.getElementById('skins-btn')) {
    const btn = document.createElement('button');
    btn.id = 'skins-btn';
    btn.textContent = 'Skins';
    btn.style = 'margin-top:1.2em;background:#a259ff;color:#fff;font-weight:700;font-size:1.1em;padding:0.6em 2.2em;border:none;border-radius:12px;box-shadow:0 2px 12px #a259ff44;cursor:pointer;display:block;width:100%;';
    btn.onclick = showSkinSelector;
    overlayRoot.querySelector('.overlay-content')?.appendChild(btn);
  }
};
// Pause/settings: after rendering, add Skins button
const origShowPauseMenu = window.showPauseMenu || showPauseMenu;
window.showPauseMenu = function(...args) {
  origShowPauseMenu.apply(this, args);
  // Add Skins button
  const overlayRoot = document.getElementById('overlay-root');
  if (overlayRoot && !document.getElementById('skins-btn')) {
    const btn = document.createElement('button');
    btn.id = 'skins-btn';
    btn.textContent = 'Skins';
    btn.style = 'margin-top:1.2em;background:#a259ff;color:#fff;font-weight:700;font-size:1.1em;padding:0.6em 2.2em;border:none;border-radius:12px;box-shadow:0 2px 12px #a259ff44;cursor:pointer;display:block;width:100%;';
    btn.onclick = showSkinSelector;
    overlayRoot.querySelector('.pause-card, .overlay-content')?.appendChild(btn);
  }
};

// When rendering player avatar, use selected glow
function renderPlayerAvatar() {
  ensureDefaultSkin();
  let player = document.getElementById('player-avatar');
  if (!player) {
    player = document.createElement('div');
    player.id = 'player-avatar';
    document.getElementById('game-container').appendChild(player);
  }
  player.style.position = 'absolute';
  player.style.left = '50%';
  player.style.top = '50%';
  player.style.transform = 'translate(-50%, -50%)';
  player.style.width = '64px';
  player.style.height = '64px';
  player.style.borderRadius = '50%';
  player.style.background = 'none'; // Remove any background
  const selectedGlow = getSelectedGlow();
  const glowObj = GLOW_UNLOCKS.find(g => g.id === selectedGlow);
  player.style.boxShadow = 'none'; // Remove any box-shadow from the avatar container
  player.style.border = 'none'; // Remove border entirely
  player.style.zIndex = '5';
  player.style.pointerEvents = 'none';
  player.classList.remove('glow-rainbow');
  const selected = localStorage.getItem('selectedSkin') || 'moon2Believer.png';
  if (selectedGlow === 'rainbow') {
    player.innerHTML = `<img src="/emotes/${selected}" alt="player" style="width:100%;height:100%;display:block;filter:url(#rainbow-glow);" onerror="this.onerror=null;this.src='/emotes/moon2Believer.png'" />`;
  } else {
    player.innerHTML = `<img src="/emotes/${selected}" alt="player" style="width:100%;height:100%;display:block;${glowObj ? `filter:${glowObj.filter};` : ''}" onerror="this.onerror=null;this.src='/emotes/moon2Believer.png'" />`;
  }
}

// --- UI Wiring ---
function setupUI() {
  updateUI();
  renderTypingInput(playerManager.inputBuffer, handleInput);
  renderPlayerAvatar();
}

function updateUI() {
  // Calculate time survived
  let timeSurvived = 0;
  if (engine && engine.isRunning) {
    const now = Date.now();
    timeSurvived = Math.floor((now - roundStartTime - totalPausedTime) / 1000);
  }
  const bestTime = getBestTime();
  renderHUD({
    score: scoreManager.getScore(),
    highScore: scoreManager.getHighScore(),
    time: timeSurvived,
    bestTime: bestTime,
    wave: isWaveMode ? currentWave : null,
  });
  renderEnemies(enemyManager.getEnemies());
  renderTypingInput(playerManager.inputBuffer, handleInput);
}

function handleInput(value, e) {
  playerManager.inputBuffer = value;
  // Case-(in)sensitive match based on setting
  const enemies = enemyManager.getEnemies();
  for (const enemy of enemies) {
    if (
      (caseSensitive && enemy.word === value) ||
      (!caseSensitive && enemy.word.toLowerCase() === value.toLowerCase())
    ) {
      enemyManager.defeatEnemy(enemy.word);
      scoreManager.incrementScore(enemy.word.length * 10);
      playerManager.inputBuffer = '';
      updateUI();
        return;
    }
  }
  updateUI();
}

// --- Pause Logic ---
function togglePause() {
  if (!engine || !engine.isRunning) return;
  if (!engine.isPaused) {
    engine.pause();
    pauseStartTime = Date.now();
    showPauseMenu(resumeGame, { caseSensitive }); // Pass current value
    setTimeout(() => {
      // Case Sensitive
      const toggle = document.getElementById('case-sensitive-toggle');
      if (toggle) {
        toggle.checked = caseSensitive;
        const labelEl = document.getElementById('case-sensitive-label');
        if (labelEl) labelEl.textContent = toggle.checked ? 'ON' : 'OFF';
        toggle.onchange = () => {
          caseSensitive = toggle.checked;
          playerManager.config.caseSensitive = caseSensitive;
          if (labelEl) labelEl.textContent = toggle.checked ? 'ON' : 'OFF';
        };
      }
      // SFX Volume
      const sfxSlider = document.getElementById('sfx-volume');
      if (sfxSlider) {
        sfxSlider.value = audioSystem.sfxVolume;
        sfxSlider.oninput = (e) => audioSystem.setSFXVolume(Number(e.target.value));
      }
      // Death Sound Volume
      const deathSlider = document.getElementById('death-volume');
      if (deathSlider) {
        deathSlider.value = audioSystem.deathVolume;
        deathSlider.oninput = (e) => audioSystem.setDeathVolume(Number(e.target.value));
      }
      // Test Death Sound Button
      const testDeathBtn = document.getElementById('test-death-sound-btn');
      if (testDeathBtn) {
        testDeathBtn.onclick = () => audioSystem.playTestDeathSound();
      }
      // BGM Toggle
      const bgmToggle = document.getElementById('bgm-toggle');
      if (bgmToggle) {
        bgmToggle.checked = audioSystem.musicEnabled;
        const labelEl = document.getElementById('bgm-label');
        if (labelEl) labelEl.textContent = bgmToggle.checked ? 'ON' : 'OFF';
        bgmToggle.onchange = () => {
          audioSystem.setMusicEnabled(bgmToggle.checked);
          if (labelEl) labelEl.textContent = bgmToggle.checked ? 'ON' : 'OFF';
        };
      }
      // BGM Volume
      const bgmSlider = document.getElementById('bgm-volume');
      if (bgmSlider) {
        bgmSlider.value = audioSystem.musicVolume;
        bgmSlider.oninput = (e) => audioSystem.setMusicVolume(Number(e.target.value));
      }
      // Music Track Dropdown
      const musicSelect = document.getElementById('music-select');
      if (musicSelect) {
        const tracks = audioSystem.getMusicList();
        musicSelect.innerHTML = '';
        tracks.forEach(track => {
          const opt = document.createElement('option');
          opt.value = track;
          opt.textContent = track.replace(/\.[^/.]+$/, '');
          if (audioSystem.currentMusicTrack === track) opt.selected = true;
          musicSelect.appendChild(opt);
        });
        musicSelect.onchange = (e) => {
          audioSystem.selectMusic(e.target.value);
        };
        // Add Next button
        let nextBtn = document.getElementById('music-next-btn');
        if (!nextBtn) {
          nextBtn = document.createElement('button');
          nextBtn.id = 'music-next-btn';
          nextBtn.textContent = 'Next';
          nextBtn.style = 'margin-left:10px;background:#a259ff;color:#fff;font-weight:700;font-size:1em;padding:0.3em 1.2em;border:none;border-radius:8px;box-shadow:0 1px 6px #a259ff33;cursor:pointer;vertical-align:middle;';
          musicSelect.parentNode.appendChild(nextBtn);
        }
        nextBtn.onclick = () => {
          const tracks = audioSystem.getMusicList();
          const currentIdx = tracks.indexOf(audioSystem.currentMusicTrack);
          const nextIdx = (currentIdx + 1) % tracks.length;
          audioSystem.selectMusic(tracks[nextIdx]);
          musicSelect.value = tracks[nextIdx];
        };
      }
      // Keep Music On Pause Toggle
      const musicPauseToggle = document.getElementById('music-on-pause-toggle');
      if (musicPauseToggle) {
        musicPauseToggle.checked = audioSystem.keepMusicOnPause;
        const labelEl = document.getElementById('music-on-pause-label');
        if (labelEl) labelEl.textContent = musicPauseToggle.checked ? 'ON' : 'OFF';
        musicPauseToggle.onchange = () => {
          audioSystem.setKeepMusicOnPause(musicPauseToggle.checked);
          if (labelEl) labelEl.textContent = musicPauseToggle.checked ? 'ON' : 'OFF';
          // If toggled ON and music is enabled and paused, resume music immediately
          if (musicPauseToggle.checked && audioSystem.music && audioSystem.musicEnabled && engine && engine.isPaused) {
            audioSystem.music.play();
          }
        };
      }
      // Mute All Toggle
      const muteAllToggle = document.getElementById('mute-all-toggle');
      if (muteAllToggle) {
        muteAllToggle.checked = audioSystem.isMuted;
        const labelEl = document.getElementById('mute-all-label');
        if (labelEl) labelEl.textContent = muteAllToggle.checked ? 'ON' : 'OFF';
        muteAllToggle.onchange = () => {
          if (muteAllToggle.checked) {
            audioSystem.muteAll();
          } else {
            audioSystem.unmuteAll();
          }
          if (labelEl) labelEl.textContent = muteAllToggle.checked ? 'ON' : 'OFF';
          // Update all sliders to reflect mute state
          const sfxSlider = document.getElementById('sfx-volume');
          if (sfxSlider) sfxSlider.value = audioSystem.sfxVolume;
          const deathSlider = document.getElementById('death-volume');
          if (deathSlider) deathSlider.value = audioSystem.deathVolume;
          const bgmSlider = document.getElementById('bgm-volume');
          if (bgmSlider) bgmSlider.value = audioSystem.musicVolume;
        };
      }
      // Pause music if needed
      if (!audioSystem.keepMusicOnPause && audioSystem.music) {
        audioSystem.music.pause();
      }
    }, 0);
  } else {
    // Resume music if needed
    if (!audioSystem.keepMusicOnPause && audioSystem.music && audioSystem.musicEnabled) {
      audioSystem.music.play();
    }
            resumeGame();
  }
}

function resumeGame() {
  console.debug('[main] resumeGame called');
  if (!engine) return;
  hidePauseMenu();
  engine.resume();
  if (pauseStartTime) {
    totalPausedTime += Date.now() - pauseStartTime;
    pauseStartTime = 0;
  }
  // Resume music if needed
  if (!audioSystem.keepMusicOnPause && audioSystem.music && audioSystem.musicEnabled) {
    audioSystem.music.play();
  }
  setupUI();
  setTimeout(() => {
    const input = document.getElementById('typed-input');
    if (input) input.focus();
  }, 0);
  lastResumeTime = Date.now();
}

// Listen for Escape key to toggle pause
window.addEventListener('keydown', (e) => {
  if (
    e.key === 'Escape' &&
    engine &&
    engine.isRunning
  ) {
    if (!engine.isPaused && !document.body.classList.contains('overlay-visible')) {
      // Pause the game
      togglePause();
    } else if (engine.isPaused && document.body.classList.contains('overlay-visible')) {
      // Resume the game if pause/settings menu is open
      resumeGame();
    }
  }
});

window.addEventListener('resize', () => {
  // Update player avatar position
  renderPlayerAvatar();
  // Update enemy manager/game center if needed
  if (enemyManager && typeof enemyManager.updateCenter === 'function') {
    enemyManager.updateCenter();
  }
  // Re-render UI
  setupUI();
}); 