import json
import os
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAPS_DIR = os.path.join(BASE_DIR, "maps")


@dataclass
class Player:
    id: str
    nickname: str
    color: str
    x: float
    y: float
    target_x: float
    target_y: float
    direction: int
    state: str
    frame: int
    hp: int = 100
    max_hp: int = 100
    inventory: list = field(default_factory=list)
    quests: list = field(default_factory=list)

    def to_dict(self):
        return {
            "id": self.id,
            "nickname": self.nickname,
            "color": self.color,
            "x": self.x,
            "y": self.y,
            "direction": self.direction,
            "state": self.state,
            "frame": self.frame,
            "hp": self.hp,
            "max_hp": self.max_hp,
            "inventory": self.inventory,
            "quests": self.quests
        }


@dataclass
class NPC:
    id: str
    name: str
    x: float
    y: float
    target_x: float
    target_y: float
    direction: int = 0
    state: str = "idle"
    frame: int = 0
    hp: int = 100
    max_hp: int = 100
    patrol_points: list = field(default_factory=list)
    current_patrol_index: int = 0
    patrol_timer: float = 0.0
    patrol_wait_time: float = 2.0
    color: str = "#4ecdc4"
    dead: bool = False
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": "npc",
            "x": self.x,
            "y": self.y,
            "direction": self.direction,
            "state": self.state,
            "frame": self.frame,
            "hp": self.hp,
            "max_hp": self.max_hp,
            "color": self.color
        }


@dataclass
class Mob:
    id: str
    name: str
    x: float
    y: float
    target_x: float
    target_y: float
    level: int = 1
    direction: int = 0
    state: str = "idle"
    frame: int = 0
    hp: int = 30
    max_hp: int = 30
    damage: int = 10
    attack_range: float = 1.5
    attack_cooldown: float = 0.0
    attack_interval: float = 1.5
    aggro_range: float = 8.0
    home_x: float = 0.0
    home_y: float = 0.0
    wander_timer: float = 0.0
    wander_interval: float = 3.0
    target_player_id: str = None
    dead: bool = False
    color: str = "#ff6b6b"
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": "mob",
            "level": self.level,
            "x": self.x,
            "y": self.y,
            "direction": self.direction,
            "state": self.state,
            "frame": self.frame,
            "hp": self.hp,
            "max_hp": self.max_hp,
            "dead": self.dead,
            "color": self.color
        }


