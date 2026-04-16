import random

TILE_GRASS = 0
TILE_WATER = 1
TILE_WALL = 2
TILE_TREE = 3
TILE_PATH = 4
TILE_SAND = 5


def is_tile_passable(tile_type: int) -> bool:
    passable = {TILE_GRASS, TILE_PATH, TILE_SAND}
    return tile_type in passable


def check_collision(map_data: list, x: float, y: float, width: int, height: int) -> bool:
    grid_x = int(round(x))
    grid_y = int(round(y))
    
    if grid_x < 0 or grid_x >= width or grid_y < 0 or grid_y >= height:
        return True
    
    tile = map_data[grid_y][grid_x]
    return not is_tile_passable(tile)


def validate_move(map_data: list, from_x: float, from_y: float, to_x: float, to_y: float, width: int, height: int, max_speed: float = 3.0) -> bool:
    if to_x < 0 or to_x >= width or to_y < 0 or to_y >= height:
        return False
    
    dist = ((to_x - from_x) ** 2 + (to_y - from_y) ** 2) ** 0.5
    if dist > max_speed * 0.1:
        return False
    
    if check_collision(map_data, to_x, to_y, width, height):
        return False
    
    return True