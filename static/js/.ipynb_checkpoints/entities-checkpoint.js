class Player {
    constructor(x, y, nickname, color) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.nickname = nickname;
        this.color = color;
        this.direction = 0;
        this.state = "idle";
        this.frame = 0;
        this.frameTimer = 0;
        this.moveSpeed = 3.0;
        this.isMoving = false;
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
        this.state = "walking";
        this.isMoving = true;
    }

    stopMoving() {
        this.state = "idle";
        this.isMoving = false;
        this.frame = 0;
    }

    update(deltaTime) {
        if (this.isMoving) {
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

    moveBy(dx, dy) {
        const newX = this.x + dx;
        const newY = this.y + dy;

        if (dx !== 0 || dy !== 0) {
            this.startMoving(dx, dy);
        }

        this.targetX = Math.max(0, Math.min(MAP_WIDTH - 1, newX));
        this.targetY = Math.max(0, Math.min(MAP_HEIGHT - 1, newY));
    }
}

const PASSABLE_TILES = new Set([TILE_GRASS, TILE_PATH, TILE_SAND]);

function isTilePassable(gx, gy) {
    const x = Math.round(gx);
    const y = Math.round(gy);

    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
        return false;
    }

    return PASSABLE_TILES.has(mapData[y][x]);
}

function canMoveTo(gx, gy) {
    const x = Math.round(gx);
    const y = Math.round(gy);
    return isTilePassable(x, y);
}
