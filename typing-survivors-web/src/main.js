const VERSION = "v1.2.0";
const WHATS_NEW = [
    "• Tiered difficulty progression based on score and word count.",
    "• Adjustable music and sound effect volumes.",
    "• Pause and resume support.",
    "• Menu for sound, music, and song selection.",
    "• Bosses and higher-tier enemies at high scores.",
];

// Game vars
let CENTER = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let ENEMY_SPEED = 80;
let enemies = [];
let emoteList = [];
let inputText = '';
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore') || '0') || 0;
let gameLoopId = null;
let spawnIntervalId = null;
let isPlaying = false;
let isPaused = false;
let settingsOpen = false;
let lastTime = 0;

// Sound & settings
let bgMusicFiles = [];
let gameOverSoundFiles = [];
let enemyDeathSoundFiles = [];
let bgMusic = null;
let gameOverSound = null;
let currentBgMusicFile = null;
let currentGameOverFile = null;
let currentEnemyDeathFile = null;
let musicVolume = parseFloat(localStorage.getItem('musicVolume') || '0.25');
let sfxVolume = parseFloat(localStorage.getItem('sfxVolume') || '0.5');
let enemyDeathSoundsOn = localStorage.getItem('enemyDeathSoundsOn') !== 'false'; // default ON

// Emote tiers
let tier1Emotes = [];
let tier2Emotes = [];
let tier3Emotes = [];

// Difficulty
let maxEnemies = 5;
let spawnIntervalMs = 2000;

// ---- Settings Logic ----
function saveSettings() {
    localStorage.setItem('musicVolume', musicVolume);
    localStorage.setItem('sfxVolume', sfxVolume);
    localStorage.setItem('enemyDeathSoundsOn', enemyDeathSoundsOn);
}
function applyVolumes() {
    if (bgMusic) bgMusic.volume = musicVolume;
}

// ---- Utility / Overlay ----
function showOverlay(html) {
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = html;
    overlay.style.display = 'flex';
}
function hideOverlay() {
    document.getElementById('overlay').style.display = 'none';
}

function addVersionBar() {
    let bar = document.createElement('div');
    bar.id = 'version-bar';
    bar.innerHTML = `
    <span>Version ${VERSION}</span>
    <button id="whatsnew-toggle" style="margin-left:8px;">What's New</button>
    <div id="whatsnew-popup" style="display:none; margin-top:4px; background:#111; padding:8px; border-radius:6px;">
      <b>What's New:</b><br>
      ${WHATS_NEW.map(l => `${l}<br>`).join('')}
    </div>
  `;
    document.body.appendChild(bar);
    document.getElementById('whatsnew-toggle').onclick = () => {
        let popup = document.getElementById('whatsnew-popup');
        popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
    };
}

// ---- Tiers & Loading ----
async function loadEmoteList() {
    const response = await fetch('/emotes/emotes.json?v=' + Date.now());
    if (!response.ok) {
        alert('❌ Failed to load emotes.json');
        return [];
    }
    return await response.json();
}
function groupEmotesByTier(list) {
    // Tier 1: ≤ 6, Tier 2: 7–10, Tier 3: >10
    tier1Emotes = [];
    tier2Emotes = [];
    tier3Emotes = [];
    for (const name of list) {
        const word = name.replace(/\.[^/.]+$/, '');
        if (word.length <= 6) tier1Emotes.push(name);
        else if (word.length <= 10) tier2Emotes.push(name);
        else tier3Emotes.push(name);
    }
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
}
function pickRandomAudioNoRepeat(files, folder, currentFile) {
    if (files.length === 0) return null;
    if (files.length === 1) {
        const audio = new Audio(`/sounds/${folder}/${files[0]}`);
        audio.volume = folder === 'background' ? musicVolume : sfxVolume;
        if (folder === 'background') audio.loop = true;
        return audio;
    }
    let file;
    do {
        file = files[Math.floor(Math.random() * files.length)];
    } while (file === currentFile);
    const audio = new Audio(`/sounds/${folder}/${file}`);
    audio.volume = folder === 'background' ? musicVolume : sfxVolume;
    if (folder === 'background') audio.loop = true;
    return audio;
}

