/**
 * HUD Manager - Управление интерфейсом пользователя
 * Реализует: HP bar, координаты, никнеймы, мини-карту
 */

class HUDManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Элементы HUD
        this.hpBar = {
            x: 10,
            y: 10,
            width: 200,
            height: 20,
            current: 100,
            max: 100
        };
        
        this.coords = {
            x: canvas.width - 150,
            y: 10,
            text: 'X: 0, Y: 0'
        };
        
        this.minimap = {
            x: canvas.width - 160,
            y: canvas.height - 160,
            size: 150,
            scale: 0.1,
            visible: true
        };
        
        this.showNicknames = true;
        this.showMinimap = true;
        this.showHP = true;
    }
    
    /**
     * Отрисовка всего HUD
     */
    render(localPlayer, remotePlayers, camera) {
        const ctx = this.ctx;
        
        // Сохраняем контекст
        ctx.save();
        ctx.resetTransform();
        
        // Отрисовка полоски здоровья
        if (this.showHP && localPlayer) {
            this.drawHPBar(ctx, localPlayer);
        }
        
        // Отрисовка координат
        this.drawCoords(ctx, localPlayer);
        
        // Отрисовка никнеймов над игроками
        if (this.showNicknames) {
            this.drawNicknames(ctx, localPlayer, remotePlayers, camera);
        }
        
        // Отрисовка мини-карты
        if (this.showMinimap) {
            this.drawMinimap(ctx, localPlayer, remotePlayers);
        }
        
        // Восстанавливаем контекст
        ctx.restore();
    }
    
    /**
     * Отрисовка индикатора времени суток
     */
    drawTimeIndicator(ctx, timeManager) {
        if (!timeManager) return;
        
        const x = this.canvas.width - 160;
        const y = 45;
        
        // Фон
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, 150, 50);
        
        // Время
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(timeManager.getFormattedTime(), x + 75, y + 20);
        
        // Фаза
        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(timeManager.getPhaseName(), x + 75, y + 38);
        
        // Индикатор освещения
        const barWidth = 100;
        const barHeight = 6;
        const barX = x + 25;
        const barY = y + 45;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Градиент от тёмного к светлому
        const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#f4a460');
        gradient.addColorStop(1, '#87ceeb');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Текущий уровень
        const currentWidth = barWidth * timeManager.lightLevel;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(barX, barY, currentWidth, barHeight);
        
        // Рамка
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
    
    /**
     * Отрисовка полоски здоровья
     */
    drawHPBar(ctx, player) {
        const x = this.hpBar.x;
        const y = this.hpBar.y;
        const width = this.hpBar.width;
        const height = this.hpBar.height;
        
        // Фон полоски
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, width, height);
        
        // Градиент для HP
        const hpPercent = player.hp / player.maxHp;
        let gradient = ctx.createLinearGradient(x, y, x + width, y);
        
        if (hpPercent > 0.6) {
            gradient.addColorStop(0, '#00ff00');
            gradient.addColorStop(1, '#00cc00');
        } else if (hpPercent > 0.3) {
            gradient.addColorStop(0, '#ffff00');
            gradient.addColorStop(1, '#ffcc00');
        } else {
            gradient.addColorStop(0, '#ff0000');
            gradient.addColorStop(1, '#cc0000');
        }
        
        // Текущее HP
        const currentWidth = width * hpPercent;
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 2, y + 2, currentWidth - 4, height - 4);
        
        // Рамка
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
        
        // Текст HP
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(player.hp)}/${player.maxHp}`, x + width / 2, y + height / 2 + 4);
    }
    
    /**
     * Отрисовка координат
     */
    drawCoords(ctx, player) {
        const x = this.canvas.width - 160;
        const y = 10;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, 150, 30);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`X: ${player.getGridX()}, Y: ${player.getGridY()}`, x + 8, y + 20);
    }
    
    /**
     * Отрисовка никнеймов над игроками
     */
    drawNicknames(ctx, localPlayer, remotePlayers, camera) {
        const offset = camera.getOffset();
        const allPlayers = [localPlayer, ...Array.from(remotePlayers.values())];
        
        allPlayers.forEach(player => {
            if (!player) return;
            
            // Преобразование координат сетки в экранные
            const screenPos = gridToScreen(player.x, player.y);
            const screenX = screenPos.x + offset.x;
            const screenY = screenPos.y + offset.y - 40; // Над игроком
            
            // Проверка видимости
            if (screenX < -50 || screenX > this.canvas.width + 50 ||
                screenY < -50 || screenY > this.canvas.height + 50) {
                return;
            }
            
            // Фон для ника
            const nickname = player.nickname || 'Player';
            ctx.font = 'bold 11px "Courier New", monospace';
            const textWidth = ctx.measureText(nickname).width;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(screenX - textWidth / 2 - 4, screenY - 14, textWidth + 8, 18);
            
            // Текст ника
            ctx.fillStyle = player.color || '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(nickname, screenX, screenY);
        });
    }
    
    /**
     * Отрисовка мини-карты
     */
    drawMinimap(ctx, localPlayer, remotePlayers) {
        if (!this.minimap.visible) return;
        
        const x = this.minimap.x;
        const y = this.minimap.y;
        const size = this.minimap.size;
        const scale = this.minimap.scale;
        
        // Фон мини-карты
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x - 5, y - 5, size + 10, size + 10);
        
        // Рамка
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 5, y - 5, size + 10, size + 10);
        
        // Обрезка по области мини-карты
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, size, size);
        ctx.clip();
        
        // Отрисовка тайлов карты (упрощённо)
        for (let gy = 0; gy < MAP_HEIGHT; gy++) {
            for (let gx = 0; gx < MAP_WIDTH; gx++) {
                const tileType = map[gy][gx];
                const tileHeight = heightMap[gy][gx];
                
                // Цвет тайла в зависимости от типа и высоты
                let color;
                if (tileType === TILE_WATER) {
                    const depthFactor = 1 - (tileHeight / MAX_HEIGHT);
                    color = `rgba(30, 100, ${180 + depthFactor * 50}, 0.8)`;
                } else if (tileType === TILE_WALL) {
                    color = '#666666';
                } else if (tileType === TILE_TREE) {
                    color = '#228B22';
                } else {
                    // Земля с учётом высоты
                    const shade = 100 + (tileHeight / MAX_HEIGHT) * 50;
                    color = `rgb(${shade}, ${shade + 50}, ${shade})`;
                }
                
                ctx.fillStyle = color;
                ctx.fillRect(
                    x + gx * size / MAP_WIDTH,
                    y + gy * size / MAP_HEIGHT,
                    size / MAP_WIDTH + 1,
                    size / MAP_HEIGHT + 1
                );
            }
        }
        
        // Отрисовка игроков на мини-карте
        const allPlayers = [localPlayer, ...Array.from(remotePlayers.values())];
        
        allPlayers.forEach(player => {
            if (!player) return;
            
            const px = x + player.x * size / MAP_WIDTH;
            const py = y + player.y * size / MAP_HEIGHT;
            
            ctx.fillStyle = player.id === localPlayer.id ? '#00ff00' : '#ff4444';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Индикатор направления для локального игрока
            if (player.id === localPlayer.id) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                const dirLength = 6;
                const dirAngle = (player.direction - 1) * Math.PI / 2;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(
                    px + Math.cos(dirAngle) * dirLength,
                    py + Math.sin(dirAngle) * dirLength
                );
                ctx.stroke();
            }
        });
        
        // Прямоугольник камеры
        const camOffset = camera.getOffset();
        const camWidth = this.canvas.width / IsoMath.TILE_W * 2;
        const camHeight = this.canvas.height / IsoMath.TILE_H * 2;
        
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            x + (-camOffset.x / IsoMath.TILE_W) * size / MAP_WIDTH,
            y + (-camOffset.y / IsoMath.TILE_H) * size / MAP_HEIGHT,
            camWidth * size / MAP_WIDTH,
            camHeight * size / MAP_HEIGHT
        );
        
        ctx.restore();
    }
    
    /**
     * Обновление размеров при resize окна
     */
    resize(newWidth, newHeight) {
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        
        this.coords.x = newWidth - 150;
        this.minimap.x = newWidth - 160;
        this.minimap.y = newHeight - 160;
    }
    
    /**
     * Переключение видимости элементов
     */
    toggleMinimap() {
        this.showMinimap = !this.showMinimap;
    }
    
    toggleNicknames() {
        this.showNicknames = !this.showNicknames;
    }
    
    toggleHP() {
        this.showHP = !this.showHP;
    }
}
