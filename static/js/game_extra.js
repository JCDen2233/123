/**
 * Game Extra - Расширенная игровая логика (Этап 5)
 * Инвентарь, квесты, диалоги, бой, смерть/респаун
 */

// Инициализация инвентаря
function initInventory() {
    inventory = new Inventory(20);
    inventory.onUpdate(renderInventory);
    
    // Стартовые предметы
    inventory.addItem(ITEMS.HEALTH_POTION, 3);
    inventory.addItem(ITEMS.FOOD_BREAD, 2);
    
    renderInventory();
}

// Отрисовка инвентаря
function renderInventory() {
    const inventoryGrid = document.getElementById('inventoryGrid');
    const hotbarGrid = document.getElementById('hotbarGrid');
    
    if (!inventoryGrid || !hotbarGrid) return;
    
    inventoryGrid.innerHTML = '';
    hotbarGrid.innerHTML = '';
    
    // Основной инвентарь
    for (let i = 0; i < inventory.size; i++) {
        const slot = inventory.getSlot(i);
        const slotEl = createInventorySlotElement(slot, i);
        inventoryGrid.appendChild(slotEl);
    }
    
    // Горячая панель
    for (let i = 0; i < 5; i++) {
        const slotIndex = hotbarSlots[i];
        const slot = inventory.getSlot(slotIndex);
        const slotEl = createInventorySlotElement(slot, slotIndex, true);
        if (i === selectedHotbarSlot) {
            slotEl.classList.add('selected');
        }
        hotbarGrid.appendChild(slotEl);
    }
}

function createInventorySlotElement(slot, index, isHotbar = false) {
    const el = document.createElement('div');
    el.className = 'inventory-slot';
    if (slot && !slot.isEmpty()) {
        el.innerHTML = `
            <span class="item-icon">${slot.item.icon}</span>
            ${slot.count > 1 ? `<span class="item-count">${slot.count}</span>` : ''}
            <span class="item-name">${slot.item.name}</span>
        `;
        el.addEventListener('click', () => useItemFromSlot(index));
    }
    return el;
}

// Использование предмета из слота
function useItemFromSlot(slotIndex) {
    if (!inventory || !localPlayer) return;
    
    const result = inventory.useItemFromSlot(slotIndex, localPlayer);
    if (result && result.success) {
        showNotification(result.message || 'Предмет использован');
        network.sendChat(`/use ${slotIndex}`);
    }
}

// Журнал квестов
function addQuest(title, description, goals) {
    questLog.push({
        title,
        description,
        goals: goals || [],
        completed: false
    });
    renderQuestLog();
}

function updateQuestProgress(questIndex, goalIndex, current, required) {
    if (questLog[questIndex] && questLog[questIndex].goals[goalIndex]) {
        questLog[questIndex].goals[goalIndex].current = current;
        questLog[questIndex].goals[goalIndex].required = required;
        
        // Проверка завершения квеста
        const allComplete = questLog[questIndex].goals.every(g => g.current >= g.required);
        if (allComplete && !questLog[questIndex].completed) {
            questLog[questIndex].completed = true;
            showNotification(`Квест выполнен: ${questLog[questIndex].title}`, 'achievement');
        }
        
        renderQuestLog();
    }
}

function renderQuestLog() {
    const questList = document.getElementById('questList');
    if (!questList) return;
    
    questList.innerHTML = '';
    
    questLog.forEach((quest, index) => {
        const questEl = document.createElement('div');
        questEl.className = `quest-item ${quest.completed ? 'completed' : ''}`;
        
        let progressHtml = '';
        quest.goals.forEach(goal => {
            progressHtml += `<div class="quest-progress">${goal.description}: ${goal.current || 0}/${goal.required}</div>`;
        });
        
        questEl.innerHTML = `
            <div class="quest-title">${quest.title}</div>
            <div class="quest-desc">${quest.description}</div>
            ${progressHtml}
        `;
        
        questList.appendChild(questEl);
    });
}

