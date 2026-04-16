const TILE_GRASS = 0;
const TILE_WATER = 1;
const TILE_WALL = 2;
const TILE_PATH = 3;
const TILE_TREE = 4;
const TILE_SAND = 5;

const TILE_COLORS = {
    [TILE_GRASS]: { top: "#4a7c59", left: "#3d6b4e", right: "#3a6347" },
    [TILE_WATER]: { top: "#4a90d9", left: "#3a7bc8", right: "#3570b8" },
    [TILE_WALL]:  { top: "#888888", left: "#666666", right: "#555555" },
    [TILE_PATH]:  { top: "#c2a66b", left: "#a89055", right: "#9a824d" },
    [TILE_TREE]:  { top: "#2d5a27", left: "#234a1e", right: "#1f4219" },
    [TILE_SAND]:  { top: "#d4b96a", left: "#bfa65a", right: "#ad9650" },
};

let MAP_WIDTH = 20;
let MAP_HEIGHT = 20;
let mapData = [];

function initMapFromData(map) {
    MAP_WIDTH = map.width || 20;
    MAP_HEIGHT = map.height || 20;
    mapData = map.tiles || [];
}

const defaultMap = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 3, 3, 3, 0, 0, 0, 5, 5, 0, 0],
    [0, 3, 3, 0, 3, 0, 0, 0, 5, 5, 0, 0],
    [0, 3, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 3, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 3, 0, 0, 1, 1, 0],
    [0, 0, 2, 2, 0, 0, 3, 3, 0, 0, 0, 0],
    [0, 0, 2, 2, 0, 0, 0, 3, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0],
    [0, 0, 4, 4, 0, 0, 0, 0, 0, 3, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

if (mapData.length === 0) {
    MAP_WIDTH = 12;
    MAP_HEIGHT = 12;
    mapData = defaultMap;
}
