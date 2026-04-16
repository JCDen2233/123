// Оптимизированный рендерер с culling и кэшированием
class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.dpr = window.devicePixelRatio || 1;
        this.isMobile = false;
        this.detectMobile();
        
        // Кэш спрайтов для оптимизации
        this.spriteCache = new Map();
        this.visibleTiles = [];
    }

    detectMobile() {
        this.isMobile = ("ontouchstart" in window) ||
                        (navigator.maxTouchPoints > 0) ||
                        window.innerWidth <= 768;
    }

    resize() {
        this.dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * this.dpr;
        this.canvas.height = window.innerHeight * this.dpr;
        this.canvas.style.width = window.innerWidth + "px";
        this.canvas.style.height = window.innerHeight + "px";
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.detectMobile();
    }

    clear() {
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
    
    // Отрисовка неба с учётом времени суток
    drawSky(timeManager) {
        if (!timeManager) return;
        
        const ctx = this.ctx;
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Градиент неба
        const gradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
        const skyColor = timeManager.skyColor;
        gradient.addColorStop(0, `rgb(${skyColor.r}, ${skyColor.g}, ${skyColor.b})`);
        gradient.addColorStop(1, `rgb(${Math.round(skyColor.r * 0.8)}, ${Math.round(skyColor.g * 0.8)}, ${Math.round(skyColor.b * 0.8)})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height * 0.6);
        
        // Отрисовка звёзд (только ночью)
        if (timeManager.phase === 'night' || timeManager.phase === 'midnight') {
            this.drawStars(ctx, width, height, timeManager);
        }
        
        // Отрисовка солнца или луны
        this.drawCelestialBody(ctx, width, height, timeManager);
    }
    
    drawStars(ctx, width, height, timeManager) {
        const stars = timeManager.stars;
        const time = performance.now() / 1000;
        
        ctx.fillStyle = '#ffffff';
        for (const star of stars) {
            // Мерцание звёзд
            const twinkle = 0.5 + 0.5 * Math.sin(time * 3 + star.twinkleOffset);
            const alpha = star.brightness * twinkle * 0.8;
            
            ctx.globalAlpha = alpha;
            const x = star.x * width;
            const y = star.y * height * 0.5;
            
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }
    
    drawCelestialBody(ctx, width, height, timeManager) {
        const angle = timeManager.celestialAngle;
        const centerX = width / 2;
        const centerY = height * 0.4;
        const radius = Math.min(width, height) * 0.08;
        
        // Позиция небесного тела
        const bodyX = centerX + Math.cos(angle) * (width * 0.35);
        const bodyY = centerY - Math.sin(angle) * (height * 0.3);
        
        // Определение: солнце или луна
        const isDay = timeManager.lightLevel > 0.5;
        
        if (isDay) {
            // Солнце
            const sunGradient = ctx.createRadialGradient(bodyX, bodyY, 0, bodyX, bodyY, radius * 2);
            sunGradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
            sunGradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.8)');
            sunGradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
            
            ctx.fillStyle = sunGradient;
            ctx.beginPath();
            ctx.arc(bodyX, bodyY, radius * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Ядро солнца
            ctx.fillStyle = '#ffffaa';
            ctx.beginPath();
            ctx.arc(bodyX, bodyY, radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Луна
            const moonGradient = ctx.createRadialGradient(bodyX, bodyY, 0, bodyX, bodyY, radius);
            moonGradient.addColorStop(0, 'rgba(220, 220, 255, 1)');
            moonGradient.addColorStop(0.7, 'rgba(200, 200, 230, 0.9)');
            moonGradient.addColorStop(1, 'rgba(180, 180, 210, 0)');
            
            ctx.fillStyle = moonGradient;
            ctx.beginPath();
            ctx.arc(bodyX, bodyY, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Кратеры на луне
            ctx.fillStyle = 'rgba(200, 200, 220, 0.3)';
            ctx.beginPath();
            ctx.arc(bodyX - radius * 0.3, bodyY - radius * 0.2, radius * 0.15, 0, Math.PI * 2);
            ctx.arc(bodyX + radius * 0.2, bodyY + radius * 0.3, radius * 0.1, 0, Math.PI * 2);
            ctx.arc(bodyX - radius * 0.1, bodyY + radius * 0.4, radius * 0.08, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    getTileDepth() {
        return this.isMobile ? 4 : 6;
    }

    drawTile(x, y, tileType, cameraOffset, elevation = 0) {
        const pos = gridToScreen(x, y, cameraOffset.x, cameraOffset.y);
        const colors = TILE_COLORS[tileType] || TILE_COLORS[TILE_GRASS];
        const isWater = tileType === TILE_WATER;
        
        // Применение коррекции цвета на основе высоты
        const adjustedColors = {
            top: getElevationColor(colors.top, elevation, isWater),
            left: getElevationColor(colors.left, elevation, isWater),
            right: getElevationColor(colors.right, elevation, isWater)
        };
        
        const halfW = TILE_W / 2;
        const halfH = TILE_H / 2;
        const depth = this.getTileDepth();
        const ctx = this.ctx;

        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - halfH);
        ctx.lineTo(pos.x + halfW, pos.y);
        ctx.lineTo(pos.x, pos.y + halfH);
        ctx.lineTo(pos.x - halfW, pos.y);
        ctx.closePath();
        ctx.fillStyle = adjustedColors.top;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pos.x - halfW, pos.y);
        ctx.lineTo(pos.x, pos.y + halfH);
        ctx.lineTo(pos.x, pos.y + halfH + depth);
        ctx.lineTo(pos.x - halfW, pos.y + depth);
        ctx.closePath();
        ctx.fillStyle = adjustedColors.left;
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pos.x + halfW, pos.y);
        ctx.lineTo(pos.x, pos.y + halfH);
        ctx.lineTo(pos.x, pos.y + halfH + depth);
        ctx.lineTo(pos.x + halfW, pos.y + depth);
        ctx.closePath();
        ctx.fillStyle = adjustedColors.right;
        ctx.fill();
        ctx.stroke();
    }

    drawPlayer(player, cameraOffset) {
        const pos = gridToScreen(player.x, player.y, cameraOffset.x, cameraOffset.y);
        const ctx = this.ctx;

        const bodyHeight = 18;
        const bodyWidth = 12;
        const headSize = 8;
        const bobOffset = player.isMoving ? Math.sin(player.frame * Math.PI / 2) * 2 : 0;
        const baseY = pos.y - bodyHeight - headSize / 2 + bobOffset;

        ctx.save();

        const shadowAlpha = 0.3;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + 2, bodyWidth, 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pos.x, baseY, headSize, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pos.x, baseY + bodyHeight * 0.6, bodyWidth, 0, Math.PI * 2);
        ctx.fillStyle = this.darkenColor(player.color, 0.3);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.stroke();

        const eyeOffsets = this.getEyeOffsets(player.direction);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(pos.x + eyeOffsets.leftX, baseY + eyeOffsets.y, 2, 0, Math.PI * 2);
        ctx.arc(pos.x + eyeOffsets.rightX, baseY + eyeOffsets.y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(pos.x + eyeOffsets.leftX + eyeOffsets.pupilDx, baseY + eyeOffsets.y + eyeOffsets.pupilDy, 1, 0, Math.PI * 2);
        ctx.arc(pos.x + eyeOffsets.rightX + eyeOffsets.pupilDx, baseY + eyeOffsets.y + eyeOffsets.pupilDy, 1, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        ctx.font = "10px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 3;
        ctx.fillText(player.nickname, pos.x, baseY - headSize - 6);
        ctx.shadowBlur = 0;
    }

    getEyeOffsets(direction) {
        switch (direction) {
            case 0: return { leftX: -3, rightX: 3, y: 1, pupilDx: 0, pupilDy: 1 };
            case 1: return { leftX: -4, rightX: 0, y: 1, pupilDx: -1, pupilDy: 0 };
            case 2: return { leftX: 0, rightX: 4, y: 1, pupilDx: 1, pupilDy: 0 };
            case 3: return { leftX: -3, rightX: 3, y: 0, pupilDx: 0, pupilDy: -1 };
            default: return { leftX: -3, rightX: 3, y: 1, pupilDx: 0, pupilDy: 0 };
        }
    }

    darkenColor(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.max(0, (num >> 16) - Math.floor(255 * amount));
        const g = Math.max(0, ((num >> 8) & 0xff) - Math.floor(255 * amount));
        const b = Math.max(0, (num & 0xff) - Math.floor(255 * amount));
        return `rgb(${r}, ${g}, ${b})`;
    }

    drawMap(cameraOffset, timeManager = null) {
        // Оптимизация: отрисовка только видимых тайлов (culling)
        const viewportWidth = window.innerWidth / this.dpr;
        const viewportHeight = window.innerHeight / this.dpr;
        
        // Вычисляем границы видимой области в координатах сетки
        const centerScreenX = viewportWidth / 2;
        const centerScreenY = viewportHeight / 2;
        
        // Преобразуем центр экрана в координаты сетки
        const centerGrid = screenToGrid(centerScreenX, centerScreenY, cameraOffset.x, cameraOffset.y);
        
        // Добавляем запас для видимой области
        const marginX = Math.ceil(viewportWidth / TILE_W) + 2;
        const marginY = Math.ceil(viewportHeight / TILE_H) + 2;
        
        const startX = Math.max(0, Math.floor(centerGrid.x - marginX));
        const endX = Math.min(MAP_WIDTH, Math.ceil(centerGrid.x + marginX));
        const startY = Math.max(0, Math.floor(centerGrid.y - marginY));
        const endY = Math.min(MAP_HEIGHT, Math.ceil(centerGrid.y + marginY));
        
        this.visibleTiles = [];
        
        // Применяем освещение от времени суток
        let lightMultiplier = 1.0;
        if (timeManager) {
            lightMultiplier = timeManager.lightLevel;
        }
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const elevation = heightMap[y] && heightMap[y][x] ? heightMap[y][x] : 0;
                
                // Если есть менеджер времени, применяем затемнение
                if (timeManager && lightMultiplier < 1.0) {
                    this.drawTileWithLight(x, y, mapData[y][x], cameraOffset, elevation, lightMultiplier);
                } else {
                    this.drawTile(x, y, mapData[y][x], cameraOffset, elevation);
                }
                
                this.visibleTiles.push({x, y});
            }
        }
    }
    
    // Отрисовка тайла с применением освещения
    drawTileWithLight(x, y, tileType, cameraOffset, elevation, lightLevel) {
        const pos = gridToScreen(x, y, cameraOffset.x, cameraOffset.y);
        const colors = TILE_COLORS[tileType] || TILE_COLORS[TILE_GRASS];
        const isWater = tileType === TILE_WATER;
        
        // Применение коррекции цвета на основе высоты
        const adjustedColors = {
            top: getElevationColor(colors.top, elevation, isWater),
            left: getElevationColor(colors.left, elevation, isWater),
            right: getElevationColor(colors.right, elevation, isWater)
        };
        
        // Применяем уровень освещения к цветам
        const litColors = {
            top: this.applyLightToColor(adjustedColors.top, lightLevel),
            left: this.applyLightToColor(adjustedColors.left, lightLevel * 0.85),
            right: this.applyLightToColor(adjustedColors.right, lightLevel * 0.9)
        };
        
        const halfW = TILE_W / 2;
        const halfH = TILE_H / 2;
        const depth = this.getTileDepth();
        const ctx = this.ctx;

        // Верхняя грань
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - halfH);
        ctx.lineTo(pos.x + halfW, pos.y);
        ctx.lineTo(pos.x, pos.y + halfH);
        ctx.lineTo(pos.x - halfW, pos.y);
        ctx.closePath();
        ctx.fillStyle = litColors.top;
        ctx.fill();
        ctx.strokeStyle = `rgba(0,0,0,${0.15 * lightLevel})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Левая грань
        ctx.beginPath();
        ctx.moveTo(pos.x - halfW, pos.y);
        ctx.lineTo(pos.x, pos.y + halfH);
        ctx.lineTo(pos.x, pos.y + halfH + depth);
        ctx.lineTo(pos.x - halfW, pos.y + depth);
        ctx.closePath();
        ctx.fillStyle = litColors.left;
        ctx.fill();
        ctx.stroke();

        // Правая грань
        ctx.beginPath();
        ctx.moveTo(pos.x + halfW, pos.y);
        ctx.lineTo(pos.x, pos.y + halfH);
        ctx.lineTo(pos.x, pos.y + halfH + depth);
        ctx.lineTo(pos.x + halfW, pos.y + depth);
        ctx.closePath();
        ctx.fillStyle = litColors.right;
        ctx.fill();
        ctx.stroke();
    }
    
    // Применение освещения к цвету (hex или rgb)
    applyLightToColor(color, lightLevel) {
        // Парсинг цвета
        let r, g, b;
        
        if (color.startsWith('#')) {
            const num = parseInt(color.slice(1), 16);
            r = (num >> 16) & 0xff;
            g = (num >> 8) & 0xff;
            b = num & 0xff;
        } else if (color.startsWith('rgb')) {
            const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                r = parseInt(match[1]);
                g = parseInt(match[2]);
                b = parseInt(match[3]);
            } else {
                return color;
            }
        } else {
            return color;
        }
        
        // Применяем освещение (минимум 15% даже в полной темноте)
        const minLight = 0.15;
        const factor = minLight + (1 - minLight) * lightLevel;
        
        r = Math.round(r * factor);
        g = Math.round(g * factor);
        b = Math.round(b * factor);
        
        return `rgb(${r}, ${g}, ${b})`;
    }

    drawAllEntities(entities, cameraOffset) {
        // Оптимизация: отрисовка только видимых сущностей
        const viewportWidth = window.innerWidth / this.dpr;
        const viewportHeight = window.innerHeight / this.dpr;
        
        const sorted = [...entities].sort((a, b) => {
            return (a.x + a.y) - (b.x + b.y);
        });

        for (const entity of sorted) {
            // Проверка видимости сущности
            const screenPos = gridToScreen(entity.x, entity.y, cameraOffset.x, cameraOffset.y);
            if (screenPos.x >= -50 && screenPos.x <= viewportWidth + 50 &&
                screenPos.y >= -50 && screenPos.y <= viewportHeight + 50) {
                this.drawPlayer(entity, cameraOffset);
            }
        }
    }
    
    // Получение количества отрисованных тайлов (для отладки)
    getVisibleTileCount() {
        return this.visibleTiles.length;
    }
}