// ---- Enemy Creation ----
function createEnemyElement(emoteName) {
    const container = document.createElement('div');
    container.classList.add('enemy-container');
    const img = document.createElement('img');
    img.src = `/emotes/${emoteName}`;
    img.classList.add('enemy-img');
    container.appendChild(img);
    const label = document.createElement('div');
    label.classList.add('enemy-label');
    const word = emoteName.replace(/\.[^/.]+$/, '');
    label.textContent = word;
    container.appendChild(label);
    if (word.length > 10) container.classList.add('enemy-boss');
    else if (word.length > 6) container.classList.add('enemy-mid');
    return { container, label, word };
}
function isOverlapping(x, y) {
    const minDistance = 70;
    for (const enemy of enemies) {
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance) return true;
    }
    return false;
}
function spawnEnemy(emoteName) {
    if (enemies.length >= maxEnemies) return;
    const { container, label, word } = createEnemyElement(emoteName);
    const padding = 100;
    let x, y, attempts = 0, maxAttempts = 10;
    do {
        const side = Math.floor(Math.random() * 4);
        if (side === 0) { x = Math.random() * window.innerWidth; y = -padding; }
        else if (side === 1) { x = Math.random() * window.innerWidth; y = window.innerHeight + padding; }
        else if (side === 2) { x = -padding; y = Math.random() * window.innerHeight; }
        else { x = window.innerWidth + padding; y = Math.random() * window.innerHeight; }
        attempts++;
    } while (isOverlapping(x, y) && attempts < maxAttempts);
    container.style.left = `${x}px`;
    container.style.top = `${y}px`;
    const img = container.querySelector('img');
    img.onload = () => {
        document.getElementById('game-container').appendChild(container);
        enemies.push({ element: container, x, y, word });
    };
    img.onerror = () => { /* optional: handle missing image */ };
}

// ---- Difficulty Logic ----
function getCurrentTierEmoteList() {
    if (score < 100) {
        return Math.random() < 0.85 ? tier1Emotes : tier2Emotes;
    } else if (score < 250) {
        const rand = Math.random();
        if (rand < 0.6) return tier1Emotes;
        if (rand < 0.95) return tier2Emotes;
        return tier3Emotes;
    } else {
        const rand = Math.random();
        if (rand < 0.25) return tier1Emotes;
        if (rand < 0.7) return tier2Emotes;
        return tier3Emotes;
    }
}

// ---- Spawning/Movement ----
function startSpawning() {
    if (spawnIntervalId) clearInterval(spawnIntervalId);
    spawnIntervalId = setInterval(() => {
        const tierList = getCurrentTierEmoteList();
        if (!tierList.length) return;
        const word = tierList[Math.floor(Math.random() * tierList.length)];
        spawnEnemy(word);
    }, spawnIntervalMs);
}
function stopSpawning() {
    clearInterval(spawnIntervalId);
    spawnIntervalId = null;
}
function moveEnemies(delta) {
    const collisionRadius = 42;
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
    if (!isPlaying || isPaused) return;
    if (!lastTime) lastTime = timestamp;
    const delta = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    moveEnemies(delta);
    gameLoopId = requestAnimationFrame(gameLoop);
}
function clearEnemies() {
    enemies.forEach(e => e.element.remove());
    enemies = [];
}

// ---- UI / HUD ----
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
function addPlayerDot() {
    const dot = document.createElement('div');
    dot.id = 'player-dot';
    document.getElementById('game-container').appendChild(dot);
}

