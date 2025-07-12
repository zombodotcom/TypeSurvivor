let CENTER = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let ENEMY_SPEED = 80; // pixels per second
let enemies = [];
let emoteList = [];
let inputText = '';
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore') || '0') || 0;
let gameLoopId = null;
let spawnIntervalId = null;
let isPlaying = false;
let lastTime = 0;

// Sound variables (assuming you have integrated sound as discussed earlier)
let bgMusicFiles = [];
let gameOverSoundFiles = [];
let enemyDeathSoundFiles = [];

let bgMusic = null;
let gameOverSound = null;
let enemyDeathSounds = [];

async function loadEmoteList() {
  const response = await fetch('/emotes/emotes.json?v=' + Date.now());
  if (!response.ok) {
    alert('❌ Failed to load emotes.json');
    return [];
  }
  return await response.json();
}

async function preloadEmotes(list) {
  const promises = list.map(name => new Promise((res) => {
    const img = new Image();
    img.src = `/emotes/${name}`;
    img.onload = res;
    img.onerror = () => {
      console.warn(`Failed to preload emote: ${name}`);
      res(); // resolve anyway to avoid blocking
    };
  }));
  await Promise.all(promises);
}

async function loadSoundList(folder) {
  try {
    const res = await fetch(`/sounds/${folder}/list.json`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function loadSounds() {
  bgMusicFiles = await loadSoundList('background');
  gameOverSoundFiles = await loadSoundList('game-over');
  enemyDeathSoundFiles = await loadSoundList('enemy-death');

  if (enemyDeathSoundFiles.length) {
    enemyDeathSounds = enemyDeathSoundFiles.map(filename => {
      const audio = new Audio(`/sounds/enemy-death/${filename}`);
      audio.volume = 0.5;
      return audio;
    });
  }
}

function pickRandomAudio(files, folder) {
  if (!files.length) return null;
  const file = files[Math.floor(Math.random() * files.length)];
  const audio = new Audio(`/sounds/${folder}/${file}`);
  audio.volume = folder === 'background' ? 0.25 : 0.5;
  if (folder === 'background') audio.loop = true;
  return audio;
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

function isOverlapping(x, y) {
  const minDistance = 70; // minimal distance between enemies (pixels)
  for (const enemy of enemies) {
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDistance) return true;
  }
  return false;
}

function spawnEnemy(emoteName) {
  const { container, label, word } = createEnemyElement(emoteName);

  const padding = 100;
  let x, y;
  let attempts = 0;
  const maxAttempts = 10;

  do {
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
    attempts++;
  } while (isOverlapping(x, y) && attempts < maxAttempts);

  container.style.left = `${x}px`;
  container.style.top = `${y}px`;

  // Preload the image and add enemy only after image loads
  const img = container.querySelector('img');
  img.onload = () => {
    document.getElementById('game-container').appendChild(container);
    enemies.push({ element: container, x, y, word });
  };
  img.onerror = () => {
    console.warn(`Failed to load emote image: ${img.src}`);
    // Optionally skip spawning this enemy here
  };
}

function moveEnemies(delta) {
  const collisionRadius = 20; // Adjust this value to tune collision distance

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const dx = CENTER.x - enemy.x;
    const dy = CENTER.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > collisionRadius) {
      enemy.x += (dx / dist) * ENEMY_SPEED * delta;
      enemy.y += (dy / dist) * ENEMY_SPEED * delta;
      enemy.element.style.left = `${enemy.x}px`;
      enemy.element.style.top = `${enemy.y}px`;
    } else {
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
    if (emoteList.length === 0) return;
    const word = emoteList[Math.floor(Math.random() * emoteList.length)];
    spawnEnemy(word);
  }, 2000);
}

function stopSpawning() {
  clearInterval(spawnIntervalId);
}

async function startGame() {
  await loadSounds();

  clearEnemies();
  score = 0;
  inputText = '';
  document.getElementById('typed-input').textContent = '';
  updateHUD();
  hideOverlay();
  isPlaying = true;
  lastTime = 0;

  if (bgMusic) {
    bgMusic.pause();
    bgMusic = null;
  }
  if (gameOverSound) {
    gameOverSound.pause();
    gameOverSound = null;
  }

  bgMusic = pickRandomAudio(bgMusicFiles, 'background');
  gameOverSound = pickRandomAudio(gameOverSoundFiles, 'game-over');

  if (bgMusic) {
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => { /* user interaction needed */ });
  }

  startSpawning();
  gameLoop();
}

function endGame() {
  isPlaying = false;
  stopSpawning();
  cancelAnimationFrame(gameLoopId);

  if (bgMusic) {
    bgMusic.pause();
  }

  if (gameOverSound) {
    gameOverSound.currentTime = 0;
    gameOverSound.play();
  }

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

  await preloadEmotes(emoteList);

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

        if (enemyDeathSounds.length) {
          const snd = enemyDeathSounds[Math.floor(Math.random() * enemyDeathSounds.length)];
          snd.currentTime = 0;
          snd.play();
        }

        break;
      }
    }
  });
}

window.addEventListener('resize', () => {
  CENTER = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
});

init();
