// Map Editor - выбор и размещение тайлов мышью
class MapEditor {
    constructor(canvas, renderer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.renderer = renderer;
        this.isActive = false;
        this.selectedTileType = 1; // По умолчанию трава
        this.isDragging = false;
        this.lastGridPos = { x: -1, y: -1 };
        
        // Палитра тайлов
        this.tilePalette = [
            { id: 0, name: 'Вода', color: '#4a90e2' },
            { id: 1, name: 'Трава', color: '#7ec850' },
            { id: 2, name: 'Песок', color: '#f4e4c1' },
            { id: 3, name: 'Камень', color: '#8b8b8b' },
            { id: 4, name: 'Грязь', color: '#6b4423' },
            { id: 5, name: 'Снег', color: '#e8f4f8' },
            { id: 6, name: 'Лавa', color: '#ff4500' },
            { id: 7, name: 'Дорога', color: '#c4a574' }
        ];
        
        this.setupUI();
        this.setupEvents();
    }
    
    setupUI() {
        // Создание панели редактора
        const editorPanel = document.createElement('div');
        editorPanel.id = 'mapEditorPanel';
        editorPanel.className = 'ui-panel hidden';
        editorPanel.innerHTML = `
            <h3>Редактор карт</h3>
            <div id="tilePalette" class="tile-palette"></div>
            <div class="editor-controls">
                <button id="btnToggleEditor" class="tool-btn active">Редактирование</button>
                <button id="btnSaveMap" class="tool-btn">Сохранить</button>
                <button id="btnClearMap" class="tool-btn danger">Очистить</button>
            </div>
            <div id="editorStatus">Выберите тайл и кликните на карту</div>
        `;
        
        document.getElementById('gameUI').appendChild(editorPanel);
        
        // Генерация палитры
        const paletteContainer = editorPanel.querySelector('#tilePalette');
        this.tilePalette.forEach(tile => {
            const tileBtn = document.createElement('div');
            tileBtn.className = 'tile-btn';
            tileBtn.style.backgroundColor = tile.color;
            tileBtn.title = tile.name;
            tileBtn.dataset.id = tile.id;
            if (tile.id === this.selectedTileType) {
                tileBtn.classList.add('selected');
            }
            tileBtn.addEventListener('click', () => this.selectTile(tile.id));
            paletteContainer.appendChild(tileBtn);
        });
        
        // Обработчики кнопок
        editorPanel.querySelector('#btnToggleEditor').addEventListener('click', () => this.toggle());
        editorPanel.querySelector('#btnSaveMap').addEventListener('click', () => this.saveMap());
        editorPanel.querySelector('#btnClearMap').addEventListener('click', () => this.clearMap());
    }
    
    setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    selectTile(tileId) {
        this.selectedTileType = tileId;
        
        // Обновление UI
        document.querySelectorAll('.tile-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (parseInt(btn.dataset.id) === tileId) {
                btn.classList.add('selected');
            }
        });
        
        const status = document.getElementById('editorStatus');
        const tileInfo = this.tilePalette.find(t => t.id === tileId);
        if (status && tileInfo) {
            status.textContent = `Выбран: ${tileInfo.name}`;
        }
    }
    
    toggle() {
        this.isActive = !this.isActive;
        const panel = document.getElementById('mapEditorPanel');
        const btn = document.getElementById('btnToggleEditor');
        
        if (this.isActive) {
            panel.classList.remove('hidden');
            btn.classList.add('active');
            document.getElementById('editorStatus').textContent = 'Режим редактирования активен';
        } else {
            panel.classList.add('hidden');
            btn.classList.remove('active');
            document.getElementById('editorStatus').textContent = 'Режим редактирования отключен';
        }
    }
    
    handleMouseDown(e) {
        if (!this.isActive) return;
        
        this.isDragging = true;
        this.placeTile(e);
    }
    
    handleMouseMove(e) {
        if (!this.isActive || !this.isDragging) return;
        
        this.placeTile(e);
    }
    
    handleMouseUp() {
        this.isDragging = false;
        this.lastGridPos = { x: -1, y: -1 };
    }
    
    placeTile(e) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        // Получение позиции камеры из глобальной переменной
        const cameraOffset = typeof camera !== 'undefined' ? camera.getOffset() : { x: 0, y: 0 };
        const gridPos = screenToGrid(screenX, screenY, cameraOffset.x, cameraOffset.y);
        
        const gridX = Math.round(gridPos.x);
        const gridY = Math.round(gridPos.y);
        
        // Проверка границ и изменение позиции
        if (gridX >= 0 && gridX < MAP_WIDTH && gridY >= 0 && gridY < MAP_HEIGHT) {
            if (gridX !== this.lastGridPos.x || gridY !== this.lastGridPos.y) {
                this.lastGridPos = { x: gridX, y: gridY };
                
                // Изменение тайла на карте
                if (mapData[gridY] && mapData[gridY][gridX] !== this.selectedTileType) {
                    mapData[gridY][gridX] = this.selectedTileType;
                    
                    // Отправка изменений на сервер (если есть network)
                    if (typeof network !== 'undefined' && network.socket && network.socket.connected) {
                        network.socket.emit('update_tile', {
                            x: gridX,
                            y: gridY,
                            tileType: this.selectedTileType
                        });
                    }
                }
            }
        }
    }
    
    saveMap() {
        if (typeof network !== 'undefined' && network.socket) {
            network.socket.emit('save_map', {
                tiles: mapData,
                width: MAP_WIDTH,
                height: MAP_HEIGHT
            });
            
            const status = document.getElementById('editorStatus');
            if (status) {
                status.textContent = 'Карта сохранена!';
                setTimeout(() => {
                    status.textContent = 'Выберите тайл и кликните на карту';
                }, 2000);
            }
        }
    }
    
    clearMap() {
        if (confirm('Вы уверены, что хотите очистить всю карту?')) {
            for (let y = 0; y < MAP_HEIGHT; y++) {
                for (let x = 0; x < MAP_WIDTH; x++) {
                    mapData[y][x] = 1; // Трава по умолчанию
                }
            }
            
            const status = document.getElementById('editorStatus');
            if (status) {
                status.textContent = 'Карта очищена';
            }
        }
    }
    
    render(offset) {
        if (!this.isActive) return;
        
        // Подсветка выбранного тайла под курсором
        // Эта функция вызывается в основном цикле рендеринга
    }
}

// Глобальный экземпляр
let mapEditor = null;

// Инициализация при загрузке
function initMapEditor(canvas, renderer) {
    mapEditor = new MapEditor(canvas, renderer);
    return mapEditor;
}
