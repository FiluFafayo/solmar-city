// The Solmar police: patrol cars that chase the player when the wanted
// level rises, and officers who get out and run the player down on foot.
// Getting caught means BUSTED; outrunning them long enough cools the heat.
import { WORLD, CAR, POLICE_CAR_SPEED, OFFICER_SPEED, MAX_WANTED } from './config.js';
import { clamp, dist2, angleDiff, range, pick } from './random.js';
import { collideCircle } from './city.js';
import { damagePlayer } from './player.js';

export function createPolice() {
  return { cars: [], officers: [], alert: false, spawnTimer: 0, decayTimer: 0 };
}

function spawnPoliceCar(S) {
  const p = S.player;
  // Appear on a road just outside the camera view, ahead of the player.
  const angle = S.rng() * Math.PI * 2;
  const r = 720;
  let x = p.x + Math.cos(angle) * r;
  let y = p.y + Math.sin(angle) * r;
  x = clamp(x, 60, WORLD.w - 60);
  y = clamp(y, 60, WORLD.h - 60);
  const car = {
    kind: 'police',
    x, y,
    angle: Math.atan2(p.y - y, p.x - x),
    speed: 0,
    color: '#2f6fd0',
    siren: S.rng() * 2,
    ramCooldown: 0,
  };
  S.police.cars.push(car);
  return car;
}

function spawnOfficer(S, x, y) {
  S.police.officers.push({
    x, y,
    angle: 0,
    speed: 0,
    hold: 0, // seconds spent holding the player
    down: 0, // seconds knocked out
  });
}

export function updatePolice(S, dt) {
  const p = S.player;
  const pol = S.police;

  // Wanted decay: stay clean and unseen for a while and the heat cools.
  if (p.wanted > 0 && S.time - p.lastCrime > 10) {
    const nearest = nearestPoliceDist(S);
    if (nearest > 520) {
      pol.decayTimer += dt;
      if (pol.decayTimer > 6) {
        pol.decayTimer = 0;
        p.wanted -= 1;
        if (p.wanted === 0) pol.alert = false;
      }
    } else {
      pol.decayTimer = 0;
    }
  }

  // Keep the right number of patrol cars on the road.
  const want = Math.min(p.wanted, 4);
  pol.spawnTimer -= dt;
  if (pol.cars.length < want && pol.spawnTimer <= 0) {
    spawnPoliceCar(S);
    pol.spawnTimer = 2.5;
  }
  // When the heat is gone, patrol cars drive off and officers stand down.
  if (p.wanted === 0) {
    pol.officers = [];
    for (const car of [...pol.cars]) {
      car.speed = Math.max(0, car.speed - 200 * dt);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      if (car.speed === 0) pol.cars.splice(pol.cars.indexOf(car), 1);
    }
  }
  // Officers cannot catch a car: they give up once the player is driving.
  if (!p.onFoot) pol.officers = [];

  for (const car of pol.cars) {
    if (p.wanted === 0) continue;
    // Chase steering: turn toward the player, accelerate hard.
    const desired = Math.atan2(p.y - car.y, p.x - car.x);
    const diff = angleDiff(car.angle, desired);
    car.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
    const top = POLICE_CAR_SPEED * (0.85 + 0.06 * p.wanted);
    car.speed = Math.min(top, car.speed + 520 * dt);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const pos = { x: nx, y: ny };
    if (collideCircle(S.city, pos, CAR.radius)) car.speed *= 0.5;
    car.x = pos.x;
    car.y = pos.y;
    car.siren += dt;
    const d = dist2(car.x, car.y, p.x, p.y);

    if (!p.onFoot) {
      // Ram the player's car: one solid hit, then back off so the patrol
      // car cannot glue itself to the player frame after frame.
      car.ramCooldown = Math.max(0, (car.ramCooldown || 0) - dt);
      if (d < 46 * 46 && car.ramCooldown <= 0) {
        damagePlayer(S, 2);
        S.audio.thud();
        car.ramCooldown = 2.0;
        const push = Math.atan2(car.y - p.y, car.x - p.x);
        car.x += Math.cos(push) * 70;
        car.y += Math.sin(push) * 70;
        car.speed *= 0.25;
        p.car.speed *= 0.85;
      }
    } else if (d < 130 * 130 && pol.officers.length < 2 && S.rng() < dt * 0.5) {
      // Pull over and send an officer after the player on foot.
      spawnOfficer(S, car.x + 30, car.y + 30);
      car.speed = 0;
    }
  }

  // Officers run the player down.
  for (const officer of pol.officers) {
    if (officer.down > 0) {
      officer.down -= dt;
      continue;
    }
    const desired = Math.atan2(p.y - officer.y, p.x - officer.x);
    officer.angle = desired;
    officer.x += Math.cos(desired) * OFFICER_SPEED * dt;
    officer.y += Math.sin(desired) * OFFICER_SPEED * dt;
    const pos = { x: officer.x, y: officer.y };
    collideCircle(S.city, pos, 14);
    officer.x = pos.x;
    officer.y = pos.y;
    if (dist2(officer.x, officer.y, p.x, p.y) < 28 * 28) {
      officer.hold += dt;
      if (officer.hold > 0.9) {
        S.screen = 'busted';
        S.audio.sting();
      }
    } else {
      officer.hold = 0;
    }
  }
}

export function nearestPoliceDist(S) {
  const p = S.player;
  let best = Infinity;
  for (const car of S.police.cars) best = Math.min(best, dist2(car.x, car.y, p.x, p.y));
  for (const o of S.police.officers) best = Math.min(best, dist2(o.x, o.y, p.x, p.y));
  return Math.sqrt(best);
}
