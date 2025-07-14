// src/ui/HUD.js
// Renders the game HUD (score, combo, high score)

export function renderHUD({ score, combo, highScore, time, bestTime, wave }) {
  let hudRoot = document.getElementById('hud-root');
  if (!hudRoot) {
    hudRoot = document.createElement('div');
    hudRoot.id = 'hud-root';
    document.getElementById('game-container').appendChild(hudRoot);
  }
  function formatTime(sec) {
    if (typeof sec !== 'number' || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  hudRoot.innerHTML = `
    <div class="hud-score">Score: <span id="score">${score}</span></div>
    <div class="hud-high-score">High Score: <span id="high-score">${highScore}</span></div>
    <div class="hud-time">Time: <span id="hud-time">${formatTime(time)}</span></div>
    <div class="hud-best-time">Best Time: <span id="hud-best-time">${formatTime(bestTime)}</span></div>
    ${wave ? `<div class="hud-wave">Wave: <span id="hud-wave">${wave}</span></div>` : ''}
  `;
  hudRoot.style.display = 'flex';
  hudRoot.style.gap = '24px';
  hudRoot.style.justifyContent = 'center';
  hudRoot.style.position = 'absolute';
  hudRoot.style.top = '18px';
  hudRoot.style.left = '50%';
  hudRoot.style.transform = 'translateX(-50%)';
  hudRoot.style.zIndex = '100';
} 