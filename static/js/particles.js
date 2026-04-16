// Система частиц для эффектов
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;
    }

    // Создание частицы
    createParticle(x, y, type, options = {}) {
        if (this.particles.length >= this.maxParticles) {
            // Удаляем старые частицы
            this.particles.shift();
        }

        const particle = {
            x: x,
            y: y,
            type: type,
            vx: options.vx || (Math.random() - 0.5) * 2,
            vy: options.vy || (Math.random() - 0.5) * 2,
            life: options.life || 1.0,
            maxLife: options.life || 1.0,
            size: options.size || 4,
            color: options.color || '#ffffff',
            gravity: options.gravity || 0,
            fade: options.fade !== undefined ? options.fade : true,
            rotation: options.rotation || 0,
            rotationSpeed: options.rotationSpeed || 0
        };

        this.particles.push(particle);
        return particle;
    }

    // Эффекты
    spawnWalkDust(x, y) {
        for (let i = 0; i < 3; i++) {
            this.createParticle(x, y, 'dust', {
                vy: -0.5 - Math.random() * 0.5,
                vx: (Math.random() - 0.5) * 1,
                life: 0.5,
                size: 2 + Math.random() * 2,
                color: '#8b7355',
                gravity: 0.02
            });
        }
    }

    spawnHitEffect(x, y, color = '#ff4444') {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            this.createParticle(x, y, 'spark', {
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                life: 0.4,
                size: 3,
                color: color,
                gravity: 0.05
            });
        }
    }

    spawnPickupEffect(x, y) {
        for (let i = 0; i < 5; i++) {
            this.createParticle(x, y, 'sparkle', {
                vx: (Math.random() - 0.5) * 3,
                vy: -1 - Math.random() * 2,
                life: 0.6,
                size: 2 + Math.random() * 2,
                color: '#ffd700',
                gravity: 0.03
            });
        }
    }

    spawnDeathEffect(x, y, color = '#ff0000') {
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            this.createParticle(x, y, 'blood', {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.8,
                size: 3 + Math.random() * 3,
                color: color,
                gravity: 0.08
            });
        }
    }

    spawnLevelUp(x, y) {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.createParticle(x, y, 'star', {
                vx: Math.cos(angle) * 1.5,
                vy: Math.sin(angle) * 1.5,
                life: 1.0,
                size: 4,
                color: '#ffd700',
                rotationSpeed: (Math.random() - 0.5) * 0.2
            });
        }
    }

    // Обновление частиц
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.life -= deltaTime;
            p.rotation += p.rotationSpeed;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    // Отрисовка частиц
    render(ctx, cameraOffset) {
        for (const p of this.particles) {
            const screenPos = gridToScreen(p.x, p.y, cameraOffset.x, cameraOffset.y);
            const alpha = p.fade ? (p.life / p.maxLife) : 1;
            
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(screenPos.x, screenPos.y);
            ctx.rotate(p.rotation);

            switch (p.type) {
                case 'dust':
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case 'spark':
                case 'sparkle':
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    for (let i = 0; i < 4; i++) {
                        const angle = (Math.PI / 2) * i;
                        const r = p.size;
                        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
                    }
                    ctx.closePath();
                    ctx.fill();
                    break;
                    
                case 'blood':
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case 'star':
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                        const r = p.size;
                        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
                        const innerAngle = angle + Math.PI / 5;
                        const innerR = p.size * 0.5;
                        ctx.lineTo(Math.cos(innerAngle) * innerR, Math.sin(innerAngle) * innerR);
                    }
                    ctx.closePath();
                    ctx.fill();
                    break;
            }

            ctx.restore();
        }
    }

    // Очистка всех частиц
    clear() {
        this.particles = [];
    }

    // Получение количества активных частиц
    getParticleCount() {
        return this.particles.length;
    }
}

// Глобальный экземпляр
const particleSystem = new ParticleSystem();
