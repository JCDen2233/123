class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.lerpFactor = 0.08;
        this.sensitivity = 5;
    }
    
    setSensitivity(value) {
        this.sensitivity = value;
        // Преобразование чувствительности в коэффициент плавности (1-10 -> 0.02-0.15)
        this.lerpFactor = 0.02 + (value - 1) * (0.13 / 9);
    }
    
    getLerpFactor() {
        return this.lerpFactor;
    }

    follow(entity, deltaTime) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const screenPos = gridToScreen(entity.x, entity.y, 0, 0);

        this.targetX = -(screenPos.x - w / 2);
        this.targetY = -(screenPos.y - h / 3);

        const speed = this.lerpFactor * Math.min(deltaTime * 60, 2);
        this.x += (this.targetX - this.x) * speed;
        this.y += (this.targetY - this.y) * speed;
    }

    getOffset() {
        return { x: this.x, y: this.y };
    }

    clampToMap() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const topLeft = gridToScreen(0, 0, 0, 0);
        const bottomRight = gridToScreen(MAP_WIDTH - 1, MAP_HEIGHT - 1, 0, 0);

        const minX = -(bottomRight.x - w / 2);
        const maxX = -(topLeft.x - w / 2);
        const minY = -(bottomRight.y - h / 3);
        const maxY = -(topLeft.y - h / 3);

        this.x = Math.max(minX, Math.min(maxX, this.x));
        this.y = Math.max(minY, Math.min(maxY, this.y));
    }

    reset(x, y) {
        const screenPos = gridToScreen(x, y, 0, 0);
        this.x = -(screenPos.x - window.innerWidth / 2);
        this.y = -(screenPos.y - window.innerHeight / 3);
        this.targetX = this.x;
        this.targetY = this.y;
    }
}
