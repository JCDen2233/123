// Height map generation using simple noise
const MAX_HEIGHT = 8;

function generateHeightMap(width, height, seed = Math.random()) {
    const heightMap = [];
    
    // Initialize with base heights
    for (let y = 0; y < height; y++) {
        heightMap[y] = [];
        for (let x = 0; x < width; x++) {
            heightMap[y][x] = 0;
        }
    }
    
    // Simple pseudo-random noise generation
    const random = seededRandom(seed);
    
    // Add some base terrain features
    const numHills = Math.floor((width * height) / 20);
    for (let i = 0; i < numHills; i++) {
        const cx = Math.floor(random() * width);
        const cy = Math.floor(random() * height);
        const radius = Math.floor(2 + random() * 4);
        const delta = Math.floor(1 + random() * 3);
        applyHill(heightMap, cx, cy, radius, delta, width, height);
    }
    
    // Add some pits
    const numPits = Math.floor((width * height) / 40);
    for (let i = 0; i < numPits; i++) {
        const cx = Math.floor(random() * width);
        const cy = Math.floor(random() * height);
        const radius = Math.floor(1 + random() * 3);
        const delta = Math.floor(1 + random() * 2);
        applyPit(heightMap, cx, cy, radius, delta, width, height);
    }
    
    return heightMap;
}

function seededRandom(seed) {
    let s = seed;
    return function() {
        s = Math.sin(s * 9999) * 10000;
        return s - Math.floor(s);
    };
}

function applyHill(heightMap, cx, cy, radius, delta, width, height) {
    for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
        for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
            const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
            if (dist <= radius) {
                const falloff = 1 - (dist / radius);
                const increase = Math.floor(delta * falloff);
                heightMap[y][x] = Math.min(MAX_HEIGHT, heightMap[y][x] + increase);
            }
        }
    }
}

function applyPit(heightMap, cx, cy, radius, delta, width, height) {
    for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
        for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
            const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
            if (dist <= radius) {
                const falloff = 1 - (dist / radius);
                const decrease = Math.floor(delta * falloff);
                heightMap[y][x] = Math.max(0, heightMap[y][x] - decrease);
            }
        }
    }
}

function getElevationColor(baseColor, elevation, isWater = false) {
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
    
    let factor;
    if (isWater) {
        // Water gets darker with depth (lower elevation = deeper)
        factor = 0.7 + (elevation / MAX_HEIGHT) * 0.3;
    } else {
        // Land gets slightly darker at higher elevations (shadows)
        factor = 1.0 - (elevation / MAX_HEIGHT) * 0.2;
    }
    
    const newR = Math.floor(r * factor);
    const newG = Math.floor(g * factor);
    const newB = Math.floor(b * factor);
    
    return `rgb(${newR}, ${newG}, ${newB})`;
}