// Диалоговая система
function startDialogue(npcName, dialogueLines, options = []) {
    currentDialogue = {
        npcName,
        lines: dialogueLines,
        options,
        currentIndex: 0
    };
    
    const dialogueContainer = document.getElementById('dialogueContainer');
    const dialogueName = document.getElementById('dialogueName');
    const dialogueText = document.getElementById('dialogueText');
    const dialogueOptions = document.getElementById('dialogueOptions');
    
    if (dialogueContainer) {
        dialogueContainer.classList.remove('hidden');
    }
    
    if (dialogueName) {
        dialogueName.textContent = npcName;
    }
    
    showNextDialogueLine();
}

function showNextDialogueLine() {
    if (!currentDialogue) return;
    
    const dialogueText = document.getElementById('dialogueText');
    const dialogueOptions = document.getElementById('dialogueOptions');
    
    if (dialogueText && currentDialogue.lines[currentDialogue.currentIndex]) {
        dialogueText.textContent = currentDialogue.lines[currentDialogue.currentIndex].text;
    }
    
    if (dialogueOptions) {
        dialogueOptions.innerHTML = '';
        const options = currentDialogue.lines[currentDialogue.currentIndex].options || [];
        
        options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'dialogue-option';
            btn.textContent = option.text;
            btn.addEventListener('click', () => {
                if (option.next !== undefined) {
                    currentDialogue.currentIndex = option.next;
                    showNextDialogueLine();
                } else if (option.callback) {
                    option.callback();
                    closeDialogue();
                }
            });
            dialogueOptions.appendChild(btn);
        });
    }
}

function closeDialogue() {
    currentDialogue = null;
    const dialogueContainer = document.getElementById('dialogueContainer');
    if (dialogueContainer) {
        dialogueContainer.classList.add('hidden');
    }
}

// Система уведомлений
function showNotification(message, type = '') {
    const notifications = document.getElementById('notifications');
    if (!notifications) return;
    
    const notifEl = document.createElement('div');
    notifEl.className = `notification ${type}`;
    notifEl.textContent = message;
    
    notifications.appendChild(notifEl);
    
    setTimeout(() => {
        notifEl.remove();
    }, 3000);
}

// Боевая система
function attackTarget(targetX, targetY) {
    if (!localPlayer || isDead) return;
    
    if (attackCooldown > 0) {
        showNotification('Атака ещё не готова!', 'damage');
        return;
    }
    
    // Поиск ближайшего моба в радиусе атаки
    const attackRange = 2;
    const closestMob = entityManager.getClosestMob(localPlayer.x, localPlayer.y, attackRange);
    
    if (closestMob) {
        // Нанесение урона
        const damage = 15 + (localPlayer.level || 1) * 2;
        const result = closestMob.takeDamage(damage);
        
        if (result.damaged) {
            showFloatingText(damage, closestMob.x, closestMob.y);
            attackCooldown = ATTACK_COOLDOWN_TIME;
            
            // Проверка смерти моба
            if (closestMob.dead) {
                const lootResult = closestMob.die();
                if (lootResult && lootResult.loot) {
                    lootResult.loot.forEach(item => {
                        const itemDrop = new ItemDrop(closestMob.x, closestMob.y, item);
                        entityManager.addItemDrop(itemDrop);
                    });
                }
                
                // Обновление квеста "Убей мобов"
                updateQuestProgress(0, 0, (questLog[0]?.goals[0]?.current || 0) + 1, 5);
                
                showNotification(`${closestMob.name} повержен!`, 'achievement');
            }
        }
    } else {
        showNotification('Нет цели в радиусе атаки!', 'damage');
    }
}

// Плавающий текст урона
function showFloatingText(text, x, y) {
    // Визуальный эффект будет добавлен в renderer
    console.log(`Урон: ${text} по координатам ${x}, ${y}`);
}

