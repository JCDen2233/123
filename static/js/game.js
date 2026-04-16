const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const renderer = new Renderer(canvas, ctx);
const camera = new Camera();
const inputHandler = new InputHandler();
const network = new NetworkManager();
const hud = new HUDManager(canvas);

let localPlayer = null;
let remotePlayers = new Map();
let entities = [];
let isJoined = false;

// Состояние инструментов рельефа
let selectedTool = null;
const TERRAIN_RADIUS = 3;
const ELEVATION_CHANGE = 2;

let lastTime = performance.now();
let fps = 0;
let frameCount = 0;
let lastFpsTime = performance.now();

const joinScreen = document.getElementById("joinScreen");
const nicknameInput = document.getElementById("nicknameInput");
const joinBtn = document.getElementById("joinBtn");
const chatContainer = document.getElementById("chatContainer");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

// Кнопки инструментов рельефа
const btnHill = document.getElementById("btnHill");
const btnPit = document.getElementById("btnPit");
const btnWater = document.getElementById("btnWater");
const toolStatus = document.getElementById("toolStatus");
const btnSettings = document.getElementById("btnSettings");

// Элементы настроек
const settingsPanel = document.getElementById("settingsPanel");
const loadingScreen = document.getElementById("loadingScreen");
const btnCloseSettings = document.getElementById("btnCloseSettings");
const volumeSlider = document.getElementById("volumeSlider");
const cameraSensitivity = document.getElementById("cameraSensitivity");
const volumeValue = document.getElementById("volumeValue");
const sensitivityValue = document.getElementById("sensitivityValue");

// Игровые системы Этапа 5
let inventory = null;
let questLog = [];
let currentDialogue = null;
let isDead = false;
let respawnTimer = 0;
let attackCooldown = 0;
const ATTACK_COOLDOWN_TIME = 0.5;
const RESPAWN_TIME = 5;

// Настройки игры
let gameSettings = {
    volume: 50,
    cameraSensitivity: 5
};

// Менеджер сущностей
const entityManager = new EntityManager();

// Система времени суток
let timeManager = null;

// Горячие клавиши для быстрого доступа
const hotbarSlots = [0, 1, 2, 3, 4];
let selectedHotbarSlot = 0;

function init() {
    window.addEventListener("resize", () => renderer.resize());
    renderer.resize();
    
    // Инициализация редактора карт
    mapEditor = initMapEditor(canvas, renderer);
    
    joinBtn.addEventListener("click", handleJoin);
    nicknameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleJoin();
    });
    sendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });
    
    network.setInitCallback(handleInit);
    network.setStateCallback(handleStateUpdate);
    network.setChatCallback(handleChatMessage);
    network.setTerrainUpdateCallback(handleTerrainUpdate);
    
    network.connect();
    
    // Обработчики событий инструментов рельефа
    btnHill.addEventListener("click", () => selectTool(TerrainType.HILL));
    btnPit.addEventListener("click", () => selectTool(TerrainType.PIT));
    btnWater.addEventListener("click", () => selectTool(TerrainType.WATER));
    
    // Кнопка настроек
    if (btnSettings) {
        btnSettings.addEventListener("click", openSettings);
    }
    
    // Клик мышью для редактирования рельефа
    canvas.addEventListener("click", handleCanvasClick);
    
    // Обработчики настроек
    initSettingsHandlers();
    
    // Инициализация системы времени суток
    timeManager = initTimeSystem();
    
    requestAnimationFrame(gameLoop);
}

function handleJoin() {
    const nickname = nicknameInput.value.trim() || "Player";
    const color = getRandomColor();
    network.join(nickname, color);
    joinScreen.style.display = "none";
    chatContainer.style.display = "flex";
}

function handleInit(data) {
    const mapData = data.map;
    initMapFromData(mapData);
    
    localPlayer = createPlayerFromData(data.players.find(p => p.id === network.myPlayerId));
    if (localPlayer) {
        localPlayer.id = network.myPlayerId;
        camera.reset(localPlayer.x, localPlayer.y);
    }
    
    remotePlayers = new Map();
    data.players.forEach(p => {
        if (p.id !== network.myPlayerId) {
            const player = createPlayerFromData(p);
            player.id = p.id;
            remotePlayers.set(p.id, player);
        }
    });
    
    updateEntitiesList();
    isJoined = true;
    
    // Синхронизация времени с сервером
    if (timeManager && data.gameTime !== undefined) {
        timeManager.currentTime = data.gameTime;
        if (data.dayDuration !== undefined) {
            timeManager.setDayDuration(data.dayDuration);
        }
        timeManager.updatePhase();
    }
    
    // Инициализация систем Этапа 5
    initInventory();
    initTestEntities();
}

