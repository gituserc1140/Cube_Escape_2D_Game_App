import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.167.1/build/three.module.js";
import { buildMazeWorld, DIFFICULTIES, disposeWorld, MAZE_CONFIG } from "./maze.js";
import { Player } from "./player.js";
import { InputController } from "./input.js";
import { GameUI } from "./ui.js";

const sceneContainer = document.getElementById("sceneContainer");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sceneContainer.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020a1d);
scene.fog = new THREE.Fog(0x020a1d, 16, 140);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 240);

const ambientLight = new THREE.AmbientLight(0x7dd3fc, 1.25);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0x8be9fd, 1.8);
directionalLight.position.set(18, 28, 12);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048);
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 80;
directionalLight.shadow.camera.left = -45;
directionalLight.shadow.camera.right = 45;
directionalLight.shadow.camera.top = 45;
directionalLight.shadow.camera.bottom = -45;
scene.add(directionalLight);

const ui = new GameUI();
const input = new InputController({
  canvas: renderer.domElement,
  joystickZone: document.getElementById("joystickZone"),
  joystickBase: document.getElementById("joystickBase"),
  joystickKnob: document.getElementById("joystickKnob"),
  lookPad: document.getElementById("lookPad"),
});
const player = new Player(camera);
const clock = new THREE.Clock();

// Track the current run so the render loop can coordinate gameplay and UI state.
const gameState = {
  difficultyKey: "easy",
  world: null,
  playing: false,
  timer: DIFFICULTIES.easy.time,
  keysCollected: 0,
  exitUnlocked: false,
  elapsed: 0,
  hintCooldown: 0,
};

// Keep the HUD in sync with the active timer, key count, and selected difficulty.
function updateStatusHUD() {
  ui.updateHUD({
    timeRemaining: gameState.timer,
    keysCollected: gameState.keysCollected,
    difficultyLabel: DIFFICULTIES[gameState.difficultyKey].label,
  });
}

function distanceXZ(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// Difficulty changes affect both the menu highlight and the next generated maze.
function setDifficulty(difficultyKey) {
  gameState.difficultyKey = DIFFICULTIES[difficultyKey] ? difficultyKey : "easy";
  ui.setDifficulty(gameState.difficultyKey);
  updateStatusHUD();
}

// Rebuild the whole maze world whenever a new game starts.
function createWorld() {
  disposeWorld(scene, gameState.world);
  gameState.world = buildMazeWorld(scene, gameState.difficultyKey);
  player.eyeHeight = MAZE_CONFIG.playerEyeHeight;
  player.reset(gameState.world.playerStart);
}

// Reset the run state and drop the player into a newly generated maze.
function startGame() {
  createWorld();
  gameState.playing = true;
  gameState.timer = gameState.world.timeLimit;
  gameState.keysCollected = 0;
  gameState.exitUnlocked = false;
  gameState.elapsed = 0;
  gameState.hintCooldown = 0;
  ui.clearPersistentStatus();
  updateDoorState();
  updateStatusHUD();
  ui.showGame();
}

function returnToMenu() {
  gameState.playing = false;
  input.resetTouchInput();
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
  input.resetTouchInput();
  ui.clearPersistentStatus();
  ui.showEndScreen(victory);
}

function updateDoorState() {
  if (!gameState.world) {
    return;
  }

  const doorMaterial = gameState.world.door.mesh.material;
  doorMaterial.color.copy(
    gameState.exitUnlocked ? gameState.world.door.unlockedColor : gameState.world.door.lockedColor
  );
  doorMaterial.emissive.copy(
    gameState.exitUnlocked ? gameState.world.door.unlockedEmissive : gameState.world.door.lockedEmissive
  );
}

// Item collection, trap penalties, and the exit door are checked every frame.
function collectKey(key) {
  key.collected = true;
  key.mesh.visible = false;
  gameState.keysCollected += 1;
  updateStatusHUD();

  if (gameState.keysCollected >= 3) {
    gameState.exitUnlocked = true;
    updateDoorState();
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

function checkInteractions() {
  if (!gameState.world) {
    return;
  }

  gameState.world.keys.forEach((key) => {
    if (key.collected) {
      return;
    }

    const distance = distanceXZ(key.mesh.position, player.position);
    if (distance <= key.radius) {
      collectKey(key);
    }
  });

  gameState.world.traps.forEach((trap) => {
    const distance = distanceXZ(trap.mesh.position, player.position);
    if (distance <= trap.size && gameState.elapsed - trap.lastTriggeredAt > 1.2) {
      triggerTrap(trap);
    }
  });

  const doorDistance = distanceXZ(gameState.world.door.mesh.position, player.position);
  if (doorDistance <= gameState.world.door.triggerRadius) {
    if (gameState.exitUnlocked) {
      endGame(true);
    } else if (gameState.elapsed >= gameState.hintCooldown) {
      gameState.hintCooldown = gameState.elapsed + 1.2;
      ui.showStatus("Collect all keys");
    }
  }
}

function animateWorld(deltaTime) {
  if (!gameState.world) {
    return;
  }

  gameState.world.keys.forEach((key) => {
    if (key.collected) {
      return;
    }

    key.mesh.rotation.y += deltaTime * 1.6;
    key.mesh.position.y = key.baseY + Math.sin(gameState.elapsed * 2.4 + key.phase) * 0.24;
  });

  gameState.world.traps.forEach((trap) => {
    const pulse = 0.88 + Math.sin(gameState.elapsed * 4 + trap.phase) * 0.08;
    trap.mesh.scale.setScalar(pulse);
    trap.mesh.scale.y = 1;
  });
}

function gameLoop() {
  const deltaTime = Math.min(clock.getDelta(), 0.05);
  gameState.elapsed += deltaTime;

  if (gameState.playing && gameState.world) {
    const inputState = input.consumeFrameState();
    const collisionBoxes = gameState.exitUnlocked
      ? gameState.world.collisionBoxes
      : [
          ...gameState.world.collisionBoxes,
          {
            minX: gameState.world.door.mesh.position.x - MAZE_CONFIG.wallThickness / 2,
            maxX: gameState.world.door.mesh.position.x + MAZE_CONFIG.wallThickness / 2,
            minZ: gameState.world.door.mesh.position.z - (MAZE_CONFIG.cellSize * 0.65) / 2,
            maxZ: gameState.world.door.mesh.position.z + (MAZE_CONFIG.cellSize * 0.65) / 2,
          },
        ];

    player.update(deltaTime, inputState, collisionBoxes);
    animateWorld(deltaTime);
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
    animateWorld(deltaTime);
  }

  renderer.render(scene, camera);
}

function resizeRenderer() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

ui.bindEvents({
  onPlay: startGame,
  onShowInstructions: showInstructions,
  onHideInstructions: hideInstructions,
  onPlayAgain: startGame,
  onMainMenu: returnToMenu,
  onDifficultyChange: setDifficulty,
});

setDifficulty("easy");
createWorld();
returnToMenu();
window.addEventListener("resize", resizeRenderer);
renderer.setAnimationLoop(gameLoop);
