import { buildMazeWorld, DIFFICULTIES, MAZE_CONFIG } from "./maze.js";
import { Player } from "./player.js";
import { InputController } from "./input.js";
import { GameUI } from "./ui.js";

const sceneContainer = document.getElementById("sceneContainer");
const canvas = document.createElement("canvas");
canvas.id = "gameCanvas";
sceneContainer.appendChild(canvas);
const ctx = canvas.getContext("2d");

const ui = new GameUI();
const input = new InputController({
  upButton: document.getElementById("moveUpButton"),
  downButton: document.getElementById("moveDownButton"),
  leftButton: document.getElementById("moveLeftButton"),
  rightButton: document.getElementById("moveRightButton"),
});
const player = new Player();

const gameState = {
  difficultyKey: "easy",
  world: null,
  playing: false,
  timer: DIFFICULTIES.easy.time,
  keysCollected: 0,
  exitUnlocked: false,
  elapsed: 0,
  hintCooldown: 0,
  lastFrameTime: performance.now(),
  dpr: 1,
};

function updateStatusHUD() {
  ui.updateHUD({
    timeRemaining: gameState.timer,
    keysCollected: gameState.keysCollected,
    difficultyLabel: DIFFICULTIES[gameState.difficultyKey].label,
  });
}

function setDifficulty(difficultyKey) {
  gameState.difficultyKey = DIFFICULTIES[difficultyKey] ? difficultyKey : "easy";
  ui.setDifficulty(gameState.difficultyKey);
  updateStatusHUD();
}

function createWorld() {
  gameState.world = buildMazeWorld(gameState.difficultyKey);
  player.reset(gameState.world.playerStart);
}

function startGame() {
  createWorld();
  gameState.playing = true;
  gameState.timer = gameState.world.timeLimit;
  gameState.keysCollected = 0;
  gameState.exitUnlocked = false;
  gameState.elapsed = 0;
  gameState.hintCooldown = 0;
  input.setActive(true);
  ui.clearPersistentStatus();
  checkInteractions();
  updateStatusHUD();
  ui.showGame();
}

function returnToMenu() {
  gameState.playing = false;
  input.setActive(false);
  ui.showTitle();
}

function showInstructions() {
  ui.showInstructions();
}

function hideInstructions() {
  ui.hideInstructions();
}

function endGame(victory) {
  gameState.playing = false;
  input.setActive(false);
  ui.clearPersistentStatus();
  ui.showEndScreen(victory);
}

function collectKey(key) {
  key.collected = true;
  gameState.keysCollected += 1;
  updateStatusHUD();

  if (gameState.keysCollected >= MAZE_CONFIG.keyCount) {
    gameState.exitUnlocked = true;
    ui.showStatus("Exit Open", true);
  }
}

function triggerTrap(trap) {
  trap.lastTriggeredAt = gameState.elapsed;
  gameState.timer = Math.max(0, gameState.timer - 10);
  updateStatusHUD();
  ui.flashTrap();
  ui.showStatus("-10 Seconds");
}

function isSameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

function checkInteractions() {
  if (!gameState.world) {
    return;
  }

  gameState.world.keys.forEach((key) => {
    if (!key.collected && isSameCell(key.cell, player.position)) {
      collectKey(key);
    }
  });

  gameState.world.traps.forEach((trap) => {
    if (isSameCell(trap.cell, player.position) && gameState.elapsed - trap.lastTriggeredAt > 0.6) {
      triggerTrap(trap);
    }
  });

  if (isSameCell(gameState.world.exitCell, player.position)) {
    if (gameState.exitUnlocked) {
      endGame(true);
    } else if (gameState.elapsed >= gameState.hintCooldown) {
      gameState.hintCooldown = gameState.elapsed + 1.2;
      ui.showStatus("Collect all keys");
    }
  }
}

