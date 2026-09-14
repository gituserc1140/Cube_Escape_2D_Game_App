# Cube Escape 3D

Cube Escape 3D is a mobile-friendly first-person maze game built with HTML, CSS, JavaScript, and Three.js. Each run generates a fresh neon maze where you must collect three floating keys, avoid time-draining traps, unlock the exit, and escape before the countdown reaches zero.

## Game Overview

- First-person maze exploration with desktop and mobile controls
- Randomly generated maze layouts for every new game
- Three collectible keys needed to unlock the exit
- Trap tiles that remove 10 seconds on contact
- Difficulty modes with different maze sizes and timers
- Responsive HUD, menus, and end screens
- GitHub Pages-ready deployment from the `/docs` folder

## Controls

### Desktop

- **W**: move forward
- **S**: move backward
- **A**: strafe left
- **D**: strafe right
- **Mouse drag**: look around
- **Arrow keys**: keyboard camera look

### Mobile / Tablet

- **Virtual joystick**: movement
- **Look pad swipe**: look around

## Difficulty Modes

- **Easy**: 10x10 maze, 180 seconds
- **Medium**: 15x15 maze, 120 seconds
- **Hard**: 20x20 maze, 90 seconds

## Local Setup

1. Clone this repository.
2. Open the repository folder.
3. Start a static server from the repository root, for example:

   ```bash
   python -m http.server 8000
   ```

4. Visit `http://localhost:8000/` in your browser.

## Project Structure

```text
docs/
  index.html
  style.css
  main.js
  maze.js
  player.js
  ui.js
  input.js
README.md
```

## GitHub Pages Deployment

1. Push the repository to GitHub.
2. Open **Settings → Pages** for the repository.
3. Under **Build and deployment**, choose:
   - **Source:** Deploy from a branch
   - **Branch:** `main` (or your default branch)
   - **Folder:** `/docs`
4. Save the settings and wait for GitHub Pages to publish.
5. Open the published site at:

   `https://<your-username>.github.io/<your-repo>/`

## Notes

- The root `index.html` redirects to `/docs/` for convenience.
- The game runs entirely client-side with no backend services.
