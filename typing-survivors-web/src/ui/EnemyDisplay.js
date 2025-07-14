// src/ui/EnemyDisplay.js
// Renders all active enemies at their positions, with emote and label

export function renderEnemies(enemies) {
  let enemyRoot = document.getElementById('enemy-root');
  if (!enemyRoot) {
    enemyRoot = document.createElement('div');
    enemyRoot.id = 'enemy-root';
    document.getElementById('game-container').appendChild(enemyRoot);
  }
  enemyRoot.innerHTML = enemies.map(e => {
    let glow = '';
    let textShadow = '';
    if (e.tier === 3) {
      glow = 'drop-shadow(0 0 7px gold)';
      textShadow = '1px 1px 2px #000, 0 0 3px gold';
    } else if (e.tier === 2) {
      glow = 'drop-shadow(0 0 4px #4cf8)';
      textShadow = '1px 1px 2px #000, 0 0 2px #4cf8';
    } else {
      glow = 'none';
      textShadow = '1px 1px 2px #000';
    }
    const labelStyle = e.labelAbove
      ? 'display:block;margin-bottom:14px;margin-top:0;'
      : 'display:block;margin-top:14px;margin-bottom:0;';
    return `
      <div class="enemy-word ${e.style}" style="position:absolute;left:${e.x}px;top:${e.y}px;padding:0;margin:0;background:transparent;border:none;box-shadow:none;">
        ${e.labelAbove ? `<div class=\"enemy-label\" style=\"text-align:center;font-size:15px;color:#fff;font-weight:bold;text-shadow:${textShadow};background:none;border:none;${labelStyle}\">${e.word}</div>` : ''}
        <img src="/emotes/${e.emote}" alt="${e.word}" class="enemy-emote" style="width:${e.size||60}px;height:${e.size||60}px;display:block;margin:0 auto;background:transparent;border:none;filter:${glow};border-radius:0;box-shadow:none;" />
        ${!e.labelAbove ? `<div class=\"enemy-label\" style=\"text-align:center;font-size:15px;color:#fff;font-weight:bold;text-shadow:${textShadow};background:none;border:none;${labelStyle}\">${e.word}</div>` : ''}
      </div>
    `;
  }).join('');
  enemyRoot.style.position = 'absolute';
  enemyRoot.style.top = '0';
  enemyRoot.style.left = '0';
  enemyRoot.style.width = '100%';
  enemyRoot.style.height = '100%';
  enemyRoot.style.pointerEvents = 'none';
  enemyRoot.style.zIndex = '50';
} 