import * as THREE from "./vendor/three.module.js";

export const DIFFICULTIES = {
  easy: { label: "Easy", size: 10, time: 180 },
  medium: { label: "Medium", size: 15, time: 120 },
  hard: { label: "Hard", size: 20, time: 90 },
};

export const MAZE_CONFIG = {
  cellSize: 6,
  wallThickness: 0.6,
  wallHeight: 4,
  floorY: 0,
  playerEyeHeight: 1.7,
};

const DIRECTIONS = [
  { key: "N", dx: 0, dy: -1, opposite: "S" },
  { key: "E", dx: 1, dy: 0, opposite: "W" },
  { key: "S", dx: 0, dy: 1, opposite: "N" },
  { key: "W", dx: -1, dy: 0, opposite: "E" },
];

// Randomize traversal order so each recursive carve creates a fresh maze layout.
function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}

// Convert logical maze cells into centered world positions for Three.js meshes.
function cellToWorld(x, y, size) {
  const offset = (size * MAZE_CONFIG.cellSize) / 2;

  return {
    x: x * MAZE_CONFIG.cellSize - offset + MAZE_CONFIG.cellSize / 2,
    z: y * MAZE_CONFIG.cellSize - offset + MAZE_CONFIG.cellSize / 2,
  };
}

// Build a grid where each cell starts fully enclosed by walls.
function createGrid(size) {
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => ({
      x,
      y,
      visited: false,
      walls: { N: true, E: true, S: true, W: true },
    }))
  );
}

// Carve a perfect maze with a depth-first search and leave a single exit opening.
function carveMaze(size) {
  const grid = createGrid(size);
  const stack = [grid[0][0]];
  grid[0][0].visited = true;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = shuffle(
      DIRECTIONS.map((direction) => {
        const nextX = current.x + direction.dx;
        const nextY = current.y + direction.dy;
        const neighbor = grid[nextY]?.[nextX];

        return neighbor && !neighbor.visited ? { direction, neighbor } : null;
      }).filter(Boolean)
    );

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const { direction, neighbor } = neighbors[0];
    current.walls[direction.key] = false;
    neighbor.walls[direction.opposite] = false;
    neighbor.visited = true;
    stack.push(neighbor);
  }

  grid[size - 1][size - 1].walls.E = false;
  return grid;
}

// Pick random empty cells for gameplay items while avoiding reserved spots.
function chooseCells(size, count, blockedSet) {
  const cells = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const id = `${x},${y}`;
      if (!blockedSet.has(id)) {
        cells.push({ x, y, id });
      }
    }
  }

  shuffle(cells);
  return cells.slice(0, count);
}

function createWallBox(x, z, width, depth) {
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  };
}

// Assemble a simple stylized key from reusable primitive meshes.
function buildKeyMesh(geometries, material) {
  const keyGroup = new THREE.Group();
  const ring = new THREE.Mesh(geometries.ring, material);
  const stem = new THREE.Mesh(geometries.stem, material);
  const toothA = new THREE.Mesh(geometries.toothA, material);
  const toothB = new THREE.Mesh(geometries.toothB, material);

  ring.rotation.y = Math.PI / 2;
  stem.position.set(0.62, 0, 0);
  toothA.position.set(0.96, -0.18, 0);
  toothB.position.set(1.18, -0.08, 0);

  keyGroup.add(ring, stem, toothA, toothB);
  return keyGroup;
}

