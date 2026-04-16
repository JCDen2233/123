from flask_socketio import SocketIO, emit
from flask import request
from server.game_state import GameState, Player
from server.player_manager import PlayerManager
import uuid
import database as db

def init_socketio(app, socketio: SocketIO):
    # Инициализация базы данных
    db.init_db()
    
    game_state = GameState()
    player_manager = PlayerManager(game_state)
    players: dict = {}
    
    # Загрузка изменений ландшафта из БД при старте сервера
    terrain_changes = db.load_terrain_changes()
    if terrain_changes:
        print(f"Загружено {len(terrain_changes)} изменений ландшафта из БД")
        for change in terrain_changes:
            tx, ty = int(change['tile_x']), int(change['tile_y'])
            if 0 <= tx < len(game_state.height_map) and 0 <= ty < len(game_state.height_map[0]):
                game_state.height_map[tx][ty] = change['height']
                # Можно добавить сохранение типа тайла если нужно
    
    # Загрузка предметов на земле из БД
    items_on_ground = db.load_items()
    if items_on_ground:
        print(f"Загружено {len(items_on_ground)} предметов из БД")
        for item in items_on_ground:
            game_state.items.append({
                'id': item['id'],
                'type': item['item_type'],
                'x': item['x'],
                'y': item['y'],
                'quantity': item['quantity']
            })

    @socketio.on("connect")
    def handle_connect():
        print(f"Клиент подключился: {request.sid}")

    @socketio.on("disconnect")
    def handle_disconnect():
        print(f"Клиент отключился: {request.sid}")
        if request.sid in players:
            player = players[request.sid]
            # Сохранение данных игрока перед выходом
            db.save_player(
                player.nickname,
                player.x,
                player.y,
                player.hp,
                player.max_hp,
                player.inventory,
                player.quests
            )
            print(f"Данные игрока {player.nickname} сохранены в БД")
            
            player_manager.unregister_player(request.sid)
            del players[request.sid]
            emit("player_left", {"id": request.sid}, broadcast=True)

    @socketio.on("join")
    def handle_join(data):
        nickname = data.get("nickname", "Игрок")
        color = data.get("color")
        
        # Загрузка или создание игрока из БД
        player_data = db.load_player(nickname)
        
        if player_data['exists']:
            print(f"Игрок {nickname} загружен из БД")
            # Используем сохраненные данные
            player = player_manager.register_player(
                request.sid, 
                nickname, 
                color,
                x=player_data['x'],
                y=player_data['y'],
                hp=player_data['hp'],
                max_hp=player_data['max_hp'],
                inventory=player_data['inventory'],
                quests=player_data['quests']
            )
        else:
            print(f"Новый игрок {nickname}, создание записи в БД")
            # Создаем нового игрока с дефолтными данными
            player = player_manager.register_player(
                request.sid, 
                nickname, 
                color,
                x=player_data['x'],
                y=player_data['y'],
                hp=player_data['hp'],
                max_hp=player_data['max_hp'],
                inventory=player_data['inventory'],
                quests=player_data['quests']
            )
            # Сохраняем нового игрока в БД
            db.save_player(
                nickname,
                player.x,
                player.y,
                player.hp,
                player.max_hp,
                player.inventory,
                player.quests
            )
        
        players[request.sid] = player
        
        init_state = game_state.broadcast_state()
        init_state["player_id"] = request.sid
        emit("init", init_state)
        
        emit("player_joined", player.to_dict(), broadcast=True)
        print(f"Игрок присоединился: {nickname} ({request.sid})")

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
            # Сохранение изменений ландшафта в БД
            # Проходим по измененным тайлам и сохраняем каждый
            for dx in range(-radius, radius + 1):
                for dy in range(-radius, radius + 1):
                    if dx*dx + dy*dy <= radius*radius:
                        tx, ty = x + dx, y + dy
                        if 0 <= tx < len(game_state.height_map) and 0 <= ty < len(game_state.height_map[0]):
                            db.save_terrain_change(tx, ty, game_state.height_map[tx][ty])
            
            emit("terrain_update", {"heightMap": game_state.height_map}, broadcast=True)

    @socketio.on("pickup_item")
    def handle_pickup_item(data):
        item_id = data.get("item_id")
        player = player_manager.game_state.get_player(request.sid)
        
        if player and item_id:
            # Удаляем предмет из БД
            db.remove_item(item_id)
            # Удаляем из игрового состояния
            game_state.items = [i for i in game_state.items if i['id'] != item_id]
            # Отправляем обновление всем клиентам
            emit("state", game_state.broadcast_state(), broadcast=True)

    @socketio.on("attack")
    def handle_attack(data):
        target_id = data.get("target_id")
        damage = data.get("damage", 10)
        
        attacker = player_manager.game_state.get_player(request.sid)
        target = player_manager.game_state.get_entity(target_id)
        
        if attacker and target and hasattr(target, 'hp'):
            # Проверка расстояния до цели
            dist = ((attacker.x - target.x)**2 + (attacker.y - target.y)**2)**0.5
            if dist <= 3.0:  # Радиус атаки
                target.hp -= damage
                if target.hp < 0:
                    target.hp = 0
                
                # Если моб умер, удаляем его
                if isinstance(target, type(player_manager.game_state.mobs.get(target_id, None))):
                    if target.hp <= 0:
                        target.dead = True
                        # Удаляем моба через некоторое время или сразу
                        player_manager.game_state.remove_mob(target_id)
                
                emit("state", game_state.broadcast_state(), broadcast=True)

    return game_state