@dataclass
class GameState:
    players: Dict[str, Player] = field(default_factory=dict)
    npcs: Dict[str, NPC] = field(default_factory=dict)
    mobs: Dict[str, Mob] = field(default_factory=dict)
    map_data: List[List[int]] = field(default_factory=list)
    map_width: int = 0
    map_height: int = 0
    height_map: List[List[int]] = field(default_factory=list)
    tick: int = 0
    last_tick_time: float = 0.0
    tick_interval: float = 0.1
    items: List[dict] = field(default_factory=list)  # Предметы на земле
    next_npc_id: int = 0
    next_mob_id: int = 0
    # Время в секундах (0-86400 = 24 часа), начинается с полудня
    game_time: float = 12 * 3600
    # Длительность игровых суток в реальных секундах
    day_duration: float = 60

    def __post_init__(self):
        if not self.map_data:
            self.load_default_map()
        if not self.height_map:
            self.generate_height_map()
        # Спавн NPC и мобов при инициализации
        self.spawn_initial_entities()

    def spawn_initial_entities(self):
        """Спавн начальных NPC и мобов на карте"""
        import random
        random.seed(42)
        
        # Спавн NPC с патрулированием
        npc_spawn_points = [
            {"x": 10, "y": 10, "name": "Стражник"},
            {"x": 20, "y": 15, "name": "Торговец"},
            {"x": 30, "y": 20, "name": "Кузнец"}
        ]
        
        for point in npc_spawn_points:
            if point["x"] < self.map_width and point["y"] < self.map_height:
                npc = NPC(
                    id="",
                    name=point["name"],
                    x=float(point["x"]),
                    y=float(point["y"]),
                    target_x=float(point["x"]),
                    target_y=float(point["y"]),
                    patrol_points=[
                        {"x": point["x"], "y": point["y"]},
                        {"x": min(self.map_width - 1, point["x"] + 5), "y": point["y"]},
                        {"x": point["x"], "y": min(self.map_height - 1, point["y"] + 5)}
                    ],
                    color="#4ecdc4"
                )
                self.add_npc(npc)
        
        # Спавн мобов-врагов
        mob_spawn_points = [
            {"x": 5, "y": 5, "name": "Гоблин", "level": 1, "hp": 30},
            {"x": 25, "y": 10, "name": "Орк", "level": 2, "hp": 50},
            {"x": 35, "y": 25, "name": "Тролль", "level": 3, "hp": 80}
        ]
        
        for point in mob_spawn_points:
            if point["x"] < self.map_width and point["y"] < self.map_height:
                mob = Mob(
                    id="",
                    name=point["name"],
                    x=float(point["x"]),
                    y=float(point["y"]),
                    target_x=float(point["x"]),
                    target_y=float(point["y"]),
                    level=point["level"],
                    hp=point["hp"],
                    max_hp=point["hp"],
                    damage=point["level"] * 10,
                    home_x=float(point["x"]),
                    home_y=float(point["y"]),
                    color="#ff6b6b"
                )
                self.add_mob(mob)

    def load_default_map(self):
        map_path = os.path.join(MAPS_DIR, "default.json")
        if os.path.exists(map_path):
            with open(map_path, "r") as f:
                data = json.load(f)
                self.map_data = data.get("tiles", [])
                self.map_width = data.get("width", len(self.map_data[0]) if self.map_data else 0)
                self.map_height = data.get("height", len(self.map_data))

    def generate_height_map(self):
        """Генерация начальной карты высот с использованием простого шума"""
        import random
        random.seed(42)  # Фиксированное зерно для воспроизводимости
        
        self.height_map = [[0 for _ in range(self.map_width)] for _ in range(self.map_height)]
        
        max_height = 8
        
        # Добавление случайных холмов
        num_hills = (self.map_width * self.map_height) // 20
        for _ in range(num_hills):
            cx = random.randint(0, self.map_width - 1)
            cy = random.randint(0, self.map_height - 1)
            radius = random.randint(2, 5)
            delta = random.randint(1, 3)
            self._apply_hill(cx, cy, radius, delta, max_height)
        
        # Добавление впадин
        num_pits = (self.map_width * self.map_height) // 40
        for _ in range(num_pits):
            cx = random.randint(0, self.map_width - 1)
            cy = random.randint(0, self.map_height - 1)
            radius = random.randint(1, 3)
            delta = random.randint(1, 2)
            self._apply_pit(cx, cy, radius, delta)

    def _apply_hill(self, cx, cy, radius, delta, max_height):
        """Применение холма к карте высот"""
        for y in range(max(0, cy - radius), min(self.map_height, cy + radius + 1)):
            for x in range(max(0, cx - radius), min(self.map_width, cx + radius + 1)):
                dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if dist <= radius:
                    falloff = 1 - (dist / radius)
                    increase = int(delta * falloff)
                    self.height_map[y][x] = min(max_height, self.height_map[y][x] + increase)

    def _apply_pit(self, cx, cy, radius, delta):
        """Применение впадины к карте высот"""
        for y in range(max(0, cy - radius), min(self.map_height, cy + radius + 1)):
            for x in range(max(0, cx - radius), min(self.map_width, cx + radius + 1)):
                dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if dist <= radius:
                    falloff = 1 - (dist / radius)
                    decrease = int(delta * falloff)
                    self.height_map[y][x] = max(0, self.height_map[y][x] - decrease)

    def modify_terrain(self, terrain_type, x, y, radius, elevation_change):
        """Изменение рельефа на основе типа инструмента"""
        max_height = 8
        
        if terrain_type == "hill":
            self._apply_hill(x, y, radius, elevation_change, max_height)
        elif terrain_type == "pit":
            self._apply_pit(x, y, radius, elevation_change)
        elif terrain_type == "water":
            self._flatten_terrain(x, y, radius, 0)
        else:
            return False
        
        return True

    def _flatten_terrain(self, cx, cy, radius, target_height):
        """Выравнивание рельефа до целевой высоты"""
        for y in range(max(0, cy - radius), min(self.map_height, cy + radius + 1)):
            for x in range(max(0, cx - radius), min(self.map_width, cx + radius + 1)):
                dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if dist <= radius:
                    falloff = 1 - (dist / radius)
                    current = self.height_map[y][x]
                    delta = (target_height - current) * falloff
                    self.height_map[y][x] = max(0, min(8, int(current + delta)))

    def add_player(self, player: Player):
        self.players[player.id] = player

    def remove_player(self, player_id: str):
        if player_id in self.players:
            del self.players[player_id]

    def get_player(self, player_id: str) -> Optional[Player]:
        return self.players.get(player_id)

    def update_player_position(self, player_id: str, new_x: float, new_y: float):
        player = self.get_player(player_id)
        if player:
            player.x = new_x
            player.y = new_y

    def add_npc(self, npc: NPC) -> str:
        """Добавление NPC на карту"""
        npc.id = f"npc_{self.next_npc_id}"
        self.next_npc_id += 1
        self.npcs[npc.id] = npc
        return npc.id

    def add_mob(self, mob: Mob) -> str:
        """Добавление моба на карту"""
        mob.id = f"mob_{self.next_mob_id}"
        self.next_mob_id += 1
        self.mobs[mob.id] = mob
        return mob.id

    def remove_mob(self, mob_id: str):
        """Удаление моба (после смерти)"""
        if mob_id in self.mobs:
            del self.mobs[mob_id]

    def get_entity(self, entity_id: str):
        """Получение сущности по ID (игрок, NPC или моб)"""
        if entity_id in self.players:
            return self.players[entity_id]
        if entity_id in self.npcs:
            return self.npcs[entity_id]
        if entity_id in self.mobs:
            return self.mobs[entity_id]
        return None

    def update_npc_ai(self, npc: NPC, dt: float):
        """Обновление ИИ NPC - патрулирование"""
        if npc.dead:
            return
            
        if len(npc.patrol_points) > 0 and not npc.target_x != npc.x:
            npc.patrol_timer += dt
            if npc.patrol_timer >= npc.patrol_wait_time:
                npc.patrol_timer = 0
                point = npc.patrol_points[npc.current_patrol_index]
                npc.target_x = point["x"]
                npc.target_y = point["y"]
                npc.state = "walking"
                npc.current_patrol_index = (npc.current_patrol_index + 1) % len(npc.patrol_points)
        
        # Движение к цели
        if npc.target_x != npc.x or npc.target_y != npc.y:
            dx = npc.target_x - npc.x
            dy = npc.target_y - npc.y
            dist = (dx**2 + dy**2)**0.5
            if dist < 0.1:
                npc.x = npc.target_x
                npc.y = npc.target_y
                npc.state = "idle"
            else:
                move_speed = 1.5 * dt
                npc.x += (dx / dist) * move_speed
                npc.y += (dy / dist) * move_speed
                # Обновление направления
                if abs(dx) > abs(dy):
                    npc.direction = 2 if dx > 0 else 1
                else:
                    npc.direction = 0 if dy > 0 else 3

    def update_mob_ai(self, mob: Mob, dt: float, players: Dict[str, Player]):
        """Обновление ИИ моба - агрессия, преследование, атака"""
        if mob.dead:
            return
        
        # Обновление кулдауна атаки
        if mob.attack_cooldown > 0:
            mob.attack_cooldown -= dt
        
        # Поиск ближайшего игрока в радиусе агрессии
        target_player = None
        min_dist = mob.aggro_range
        
        for player in players.values():
            if player.dead or player.hp <= 0:
                continue
            dist = ((player.x - mob.x)**2 + (player.y - mob.y)**2)**0.5
            if dist < min_dist:
                min_dist = dist
                target_player = player
        
        if target_player:
            mob.target_player_id = target_player.id
            # Преследование или атака
            if min_dist > mob.attack_range:
                # Движение к игроку
                dx = target_player.x - mob.x
                dy = target_player.y - mob.y
                dist = (dx**2 + dy**2)**0.5
                if dist > 0:
                    move_speed = 1.8 * dt
                    mob.x += (dx / dist) * move_speed
                    mob.y += (dy / dist) * move_speed
                    mob.state = "walking"
                    # Обновление направления
                    if abs(dx) > abs(dy):
                        mob.direction = 2 if dx > 0 else 1
                    else:
                        mob.direction = 0 if dy > 0 else 3
            elif mob.attack_cooldown <= 0:
                # Атака игрока
                target_player.hp -= mob.damage
                if target_player.hp < 0:
                    target_player.hp = 0
                mob.attack_cooldown = mob.attack_interval
                mob.state = "attack"
        else:
            mob.target_player_id = None
            # Блуждание вокруг домашней точки
            mob.wander_timer += dt
            if mob.wander_timer >= mob.wander_interval:
                mob.wander_timer = 0
                import random
                angle = random.random() * 3.14159 * 2
                radius = random.random() * mob.aggro_range * 0.5
                new_x = mob.home_x + (angle) * radius
                new_y = mob.home_y + (angle) * radius
                # Ограничение границами карты
                new_x = max(0, min(self.map_width - 1, new_x))
                new_y = max(0, min(self.map_height - 1, new_y))
                mob.target_x = new_x
                mob.target_y = new_y
                mob.state = "walking"

    def tick_loop(self, dt: float):
        self.last_tick_time += dt
        if self.last_tick_time >= self.tick_interval:
            self.last_tick_time = 0.0
            self.tick += 1
            
            # Обновление игрового времени
            self.game_time += dt * (86400 / self.day_duration)
            if self.game_time >= 86400:
                self.game_time -= 86400
            
            # Обновление ИИ NPC
            for npc in self.npcs.values():
                self.update_npc_ai(npc, self.tick_interval)
            
            # Обновление ИИ мобов
            for mob in self.mobs.values():
                self.update_mob_ai(mob, self.tick_interval, self.players)
            
            return True
        return False

    def broadcast_state(self):
        return {
            "tick": self.tick,
            "timestamp": time.time(),
            "gameTime": self.game_time,
            "dayDuration": self.day_duration,
            "players": [p.to_dict() for p in self.players.values()],
            "npcs": [n.to_dict() for n in self.npcs.values()],
            "mobs": [m.to_dict() for m in self.mobs.values()],
            "map": {
                "width": self.map_width,
                "height": self.map_height,
                "tiles": self.map_data,
                "heightMap": self.height_map
            },
            "items": self.items  # Отправляем предметы на земле
        }