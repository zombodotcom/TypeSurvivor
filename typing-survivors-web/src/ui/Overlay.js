// src/ui/Overlay.js
import { showWaveSelectModal } from '../main.js';

let startGameHandler = null;

export function setStartGameHandler(fn) {
  startGameHandler = fn;
}

export function showMainMenu(onStart, options = {}) {
  const overlayRoot = document.getElementById('overlay-root');
  overlayRoot.innerHTML = `
    <div class="overlay-content">
      <h1>Typing Survivors</h1>
      <div class="game-mode-select" style="margin-bottom:18px;">
        <div style="font-size:15px;font-weight:600;margin-bottom:6px;">Game Mode:</div>
        <label style="margin-right:12px;"><input type="radio" name="mode" value="classic" checked> Classic</label>
        <label style="margin-right:12px;"><input type="radio" name="mode" value="wave"> Wave</label>
        <!-- <label><input type="radio" name="mode" value="adaptive"> Adaptive</label> -->
      </div>
      <div id="mode-description" style="font-size:13px;color:#a78bfa;margin-bottom:18px;">Classic: Enemies get harder as your score increases.</div>
      <div class="ui-toggles" style="margin-bottom:18px;">
        <label style="font-size:14px;font-weight:500;">
          <input type="checkbox" id="case-sensitive-toggle"> Case Sensitive
        </label>
        <!-- Add more toggles here in the future -->
      </div>
      <button id="start-btn">Start Game</button>
      <button id="skins-btn" style="margin-top:1.2em;background:#a259ff;color:#fff;font-weight:700;font-size:1.1em;padding:0.6em 2.2em;border:none;border-radius:12px;box-shadow:0 2px 12px #a259ff44;cursor:pointer;display:block;width:100%;">Skins</button>
    </div>
  `;
  overlayRoot.style.display = 'flex';
  document.body.classList.add('overlay-visible');

  // Mode descriptions
  const descriptions = {
    classic: 'Classic: Enemies get harder as your score increases.',
    wave: 'Wave: Survive increasingly difficult waves of enemies. Each wave brings new challenges.',
    adaptive: 'Adaptive: The game adjusts difficulty based on your performance.'
  };
  let selectedMode = 'classic';
  document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.onchange = (e) => {
      selectedMode = e.target.value;
      document.getElementById('mode-description').textContent = descriptions[selectedMode];
    };
  });

  // Start button handler
  document.getElementById('start-btn').onclick = () => {
    overlayRoot.style.display = 'none';
    document.body.classList.remove('overlay-visible');
    const caseSensitive = document.getElementById('case-sensitive-toggle').checked;
    if (selectedMode === 'wave') {
      showWaveSelectModal(wave => {
        if (typeof onStart === 'function') onStart({ mode: selectedMode, caseSensitive, startWave: wave });
      });
    } else {
      if (typeof onStart === 'function') onStart({ mode: selectedMode, caseSensitive });
    }
  };
  // Skins button handler
  document.getElementById('skins-btn').onclick = () => {
    if (typeof window.showSkinSelector === 'function') {
      window.showSkinSelector();
    } else if (typeof showSkinSelector === 'function') {
      showSkinSelector();
    } else {
      alert('Skin selector not available.');
    }
  };
} 