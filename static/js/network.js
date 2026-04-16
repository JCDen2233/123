class NetworkManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.myPlayerId = null;
        this.remotePlayers = new Map();
        this.stateCallback = null;
        this.initCallback = null;
        this.chatCallback = null;
        this.terrainUpdateCallback = null;
        this.connectionStatus = 'disconnected';
    }

    connect() {
        this.updateConnectionStatus('connecting');
        this.socket = io();

        this.socket.on("connect", () => {
            this.connected = true;
            console.log("Подключено к серверу");
            this.updateConnectionStatus('connected');
        });

        this.socket.on("disconnect", () => {
            this.connected = false;
            console.log("Отключено от сервера");
            this.updateConnectionStatus('disconnected');
        });

        this.socket.on("connect_error", (error) => {
            console.error("Ошибка подключения:", error);
            this.updateConnectionStatus('reconnecting');
        });

        this.socket.on("init", (data) => {
            this.myPlayerId = data.player_id;
            if (this.initCallback) {
                this.initCallback(data);
            }
        });

        this.socket.on("state", (data) => {
            // Обновление HP локального игрока
            if (this.stateCallback && data.players) {
                const localPlayerData = data.players.find(p => p.id === this.myPlayerId);
                if (localPlayerData && typeof localPlayerData.hp !== 'undefined') {
                    // Сохраняем HP для отображения в HUD
                    window.localPlayerHP = localPlayerData.hp;
                    window.localPlayerMaxHP = localPlayerData.max_hp || 100;
                }
                this.stateCallback(data);
            }
        });

        this.socket.on("player_joined", (data) => {
            console.log("Игрок присоединился:", data.nickname);
        });

        this.socket.on("player_left", (data) => {
            console.log("Игрок покинул игру:", data.id);
            this.remotePlayers.delete(data.id);
        });

        this.socket.on("chat_message", (data) => {
            if (this.chatCallback) {
                this.chatCallback(data);
            }
        });

        this.socket.on("terrain_update", (data) => {
            if (this.terrainUpdateCallback) {
                this.terrainUpdateCallback(data);
            }
        });
    }

    updateConnectionStatus(status) {
        this.connectionStatus = status;
        const statusEl = document.getElementById('connectionStatus');
        const textEl = document.getElementById('connectionText');

        if (statusEl && textEl) {
            statusEl.classList.remove('hidden', 'connected', 'disconnected', 'reconnecting');

            const statusTexts = {
                'connecting': 'Connecting...',
                'connected': 'Connected',
                'disconnected': 'Disconnected',
                'reconnecting': 'Reconnecting...'
            };

            statusEl.classList.add(status);
            textEl.textContent = statusTexts[status] || status;
        }
    }

    join(nickname, color) {
        this.socket.emit("join", { nickname, color });
    }

    move(x, y, direction, state, frame) {
        if (this.connected) {
            this.socket.emit("move", { x, y, direction, state, frame });
        }
    }

    buildTerrain(type, x, y, radius, elevationChange) {
        if (this.connected) {
            this.socket.emit("build_terrain", { type, x, y, radius, elevationChange });
        }
    }

    sendChat(message) {
        if (this.connected) {
            this.socket.emit("chat", { message });
        }
    }

    setStateCallback(callback) {
        this.stateCallback = callback;
    }

    setInitCallback(callback) {
        this.initCallback = callback;
    }

    setChatCallback(callback) {
        this.chatCallback = callback;
    }

    setTerrainUpdateCallback(callback) {
        this.terrainUpdateCallback = callback;
    }

    attack(targetId) {
        if (this.connected) {
            this.socket.emit("attack", { targetId });
        }
    }
}