function handleStateUpdate(data) {
    // Синхронизация времени с сервером
    if (timeManager && data.gameTime !== undefined) {
        timeManager.currentTime = data.gameTime;
        if (data.dayDuration !== undefined) {
            timeManager.setDayDuration(data.dayDuration);
        }
        timeManager.updatePhase();
    }
    
    data.players.forEach(pData => {
        if (pData.id === network.myPlayerId) {
            if (localPlayer) {
                localPlayer.x = pData.x;
                localPlayer.y = pData.y;
                localPlayer.direction = pData.direction;
                localPlayer.state = pData.state;
                localPlayer.frame = pData.frame;
                // Обновление HP
                if (typeof pData.hp !== 'undefined') {
                    localPlayer.hp = pData.hp;
                    localPlayer.maxHp = pData.max_hp || 100;
                }
            }
        } else {
            if (remotePlayers.has(pData.id)) {
                const p = remotePlayers.get(pData.id);
                p.x = pData.x;
                p.y = pData.y;
                p.direction = pData.direction;
                p.state = pData.state;
                p.frame = pData.frame;
                if (typeof pData.hp !== 'undefined') {
                    p.hp = pData.hp;
                    p.maxHp = pData.max_hp || 100;
                }
            } else {
                const player = createPlayerFromData(pData);
                player.id = pData.id;
                if (typeof pData.hp !== 'undefined') {
                    player.hp = pData.hp;
                    player.maxHp = pData.max_hp || 100;
                }
                remotePlayers.set(pData.id, player);
                updateEntitiesList();
            }
        }
    });
}

function handleChatMessage(data) {
    const div = document.createElement("div");
    div.className = "chat-line";
    div.innerHTML = `<span class="nickname" style="color: ${data.color}">${data.nickname}:</span> <span class="message">${escapeHtml(data.message)}</span>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function createPlayerFromData(data) {
    return new Player(data.x, data.y, data.nickname, data.color);
}

function updateEntitiesList() {
    entities = [localPlayer, ...Array.from(remotePlayers.values())];
}

function getRandomColor() {
    const colors = [
        "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4",
        "#ffeaa7", "#dfe6e9", "#fd79a8", "#a29bfe",
        "#6c5ce7", "#00b894", "#e17055", "#74b9ff"
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Обработчики команд чата
function handleChatCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    
    if (cmd === '/help') {
        addChatMessage('Система', '#ffffff', 'Доступные команды: /help, /teleport x y');
    } else if (cmd === '/teleport' && parts.length >= 3) {
        const x = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        if (!isNaN(x) && !isNaN(y) && localPlayer) {
            // Телепортация будет обработана сервером
            network.move(x, y, localPlayer.direction, localPlayer.state, localPlayer.frame);
            addChatMessage('Система', '#ffffff', `Телепортация на ${x}, ${y}`);
        } else {
            addChatMessage('Система', '#ff4444', 'Неверные координаты');
        }
    } else {
        addChatMessage('Система', '#ff4444', 'Неизвестная команда. Введите /help для справки.');
    }
}

function addChatMessage(nickname, color, message) {
    const div = document.createElement("div");
    div.className = "chat-line";
    div.innerHTML = `<span class="nickname" style="color: ${color}">${nickname}:</span> <span class="message">${escapeHtml(message)}</span>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
    const msg = chatInput.value.trim();
    if (msg) {
        if (msg.startsWith('/')) {
            handleChatCommand(msg.substring(1));
        } else {
            network.sendChat(msg);
        }
        chatInput.value = "";
    }
}

// Инициализация обработчиков настроек
function initSettingsHandlers() {
    // Кнопка закрытия настроек
    if (btnCloseSettings) {
        btnCloseSettings.addEventListener("click", () => {
            settingsPanel.classList.add("hidden");
        });
    }
    
    // Ползунок громкости
    if (volumeSlider) {
        volumeSlider.addEventListener("input", (e) => {
            gameSettings.volume = parseInt(e.target.value);
            volumeValue.textContent = gameSettings.volume + "%";
            if (typeof audioSystem !== 'undefined') {
                audioSystem.setVolume(gameSettings.volume / 100);
            }
        });
    }
    
    // Ползунок чувствительности камеры
    if (cameraSensitivity) {
        cameraSensitivity.addEventListener("input", (e) => {
            gameSettings.cameraSensitivity = parseInt(e.target.value);
            sensitivityValue.textContent = gameSettings.cameraSensitivity;
            camera.setSensitivity(gameSettings.cameraSensitivity);
        });
    }
    
    // Скрыть экран загрузки после инициализации
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.display = "none";
        }, 1000);
    }
}

