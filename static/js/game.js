const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const renderer = new Renderer(canvas, ctx);
const camera = new Camera();
const inputHandler = new InputHandler();
const network = new NetworkManager();

let localPlayer = null;
let remotePlayers = new Map();
let entities = [];
let isJoined = false;

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

function init() {
    window.addEventListener("resize", () => renderer.resize());
    renderer.resize();
    
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
    
    network.connect();
    
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
        camera.reset(localPlayer.x, localPlayer.y);
    }
    
    remotePlayers = new Map();
    data.players.forEach(p => {
        if (p.id !== network.myPlayerId) {
            remotePlayers.set(p.id, createPlayerFromData(p));
        }
    });
    
    updateEntitiesList();
    isJoined = true;
}

function handleStateUpdate(data) {
    data.players.forEach(pData => {
        if (pData.id === network.myPlayerId) {
            if (localPlayer) {
                localPlayer.x = pData.x;
                localPlayer.y = pData.y;
                localPlayer.direction = pData.direction;
                localPlayer.state = pData.state;
                localPlayer.frame = pData.frame;
            }
        } else {
            if (remotePlayers.has(pData.id)) {
                const p = remotePlayers.get(pData.id);
                p.x = pData.x;
                p.y = pData.y;
                p.direction = pData.direction;
                p.state = pData.state;
                p.frame = pData.frame;
            } else {
                remotePlayers.set(pData.id, createPlayerFromData(pData));
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

function sendMessage() {
    const msg = chatInput.value.trim();
    if (msg) {
        network.sendChat(msg);
        chatInput.value = "";
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
    
    if (localPlayer) {
        localPlayer.update(deltaTime);
        updateNetwork();
        camera.follow(localPlayer, deltaTime);
        camera.clampToMap();
    }
    
    remotePlayers.forEach(p => p.update(deltaTime));
}

function render() {
    renderer.clear();
    const offset = camera.getOffset();
    renderer.drawMap(offset);
    renderer.drawAllEntities(entities, offset);
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
