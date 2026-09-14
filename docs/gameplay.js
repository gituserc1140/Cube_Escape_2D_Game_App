import { MAZE_CONFIG } from "./maze.js";

function isSameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function collectKey(state, key) {
  if (key.collected) {
    return { collected: false, unlockedExit: false };
  }

  key.collected = true;
  state.keysCollected += 1;

  if (!state.exitUnlocked && state.keysCollected >= MAZE_CONFIG.keyCount) {
    state.exitUnlocked = true;
    return { collected: true, unlockedExit: true };
  }

  return { collected: true, unlockedExit: false };
}

export function triggerTrap(state, trap) {
  trap.lastTriggeredAt = state.elapsed;
  state.timer = Math.max(0, state.timer - 10);
  return { triggered: true };
}

export function evaluateInteractions(state, world, playerPosition) {
  const result = {
    collectedKey: false,
    unlockedExit: false,
    triggeredTrap: false,
    reachedExit: false,
    needsExitHint: false,
  };

  world.keys.forEach((key) => {
    if (!key.collected && isSameCell(key.cell, playerPosition)) {
      const keyResult = collectKey(state, key);
      result.collectedKey ||= keyResult.collected;
      result.unlockedExit ||= keyResult.unlockedExit;
    }
  });

  world.traps.forEach((trap) => {
    if (isSameCell(trap.cell, playerPosition) && state.elapsed - trap.lastTriggeredAt > 0.6) {
      const trapResult = triggerTrap(state, trap);
      result.triggeredTrap ||= trapResult.triggered;
    }
  });

  if (isSameCell(world.exitCell, playerPosition)) {
    if (state.exitUnlocked) {
      result.reachedExit = true;
    } else if (state.elapsed >= state.hintCooldown) {
      state.hintCooldown = state.elapsed + 1.2;
      result.needsExitHint = true;
    }
  }

  return result;
}