// Create the playable maze, including geometry, collision data, keys, traps, and exit door.
export function buildMazeWorld(scene, difficultyKey) {
  const settings = DIFFICULTIES[difficultyKey] ?? DIFFICULTIES.easy;
  const size = settings.size;
  const grid = carveMaze(size);
  const cellSize = MAZE_CONFIG.cellSize;
  const wallThickness = MAZE_CONFIG.wallThickness;
  const wallHeight = MAZE_CONFIG.wallHeight;
  const halfMaze = (size * cellSize) / 2;
  const blockedCells = new Set(["0,0", `${size - 1},${size - 1}`]);
  const keyCells = chooseCells(size, 3, blockedCells);
  keyCells.forEach((cell) => blockedCells.add(cell.id));
  const trapCount = Math.max(4, Math.floor(size * size * 0.09));
  const trapCells = chooseCells(size, trapCount, blockedCells);

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x0a8198,
    emissiveIntensity: 0.45,
    roughness: 0.38,
    metalness: 0.15,
  });
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x091329,
    roughness: 0.95,
    metalness: 0.05,
  });
  const trapMaterial = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.55,
    roughness: 0.35,
  });
  const keyMaterial = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0x8a6b00,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.55,
  });
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e3a5f,
    emissive: 0x082f49,
    emissiveIntensity: 0.5,
    roughness: 0.35,
    metalness: 0.15,
  });

  const wallBoxGeometry = new THREE.BoxGeometry(cellSize, wallHeight, wallThickness);
  const sideWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, cellSize);
  const floorGeometry = new THREE.PlaneGeometry(size * cellSize, size * cellSize);
  const trapGeometry = new THREE.BoxGeometry(cellSize * 0.5, 0.25, cellSize * 0.5);
  const doorGeometry = new THREE.BoxGeometry(wallThickness, wallHeight * 0.82, cellSize * 0.65);
  const keyGeometries = {
    ring: new THREE.TorusGeometry(0.34, 0.12, 12, 24),
    stem: new THREE.BoxGeometry(0.85, 0.12, 0.12),
    toothA: new THREE.BoxGeometry(0.14, 0.34, 0.12),
    toothB: new THREE.BoxGeometry(0.14, 0.22, 0.12),
  };

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = MAZE_CONFIG.floorY;
  floor.receiveShadow = true;
  worldGroup.add(floor);

  const collisionBoxes = [];
  const wallsGroup = new THREE.Group();
  worldGroup.add(wallsGroup);

  const addWall = (x, z, geometry, rotationY = 0) => {
    const mesh = new THREE.Mesh(geometry, wallMaterial);
    mesh.position.set(x, wallHeight / 2, z);
    mesh.rotation.y = rotationY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    wallsGroup.add(mesh);
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cell = grid[y][x];
      const center = cellToWorld(x, y, size);

      if (cell.walls.N) {
        const z = center.z - cellSize / 2;
        addWall(center.x, z, wallBoxGeometry);
        collisionBoxes.push(createWallBox(center.x, z, cellSize, wallThickness));
      }

      if (cell.walls.W) {
        const xPos = center.x - cellSize / 2;
        addWall(xPos, center.z, sideWallGeometry);
        collisionBoxes.push(createWallBox(xPos, center.z, wallThickness, cellSize));
      }

      if (y === size - 1 && cell.walls.S) {
        const z = center.z + cellSize / 2;
        addWall(center.x, z, wallBoxGeometry);
        collisionBoxes.push(createWallBox(center.x, z, cellSize, wallThickness));
      }

      if (x === size - 1 && y !== size - 1 && cell.walls.E) {
        const xPos = center.x + cellSize / 2;
        addWall(xPos, center.z, sideWallGeometry);
        collisionBoxes.push(createWallBox(xPos, center.z, wallThickness, cellSize));
      }
    }
  }

  const keys = keyCells.map((cell, index) => {
    const worldPosition = cellToWorld(cell.x, cell.y, size);
    const mesh = buildKeyMesh(keyGeometries, keyMaterial);
    mesh.position.set(worldPosition.x, 1.35, worldPosition.z);
    mesh.castShadow = true;
    mesh.userData.baseY = 1.35;
    worldGroup.add(mesh);

    return {
      id: `key-${index}`,
      mesh,
      radius: 1.15,
      baseY: 1.35,
      phase: Math.random() * Math.PI * 2,
      collected: false,
    };
  });

  const traps = trapCells.map((cell, index) => {
    const worldPosition = cellToWorld(cell.x, cell.y, size);
    const mesh = new THREE.Mesh(trapGeometry, trapMaterial);
    mesh.position.set(worldPosition.x, 0.12, worldPosition.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    worldGroup.add(mesh);

    return {
      id: `trap-${index}`,
      mesh,
      size: cellSize * 0.34,
      lastTriggeredAt: -Infinity,
      phase: Math.random() * Math.PI * 2,
    };
  });

  const exitCellCenter = cellToWorld(size - 1, size - 1, size);
  const door = new THREE.Mesh(doorGeometry, doorMaterial);
  door.position.set(halfMaze - wallThickness / 2, wallHeight * 0.41, exitCellCenter.z);
  door.castShadow = true;
  door.receiveShadow = true;
  worldGroup.add(door);
  const doorCollisionBox = {
    minX: door.position.x - wallThickness / 2,
    maxX: door.position.x + wallThickness / 2,
    minZ: door.position.z - (cellSize * 0.65) / 2,
    maxZ: door.position.z + (cellSize * 0.65) / 2,
  };

  return {
    difficultyKey,
    difficultyLabel: settings.label,
    timeLimit: settings.time,
    size,
    group: worldGroup,
    collisionBoxes,
    lockedCollisionBoxes: [...collisionBoxes, doorCollisionBox],
    playerStart: new THREE.Vector3(-halfMaze + cellSize / 2, MAZE_CONFIG.playerEyeHeight, -halfMaze + cellSize / 2),
    boundsRadius: halfMaze - 0.3,
    keys,
    traps,
    door: {
      mesh: door,
      collisionBox: doorCollisionBox,
      lockedColor: new THREE.Color(0x1e3a5f),
      lockedEmissive: new THREE.Color(0x082f49),
      unlockedColor: new THREE.Color(0x22c55e),
      unlockedEmissive: new THREE.Color(0x166534),
      triggerRadius: 1.7,
    },
    resources: [
      wallMaterial,
      floorMaterial,
      trapMaterial,
      keyMaterial,
      doorMaterial,
      wallBoxGeometry,
      sideWallGeometry,
      floorGeometry,
      trapGeometry,
      doorGeometry,
      ...Object.values(keyGeometries),
    ],
  };
}

// Tear down the previous world before generating a new run.
export function disposeWorld(scene, world) {
  if (!world) {
    return;
  }

  scene.remove(world.group);
  world.resources.forEach((resource) => resource.dispose?.());
}
