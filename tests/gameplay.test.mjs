import assert from 'node:assert/strict';
import { buildMazeWorld } from '../docs/maze.js';
import { evaluateInteractions } from '../docs/gameplay.js';

function createState(world) {
  return {
    timer: world.timeLimit,
    keysCollected: 0,
    exitUnlocked: false,
    elapsed: 0,
    hintCooldown: 0,
  };
}

{
  const world = buildMazeWorld('easy');
  world.keys = [
    { id: 'key-0', cell: { x: 0, y: 0 }, collected: false, phase: 0 },
    { id: 'key-1', cell: { x: 0, y: 0 }, collected: false, phase: 0 },
    { id: 'key-2', cell: { x: 0, y: 0 }, collected: false, phase: 0 },
  ];
  world.traps = [];

  const state = createState(world);
  const result = evaluateInteractions(state, world, { x: 0, y: 0 });

  assert.equal(result.collectedKey, true);
  assert.equal(result.unlockedExit, true);
  assert.equal(state.keysCollected, 3);
  assert.equal(state.exitUnlocked, true);
  assert.equal(world.keys.every((key) => key.collected), true);
}

{
  const world = buildMazeWorld('easy');
  world.keys = [];
  world.traps = [{ id: 'trap-0', cell: { x: 0, y: 0 }, lastTriggeredAt: -Infinity, phase: 0 }];

  const state = createState(world);
  state.timer = 30;
  state.elapsed = 5;
  evaluateInteractions(state, world, { x: 0, y: 0 });
  assert.equal(state.timer, 20);

  state.elapsed = 5.2;
  evaluateInteractions(state, world, { x: 0, y: 0 });
  assert.equal(state.timer, 20);

  state.elapsed = 5.7;
  evaluateInteractions(state, world, { x: 0, y: 0 });
  assert.equal(state.timer, 10);
}

{
  const world = buildMazeWorld('easy');
  world.keys = [];
  world.traps = [];
  world.exitCell = { x: 0, y: 0 };

  const state = createState(world);
  let result = evaluateInteractions(state, world, { x: 0, y: 0 });
  assert.equal(result.reachedExit, false);
  assert.equal(result.needsExitHint, true);

  state.exitUnlocked = true;
  state.elapsed = 2;
  result = evaluateInteractions(state, world, { x: 0, y: 0 });
  assert.equal(result.reachedExit, true);
}

console.log('gameplay tests passed');