// Показать панель настроек
function openSettings() {
    if (settingsPanel) {
        settingsPanel.classList.remove("hidden");
    }
}

function selectTool(toolType) {
    selectedTool = toolType;
    
    // Обновление интерфейса
    btnHill.classList.remove("active");
    btnPit.classList.remove("active");
    btnWater.classList.remove("active");
    
    switch (toolType) {
        case TerrainType.HILL:
            btnHill.classList.add("active");
            toolStatus.textContent = "Строительство холмов...";
            break;
        case TerrainType.PIT:
            btnPit.classList.add("active");
            toolStatus.textContent = "Копание впадин...";
            break;
        case TerrainType.WATER:
            btnWater.classList.add("active");
            toolStatus.textContent = "Создание водоёма...";
            break;
    }
}

function handleCanvasClick(event) {
    if (!selectedTool || !isJoined) return;
    
    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    
    // Преобразование экранных координат в координаты сетки
    const cameraOffset = camera.getOffset();
    const gridPos = screenToGrid(screenX, screenY, cameraOffset.x, cameraOffset.y);
    
    const gridX = Math.round(gridPos.x);
    const gridY = Math.round(gridPos.y);
    
    if (gridX >= 0 && gridX < MAP_WIDTH && gridY >= 0 && gridY < MAP_HEIGHT) {
        network.buildTerrain(selectedTool, gridX, gridY, TERRAIN_RADIUS, ELEVATION_CHANGE);
    }
}

function handleTerrainUpdate(data) {
    if (data.heightMap) {
        heightMap = data.heightMap;
    }
}

function handleInput() {
    if (!localPlayer || !isJoined) return;
    
    const { x: moveX, y: moveY } = inputHandler.getMoveVector();
    
    if (moveX !== 0 || moveY !== 0) {
        localPlayer.setDirection(moveX, moveY);
        localPlayer.moveBy(moveX, moveY);
    } else {
        localPlayer.stopMoving();
    }
}

function updateNetwork() {
    if (localPlayer && isJoined) {
        network.move(localPlayer.targetX, localPlayer.targetY, localPlayer.direction, localPlayer.state, localPlayer.frame);
    }
}

function update(deltaTime) {
    handleInput();
    
    if (localPlayer && !isDead) {
        localPlayer.update(deltaTime);
        updateNetwork();
        camera.follow(localPlayer, deltaTime);
        camera.clampToMap();
    }
    
    remotePlayers.forEach(p => p.update(deltaTime));
    
    // Обновление систем Этапа 5
    updateGameExtra(deltaTime);
    
    // Обновление системы времени суток
    if (timeManager) {
        timeManager.update(deltaTime);
        timeManager.checkPhaseChange();
    }
}

function render() {
    renderer.clear();
    
    // Отрисовка неба с учётом времени суток
    if (timeManager) {
        renderer.drawSky(timeManager);
    }
    
    const offset = camera.getOffset();
    renderer.drawMap(offset, timeManager);
    
    // Отрисовка всех сущностей (игроки + NPC + мобы + предметы)
    const allEntities = [...entities, ...entityManager.getAllEntities()];
    renderer.drawAllEntities(allEntities, offset);
    
    // Отрисовка частиц
    if (typeof particleSystem !== 'undefined') {
        particleSystem.render(ctx, offset);
    }
    
    // Отрисовка HUD
    if (isJoined && localPlayer) {
        hud.render(localPlayer, remotePlayers, camera, timeManager);
        
        // Отрисовка индикатора времени
        if (timeManager) {
            hud.drawTimeIndicator(ctx, timeManager);
        }
    }
}

function updateHud() {
    if (localPlayer) {
        document.getElementById("coords").textContent = `X: ${localPlayer.getGridX()}, Y: ${localPlayer.getGridY()}`;
    }
}

function updateFps() {
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFpsTime = now;
    }
    document.getElementById("fps").textContent = `FPS: ${fps}`;
}

function gameLoop(currentTime) {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    update(deltaTime);
    render();
    updateHud();
    updateFps();

    requestAnimationFrame(gameLoop);
}

init();
