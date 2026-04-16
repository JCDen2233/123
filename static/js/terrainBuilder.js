// Terrain building tools for modifying heightmap
const TerrainType = {
    HILL: 'hill',
    PIT: 'pit',
    WATER: 'water'
};

function buildTerrain(heightMap, type, x, y, radius, elevationChange, width, height) {
    switch (type) {
        case TerrainType.HILL:
            applyHill(heightMap, x, y, radius, elevationChange, width, height);
            break;
        case TerrainType.PIT:
            applyPit(heightMap, x, y, radius, elevationChange, width, height);
            break;
        case TerrainType.WATER:
            // Flatten and lower terrain for water body
            flattenTerrain(heightMap, x, y, radius, 0, width, height);
            break;
        default:
            console.warn('Unknown terrain type:', type);
    }
}

function flattenTerrain(heightMap, cx, cy, radius, targetHeight, width, height) {
    for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
        for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
            const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
            if (dist <= radius) {
                const falloff = 1 - (dist / radius);
                const current = heightMap[y][x];
                const delta = (targetHeight - current) * falloff;
                heightMap[y][x] = Math.max(0, Math.min(MAX_HEIGHT, current + delta));
            }
        }
    }
}

function getTerrainAt(heightMap, x, y) {
    if (x < 0 || x >= heightMap.length || y < 0 || y >= heightMap[0].length) {
        return null;
    }
    return heightMap[x][y];
}

function canBuildHere(heightMap, x, y, radius, width, height) {
    // Check if the area is within bounds
    if (x - radius < 0 || x + radius >= width || y - radius < 0 || y + radius >= height) {
        return false;
    }
    return true;
}

function previewTerrainChange(heightMap, type, x, y, radius, elevationChange, width, height) {
    // Create a copy of the heightmap for preview
    const preview = heightMap.map(row => [...row]);
    buildTerrain(preview, type, x, y, radius, elevationChange, width, height);
    return preview;
}
