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
            "max_hp": self.max_hp
        }


@dataclass
class GameState:
    players: Dict[str, Player] = field(default_factory=dict)
    map_data: List[List[int]] = field(default_factory=list)
    map_width: int = 0
    map_height: int = 0
    height_map: List[List[int]] = field(default_factory=list)
    tick: int = 0
    last_tick_time: float = 0.0
    tick_interval: float = 0.1

    def __post_init__(self):
        if not self.map_data:
            self.load_default_map()
        if not self.height_map:
            self.generate_height_map()

    def load_default_map(self):
        map_path = os.path.join(MAPS_DIR, "default.json")
        if os.path.exists(map_path):
            with open(map_path, "r") as f:
                data = json.load(f)
                self.map_data = data.get("tiles", [])
                self.map_width = data.get("width", len(self.map_data[0]) if self.map_data else 0)
                self.map_height = data.get("height", len(self.map_data))

    def generate_height_map(self):
        """Generate initial height map using simple noise"""
        import random
        random.seed(42)  # Fixed seed for consistency
        
        self.height_map = [[0 for _ in range(self.map_width)] for _ in range(self.map_height)]
        
        max_height = 8
        
        # Add some random hills
        num_hills = (self.map_width * self.map_height) // 20
        for _ in range(num_hills):
            cx = random.randint(0, self.map_width - 1)
            cy = random.randint(0, self.map_height - 1)
            radius = random.randint(2, 5)
            delta = random.randint(1, 3)
            self._apply_hill(cx, cy, radius, delta, max_height)
        
        # Add some pits
        num_pits = (self.map_width * self.map_height) // 40
        for _ in range(num_pits):
            cx = random.randint(0, self.map_width - 1)
            cy = random.randint(0, self.map_height - 1)
            radius = random.randint(1, 3)
            delta = random.randint(1, 2)
            self._apply_pit(cx, cy, radius, delta)

    def _apply_hill(self, cx, cy, radius, delta, max_height):
        """Apply a hill to the height map"""
        for y in range(max(0, cy - radius), min(self.map_height, cy + radius + 1)):
            for x in range(max(0, cx - radius), min(self.map_width, cx + radius + 1)):
                dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if dist <= radius:
                    falloff = 1 - (dist / radius)
                    increase = int(delta * falloff)
                    self.height_map[y][x] = min(max_height, self.height_map[y][x] + increase)

    def _apply_pit(self, cx, cy, radius, delta):
        """Apply a pit to the height map"""
        for y in range(max(0, cy - radius), min(self.map_height, cy + radius + 1)):
            for x in range(max(0, cx - radius), min(self.map_width, cx + radius + 1)):
                dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if dist <= radius:
                    falloff = 1 - (dist / radius)
                    decrease = int(delta * falloff)
                    self.height_map[y][x] = max(0, self.height_map[y][x] - decrease)

    def modify_terrain(self, terrain_type, x, y, radius, elevation_change):
        """Modify terrain based on tool type"""
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
        """Flatten terrain to a target height"""
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

    def tick_loop(self, dt: float):
        self.last_tick_time += dt
        if self.last_tick_time >= self.tick_interval:
            self.last_tick_time = 0.0
            self.tick += 1
            return True
        return False

    def broadcast_state(self):
        return {
            "tick": self.tick,
            "timestamp": time.time(),
            "players": [p.to_dict() for p in self.players.values()],
            "map": {
                "width": self.map_width,
                "height": self.map_height,
                "tiles": self.map_data,
                "heightMap": self.height_map
            }
        }