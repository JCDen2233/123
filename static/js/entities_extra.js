/**
 * Entity System - NPC, Мобы и другие сущности
 */

class Entity {
    constructor(x, y, type) {
        this.id = null;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.type = type; // 'npc', 'mob', 'item'
        this.direction = 0;
        this.state = 'idle';
        this.frame = 0;
        this.frameTimer = 0;
        this.moveSpeed = 2.0;
        this.isMoving = false;
        this.color = '#888888';
        this.name = 'Сущность';
        this.hp = 100;
        this.maxHp = 100;
        this.dead = false;
    }

    getGridX() {
        return Math.round(this.x);
    }

    getGridY() {
        return Math.round(this.y);
    }

    setDirection(dx, dy) {
        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? 2 : 1;
        } else if (Math.abs(dy) > 0) {
            this.direction = dy > 0 ? 0 : 3;
        }
    }

    startMoving(dx, dy) {
        this.setDirection(dx, dy);
        this.state = 'walking';
        this.isMoving = true;
    }

    stopMoving() {
        this.state = 'idle';
        this.isMoving = false;
        this.frame = 0;
    }

    update(deltaTime) {
        if (this.isMoving && !this.dead) {
            const lerpFactor = this.moveSpeed * deltaTime;
            const distX = this.targetX - this.x;
            const distY = this.targetY - this.y;

            if (Math.abs(distX) < 0.01 && Math.abs(distY) < 0.01) {
                this.x = this.targetX;
                this.y = this.targetY;
                this.stopMoving();
                return;
            }

            this.x += Math.sign(distX) * Math.min(Math.abs(distX), lerpFactor);
            this.y += Math.sign(distY) * Math.min(Math.abs(distY), lerpFactor);

            this.frameTimer += deltaTime;
            if (this.frameTimer > 0.15) {
                this.frameTimer = 0;
                this.frame = (this.frame + 1) % 4;
            }
        }
    }

    moveTo(targetX, targetY) {
        this.targetX = targetX;
        this.targetY = targetY;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        this.startMoving(dx, dy);
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
        return { damaged: true, damage: amount, remaining: this.hp };
    }

    die() {
        this.dead = true;
        this.state = 'dead';
    }

    respawn(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.hp = this.maxHp;
        this.dead = false;
        this.state = 'idle';
    }
}

class NPC extends Entity {
    constructor(x, y, name, dialogue) {
        super(x, y, 'npc');
        this.name = name || 'NPC';
        this.dialogue = dialogue || [
            { text: 'Привет, путник!', options: [] },
            { text: 'Добро пожаловать в наши земли.', options: [] }
        ];
        this.color = '#4ecdc4';
        this.moveSpeed = 1.5;
        this.patrolPoints = [];
        this.currentPatrolIndex = 0;
        this.patrolTimer = 0;
        this.patrolWaitTime = 2.0;
    }

    addPatrolPoint(x, y) {
        this.patrolPoints.push({ x, y });
    }

    update(deltaTime, player = null) {
        if (this.dead) return;

        // Если патрульные точки заданы, двигаемся между ними
        if (this.patrolPoints.length > 0 && !this.isMoving) {
            this.patrolTimer += deltaTime;
            if (this.patrolTimer >= this.patrolWaitTime) {
                this.patrolTimer = 0;
                const point = this.patrolPoints[this.currentPatrolIndex];
                this.moveTo(point.x, point.y);
                this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
            }
        }

        super.update(deltaTime);
    }

    interact(player) {
        return {
            success: true,
            dialogue: this.dialogue,
            npcName: this.name
        };
    }
}

class Mob extends Entity {
    constructor(x, y, name, level = 1) {
        super(x, y, 'mob');
        this.name = name || 'Враг';
        this.level = level;
        this.color = '#ff6b6b';
        this.moveSpeed = 1.8;
        this.damage = 10 + level * 2;
        this.attackRange = 1.5;
        this.attackCooldown = 0;
        this.attackInterval = 1.5;
        this.aggroRange = 8;
        this.wanderRadius = 5;
        this.homeX = x;
        this.homeY = y;
        this.wanderTimer = 0;
        this.wanderInterval = 3.0;
        this.targetPlayer = null;
    }

    update(deltaTime, player = null) {
        if (this.dead) return;

        // Обновление кулдауна атаки
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }

        // Проверка агрессии
        if (player && !player.dead) {
            const distToPlayer = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
            
            if (distToPlayer <= this.aggroRange) {
                // Агрессия - преследование игрока
                this.targetPlayer = player;
                
                if (distToPlayer > this.attackRange) {
                    // Движение к игроку
                    const dx = player.x - this.x;
                    const dy = player.y - this.y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    if (len > 0) {
                        const moveX = (dx / len) * 0.5;
                        const moveY = (dy / len) * 0.5;
                        this.moveTo(this.x + moveX, this.y + moveY);
                    }
                } else if (this.attackCooldown <= 0) {
                    // Атака игрока
                    this.attack(player);
                }
            } else {
                this.targetPlayer = null;
            }
        }

