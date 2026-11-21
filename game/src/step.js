// One fixed step of the whole simulation: the player, traffic, pedestrians,
// police, missions, particles and the camera. The live loop and the
// screenshot autopilot both step the world through here, so a screenshot
// is always a real moment of play.
import { WORLD, VIEW } from './config.js';
import { clamp, lerp } from './random.js';
import { updatePlayer } from './player.js';
import { updateTraffic, updatePeds } from './traffic.js';
import { updatePolice } from './police.js';
import { updateMissions } from './missions.js';

export function stepWorld(S, dt, axes) {
  S.time += dt;
  updatePlayer(S, dt, axes);
  updateTraffic(S.traffic, dt, S.rng);
  updatePeds(S.peds, dt, S.rng, S.player.car);
  updatePolice(S, dt);
  updateMissions(S, dt);

  if (S.banner) {
    S.banner.t -= dt;
    if (S.banner.t <= 0) S.banner = null;
  }
  for (const pt of S.particles) {
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
  }
  S.particles = S.particles.filter((pt) => pt.life > 0);

  // Camera follows the player, clamped inside the city.
  const targetX = clamp(S.player.x, VIEW.w / 2, WORLD.w - VIEW.w / 2);
  const targetY = clamp(S.player.y, VIEW.h / 2, WORLD.h - VIEW.h / 2);
  S.camera.x = lerp(S.camera.x, targetX, Math.min(1, dt * 5));
  S.camera.y = lerp(S.camera.y, targetY, Math.min(1, dt * 5));

  S.audio.update(!S.player.onFoot, S.player.speed, S.player.wanted);
}
