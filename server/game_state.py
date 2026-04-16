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
    tick: int = 0
    last_tick_time: float = 0.0
    tick_interval: float = 0.1

    def __post_init__(self):
        if not self.map_data:
            self.load_default_map()

    def load_default_map(self):
        map_path = os.path.join(MAPS_DIR, "default.json")
        if os.path.exists(map_path):
            with open(map_path, "r") as f:
                data = json.load(f)
                self.map_data = data.get("tiles", [])
                self.map_width = data.get("width", len(self.map_data[0]) if self.map_data else 0)
                self.map_height = data.get("height", len(self.map_data))

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
                "tiles": self.map_data
            }
        }