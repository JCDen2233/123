import sqlite3
import json
import os
from datetime import datetime

DB_NAME = 'game_world.db'

def get_db_connection():
    """Создает подключение к базе данных."""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Инициализирует базу данных, создавая таблицы если они не существуют."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Таблица игроков
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                x REAL DEFAULT 5.0,
                y REAL DEFAULT 5.0,
                hp INTEGER DEFAULT 100,
                max_hp INTEGER DEFAULT 100,
                inventory_json TEXT DEFAULT '[]',
                quests_json TEXT DEFAULT '[]',
                last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Таблица изменений мира (ландшафт)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS world_changes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tile_x INTEGER NOT NULL,
                tile_y INTEGER NOT NULL,
                height REAL NOT NULL,
                tile_type TEXT DEFAULT 'grass',
                modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tile_x, tile_y)
            )
        ''')
        
        # Таблица предметов на земле
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_type TEXT NOT NULL,
                x REAL NOT NULL,
                y REAL NOT NULL,
                quantity INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        print("База данных успешно инициализирована.")
    except Exception as e:
        print(f"Ошибка инициализации БД: {e}")
    finally:
        conn.close()

# --- Игроки ---

def save_player(username, x, y, hp, max_hp, inventory, quests):
    """Сохраняет данные игрока в БД."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO players (username, x, y, hp, max_hp, inventory_json, quests_json, last_login)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
                x = excluded.x,
                y = excluded.y,
                hp = excluded.hp,
                max_hp = excluded.max_hp,
                inventory_json = excluded.inventory_json,
                quests_json = excluded.quests_json,
                last_login = excluded.last_login
        ''', (username, x, y, hp, max_hp, json.dumps(inventory), json.dumps(quests), datetime.now()))
        conn.commit()
    except Exception as e:
        print(f"Ошибка сохранения игрока {username}: {e}")
    finally:
        conn.close()

def load_player(username):
    """Загружает данные игрока из БД. Возвращает dict или None если игрок не найден."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM players WHERE username = ?', (username,))
        row = cursor.fetchone()
        
        if row:
            return {
                'username': row['username'],
                'x': row['x'],
                'y': row['y'],
                'hp': row['hp'],
                'max_hp': row['max_hp'],
                'inventory': json.loads(row['inventory_json']) if row['inventory_json'] else [],
                'quests': json.loads(row['quests_json']) if row['quests_json'] else [],
                'exists': True
            }
        else:
            # Игрок не найден, возвращаем дефолтные данные
            return {
                'username': username,
                'x': 5.0,
                'y': 5.0,
                'hp': 100,
                'max_hp': 100,
                'inventory': [],
                'quests': [],
                'exists': False
            }
    except Exception as e:
        print(f"Ошибка загрузки игрока {username}: {e}")
        return None
    finally:
        conn.close()

def delete_player(username):
    """Удаляет игрока из БД (например, при бане)."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM players WHERE username = ?', (username,))
        conn.commit()
    except Exception as e:
        print(f"Ошибка удаления игрока {username}: {e}")
    finally:
        conn.close()

# --- Мир (Ландшафт) ---

def save_terrain_change(tile_x, tile_y, height, tile_type='grass'):
    """Сохраняет изменение тайла в БД."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO world_changes (tile_x, tile_y, height, tile_type)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(tile_x, tile_y) DO UPDATE SET
                height = excluded.height,
                tile_type = excluded.tile_type,
                modified_at = CURRENT_TIMESTAMP
        ''', (tile_x, tile_y, height, tile_type))
        conn.commit()
    except Exception as e:
        print(f"Ошибка сохранения ландшафта ({tile_x}, {tile_y}): {e}")
    finally:
        conn.close()

def load_terrain_changes():
    """Загружает все изменения ландшафта из БД. Возвращает список словарей."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT tile_x, tile_y, height, tile_type FROM world_changes')
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"Ошибка загрузки ландшафта: {e}")
        return []
    finally:
        conn.close()

# --- Предметы на земле ---

def save_item_drop(item_type, x, y, quantity=1):
    """Сохраняет выпавший предмет в БД."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO items (item_type, x, y, quantity)
            VALUES (?, ?, ?, ?)
        ''', (item_type, x, y, quantity))
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        print(f"Ошибка сохранения предмета {item_type}: {e}")
        return None
    finally:
        conn.close()

def load_items():
    """Загружает все предметы на земле из БД."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT id, item_type, x, y, quantity FROM items')
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"Ошибка загрузки предметов: {e}")
        return []
    finally:
        conn.close()

def remove_item(item_id):
    """Удаляет предмет из БД после подбора."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM items WHERE id = ?', (item_id,))
        conn.commit()
    except Exception as e:
        print(f"Ошибка удаления предмета {item_id}: {e}")
    finally:
        conn.close()

def clear_items():
    """Очищает все предметы на земле (например, при рестарте мира)."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM items')
        conn.commit()
    except Exception as e:
        print(f"Ошибка очистки предметов: {e}")
    finally:
        conn.close()
