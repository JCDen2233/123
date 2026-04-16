class InputHandler {
    constructor() {
        this.keys = {};
        this.touchKeys = {};
        this.moveVector = { x: 0, y: 0 };
        this.isMobile = false;
        this.detectMobile();
        this.setupKeyboard();
        this.setupTouch();
        this.setupMouse();
    }
    
    detectMobile() {
        this.isMobile = ("ontouchstart" in window) ||
                        (navigator.maxTouchPoints > 0) ||
                        window.innerWidth <= 768;
    }

    setupKeyboard() {
        window.addEventListener("keydown", (e) => {
            this.keys[e.code] = true;
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener("keyup", (e) => {
            this.keys[e.code] = false;
        });
    }

    setupTouch() {
        const buttons = [
            { id: "btnUp",    dir: "up" },
            { id: "btnDown",  dir: "down" },
            { id: "btnLeft",  dir: "left" },
            { id: "btnRight", dir: "right" },
        ];

        buttons.forEach(({ id, dir }) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            const activate = (e) => {
                e.preventDefault();
                this.touchKeys[dir] = true;
            };
            const deactivate = (e) => {
                e.preventDefault();
                this.touchKeys[dir] = false;
            };

            btn.addEventListener("touchstart", activate, { passive: false });
            btn.addEventListener("touchend", deactivate, { passive: false });
            btn.addEventListener("touchcancel", deactivate, { passive: false });
            btn.addEventListener("mousedown", activate);
            btn.addEventListener("mouseup", deactivate);
            btn.addEventListener("mouseleave", deactivate);
        });
    }
    
    setupMouse() {
        // Обработка клика мыши для атаки
        window.addEventListener("mousedown", (e) => {
            if (e.button === 0 && typeof attackTarget !== 'undefined') { // ЛКМ
                const target = getNearestEnemy();
                if (target) {
                    attackTarget(target);
                }
            }
        });
    }

    getMoveVector() {
        let x = 0;
        let y = 0;

        if (this.keys["ArrowUp"] || this.keys["KeyW"] || this.touchKeys["up"])    y -= 1;
        if (this.keys["ArrowDown"] || this.keys["KeyS"] || this.touchKeys["down"])  y += 1;
        if (this.keys["ArrowLeft"] || this.keys["KeyA"] || this.touchKeys["left"])  x -= 1;
        if (this.keys["ArrowRight"] || this.keys["KeyD"] || this.touchKeys["right"]) x += 1;

        if (x !== 0 && y !== 0) {
            x *= 0.707;
            y *= 0.707;
        }

        return { x, y };
    }

    isAnyInputActive() {
        const v = this.getMoveVector();
        return v.x !== 0 || v.y !== 0;
    }
}