        // Если нет цели, блуждаем вокруг домашней точки
        if (!this.targetPlayer && !this.isMoving) {
            this.wanderTimer += deltaTime;
            if (this.wanderTimer >= this.wanderInterval) {
                this.wanderTimer = 0;
                this.wander();
            }
        }

        super.update(deltaTime);
    }

    wander() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.wanderRadius;
        const newX = this.homeX + Math.cos(angle) * radius;
        const newY = this.homeY + Math.sin(angle) * radius;
        
        // Ограничение границами карты
        const clampedX = Math.max(0, Math.min(MAP_WIDTH - 1, newX));
        const clampedY = Math.max(0, Math.min(MAP_HEIGHT - 1, newY));
        
        if (canMoveTo(clampedX, clampedY)) {
            this.moveTo(clampedX, clampedY);
        }
    }

    attack(target) {
        if (target && !target.dead) {
            this.attackCooldown = this.attackInterval;
            const result = target.takeDamage(this.damage);
            return {
                attacked: true,
                damage: this.damage,
                target: target
            };
        }
        return null;
    }

    takeDamage(amount) {
        const result = super.takeDamage(amount);
        // При получении урона моб становится агрессивным
        if (result.damaged && !this.targetPlayer) {
            // Ищем кто атаковал (упрощённо - ближайший игрок)
            if (localPlayer && !localPlayer.dead) {
                const dist = Math.sqrt((localPlayer.x - this.x) ** 2 + (localPlayer.y - this.y) ** 2);
                if (dist < this.aggroRange * 2) {
                    this.targetPlayer = localPlayer;
                }
            }
        }
        return result;
    }

    die() {
        super.die();
        // Drop loot or give experience
        return {
            killed: true,
            mobName: this.name,
            level: this.level,
            loot: this.generateLoot()
        };
    }

    generateLoot() {
        const lootTable = [
            { item: ITEMS.HEALTH_POTION, chance: 0.3 },
            { item: ITEMS.FOOD_BREAD, chance: 0.4 },
            { item: ITEMS.HERB, chance: 0.5 }
        ];
        
        const drops = [];
        for (const entry of lootTable) {
            if (Math.random() < entry.chance) {
                drops.push(entry.item);
            }
        }
        return drops;
    }
}

class ItemDrop extends Entity {
    constructor(x, y, item, count = 1) {
        super(x, y, 'item');
        this.item = item;
        this.count = count;
        this.color = '#ffd700';
        this.name = item.name;
        this.pickupRange = 1.0;
    }

    canPickup(player) {
        const dist = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
        return dist <= this.pickupRange;
    }

    pickup(player) {
        if (this.canPickup(player)) {
            return {
                success: true,
                item: this.item,
                count: this.count
            };
        }
        return { success: false };
    }
}

// Менеджер сущностей
class EntityManager {
    constructor() {
        this.npcs = new Map();
        this.mobs = new Map();
        this.items = new Map();
        this.nextId = 0;
    }

    generateId() {
        return `entity_${this.nextId++}`;
    }

    addNPC(npc) {
        npc.id = this.generateId();
        this.npcs.set(npc.id, npc);
        return npc.id;
    }

    addMob(mob) {
        mob.id = this.generateId();
        this.mobs.set(mob.id, mob);
        return mob.id;
    }

    addItemDrop(itemDrop) {
        itemDrop.id = this.generateId();
        this.items.set(itemDrop.id, itemDrop);
        return itemDrop.id;
    }

    removeEntity(entityId) {
        if (this.npcs.has(entityId)) {
            this.npcs.delete(entityId);
            return true;
        }
        if (this.mobs.has(entityId)) {
            this.mobs.delete(entityId);
            return true;
        }
        if (this.items.has(entityId)) {
            this.items.delete(entityId);
            return true;
        }
        return false;
    }

    getAllEntities() {
        return [
            ...Array.from(this.npcs.values()),
            ...Array.from(this.mobs.values()),
            ...Array.from(this.items.values())
        ];
    }

    update(deltaTime, player = null) {
        // Обновление NPC
        for (const npc of this.npcs.values()) {
            npc.update(deltaTime, player);
        }

        // Обновление мобов
        for (const mob of this.mobs.values()) {
            mob.update(deltaTime, player);
        }
    }

    getNearbyEntities(x, y, radius) {
        const nearby = [];
        const allEntities = this.getAllEntities();
        
        for (const entity of allEntities) {
            const dist = Math.sqrt((entity.x - x) ** 2 + (entity.y - y) ** 2);
            if (dist <= radius) {
                nearby.push(entity);
            }
        }
        
        return nearby;
    }

    getClosestMob(x, y, maxDistance) {
        let closest = null;
        let minDist = maxDistance;

        for (const mob of this.mobs.values()) {
            if (mob.dead) continue;
            const dist = Math.sqrt((mob.x - x) ** 2 + (mob.y - y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                closest = mob;
            }
        }

        return closest;
    }
}

// Глобальный менеджер сущностей
const entityManager = new EntityManager();

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Entity, NPC, Mob, ItemDrop, EntityManager, entityManager };
}
