let CENTER = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let ENEMY_SPEED = 80; // pixels per second (adjust as you like)
let enemies = [];
let emoteList = [];
let inputText = '';
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore') || '0') || 0;
let gameLoopId = null;
let spawnIntervalId = null;
let isPlaying = false;
let lastTime = 0;

async function loadEmoteList() {
  const response = await fetch('/emotes/emotes.json');
  return await response.json();
}

function createEnemyElement(emoteName) {
  const container = document.createElement('div');
  container.classList.add('enemy-container');

  const img = document.createElement('img');
  img.src = `/emotes/${emoteName}`;
  img.classList.add('enemy-img');
  container.appendChild(img);

  const label = document.createElement('div');
  label.classList.add('enemy-label');
  label.textContent = emoteName.replace(/\.[^/.]+$/, '');
  container.appendChild(label);

  return { container, label, word: label.textContent };
}

function spawnEnemy(emoteName) {
  const { container, label, word } = createEnemyElement(emoteName);

  let x, y;
  const padding = 100;
  const side = Math.floor(Math.random() * 4);
  if (side === 0) {
    x = Math.random() * window.innerWidth;
    y = -padding;
  } else if (side === 1) {
    x = Math.random() * window.innerWidth;
    y = window.innerHeight + padding;
  } else if (side === 2) {
    x = -padding;
    y = Math.random() * window.innerHeight;
  } else {
    x = window.innerWidth + padding;
    y = Math.random() * window.innerHeight;
  }

  container.style.left = `${x}px`;
  container.style.top = `${y}px`;
  document.getElementById('game-container').appendChild(container);

  enemies.push({ element: container, x, y, word });
}

function moveEnemies(delta) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const dx = CENTER.x - enemy.x;
    const dy = CENTER.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      enemy.x += (dx / dist) * ENEMY_SPEED * delta;
      enemy.y += (dy / dist) * ENEMY_SPEED * delta;
      enemy.element.style.left = `${enemy.x}px`;
      enemy.element.style.top = `${enemy.y}px`;
    } else {
      // Hit player → game over
      endGame();
      return;
    }
  }
}

function gameLoop(timestamp = 0) {
  if (!isPlaying) return;

  if (!lastTime) lastTime = timestamp;
  const delta = (timestamp - lastTime) / 1000; // seconds elapsed
  lastTime = timestamp;

  moveEnemies(delta);

  gameLoopId = requestAnimationFrame(gameLoop);
}

function clearEnemies() {
  enemies.forEach(e => e.element.remove());
  enemies = [];
}

function updateHUD() {
  let hud = document.getElementById('hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'hud';
    hud.style.position = 'absolute';
    hud.style.top = '10px';
    hud.style.left = '50%';
    hud.style.transform = 'translateX(-50%)';
    hud.style.color = '#ffff00';
    hud.style.fontSize = '20px';
    hud.style.fontFamily = 'Arial, sans-serif';
    document.getElementById('game-container').appendChild(hud);
  }
  hud.textContent = `Score: ${score}   High Score: ${highScore}`;
}

function showOverlay(contentHtml) {
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = contentHtml;
  overlay.style.display = 'flex';
}

function hideOverlay() {
  document.getElementById('overlay').style.display = 'none';
}

function startSpawning() {
  spawnIntervalId = setInterval(() => {
    const word = emoteList[Math.floor(Math.random() * emoteList.length)];
    spawnEnemy(word);
  }, 2000);
}

function stopSpawning() {
  clearInterval(spawnIntervalId);
}

function startGame() {
  clearEnemies();
  score = 0;
  inputText = '';
  document.getElementById('typed-input').textContent = '';
  updateHUD();
  hideOverlay();
  isPlaying = true;
  lastTime = 0; // reset timestamp for smooth animation
  startSpawning();
  gameLoop();
}

function endGame() {
  isPlaying = false;
  stopSpawning();
  cancelAnimationFrame(gameLoopId);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore.toString());
  }

  showOverlay(`
    <div class="overlay-content">
      <h1>Game Over</h1>
      <p>Score: ${score}</p>
      <p>High Score: ${highScore}</p>
      <button id="restart-button">Restart</button>
    </div>
  `);

  document.getElementById('restart-button').addEventListener('click', startGame);
}

function addPlayerDot() {
  const dot = document.createElement('div');
  dot.id = 'player-dot';
  document.getElementById('game-container').appendChild(dot);
}

async function init() {
  emoteList = await loadEmoteList();
  if (!emoteList.length) {
    alert('❌ No emotes found in emotes.json!');
    return;
  }

  addPlayerDot();

  showOverlay(`
    <div class="overlay-content">
      <h1>Typing Survivors</h1>
      <p>High Score: ${highScore}</p>
      <button id="start-button">Start</button>
    </div>
  `);

  document.getElementById('start-button').addEventListener('click', startGame);

  const inputDiv = document.getElementById('typed-input');
  window.addEventListener('keydown', (e) => {
    if (!isPlaying) return;

    if (e.key === 'Backspace') {
      inputText = inputText.slice(0, -1);
    } else if (e.key === 'Enter') {
      inputText = '';
    } else if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) {
      inputText += e.key;
    }
    inputDiv.textContent = inputText;

    for (let i = enemies.length - 1; i >= 0; i--) {
      if (inputText.toLowerCase() === enemies[i].word.toLowerCase()) {
        enemies[i].element.remove();
        enemies.splice(i, 1);
        inputText = '';
        inputDiv.textContent = '';
        score++;
        updateHUD();
        break;
      }
    }
  });
}

window.addEventListener('resize', () => {
  CENTER = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
});

init();
