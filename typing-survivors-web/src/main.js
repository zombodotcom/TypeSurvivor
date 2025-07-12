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

// Sound lists & current files for no-repeat logic (as before)
let bgMusicFiles = [];
let gameOverSoundFiles = [];
let enemyDeathSoundFiles = [];
let bgMusic = null;
let gameOverSound = null;
let currentBgMusicFile = null;
let currentGameOverFile = null;
let currentEnemyDeathFile = null;

// Tiered emote lists
let tier1Emotes = []; // ≤ 3 letters
let tier2Emotes = []; // 4-6 letters
let tier3Emotes = []; // 7+ letters (bosses)

// Difficulty parameters
let maxEnemies = 5; // starts small
let spawnIntervalMs = 2000; // starts at 2 sec

async function loadEmoteList() {
    const response = await fetch('/emotes/emotes.json?v=' + Date.now());
    if (!response.ok) {
        alert('❌ Failed to load emotes.json');
        return [];
    }
    return await response.json();
}

function groupEmotesByTier(list) {
    tier1Emotes = [];
    tier2Emotes = [];
    tier3Emotes = [];

    for (const name of list) {
        const word = name.replace(/\.[^/.]+$/, '');
        if (word.length <= 4) tier1Emotes.push(name);
        else if (word.length <= 7) tier2Emotes.push(name);
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
        audio.volume = folder === 'background' ? 0.25 : 0.5;
        if (folder === 'background') audio.loop = true;
        return audio;
    }
    let file;
    do {
        file = files[Math.floor(Math.random() * files.length)];
    } while (file === currentFile);

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
    const word = emoteName.replace(/\.[^/.]+$/, '');
    label.textContent = word;
    container.appendChild(label);

    // Add boss class if tier3
    if (word.length > 6) container.classList.add('enemy-boss');

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
    console.log('Trying to spawn:', emoteName);
    if (enemies.length >= maxEnemies) return; // limit max enemies

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

    const img = container.querySelector('img');
    img.onload = () => {
        document.getElementById('game-container').appendChild(container);
        enemies.push({ element: container, x, y, word });
    };
    img.onerror = () => {
        console.warn(`Failed to load emote image: ${img.src}`);
    };
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
    if (!isPlaying) return;

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

    // Increase difficulty params at start
    maxEnemies = 5;
    spawnIntervalMs = 2000;

    if (bgMusic) {
        bgMusic.pause();
        bgMusic = null;
    }
    if (gameOverSound) {
        gameOverSound.pause();
        gameOverSound = null;
    }

    bgMusic = pickRandomAudioNoRepeat(bgMusicFiles, 'background', currentBgMusicFile);
    currentBgMusicFile = bgMusic ? bgMusic.src.split('/').pop() : null;

    gameOverSound = pickRandomAudioNoRepeat(gameOverSoundFiles, 'game-over', currentGameOverFile);
    currentGameOverFile = gameOverSound ? gameOverSound.src.split('/').pop() : null;

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

function playEnemyDeathSound() {
    if (enemyDeathSoundFiles.length === 0) return;

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
    snd.volume = 0.5;
    snd.play();
}

function getCurrentTierEmoteList() {
    if (score < 40) {
        // Only Tier 1
        return tier1Emotes;
    } else if (score < 120) {
        // 85% Tier 1, 15% Tier 2, 0% Tier 3
        return Math.random() < 0.85 ? tier1Emotes : tier2Emotes;
    } else if (score < 250) {
        // 60% Tier 1, 35% Tier 2, 5% Tier 3 (very rare)
        const rand = Math.random();
        if (rand < 0.6) return tier1Emotes;
        if (rand < 0.95) return tier2Emotes;
        return tier3Emotes;
    } else {
        // 25% Tier 1, 45% Tier 2, 30% Tier 3 (now bosses show up regularly)
        const rand = Math.random();
        if (rand < 0.25) return tier1Emotes;
        if (rand < 0.7) return tier2Emotes;
        return tier3Emotes;
    }
}


async function init() {
    emoteList = await loadEmoteList();
    if (!emoteList.length) {
        alert('❌ No emotes found in emotes.json!');
        return;
    }

    groupEmotesByTier(emoteList);
    console.log('Tier 1:', tier1Emotes.length);
    console.log('Tier 2:', tier2Emotes.length);
    console.log('Tier 3:', tier3Emotes.length);
    await loadSounds();

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
                score += enemies[i].word.length; // score per letter
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