// ---- Pause/Menu ----
function showPauseOverlay() {
    isPaused = true;
    stopSpawning();
    cancelAnimationFrame(gameLoopId);
    showOverlay(`
    <div class="overlay-content">
      <h1>Paused</h1>
      <button id="resume-button">Resume</button>
      <button id="settings-button">Settings</button>
      <button id="mainmenu-button">Main Menu</button>
    </div>
  `);
    document.getElementById('resume-button').onclick = resumeGame;
    document.getElementById('settings-button').onclick = showSettingsOverlay;
    document.getElementById('mainmenu-button').onclick = showMainMenu;
}
async function showSettingsOverlay() {
    settingsOpen = true;
    hideOverlay();
    await loadSounds(); // Always reload the current list
    const musicOptions = bgMusicFiles.map(f => {
        const selected = (bgMusic && bgMusic.src.endsWith(f)) ? 'selected' : '';
        return `<option value="${f}" ${selected}>${f.replace(/\.[^/.]+$/, '')}</option>`;
    }).join('');
    showOverlay(`
    <div class="overlay-content">
      <h2>Settings</h2>
      <label>
        <span>Music Volume</span>
        <input id="music-vol" type="range" min="0" max="1" step="0.01" value="${musicVolume}">
      </label><br>
      <label>
        <span>Sound Effects Volume</span>
        <input id="sfx-vol" type="range" min="0" max="1" step="0.01" value="${sfxVolume}">
      </label><br>
      <label>
        <input id="toggle-sfx" type="checkbox" ${enemyDeathSoundsOn ? 'checked' : ''}>
        Enemy Death Sounds
      </label><br>
      <label>
        <span>Background Song:</span>
        <select id="bgm-picker">${musicOptions}</select>
      </label><br><br>
      <button id="back-button">Back</button>
    </div>
  `);
    document.getElementById('music-vol').oninput = e => {
        musicVolume = parseFloat(e.target.value);
        applyVolumes();
        saveSettings();
    };
    document.getElementById('sfx-vol').oninput = e => {
        sfxVolume = parseFloat(e.target.value);
        saveSettings();
    };
    document.getElementById('toggle-sfx').onchange = e => {
        enemyDeathSoundsOn = e.target.checked;
        saveSettings();
    };
    document.getElementById('bgm-picker').onchange = e => {
        const selectedFile = e.target.value;
        if (bgMusic) bgMusic.pause();
        bgMusic = new Audio(`/sounds/background/${selectedFile}`);
        bgMusic.loop = true;
        bgMusic.volume = musicVolume;
        bgMusic.currentTime = 0;
        if (isPlaying && !isPaused) bgMusic.play().catch(() => { });
    };
    document.getElementById('back-button').onclick = () => {
        settingsOpen = false;
        if (isPaused) showPauseOverlay();
        else showMainMenu();
    };
}

function showMainMenu() {
    isPlaying = false;
    stopSpawning();
    cancelAnimationFrame(gameLoopId);
    showOverlay(`
      <div class="overlay-content">
        <h1>Typing Survivors</h1>
        <div class="menu-hud">High Score: ${highScore}</div>
        <div style="margin-top:16px;">
          <button id="start-button">Start</button>
          <button id="settings-button">Settings</button>
        </div>
        <div class="menu-difficulty" style="margin-top:16px;">
          <h3>Difficulty</h3>
          <ul style="text-align:left;display:inline-block;">
            <li>Score &lt; 100: 85% Tier 1, 15% Tier 2, 0% Tier 3</li>
            <li>Score &lt; 250: 60% Tier 1, 35% Tier 2, 5% Tier 3</li>
            <li>Score &gt; 250: 25% Tier 1, 45% Tier 2, 30% Tier 3</li>
          </ul>
        </div>
        <div class="whatsnew-section" style="margin-top:18px;text-align:left;">
          <div style="font-size:15px;color:#ffd700b0;">Version ${VERSION}</div>
          <b>What's New:</b>
          <ul style="margin:5px 0 0 18px;padding:0;">
            ${WHATS_NEW.map(l => `<li>${l}</li>`).join('')}
          </ul>
        </div>
      </div>
    `);
    document.getElementById('start-button').onclick = startGame;
    document.getElementById('settings-button').onclick = showSettingsOverlay;
}

