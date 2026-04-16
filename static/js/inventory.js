/**
 * Inventory System - Управление предметами и инвентарём
 */

class Item {
    constructor(id, name, type, icon, description, maxStack = 1, effect = null) {
        this.id = id;
        this.name = name;
        this.type = type; // 'potion', 'food', 'weapon', 'material', 'quest'
        this.icon = icon;
        this.description = description;
        this.maxStack = maxStack;
        this.effect = effect; // функция эффекта при использовании
        this.count = 1;
    }

    use(target = null) {
        if (this.effect && typeof this.effect === 'function') {
            return this.effect(target);
        }
        return false;
    }

    clone() {
        const item = new Item(this.id, this.name, this.type, this.icon, this.description, this.maxStack, this.effect);
        item.count = this.count;
        return item;
    }
}

class InventorySlot {
    constructor() {
        this.item = null;
        this.count = 0;
    }

    addItem(item, count = 1) {
        if (!this.item) {
            this.item = item.clone();
            this.count = Math.min(count, item.maxStack);
            return count;
        }

        if (this.item.id !== item.id || this.count >= this.item.maxStack) {
            return 0;
        }

        const space = this.item.maxStack - this.count;
        const toAdd = Math.min(count, space);
        this.count += toAdd;
        return toAdd;
    }

    removeItem(count = 1) {
        if (!this.item) return 0;

        const toRemove = Math.min(count, this.count);
        this.count -= toRemove;

        if (this.count <= 0) {
            this.item = null;
            this.count = 0;
        }

        return toRemove;
    }

    isEmpty() {
        return !this.item || this.count === 0;
    }
}

class Inventory {
    constructor(size = 20) {
        this.slots = [];
        for (let i = 0; i < size; i++) {
            this.slots.push(new InventorySlot());
        }
        this.size = size;
        this.onUpdateCallbacks = [];
    }

    addItem(item, count = 1) {
        let remaining = count;

        // Сначала пытаемся добавить в существующие стаки
        for (const slot of this.slots) {
            if (remaining <= 0) break;
            const added = slot.addItem(item, remaining);
            remaining -= added;
        }

        // Затем ищем пустые слоты
        if (remaining > 0) {
            for (const slot of this.slots) {
                if (remaining <= 0) break;
                if (slot.isEmpty()) {
                    const added = slot.addItem(item, remaining);
                    remaining -= added;
                }
            }
        }

        this.notifyUpdate();
        return count - remaining; // Вернуть количество добавленных предметов
    }

    removeItem(itemId, count = 1) {
        let removed = 0;
        for (const slot of this.slots) {
            if (removed >= count) break;
            if (slot.item && slot.item.id === itemId) {
                const toRemove = Math.min(count - removed, slot.count);
                slot.removeItem(toRemove);
                removed += toRemove;
            }
        }
        this.notifyUpdate();
        return removed;
    }

    getItem(itemId) {
        for (const slot of this.slots) {
            if (slot.item && slot.item.id === itemId) {
                return { item: slot.item, count: slot.count };
            }
        }
        return null;
    }

    hasItem(itemId, count = 1) {
        const found = this.getItem(itemId);
        return found && found.count >= count;
    }

    useItemFromSlot(slotIndex, target = null) {
        if (slotIndex < 0 || slotIndex >= this.size) return false;
        const slot = this.slots[slotIndex];
        if (slot.isEmpty()) return false;

        const result = slot.item.use(target);
        if (result) {
            slot.removeItem(1);
            this.notifyUpdate();
        }
        return result;
    }

    getSlot(index) {
        if (index < 0 || index >= this.size) return null;
        return this.slots[index];
    }

    getAllItems() {
        const items = [];
        for (let i = 0; i < this.size; i++) {
            const slot = this.slots[i];
            if (!slot.isEmpty()) {
                items.push({
                    slotIndex: i,
                    item: slot.item,
                    count: slot.count
                });
            }
        }
        return items;
    }

    clear() {
        for (const slot of this.slots) {
            slot.item = null;
            slot.count = 0;
        }
        this.notifyUpdate();
    }

    onUpdate(callback) {
        this.onUpdateCallbacks.push(callback);
    }

    notifyUpdate() {
        for (const cb of this.onUpdateCallbacks) {
            cb(this);
        }
    }
}

// Предопределённые предметы
const ITEMS = {
    HEALTH_POTION: new Item('health_potion', 'Зелье лечения', 'potion', '🧪', 'Восстанавливает 50 HP', 10, (target) => {
        if (target && target.hp !== undefined) {
            const healAmount = 50;
            const oldHp = target.hp;
            target.hp = Math.min(target.maxHp, target.hp + healAmount);
            return { success: true, message: `+${target.hp - oldHp} HP` };
        }
        return { success: false, message: 'Не удалось использовать' };
    }),

    FOOD_BREAD: new Item('food_bread', 'Хлеб', 'food', '🍞', 'Восстанавливает 25 HP', 20, (target) => {
        if (target && target.hp !== undefined) {
            const healAmount = 25;
            const oldHp = target.hp;
            target.hp = Math.min(target.maxHp, target.hp + healAmount);
            return { success: true, message: `+${target.hp - oldHp} HP` };
        }
        return { success: false, message: 'Не удалось использовать' };
    }),

    WOOD_SWORD: new Item('wood_sword', 'Деревянный меч', 'weapon', '🗡️', 'Простое оружие (+5 к урону)', 1, null),

    IRON_SWORD: new Item('iron_sword', 'Железный меч', 'weapon', '⚔️', 'Хорошее оружие (+10 к урону)', 1, null),

    HERB: new Item('herb', 'Трава', 'material', '🌿', 'Обычная трава для крафта', 99, null),

    QUEST_SCROLL: new Item('quest_scroll', 'Свиток квеста', 'quest', '📜', 'Загадочный свиток', 1, null)
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Item, InventorySlot, Inventory, ITEMS };
}