// Получение урона игроком
function takeDamage(amount, source = null) {
    if (!localPlayer || isDead) return;
    
    localPlayer.hp -= amount;
    if (localPlayer.hp <= 0) {
        localPlayer.hp = 0;
        die(source);
    }
    
    // Визуальный эффект
    const damageOverlay = document.getElementById('damageOverlay');
    if (damageOverlay) {
        damageOverlay.classList.remove('hidden');
        setTimeout(() => {
            damageOverlay.classList.add('hidden');
        }, 300);
    }
    
    showNotification(`-${amount} HP`, 'damage');
    
    // Отправка на сервер
    network.socket.emit('damage_taken', {
        amount: amount,
        source: source ? source.id : null
    });
}

// Смерть игрока
function die(killer = null) {
    isDead = true;
    respawnTimer = RESPAWN_TIME;
    
    const deathScreen = document.getElementById('deathScreen');
    if (deathScreen) {
        deathScreen.classList.remove('hidden');
    }
    
    showNotification('ВЫ ПОГИБЛИ!', 'damage');
    
    // Таймер респауна
    const respawnInterval = setInterval(() => {
        respawnTimer--;
        const timerEl = document.getElementById('respawnTimer');
        if (timerEl) {
            timerEl.textContent = respawnTimer;
        }
        
        if (respawnTimer <= 0) {
            clearInterval(respawnInterval);
            respawn();
        }
    }, 1000);
}

// Респаун игрока
function respawn() {
    isDead = false;
    respawnTimer = 0;
    
    // Телепортация на случайную безопасную позицию
    const spawnX = Math.floor(Math.random() * (MAP_WIDTH - 4)) + 2;
    const spawnY = Math.floor(Math.random() * (MAP_HEIGHT - 4)) + 2;
    
    localPlayer.x = spawnX;
    localPlayer.y = spawnY;
    localPlayer.targetX = spawnX;
    localPlayer.targetY = spawnY;
    localPlayer.hp = localPlayer.maxHp;
    
    const deathScreen = document.getElementById('deathScreen');
    if (deathScreen) {
        deathScreen.classList.add('hidden');
    }
    
    showNotification('Вы возродились!', 'achievement');
    
    // Отправка на сервер
    network.move(spawnX, spawnY, localPlayer.direction, 'idle', 0);
}

// Взаимодействие с NPC
function interactWithNPC() {
    if (!localPlayer || isDead) return;
    
    // Поиск ближайшего NPC
    const interactRange = 2;
    const nearbyNPCs = entityManager.getNearbyEntities(localPlayer.x, localPlayer.y, interactRange)
        .filter(e => e.type === 'npc' && !e.dead);
    
    if (nearbyNPCs.length > 0) {
        const npc = nearbyNPCs[0];
        const result = npc.interact(localPlayer);
        
        if (result && result.success) {
            startDialogue(result.npcName, result.dialogue);
        }
    } else {
        showNotification('Нет NPC рядом для взаимодействия', 'damage');
    }
}

// Подбор предметов
function pickupItems() {
    if (!localPlayer || isDead) return;
    
    const pickupRange = 1.5;
    const nearbyItems = entityManager.getNearbyEntities(localPlayer.x, localPlayer.y, pickupRange)
        .filter(e => e.type === 'item');
    
    nearbyItems.forEach(itemDrop => {
        const result = itemDrop.pickup(localPlayer);
        if (result && result.success) {
            inventory.addItem(result.item, result.count);
            entityManager.removeEntity(itemDrop.id);
            showNotification(`Подобрано: ${result.item.name} x${result.count}`, 'achievement');
        }
    });
}

// Переключение слота горячей панели
function selectHotbarSlot(slotIndex) {
    if (slotIndex >= 0 && slotIndex < 5) {
        selectedHotbarSlot = slotIndex;
        renderInventory();
    }
}

// Использование предмета из горячей панели
function useHotbarItem() {
    const slotIndex = hotbarSlots[selectedHotbarSlot];
    useItemFromSlot(slotIndex);
}

