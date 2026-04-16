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

    drawMap(cameraOffset) {
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
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const elevation = heightMap[y] && heightMap[y][x] ? heightMap[y][x] : 0;
                this.drawTile(x, y, mapData[y][x], cameraOffset, elevation);
                this.visibleTiles.push({x, y});
            }
        }
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
