const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const renderer = new Renderer(canvas, ctx);
const camera = new Camera();
const input = new InputHandler();

const player = new Player(2, 2, "Player", "#4fc3f7");

const entities = [player];

camera.reset(player.x, player.y);

let lastTime = performance.now();
let fps = 0;
let frameCount = 0;
let lastFpsTime = performance.now();

window.addEventListener("resize", () => {
    renderer.resize();
});
renderer.resize();

function handleInput(deltaTime) {
    const vec = input.getMoveVector();

    if (vec.x !== 0 || vec.y !== 0) {
        player.setDirection(vec.x, vec.y);

        const stepSize = 0.12 * Math.min(deltaTime * 60, 2);
        const newX = player.x + vec.x * stepSize;
        const newY = player.y + vec.y * stepSize;

        if (canMoveTo(newX, player.y)) {
            player.x = newX;
        }
        if (canMoveTo(player.x, newY)) {
            player.y = newY;
        }

        if (!player.isMoving) {
            player.startMoving(vec.x, vec.y);
        }

        player.frameTimer += deltaTime;
        if (player.frameTimer > 0.15) {
            player.frameTimer = 0;
            player.frame = (player.frame + 1) % 4;
        }
    } else {
        player.stopMoving();
    }
}

function update(deltaTime) {
    handleInput(deltaTime);
    camera.follow(player, deltaTime);
    camera.clampToMap();
}

function render() {
    renderer.clear();
    const offset = camera.getOffset();
    renderer.drawMap(offset);
    renderer.drawAllEntities(entities, offset);
}

function updateHud() {
    document.getElementById("coords").textContent = `X: ${player.getGridX()}, Y: ${player.getGridY()}`;
}

function updateFps() {
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFpsTime = now;
    }
    document.getElementById("fps").textContent = `FPS: ${fps}`;
}

function gameLoop(currentTime) {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    update(deltaTime);
    render();
    updateHud();
    updateFps();

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
