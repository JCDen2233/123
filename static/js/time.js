// Система времени и цикла день/ночь
class TimeManager {
    constructor() {
        // Время в секундах (0-86400 = 24 часа)
        this.currentTime = 12 * 3600; // Начинаем с полудня (12:00)
        
        // Длительность игровых суток в реальных секундах (по умолчанию 60 секунд)
        this.dayDuration = 60;
        
        // Текущая фаза времени
        this.phase = 'day'; // dawn, day, dusk, night, midnight
        
        // Коэффициент освещения (0-1)
        this.lightLevel = 1.0;
        
        // Цвет неба (RGB компоненты 0-255)
        this.skyColor = { r: 135, g: 206, b: 235 };
        
        // Позиция солнца/луны (угол в радианах)
        this.celestialAngle = Math.PI / 2;
        
        // Звёзды (массив объектов {x, y, brightness})
        this.stars = [];
        this.generateStars();
        
        // События смены фаз
        this.phaseCallbacks = [];
    }
    
    generateStars() {
        // Генерируем 100 случайных звёзд
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random() * 0.5, // Только в верхней половине неба
                brightness: Math.random(),
                twinkleOffset: Math.random() * Math.PI * 2
            });
        }
    }
    
    update(deltaTime) {
        // Продвигаем время
        const secondsPerDay = this.dayDuration;
        const timeIncrement = (deltaTime / secondsPerDay) * 86400;
        
        this.currentTime += timeIncrement;
        
        // Зацикливаем сутки
        if (this.currentTime >= 86400) {
            this.currentTime -= 86400;
        }
        
        // Вычисляем угол небесного тела (солнце/луна)
        // 0 = восход (восток), PI/2 = зенит, PI = закат (запад), 3PI/2 = надир
        this.celestialAngle = (this.currentTime / 86400) * Math.PI * 2;
        
        // Определяем текущую фазу и параметры
        this.updatePhase();
    }
    
    updatePhase() {
        const hour = this.currentTime / 3600;
        
        // Определение фазы
        if (hour >= 5 && hour < 7) {
            this.phase = 'dawn';
        } else if (hour >= 7 && hour < 18) {
            this.phase = 'day';
        } else if (hour >= 18 && hour < 20) {
            this.phase = 'dusk';
        } else if (hour >= 20 && hour < 23) {
            this.phase = 'night';
        } else {
            this.phase = 'midnight';
        }
        
        // Вычисление уровня освещения (0.0 - 1.0)
        this.lightLevel = this.calculateLightLevel();
        
        // Вычисление цвета неба
        this.skyColor = this.calculateSkyColor();
    }
    
    calculateLightLevel() {
        const hour = this.currentTime / 3600;
        
        // Пик освещения в полдень (12:00)
        // Минимум в полночь (00:00)
        const normalizedTime = (hour - 12) / 12; // -1 в полночь, 0 в полдень, 1 в следующую полночь
        const angle = normalizedTime * Math.PI;
        
        // Базовое освещение от солнца/луны
        let sunLight = Math.cos(angle);
        sunLight = (sunLight + 1) / 2; // Нормализация к 0-1
        
        // Минимальное ночное освещение (звёзды, луна)
        const minLight = 0.15;
        
        // Интерполяция между минимальным и максимальным
        return minLight + (1 - minLight) * sunLight;
    }
    
    calculateSkyColor() {
        const hour = this.currentTime / 3600;
        
        // Дневное небо (голубое)
        const dayColor = { r: 135, g: 206, b: 235 };
        
        // Ночное небо (тёмно-синее/чёрное)
        const nightColor = { r: 10, g: 10, b: 30 };
        
        // Цвет рассвета/заката (оранжево-розовый)
        const dawnDuskColor = { r: 255, g: 140, b: 90 };
        
        // Определение коэффициента смешивания
        let t = 0;
        let useDawnDusk = false;
        
        if (hour >= 5 && hour < 7) {
            // Рассвет
            t = (hour - 5) / 2;
            useDawnDusk = true;
        } else if (hour >= 7 && hour < 17) {
            // День
            t = 1;
        } else if (hour >= 17 && hour < 20) {
            // Закат
            t = 1 - (hour - 17) / 3;
            useDawnDusk = true;
        } else {
            // Ночь
            t = 0;
        }
        
        if (useDawnDusk && hour >= 5 && hour < 7) {
            // Переход от ночи к рассвету к дню
            if (t < 0.5) {
                const localT = t * 2;
                return this.lerpColor(nightColor, dawnDuskColor, localT);
            } else {
                const localT = (t - 0.5) * 2;
                return this.lerpColor(dawnDuskColor, dayColor, localT);
            }
        } else if (useDawnDusk && hour >= 17 && hour < 20) {
            // Переход от дня к закату к ночи
            if (t > 0.5) {
                const localT = (t - 0.5) * 2;
                return this.lerpColor(dayColor, dawnDuskColor, 1 - localT);
            } else {
                const localT = t * 2;
                return this.lerpColor(dawnDuskColor, nightColor, 1 - localT);
            }
        } else if (t >= 1) {
            return { ...dayColor };
        } else {
            return { ...nightColor };
        }
    }
    
    lerpColor(color1, color2, t) {
        return {
            r: Math.round(color1.r + (color2.r - color1.r) * t),
            g: Math.round(color1.g + (color2.g - color1.g) * t),
            b: Math.round(color1.b + (color2.b - color1.b) * t)
        };
    }
    
    getFormattedTime() {
        const hours = Math.floor(this.currentTime / 3600);
        const minutes = Math.floor((this.currentTime % 3600) / 60);
        const seconds = Math.floor(this.currentTime % 60);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    getPhaseName() {
        const phaseNames = {
            'dawn': 'Рассвет',
            'day': 'День',
            'dusk': 'Закат',
            'night': 'Ночь',
            'midnight': 'Полночь'
        };
        return phaseNames[this.phase] || this.phase;
    }
    
    setDayDuration(seconds) {
        this.dayDuration = Math.max(10, Math.min(300, seconds));
    }
    
    setTime(hours, minutes = 0) {
        this.currentTime = (hours * 3600 + minutes * 60) % 86400;
        this.updatePhase();
    }
    
    onPhaseChange(callback) {
        this.phaseCallbacks.push(callback);
    }
    
    checkPhaseChange() {
        const lastPhase = this.phase;
        this.updatePhase();
        
        if (lastPhase !== this.phase) {
            this.phaseCallbacks.forEach(cb => cb(this.phase, lastPhase));
        }
    }
}

// Глобальный экземпляр
let timeManager = null;

function initTimeSystem() {
    timeManager = new TimeManager();
    return timeManager;
}
