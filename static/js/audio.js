// Аудио система для звуковых эффектов
class AudioSystem {
    constructor() {
        this.enabled = true;
        this.masterVolume = 0.5;
        this.sounds = {};
        this.audioContext = null;
        this.initialized = false;
    }

    // Инициализация аудио контекста (требуется жест пользователя)
    init() {
        if (this.initialized) return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.initialized = true;
            console.log('Audio system initialized');
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    // Генерация звука шагов
    playStep(frequency = 200, duration = 0.1) {
        if (!this.enabled || !this.initialized) return;
        this.playTone(frequency, 'square', duration, 0.3);
    }

    // Звук удара
    playHit(frequency = 150, duration = 0.2) {
        if (!this.enabled || !this.initialized) return;
        this.playTone(frequency, 'sawtooth', duration, 0.5);
    }

    // Звук подбора предмета
    playPickup(frequency = 400, duration = 0.15) {
        if (!this.enabled || !this.initialized) return;
        this.playTone(frequency, 'sine', duration, 0.4);
        setTimeout(() => this.playTone(frequency * 1.5, 'sine', duration, 0.3), 50);
    }

    // Звук смерти
    playDeath(frequency = 100, duration = 0.5) {
        if (!this.enabled || !this.initialized) return;
        this.playTone(frequency, 'sawtooth', duration, 0.6);
    }

    // Звук атаки
    playAttack(frequency = 300, duration = 0.1) {
        if (!this.enabled || !this.initialized) return;
        this.playTone(frequency, 'square', duration, 0.4);
    }

    // Звук чата
    playChat(frequency = 600, duration = 0.08) {
        if (!this.enabled || !this.initialized) return;
        this.playTone(frequency, 'sine', duration, 0.2);
    }

    // Базовая функция воспроизведения тона
    playTone(frequency, type, duration, volume) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    // Воспроизведение последовательности тонов (для событий)
    playSequence(notes, delay = 100) {
        if (!this.enabled || !this.initialized) return;
        
        notes.forEach((note, index) => {
            setTimeout(() => {
                this.playTone(note.freq, note.type || 'sine', note.duration || 0.1, note.volume || 0.3);
            }, index * delay);
        });
    }

    // Вкл/выкл звук
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    // Установка громкости
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    // Получение текущей громкости
    getVolume() {
        return this.masterVolume;
    }

    // Проверка поддержки аудио
    isSupported() {
        return !!(window.AudioContext || window.webkitAudioContext);
    }
}

// Глобальный экземпляр
const audioSystem = new AudioSystem();

// Автоматическая инициализация при первом клике
document.addEventListener('click', () => {
    audioSystem.init();
}, { once: true });

document.addEventListener('keydown', () => {
    audioSystem.init();
}, { once: true });
