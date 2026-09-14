export const DIFFICULTIES = {
  easy: { label: "Easy", size: 10, time: 180 },
  medium: { label: "Medium", size: 15, time: 120 },
  hard: { label: "Hard", size: 20, time: 90 },
};

export const MAZE_CONFIG = {
  keyCount: 3,
  minTraps: 4,
  trapDensity: 0.09,
};

const DIRECTIONS = [
  { key: "N", dx: 0, dy: -1, opposite: "S" },
  { key: "E", dx: 1, dy: 0, opposite: "W" },
  { key: "S", dx: 0, dy: 1, opposite: "N" },
  { key: "W", dx: -1, dy: 0, opposite: "E" },
];

const DIRECTION_MAP = Object.fromEntries(DIRECTIONS.map((direction) => [direction.key, direction]));

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}

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

export function buildMazeWorld(difficultyKey) {
  const settings = DIFFICULTIES[difficultyKey] ?? DIFFICULTIES.easy;
  const size = settings.size;
  const grid = carveMaze(size);
  const blockedCells = new Set(["0,0", `${size - 1},${size - 1}`]);
  const keyCells = chooseCells(size, MAZE_CONFIG.keyCount, blockedCells);
  keyCells.forEach((cell) => blockedCells.add(cell.id));
  const trapCount = Math.max(MAZE_CONFIG.minTraps, Math.floor(size * size * MAZE_CONFIG.trapDensity));
  const trapCells = chooseCells(size, trapCount, blockedCells);

  return {
    difficultyKey,
    difficultyLabel: settings.label,
    timeLimit: settings.time,
    size,
    grid,
    playerStart: { x: 0, y: 0 },
    exitCell: { x: size - 1, y: size - 1 },
    keys: keyCells.map((cell, index) => ({
      id: `key-${index}`,
      cell: { x: cell.x, y: cell.y },
      collected: false,
      phase: Math.random() * Math.PI * 2,
    })),
    traps: trapCells.map((cell, index) => ({
      id: `trap-${index}`,
      cell: { x: cell.x, y: cell.y },
      lastTriggeredAt: -Infinity,
      phase: Math.random() * Math.PI * 2,
    })),
  };
}

export function getCell(world, x, y) {
  return world.grid[y]?.[x] ?? null;
}

export function canMove(world, x, y, directionKey) {
  const cell = getCell(world, x, y);
  const direction = DIRECTION_MAP[directionKey];

  if (!cell || !direction || cell.walls[directionKey]) {
    return false;
  }

  return Boolean(getCell(world, x + direction.dx, y + direction.dy));
}

export function stepPosition(world, x, y, directionKey) {
  if (!canMove(world, x, y, directionKey)) {
    return { x, y };
  }

  const direction = DIRECTION_MAP[directionKey];
  return {
    x: x + direction.dx,
    y: y + direction.dy,
  };
}
