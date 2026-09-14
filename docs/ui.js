import { DIFFICULTIES } from "./maze.js";

// Handle menu flow, HUD updates, feedback banners, and end-screen presentation.
export class GameUI {
  constructor() {
    this.elements = {
      hud: document.getElementById("hud"),
      timeValue: document.getElementById("timeValue"),
      keyValue: document.getElementById("keyValue"),
      difficultyValue: document.getElementById("difficultyValue"),
      titleScreen: document.getElementById("titleScreen"),
      instructionsScreen: document.getElementById("instructionsScreen"),
      endScreen: document.getElementById("endScreen"),
      endEyebrow: document.getElementById("endEyebrow"),
      endTitle: document.getElementById("endTitle"),
      endMessage: document.getElementById("endMessage"),
      statusBanner: document.getElementById("statusBanner"),
      flashOverlay: document.getElementById("flashOverlay"),
      difficultyButtons: [...document.querySelectorAll(".difficulty-button")],
      playButton: document.getElementById("playButton"),
      instructionsButton: document.getElementById("instructionsButton"),
      closeInstructionsButton: document.getElementById("closeInstructionsButton"),
      playAgainButton: document.getElementById("playAgainButton"),
      mainMenuButton: document.getElementById("mainMenuButton"),
    };

    this.statusTimeout = null;
    this.persistentStatus = "";
  }

  bindEvents(handlers) {
    this.elements.playButton.addEventListener("click", handlers.onPlay);
    this.elements.instructionsButton.addEventListener("click", handlers.onShowInstructions);
    this.elements.closeInstructionsButton.addEventListener("click", handlers.onHideInstructions);
    this.elements.playAgainButton.addEventListener("click", handlers.onPlayAgain);
    this.elements.mainMenuButton.addEventListener("click", handlers.onMainMenu);

    this.elements.difficultyButtons.forEach((button) => {
      button.addEventListener("click", () => handlers.onDifficultyChange(button.dataset.difficulty));
    });
  }

  setDifficulty(difficultyKey) {
    const difficulty = DIFFICULTIES[difficultyKey] ?? DIFFICULTIES.easy;
    this.elements.difficultyValue.textContent = difficulty.label;
    this.elements.difficultyButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.difficulty === difficultyKey);
    });
  }

  updateHUD({ timeRemaining, keysCollected, difficultyLabel }) {
    this.elements.timeValue.textContent = `${Math.max(0, Math.ceil(timeRemaining))}s`;
    this.elements.keyValue.textContent = `${keysCollected} / 3`;
    this.elements.difficultyValue.textContent = difficultyLabel;
  }

  showTitle() {
    this.clearPersistentStatus();
    this.elements.hud.classList.add("hidden");
    this.elements.endScreen.classList.add("hidden");
    this.elements.instructionsScreen.classList.add("hidden");
    this.elements.titleScreen.classList.remove("hidden");
  }

  showInstructions() {
    this.elements.instructionsScreen.classList.remove("hidden");
  }

  hideInstructions() {
    this.elements.instructionsScreen.classList.add("hidden");
  }

  showGame() {
    this.hideStatus();
    this.elements.titleScreen.classList.add("hidden");
    this.elements.instructionsScreen.classList.add("hidden");
    this.elements.endScreen.classList.add("hidden");
    this.elements.hud.classList.remove("hidden");
  }

  showEndScreen(victory) {
    this.elements.hud.classList.add("hidden");
    this.elements.endScreen.classList.remove("hidden");
    this.elements.endEyebrow.textContent = victory ? "Maze Complete" : "Time Expired";
    this.elements.endTitle.textContent = victory ? "You Escaped!" : "Lost In The Maze";
    this.elements.endMessage.textContent = victory
      ? "Every key was yours, and the neon exit finally opened."
      : "The maze sealed before you could break free.";
  }

  showStatus(message, persistent = false) {
    this.persistentStatus = persistent ? message : this.persistentStatus;
    this.elements.statusBanner.textContent = message;
    this.elements.statusBanner.classList.remove("hidden");

    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }

    if (!persistent) {
      this.statusTimeout = window.setTimeout(() => this.hideStatus(), 1400);
    }
  }

  hideStatus() {
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }

    if (this.persistentStatus) {
      this.elements.statusBanner.textContent = this.persistentStatus;
      this.elements.statusBanner.classList.remove("hidden");
      return;
    }

    this.elements.statusBanner.classList.add("hidden");
  }

  clearPersistentStatus() {
    this.persistentStatus = "";
    this.hideStatus();
  }

  flashTrap() {
    this.elements.flashOverlay.classList.add("active");
    window.setTimeout(() => this.elements.flashOverlay.classList.remove("active"), 160);
  }
}