// Инициализация тестовых сущностей
function initTestEntities() {
    // Добавление NPC
    const npc = new NPC(10, 10, 'Старейшина', [
        { text: 'Приветствую тебя, путник! Наши земли нуждаются в защите.', options: [
            { text: 'Чем я могу помочь?', next: 1 },
            { text: 'До свидания', callback: () => {} }
        ]},
        { text: 'Убей 5 слизней к востоку от деревни, и я награжу тебя.', options: [
            { text: 'Я согласен!', callback: () => {
                addQuest('Охота на слизней', 'Убейте 5 слизней', [
                    { description: 'Слизней убито', current: 0, required: 5 }
                ]);
            }},
            { text: 'Мне нужно подумать', next: 0 }
        ]}
    ]);
    
    // Патрульные точки для NPC
    npc.addPatrolPoint(10, 10);
    npc.addPatrolPoint(12, 10);
    npc.addPatrolPoint(12, 12);
    npc.addPatrolPoint(10, 12);
    
    entityManager.addNPC(npc);
    
    // Добавление мобов
    for (let i = 0; i < 5; i++) {
        const mob = new Mob(20 + i * 2, 15 + i, 'Слизень', 1);
        entityManager.addMob(mob);
    }
}

// Обработка клавиш для Этапа 5
function handleGameExtraKeys(key) {
    if (isDead) return;
    
    switch (key) {
        case 'i':
        case 'I':
        case 'к':
        case 'К':
            toggleInventory();
            break;
        case 'q':
        case 'Q':
        case 'й':
        case 'Й':
            toggleQuestLog();
            break;
        case 'e':
        case 'E':
        case 'у':
        case 'У':
            interactWithNPC();
            break;
        case 'f':
        case 'F':
        case 'а':
        case 'А':
            pickupItems();
            break;
        case '1':
            selectHotbarSlot(0);
            break;
        case '2':
            selectHotbarSlot(1);
            break;
        case '3':
            selectHotbarSlot(2);
            break;
        case '4':
            selectHotbarSlot(3);
            break;
        case '5':
            selectHotbarSlot(4);
            break;
    }
}

function toggleInventory() {
    const container = document.getElementById('inventoryContainer');
    if (container) {
        container.classList.toggle('hidden');
    }
}

function toggleQuestLog() {
    const container = document.getElementById('questLogContainer');
    if (container) {
        container.classList.toggle('hidden');
    }
}

// Обновление игровых систем
function updateGameExtra(deltaTime) {
    if (isDead) return;
    
    // Обновление кулдауна атаки
    if (attackCooldown > 0) {
        attackCooldown -= deltaTime;
        if (attackCooldown < 0) attackCooldown = 0;
    }
    
    // Обновление сущностей
    entityManager.update(deltaTime, localPlayer);
    
    // Обновление частиц
    if (typeof particleSystem !== 'undefined') {
        particleSystem.update(deltaTime);
    }
    
    // Автоматический подбор предметов поблизости
    pickupItems();
}

// Атака цели
function attackTarget(target) {
    if (!localPlayer || isDead || attackCooldown > 0) return false;
    
    const dist = ((localPlayer.x - target.x)**2 + (localPlayer.y - target.y)**2)**0.5;
    if (dist > 3.0) return false;
    
    const damage = 10;
    network.attack(target.id, damage);
    attackCooldown = ATTACK_COOLDOWN_TIME;
    
    // Звуковой эффект и частицы
    if (typeof audioSystem !== 'undefined') {
        audioSystem.playAttack();
    }
    if (typeof particleSystem !== 'undefined') {
        particleSystem.spawnHitEffect(target.x, target.y, '#ff4444');
    }
    
    showNotification(`Атака! Урон: ${damage}`, 'damage');
    return true;
}

// Глобальные обработчики событий
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeDialogue();
        const invContainer = document.getElementById('inventoryContainer');
        const questContainer = document.getElementById('questLogContainer');
        if (invContainer) invContainer.classList.add('hidden');
        if (questContainer) questContainer.classList.add('hidden');
    }
    
    handleGameExtraKeys(e.key);
});

// Обработка клика правой кнопкой мыши для атаки
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (isJoined && !isDead) {
        attackTarget();
    }
});

// Закрытие диалога
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('closeDialogue');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeDialogue);
    }
});

console.log('Game Extra (Этап 5) загружен: инвентарь, квесты, диалоги, бой, смерть/респаун');
