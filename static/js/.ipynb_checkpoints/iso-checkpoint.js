const TILE_W = 64;
const TILE_H = 32;

function gridToScreen(gridX, gridY, offsetX, offsetY) {
    const screenX = (gridX - gridY) * TILE_W / 2 + offsetX;
    const screenY = (gridX + gridY) * TILE_H / 2 + offsetY;
    return { x: screenX, y: screenY };
}

function screenToGrid(screenX, screenY, offsetX, offsetY) {
    const gridX = ((screenX - offsetX) / TILE_W + (screenY - offsetY) / TILE_H);
    const gridY = ((screenY - offsetY) / TILE_H - (screenX - offsetX) / TILE_W);
    return { x: Math.floor(gridX), y: Math.floor(gridY) };
}
