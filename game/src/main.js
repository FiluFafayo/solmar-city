// Solmar City — an original top-down open-world crime game.
// ?seed=N fixes the decorative random details. ?shot=cover|title|onfoot|mission
// stages one deterministic scene and renders a single frame for a screenshot.
import { VIEW, PLAYER_START } from './config.js';
import { mulberry32, range, int } from './random.js';
import { buildCity, insideBuilding, isOnRoad } from './city.js';
import { spawnTraffic, spawnPeds } from './traffic.js';
import { createPlayer, respawn } from './player.js';
import { createPolice } from './police.js';
import { createMissions, loadSave, saveProgress } from './missions.js';
import { AudioSys } from './audio.js';
import { render } from './render.js';
import { stepWorld } from './step.js';
import { stageShot } from './shots.js';
import { attachInput, readAxes, justPressed } from './input.js';

const params = new URLSearchParams(location.search);
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;
const shot = params.get('shot');

const canvas = document.getElementById('game');
canvas.width = VIEW.w;
canvas.height = VIEW.h;
const ctx = canvas.getContext('2d');

function newGame() {
  const rng = mulberry32(seed);
  const city = buildCity(rng);
  const S = {
    rng,
    city,
    traffic: spawnTraffic(rng, 14),
    peds: spawnPeds(rng, 26),
    player: createPlayer(),
    police: createPolice(),
    missions: createMissions(),
    cash: [],
    particles: [],
    camera: { x: PLAYER_START.x, y: PLAYER_START.y },
    time: 0,
    screen: 'title',
    banner: null,
    audio: new AudioSys(),
    save: loadSave(),
    stats: { earned: 0 },
  };
  // Cash bundles on sidewalks, never inside a building.
  for (let i = 0; i < 8; i += 1) {
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 40; tries += 1) {
      x = range(rng, 120, 2280);
      y = range(rng, 120, 1620);
      if (!insideBuilding(city, x, y) && !isOnRoad(x, y)) break;
    }
    S.cash.push({ x, y, value: int(rng, 25, 75), taken: false });
  }
  return S;
}

const S = newGame();

attachInput(canvas, () => S.audio.ensure());

if (shot) {
  // Screenshot mode: stage the scene synchronously and render one frame.
  stageShot(shot, S);
  render(S, ctx);
  window.__shotReady = true;
} else {
  // Live play.
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const axes = readAxes();
    axes.interact = justPressed('e');
    const pausePressed = justPressed('p') || justPressed('Escape');

    if (S.screen === 'title') {
      if (justPressed('Enter')) {
        S.screen = 'play';
        S.audio.ensure();
      }
      render(S, ctx);
    } else if (S.screen === 'play') {
      if (pausePressed) {
        S.screen = 'paused';
      } else {
        stepWorld(S, dt, axes);
      }
      render(S, ctx);
    } else if (S.screen === 'paused') {
      if (pausePressed) S.screen = 'play';
      render(S, ctx);
    } else if (S.screen === 'busted' || S.screen === 'wasted') {
      if (justPressed('Enter')) respawn(S);
      render(S, ctx);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Keep the save fresh when the player earns.
setInterval(() => {
  if (S.screen === 'play') saveProgress(S);
}, 5000);
