// src/ui/PauseMenu.js
// Modular pause menu overlay

import { showMainMenu } from './Overlay.js';

let resumeHandler = null;

export function showPauseMenu(onResume) {
  resumeHandler = onResume;
  const overlayRoot = document.getElementById('overlay-root');
  overlayRoot.innerHTML = `
    <div class="pause-card">
      <button class="resume-btn" id="resume-btn">Resume</button>
      <h2 class="pause-title">Paused</h2>
      <div class="settings-section">
        <div class="setting-row">
          <label for="mute-all-toggle">Mute All</label>
          <label class="switch">
            <input type="checkbox" id="mute-all-toggle">
            <span class="slider"></span>
            <span class="toggle-label" id="mute-all-label">OFF</span>
          </label>
        </div>
        <div class="setting-row">
          <label for="case-sensitive-toggle">Case Sensitive</label>
          <label class="switch">
            <input type="checkbox" id="case-sensitive-toggle">
            <span class="slider"></span>
            <span class="toggle-label" id="case-sensitive-label">OFF</span>
          </label>
        </div>
        <div class="setting-row">
          <label for="sfx-volume">Sound Effects Volume</label>
          <input type="range" id="sfx-volume" min="0" max="1" step="0.01" value="1" class="slider" />
        </div>
        <div class="setting-row">
          <label for="death-volume">Death Sound Volume</label>
          <input type="range" id="death-volume" min="0" max="1" step="0.01" value="1" class="slider" style="margin-right:12px;" />
          <button id="test-death-sound-btn" class="test-btn">Test</button>
        </div>
        <div class="setting-row">
          <label for="bgm-toggle">Background Music</label>
          <label class="switch">
            <input type="checkbox" id="bgm-toggle">
            <span class="slider"></span>
            <span class="toggle-label" id="bgm-label">OFF</span>
          </label>
        </div>
        <div class="setting-row">
          <label for="bgm-volume">Music Volume</label>
          <input type="range" id="bgm-volume" min="0" max="1" step="0.01" value="1" class="slider" />
        </div>
        <div class="setting-row">
          <label for="music-select">Music Track</label>
          <select id="music-select" style="margin-left:12px; min-width:140px;"></select>
        </div>
        <div class="setting-row">
          <label for="music-on-pause-toggle">Keep Music Playing When Paused</label>
          <label class="switch">
            <input type="checkbox" id="music-on-pause-toggle">
            <span class="slider"></span>
            <span class="toggle-label" id="music-on-pause-label">OFF</span>
          </label>
        </div>
      </div>
      <button id="skins-btn" style="margin-top:1.2em;background:#a259ff;color:#fff;font-weight:700;font-size:1.1em;padding:0.6em 2.2em;border:none;border-radius:12px;box-shadow:0 2px 12px #a259ff44;cursor:pointer;display:block;width:100%;">Skins</button>
      <button id="abandon-btn" style="margin-top:1.2em;background:#ff4d4f;color:#fff;font-weight:700;font-size:1.1em;padding:0.6em 2.2em;border:none;border-radius:12px;box-shadow:0 2px 12px #ff4d4f44;cursor:pointer;display:block;width:100%;">Abandon Game</button>
    </div>
  `;
  overlayRoot.style.display = 'flex';
  document.body.classList.add('overlay-visible');

  // Toggle switch ON/OFF label logic
  const toggles = [
    { id: 'case-sensitive-toggle', label: 'case-sensitive-label' },
    { id: 'bgm-toggle', label: 'bgm-label' },
  ];
  toggles.forEach(({ id, label }) => {
    const toggle = document.getElementById(id);
    const labelEl = document.getElementById(label);
    if (toggle && labelEl) {
      toggle.onchange = () => {
        labelEl.textContent = toggle.checked ? 'ON' : 'OFF';
      };
      labelEl.textContent = toggle.checked ? 'ON' : 'OFF';
    }
  });

  document.getElementById('resume-btn').onclick = () => {
    console.debug('[PauseMenu] Resume button clicked');
    if (typeof resumeHandler === 'function') {
      console.debug('[PauseMenu] Calling resumeHandler');
      resumeHandler();
    } else {
      console.debug('[PauseMenu] resumeHandler is not a function:', resumeHandler);
    }
    hidePauseMenu();
    console.debug('[PauseMenu] hidePauseMenu called');
    const btn = document.getElementById('resume-btn');
    if (btn) btn.blur();
  };

  // Skins button handler
  setTimeout(() => {
    const btn = document.getElementById('skins-btn');
    if (btn) {
      btn.onclick = () => {
        if (typeof window.showSkinSelector === 'function') {
          window.showSkinSelector();
        } else if (typeof showSkinSelector === 'function') {
          showSkinSelector();
        } else {
          alert('Skin selector not available.');
        }
      };
    }
  }, 0);

  // Abandon Game button handler
  const abandonBtn = document.getElementById('abandon-btn');
  if (abandonBtn) {
    abandonBtn.onclick = () => {
      // Show confirmation dialog
      const confirmModal = document.createElement('div');
      confirmModal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:100000;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;';
      confirmModal.innerHTML = `
        <div style="background:#231a35;padding:2em 2.5em;border-radius:18px;box-shadow:0 0 32px #000a;max-width:90vw;text-align:center;">
          <div style="color:#fff;font-size:1.2em;margin-bottom:1.5em;">Are you sure you want to abandon the current game and return to the main menu?</div>
          <button id="confirm-abandon" style="background:#ff4d4f;color:#fff;font-weight:700;font-size:1.1em;padding:0.5em 2em;border:none;border-radius:10px;margin-right:1.2em;cursor:pointer;">Yes, Abandon</button>
          <button id="cancel-abandon" style="background:#a259ff;color:#fff;font-weight:700;font-size:1.1em;padding:0.5em 2em;border:none;border-radius:10px;cursor:pointer;">Cancel</button>
        </div>
      `;
      document.body.appendChild(confirmModal);
      document.getElementById('confirm-abandon').onclick = () => {
        console.debug('[PauseMenu] Abandon confirm clicked');
        // Remove the confirmation modal immediately
        document.body.removeChild(confirmModal);
        // Hide pause menu overlay
        const overlayRoot = document.getElementById('overlay-root');
        console.debug('[PauseMenu] overlayRoot before clear', overlayRoot);
        overlayRoot.innerHTML = '';
        overlayRoot.style.display = 'none';
        document.body.classList.remove('overlay-visible');
        // Force game over
        if (window.engine) {
          console.debug('[PauseMenu] window.engine exists', window.engine);
          window._abandonedGame = true;
          window.engine.isRunning = false;
          window.engine.isPaused = false;
          if (typeof window.engine.onGameOver === 'function') {
            console.debug('[PauseMenu] Calling window.engine.onGameOver');
            window.engine.onGameOver();
          } else {
            console.debug('[PauseMenu] window.engine.onGameOver is not a function', window.engine.onGameOver);
          }
        } else {
          console.debug('[PauseMenu] window.engine does not exist');
        }
        // Do not show main menu here; let onGameOver handle it
      };
      document.getElementById('cancel-abandon').onclick = () => {
        document.body.removeChild(confirmModal);
      };
    };
  }
}

export function hidePauseMenu() {
  const overlayRoot = document.getElementById('overlay-root');
  overlayRoot.innerHTML = '';
  overlayRoot.style.display = 'none';
  document.body.classList.remove('overlay-visible');
  resumeHandler = null;
} 