function resumeGame() {
    isPaused = false;
    hideOverlay();
    startSpawning();
    lastTime = performance.now();
    gameLoop(lastTime);
    if (bgMusic && bgMusic.paused) bgMusic.play().catch(() => { });
}

// ---- Game ----
async function startGame() {
    await loadSounds();
    clearEnemies();
    score = 0;
    inputText = '';
    document.getElementById('typed-input').textContent = '';
    updateHUD();
    hideOverlay();
    isPlaying = true;
    isPaused = false;
    lastTime = 0;
    maxEnemies = 5;
    spawnIntervalMs = 2000;
    if (bgMusic) { bgMusic.pause(); bgMusic = null; }
    if (gameOverSound) { gameOverSound.pause(); gameOverSound = null; }
    bgMusic = pickRandomAudioNoRepeat(bgMusicFiles, 'background', currentBgMusicFile);
    currentBgMusicFile = bgMusic ? bgMusic.src.split('/').pop() : null;
    gameOverSound = pickRandomAudioNoRepeat(gameOverSoundFiles, 'game-over', currentGameOverFile);
    currentGameOverFile = gameOverSound ? gameOverSound.src.split('/').pop() : null;
    if (bgMusic) {
        bgMusic.currentTime = 0;
        bgMusic.volume = musicVolume;
        bgMusic.play().catch(() => { });
    }
    startSpawning();
    gameLoop();
}
function endGame() {
    isPlaying = false;
    stopSpawning();
    cancelAnimationFrame(gameLoopId);
    if (bgMusic) bgMusic.pause();
    if (gameOverSound) {
        gameOverSound.currentTime = 0;
        gameOverSound.volume = musicVolume;
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
      <button id="mainmenu-button">Main Menu</button>
    </div>
  `);
    document.getElementById('restart-button').onclick = startGame;
    document.getElementById('mainmenu-button').onclick = showMainMenu;
}
function playEnemyDeathSound() {
    if (!enemyDeathSoundsOn || enemyDeathSoundFiles.length === 0) return;
    let file;
    if (enemyDeathSoundFiles.length === 1) {
        file = enemyDeathSoundFiles[0];
    } else {
        do {
            file = enemyDeathSoundFiles[Math.floor(Math.random() * enemyDeathSoundFiles.length)];
        } while (file === currentEnemyDeathFile);
    }
    currentEnemyDeathFile = file;
    const snd = new Audio(`/sounds/enemy-death/${file}`);
    snd.volume = sfxVolume;
    snd.play();
}

// ---- Main Init and Keyboard ----
async function init() {
    emoteList = await loadEmoteList();
    if (!emoteList.length) {
        alert('❌ No emotes found in emotes.json!');
        return;
    }
    groupEmotesByTier(emoteList);
    await loadSounds();
    addPlayerDot();
    showMainMenu();

    // Typing input
    const inputDiv = document.getElementById('typed-input');
    window.addEventListener('keydown', (e) => {
        if (settingsOpen) return; // block typing during settings
        if (e.key === 'Escape') {
            if (isPlaying && !isPaused && !settingsOpen) showPauseOverlay();
            else if (isPaused && !settingsOpen) resumeGame();
            return;
        }
        if (!isPlaying || isPaused) return;
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
                let wordLen = enemies[i].word.length;
                enemies[i].element.remove();
                enemies.splice(i, 1);
                inputText = '';
                inputDiv.textContent = '';
                score += wordLen;
                updateHUD();
                playEnemyDeathSound();
                break;
            }
        }
    });
}
window.addEventListener('resize', () => {
    CENTER = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
});
init();