function resizeCanvas() {
  gameState.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.floor(window.innerWidth * gameState.dpr);
  canvas.height = Math.floor(window.innerHeight * gameState.dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
}

function getBoardMetrics() {
  if (!gameState.world) {
    return null;
  }

  const padding = Math.min(window.innerWidth, window.innerHeight) < 640 ? 18 : 28;
  const availableWidth = window.innerWidth - padding * 2;
  const availableHeight = window.innerHeight - padding * 2;
  const cellSize = Math.max(18, Math.floor(Math.min(availableWidth / gameState.world.size, availableHeight / gameState.world.size)));
  const boardSize = cellSize * gameState.world.size;

  return {
    cellSize,
    boardSize,
    left: (window.innerWidth - boardSize) / 2,
    top: (window.innerHeight - boardSize) / 2,
    wallThickness: Math.max(2, Math.floor(cellSize * 0.12)),
  };
}

function drawRoundedRect(x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function drawBackground() {
  const gradient = ctx.createRadialGradient(
    window.innerWidth * 0.5,
    window.innerHeight * 0.2,
    40,
    window.innerWidth * 0.5,
    window.innerHeight * 0.5,
    window.innerWidth * 0.8
  );
  gradient.addColorStop(0, "#0b214e");
  gradient.addColorStop(1, "#020a1d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  for (let index = 0; index < 18; index += 1) {
    const x = ((index * 173) % window.innerWidth) + ((gameState.elapsed * 16) % 40);
    const y = (index * 97) % window.innerHeight;
    const alpha = 0.08 + (index % 4) * 0.02;
    ctx.fillStyle = `rgba(103, 232, 249, ${alpha})`;
    ctx.fillRect(x % window.innerWidth, y, 2, 2);
  }
}

function drawBoard() {
  const metrics = getBoardMetrics();
  if (!metrics) {
    return;
  }

  const { world } = gameState;
  const { cellSize, left, top, boardSize, wallThickness } = metrics;
  const radius = Math.max(12, cellSize * 0.22);

  drawRoundedRect(left - 10, top - 10, boardSize + 20, boardSize + 20, radius + 6);
  ctx.fillStyle = "rgba(4, 17, 45, 0.86)";
  ctx.fill();
  ctx.strokeStyle = "rgba(103, 232, 249, 0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();

  for (let y = 0; y < world.size; y += 1) {
    for (let x = 0; x < world.size; x += 1) {
      const cellX = left + x * cellSize;
      const cellY = top + y * cellSize;
      const checker = (x + y) % 2 === 0 ? 0.82 : 1;
      ctx.fillStyle = `rgba(9, 19, 41, ${checker})`;
      ctx.fillRect(cellX, cellY, cellSize, cellSize);
    }
  }

  const startX = left + world.playerStart.x * cellSize;
  const startY = top + world.playerStart.y * cellSize;
  ctx.fillStyle = "rgba(34, 211, 238, 0.14)";
  ctx.fillRect(startX, startY, cellSize, cellSize);

  const exitX = left + world.exitCell.x * cellSize;
  const exitY = top + world.exitCell.y * cellSize;
  ctx.fillStyle = gameState.exitUnlocked ? "rgba(34, 197, 94, 0.3)" : "rgba(30, 58, 95, 0.65)";
  ctx.fillRect(exitX, exitY, cellSize, cellSize);

  world.traps.forEach((trap) => {
    const pulse = 0.82 + Math.sin(gameState.elapsed * 5 + trap.phase) * 0.12;
    const inset = cellSize * (0.22 - (pulse - 0.82) * 0.12);
    const x = left + trap.cell.x * cellSize + inset;
    const y = top + trap.cell.y * cellSize + inset;
    const size = cellSize - inset * 2;
    ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
    ctx.fillRect(x, y, size, size);
  });

  world.keys.forEach((key) => {
    if (key.collected) {
      return;
    }

    const pulse = 0.92 + Math.sin(gameState.elapsed * 4 + key.phase) * 0.08;
    const centerX = left + (key.cell.x + 0.5) * cellSize;
    const centerY = top + (key.cell.y + 0.5) * cellSize;
    const size = cellSize * 0.24 * pulse;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY - size);
    ctx.lineTo(centerX + size, centerY);
    ctx.lineTo(centerX, centerY + size);
    ctx.lineTo(centerX - size, centerY);
    ctx.closePath();
    ctx.fillStyle = "#fde047";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 247, 173, 0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  ctx.strokeStyle = "#67e8f9";
  ctx.lineWidth = wallThickness;
  ctx.lineCap = "round";

  for (let y = 0; y < world.size; y += 1) {
    for (let x = 0; x < world.size; x += 1) {
      const cell = world.grid[y][x];
      const cellX = left + x * cellSize;
      const cellY = top + y * cellSize;

      if (cell.walls.N) {
        ctx.beginPath();
        ctx.moveTo(cellX, cellY);
        ctx.lineTo(cellX + cellSize, cellY);
        ctx.stroke();
      }

      if (cell.walls.W) {
        ctx.beginPath();
        ctx.moveTo(cellX, cellY);
        ctx.lineTo(cellX, cellY + cellSize);
        ctx.stroke();
      }

      if (y === world.size - 1 && cell.walls.S) {
        ctx.beginPath();
        ctx.moveTo(cellX, cellY + cellSize);
        ctx.lineTo(cellX + cellSize, cellY + cellSize);
        ctx.stroke();
      }

      if (x === world.size - 1 && cell.walls.E) {
        ctx.beginPath();
        ctx.moveTo(cellX + cellSize, cellY);
        ctx.lineTo(cellX + cellSize, cellY + cellSize);
        ctx.stroke();
      }
    }
  }

  const playerX = left + (player.position.x + 0.5) * cellSize;
  const playerY = top + (player.position.y + 0.5) * cellSize;
  const playerGlow = cellSize * (0.2 + Math.sin(gameState.elapsed * 7) * 0.02);
  ctx.beginPath();
  ctx.arc(playerX, playerY, playerGlow * 1.45, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(34, 211, 238, 0.18)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(playerX, playerY, playerGlow, 0, Math.PI * 2);
  ctx.fillStyle = "#22d3ee";
  ctx.fill();
  ctx.strokeStyle = "rgba(191, 219, 254, 0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function render() {
  ctx.setTransform(gameState.dpr, 0, 0, gameState.dpr, 0, 0);
  drawBackground();

  if (gameState.world) {
    drawBoard();
  }
}

function gameLoop(frameTime) {
  const deltaTime = Math.min((frameTime - gameState.lastFrameTime) / 1000, 0.05);
  gameState.lastFrameTime = frameTime;
  gameState.elapsed += deltaTime;

  if (gameState.playing && gameState.world) {
    const inputState = input.consumeFrameState();
    player.update(deltaTime, inputState, gameState.world);
    checkInteractions();

    gameState.timer -= deltaTime;
    if (gameState.timer <= 0) {
      gameState.timer = 0;
      updateStatusHUD();
      endGame(false);
    } else {
      updateStatusHUD();
    }
  } else {
    input.consumeFrameState();
  }

  render();
  window.requestAnimationFrame(gameLoop);
}

ui.bindEvents({
  onPlay: startGame,
  onShowInstructions: showInstructions,
  onHideInstructions: hideInstructions,
  onPlayAgain: startGame,
  onMainMenu: returnToMenu,
  onDifficultyChange: setDifficulty,
});

resizeCanvas();
setDifficulty("easy");
returnToMenu();
window.addEventListener("resize", resizeCanvas);
window.requestAnimationFrame(gameLoop);
