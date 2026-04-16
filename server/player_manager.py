from server.game_state import GameState, Player
from server.world import validate_move
import random


class PlayerManager:
    COLORS = [
        "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4",
        "#ffeaa7", "#dfe6e9", "#fd79a8", "#a29bfe",
        "#6c5ce7", "#00b894", "#e17055", "#74b9ff"
    ]

    def __init__(self, game_state: GameState):
        self.game_state = game_state

    def register_player(self, session_id: str, nickname: str, color: str = None, 
                       x: float = 2.0, y: float = 2.0, hp: int = 100, max_hp: int = 100,
                       inventory: list = None, quests: list = None) -> Player:
        if color is None:
            color = random.choice(self.COLORS)
        
        spawn_x = x
        spawn_y = y

        # Если позиция передана из БД, используем её, иначе ищем свободное место
        if x == 2.0 and y == 2.0:  # Дефолтная позиция, ищем свободную
            while self._is_occupied(spawn_x, spawn_y):
                spawn_x = random.uniform(1, min(10, self.game_state.map_width - 1))
                spawn_y = random.uniform(1, min(10, self.game_state.map_height - 1))

        player = Player(
            id=session_id,
            nickname=nickname,
            color=color,
            x=spawn_x,
            y=spawn_y,
            target_x=spawn_x,
            target_y=spawn_y,
            direction=0,
            state="idle",
            frame=0,
            hp=hp,
            max_hp=max_hp
        )
        
        # Сохраняем инвентарь и квесты в объекте игрока (если нужно расширить Player)
        if inventory:
            player.inventory = inventory
        if quests:
            player.quests = quests

        self.game_state.add_player(player)
        return player

    def unregister_player(self, session_id: str):
        self.game_state.remove_player(session_id)

    def update_player(self, session_id: str, new_x: float, new_y: float, direction: int, state: str, frame: int) -> bool:
        player = self.game_state.get_player(session_id)
        if not player:
            return False

        if not validate_move(
            self.game_state.map_data,
            player.x, player.y,
            new_x, new_y,
            self.game_state.map_width,
            self.game_state.map_height
        ):
            return False

        player.x = new_x
        player.y = new_y
        player.target_x = new_x
        player.target_y = new_y
        player.direction = direction
        player.state = state
        player.frame = frame

        return True

    def _is_occupied(self, x: float, y: float, radius: float = 2.0) -> bool:
        for p in self.game_state.players.values():
            dist = ((p.x - x) ** 2 + (p.y - y) ** 2) ** 0.5
            if dist < radius:
                return True
        return False

    def get_all_players(self) -> list:
        return list(self.game_state.players.values())