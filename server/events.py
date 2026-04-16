from flask_socketio import SocketIO, emit
from flask import request
from server.game_state import GameState, Player
from server.player_manager import PlayerManager
import uuid


def init_socketio(app, socketio: SocketIO):
    game_state = GameState()
    player_manager = PlayerManager(game_state)
    players: dict = {}

    @socketio.on("connect")
    def handle_connect():
        print(f"Client connected: {request.sid}")

    @socketio.on("disconnect")
    def handle_disconnect():
        print(f"Client disconnected: {request.sid}")
        if request.sid in players:
            player_manager.unregister_player(request.sid)
            emit("player_left", {"id": request.sid}, broadcast=True)

    @socketio.on("join")
    def handle_join(data):
        nickname = data.get("nickname", "Player")
        color = data.get("color")
        
        player = player_manager.register_player(request.sid, nickname, color)
        players[request.sid] = player
        
        init_state = game_state.broadcast_state()
        init_state["player_id"] = request.sid
        emit("init", init_state)
        
        emit("player_joined", player.to_dict(), broadcast=True)
        print(f"Player joined: {nickname} ({request.sid})")

    @socketio.on("move")
    def handle_move(data):
        new_x = float(data.get("x", 0))
        new_y = float(data.get("y", 0))
        direction = int(data.get("direction", 0))
        state = data.get("state", "idle")
        frame = int(data.get("frame", 0))
        
        success = player_manager.update_player(request.sid, new_x, new_y, direction, state, frame)
        
        if success:
            emit("state", game_state.broadcast_state(), broadcast=True)

    @socketio.on("chat")
    def handle_chat(data):
        message = data.get("message", "")
        player = player_manager.game_state.get_player(request.sid)
        if player and message:
            chat_data = {
                "nickname": player.nickname,
                "color": player.color,
                "message": message
            }
            emit("chat_message", chat_data, broadcast=True)

    @socketio.on("build_terrain")
    def handle_build_terrain(data):
        terrain_type = data.get("type", "hill")
        x = int(data.get("x", 0))
        y = int(data.get("y", 0))
        radius = int(data.get("radius", 3))
        elevation_change = int(data.get("elevation_change", 2))
        
        success = game_state.modify_terrain(terrain_type, x, y, radius, elevation_change)
        
        if success:
            emit("terrain_update", {"heightMap": game_state.height_map}, broadcast=True)

    return game_state