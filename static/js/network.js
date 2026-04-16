class NetworkManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.myPlayerId = null;
        this.remotePlayers = new Map();
        this.stateCallback = null;
        this.initCallback = null;
    }

    connect() {
        this.socket = io();

        this.socket.on("connect", () => {
            this.connected = true;
            console.log("Connected to server");
        });

        this.socket.on("disconnect", () => {
            this.connected = false;
            console.log("Disconnected from server");
        });

        this.socket.on("init", (data) => {
            this.myPlayerId = data.player_id;
            if (this.initCallback) {
                this.initCallback(data);
            }
        });

        this.socket.on("state", (data) => {
            if (this.stateCallback) {
                this.stateCallback(data);
            }
        });

        this.socket.on("player_joined", (data) => {
            console.log("Player joined:", data.nickname);
        });

        this.socket.on("player_left", (data) => {
            console.log("Player left:", data.id);
            this.remotePlayers.delete(data.id);
        });

        this.socket.on("chat_message", (data) => {
            if (this.chatCallback) {
                this.chatCallback(data);
            }
        });
    }

    join(nickname, color) {
        this.socket.emit("join", { nickname, color });
    }

    move(x, y, direction, state, frame) {
        if (this.connected) {
            this.socket.emit("move", { x, y, direction, state, frame });
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
}