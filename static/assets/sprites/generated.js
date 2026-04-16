// Простые спрайты тайлов (программная генерация)
const TILE_SPRITES = {
    [0]: drawGrassTile,
    [1]: drawWaterTile,
    [2]: drawWallTile,
    [3]: drawPathTile,
    [4]: drawTreeTile,
    [5]: drawSandTile,
};

function drawGrassTile(x, y, ctx) {
    const halfW = 32;
    const halfH = 32;
    
    // Top face
    ctx.fillStyle = "#4a7c59";
    ctx.beginPath();
    ctx.moveTo(x, y - halfH);
    ctx.lineTo(x + halfW, y);
    ctx.lineTo(x, y + halfH);
    ctx.lineTo(x - halfW, y);
    ctx.closePath();
    ctx.fill();
    
    // Slight highlight
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(x, y - halfH);
    ctx.lineTo(x + halfW - 4, y);
    ctx.lineTo(x, y + halfH - 4);
    ctx.closePath();
    ctx.fill();
    
    // Border
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawWaterTile(x, y, ctx) {
    const halfW = 32;
    const halfH = 32;
    
    // Top with gradient effect
    const grad = ctx.createLinearGradient(x, y - halfH, x, y + halfH);
    grad.addColorStop(0, "#4a90d9");
    grad.addColorStop(0.5, "#3a7bc8");
    grad.addColorStop(1, "#3570b8");
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    ctx.moveTo(x, y - halfH);
    ctx.lineTo(x + halfW, y);
    ctx.lineTo(x, y + halfH);
    ctx.lineTo(x - halfW, y);
    ctx.closePath();
    ctx.fill();
    
    // Wave effect (simplified)
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - halfW + 2, y - halfH + 2);
    ctx.quadraticCurveTo(x - halfW + 6, y - halfH, x + halfW - 2, y - halfH + 4);
    ctx.stroke();
}

function drawWallTile(x, y, ctx) {
    const halfW = 32;
    const halfH = 32;
    const depth = 8;
    
    // Main brick pattern
    ctx.fillStyle = "#663333";
    ctx.beginPath();
    ctx.moveTo(x, y - halfH);
    ctx.lineTo(x + halfW, y);
    ctx.lineTo(x, y + halfH);
    ctx.lineTo(x - halfW, y);
    ctx.closePath();
    ctx.fill();
    
    // Brick lines
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y - halfH + 8);
    ctx.lineTo(x + halfW - 28, y - halfH + 8);
    ctx.moveTo(x, y - halfH + 18);
    ctx.lineTo(x + halfW - 28, y - halfH + 18);
    ctx.moveTo(x + halfW - 32, y - 8);
    ctx.lineTo(x + halfW - 28, y + 8);
    ctx.stroke();
    
    // Sides
    const sideColors = ["#552222", "#441111"];
    for (let i = 0; i < 2; i++) {
        ctx.fillStyle = sideColors[i % 2];
        ctx.beginPath();
        ctx.moveTo(x - halfW + i * depth, y);
        ctx.lineTo(x - halfW + i * depth + 2, y + halfH);
        ctx.lineTo(x - halfW + i * depth + 4, y + halfH + depth);
        ctx.lineTo(x - halfW + i * depth + 6, y + depth);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}

function drawPathTile(x, y, ctx) {
    const halfW = 32;
    const halfH = 32;
    const depth = 6;
    
    // Top gradient
    const grad = ctx.createLinearGradient(x, y - halfH, x, y + halfH);
    grad.addColorStop(0, "#c2a66b");
    grad.addColorStop(0.3, "#cfa67b");
    grad.addColorStop(0.7, "#bca65b");
    grad.addColorStop(1, "#a89055");
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    ctx.moveTo(x, y - halfH);
    ctx.lineTo(x + halfW, y);
    ctx.lineTo(x, y + halfH);
    ctx.lineTo(x - halfW, y);
    ctx.closePath();
    ctx.fill();
    
    // Stone texture lines
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 0.6;
    const lines = [
        { x1: x - 3, y1: y - halfH + 6, x2: x - 3, y2: y + halfH - 6 },
        { x1: x + halfW - 3, y1: y + 6, x2: x + halfW - 3, y2: y + halfH - 6 },
        { x1: x + 6, y1: y - halfH + 6, x2: x + halfW - 6, y2: y - 6 },
        { x1: x + halfW - 6, y1: y + halfH - 6, x2: x + 6, y2: y + halfH - 6 },
    ];
    lines.forEach(l => {
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
    });
}

function drawTreeTile(x, y, ctx) {
    const halfW = 32;
    const halfH = 32;
    const depth = 5;
    const trunkW = 8;
    const trunkH = 10;
    
    // Trunk (bottom)
    const trunkGrad = ctx.createLinearGradient(x - trunkW/2, y + halfH - trunkH, x + trunkW/2, y + halfH);
    trunkGrad.addColorStop(0, "#4a3a2a");
    trunkGrad.addColorStop(1, "#3a2a1a");
    ctx.fillStyle = trunkGrad;
    ctx.fillRect(x - trunkW/2, y + halfH - trunkH, trunkW, trunkH);
    
    // Trunk sides
    ctx.fillStyle = "#3a2a1a";
    ctx.fillRect(x - trunkW - depth/2, y + halfH - trunkH + 2, depth/6, trunkH);
    ctx.fillRect(x + trunkW + depth/6 - depth, y + halfH - trunkH + 2, depth/6, trunkH);
    
    // Foliage layers (top triangle)
    ctx.fillStyle = "#2d5a27";
    ctx.beginPath();
    ctx.moveTo(x - halfW - 6, y - halfH - 10);
    ctx.lineTo(x - halfW + 6, y - halfH + 6);
    ctx.lineTo(x, y - halfH - 16);
    ctx.lineTo(x + halfW - 6, y - halfH + 6);
    ctx.lineTo(x + halfW + 6, y - halfH - 10);
    ctx.closePath();
    ctx.fill();
    
    // Second foliage layer
    ctx.fillStyle = "#3a6633";
    ctx.beginPath();
    ctx.moveTo(x - halfW, y - halfH + 2);
    ctx.lineTo(x - halfW + 12, y - halfH + 10);
    ctx.lineTo(x, y - halfH + 4);
    ctx.lineTo(x + halfW - 12, y - halfH + 10);
    ctx.lineTo(x + halfW, y - halfH + 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
}

function drawSandTile(x, y, ctx) {
    const halfW = 32;
    const halfH = 32;
    const depth = 5;
    
    // Sand with highlights
    const grad = ctx.createLinearGradient(x, y - halfH, x, y + halfH);
    grad.addColorStop(0, "#d4b96a");
    grad.addColorStop(0.2, "#e0c07a");
    grad.addColorStop(0.8, "#c8a05a");
    grad.addColorStop(1, "#bfa65a");
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    ctx.moveTo(x, y - halfH);
    ctx.lineTo(x + halfW, y);
    ctx.lineTo(x, y + halfH);
    ctx.lineTo(x - halfW, y);
    ctx.closePath();
    ctx.fill();
    
    // Sand particles (simplified)
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x - halfW + 4, y, 3, 3);
    ctx.fillRect(x + halfW - 4, y, 3, 3);
    ctx.fillRect(x, y + halfH - 4, 3, 3);
    ctx.fillRect(x + halfW/2 - 1, y + halfH/2, 2, 2);
    
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
}
