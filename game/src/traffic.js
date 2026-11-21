// Traffic cars that follow the street grid and pedestrians who stroll the
// sidewalks. Both are simple, robust and deterministic under a seed.
import { WORLD, ROAD_W, STREETS_X, STREETS_Y, CAR_COLORS, TRAFFIC_SPEED } from './config.js';
import { range, int, pick } from './random.js';
import { nearestStreetX, nearestStreetY } from './city.js';

const LANE = 22; // offset from the street centre for right-hand traffic

export function spawnTraffic(rng, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    cars.push(makeTrafficCar(rng, cars));
  }
  return cars;
}

function makeTrafficCar(rng, others) {
  const vertical = rng() < 0.5;
  const road = vertical ? pick(rng, STREETS_X) : pick(rng, STREETS_Y);
  const dir = rng() < 0.5 ? 1 : -1;
  const span = vertical ? WORLD.h - 160 : WORLD.w - 160;
  const s = range(rng, 80, span);
  const car = {
    kind: 'traffic',
    axis: vertical ? 'y' : 'x', // axis of travel
    road,
    s,
    dir,
    speed: range(rng, TRAFFIC_SPEED[0], TRAFFIC_SPEED[1]),
    cruise: 0,
    color: pick(rng, CAR_COLORS),
    x: 0,
    y: 0,
    angle: 0,
    turnCooldown: 0,
  };
  car.cruise = car.speed;
  placeCar(car);
  // Keep spawns from stacking on an identical lane position.
  for (const other of others) {
    if (other.axis === car.axis && other.road === car.road && other.dir === car.dir &&
        Math.abs(other.s - car.s) < 120) {
      car.s = (car.s + 160) % span;
      placeCar(car);
    }
  }
  return car;
}

export function placeCar(car) {
  if (car.axis === 'y') {
    car.x = car.road + (car.dir > 0 ? LANE : -LANE);
    car.y = car.s;
    car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    car.x = car.s;
    car.y = car.road + (car.dir > 0 ? LANE : -LANE);
    car.angle = car.dir > 0 ? 0 : Math.PI;
  }
}

// A car ahead on the same lane within `gap` slows this one down.
function carAhead(cars, car, gap) {
  let best = null;
  for (const other of cars) {
    if (other === car || other.axis !== car.axis || other.road !== car.road || other.dir !== car.dir) continue;
    const ahead = (other.s - car.s) * car.dir;
    if (ahead > 0 && ahead < gap && (best === null || ahead < best)) best = ahead;
  }
  return best;
}

export function updateTraffic(cars, dt, rng) {
  const span = (car) => (car.axis === 'y' ? WORLD.h - 160 : WORLD.w - 160);
  for (const car of cars) {
    if (car.kind === 'player') continue; // the player drives this one
    car.turnCooldown -= dt;
    const ahead = carAhead(cars, car, 110);
    const target = ahead === null ? car.cruise : Math.min(car.cruise, Math.max(0, (ahead - 60) * 1.6));
    car.speed += (target - car.speed) * Math.min(1, dt * 2.5);
    car.s += car.speed * car.dir * dt;
    // Turn at an intersection sometimes, u-turn at the edge of the map.
    if (car.turnCooldown <= 0) {
      const crossings = car.axis === 'y' ? STREETS_Y : STREETS_X;
      for (const cross of crossings) {
        if (Math.abs(car.s - cross) < 14 && rng() < 0.22) {
          car.axis = car.axis === 'y' ? 'x' : 'y';
          car.road = cross;
          car.dir = rng() < 0.5 ? 1 : -1;
          car.s = car.axis === 'y' ? car.y : car.x;
          car.turnCooldown = 2;
          break;
        }
      }
    }
    if (car.s < 70) { car.s = 70; car.dir = 1; car.turnCooldown = 1; }
    if (car.s > span(car) + 70) { car.s = span(car) + 70; car.dir = -1; car.turnCooldown = 1; }
    placeCar(car);
  }
}

// --- Pedestrians ---------------------------------------------------------

export function spawnPeds(rng, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    peds.push(makePed(rng));
  }
  return peds;
}

function makePed(rng) {
  const vertical = rng() < 0.5;
  const road = vertical ? pick(rng, STREETS_X) : pick(rng, STREETS_Y);
  const side = rng() < 0.5 ? 1 : -1;
  const span = vertical ? WORLD.h - 200 : WORLD.w - 200;
  const s = range(rng, 100, span);
  const ped = {
    axis: vertical ? 'y' : 'x',
    road,
    side,
    s,
    dir: rng() < 0.5 ? 1 : -1,
    speed: range(rng, 32, 62),
    color: pick(rng, ['#e8e8e8', '#d94f3d', '#3d7dd9', '#e8b93d', '#58a34a', '#8a5fc0', '#2b2b30']),
    skin: pick(rng, ['#e8b48a', '#c98d5f', '#8a5a3b', '#f2c9a0']),
    x: 0,
    y: 0,
    down: 0, // seconds spent knocked down, 0 = walking
    downTimer: 0,
  };
  placePed(ped);
  return ped;
}

export function placePed(ped) {
  const off = ROAD_W / 2 + 14;
  if (ped.axis === 'y') {
    ped.x = ped.road + ped.side * off;
    ped.y = ped.s;
  } else {
    ped.x = ped.s;
    ped.y = ped.road + ped.side * off;
  }
}

export function updatePeds(peds, dt, rng, playerCar) {
  for (const ped of peds) {
    if (ped.down > 0) {
      ped.downTimer -= dt;
      if (ped.downTimer <= 0) {
        // Get up somewhere else in the city.
        const fresh = makePed(rng);
        Object.assign(ped, fresh, { down: 0, downTimer: 0 });
      }
      continue;
    }
    // Flee a fast car bearing down on the sidewalk: run along the
    // sidewalk away from it, three times as fast as a stroll.
    if (playerCar && Math.abs(playerCar.speed || 0) > 150) {
      const dx = ped.x - playerCar.x;
      const dy = ped.y - playerCar.y;
      if (dx * dx + dy * dy < 90 * 90) {
        const away = ped.axis === 'y'
          ? (ped.y < playerCar.y ? -1 : 1)
          : (ped.x < playerCar.x ? -1 : 1);
        ped.s += ped.speed * 3 * away * dt;
        const spanFlee = ped.axis === 'y' ? WORLD.h - 200 : WORLD.w - 200;
        if (ped.s < 90) ped.s = 90;
        if (ped.s > spanFlee + 90) ped.s = spanFlee + 90;
        placePed(ped);
        continue;
      }
    }
    ped.s += ped.speed * ped.dir * dt;
    const span = ped.axis === 'y' ? WORLD.h - 200 : WORLD.w - 200;
    if (ped.s < 90) { ped.s = 90; ped.dir = 1; }
    if (ped.s > span + 90) { ped.s = span + 90; ped.dir = -1; }
    // Occasionally cross at an intersection onto the other street's sidewalk
    // — never right in front of the player's car, so a fast driver is not
    // constantly handed a hit-and-run they could not avoid.
    const carNear = playerCar &&
      Math.abs(playerCar.x - ped.x) < 170 && Math.abs(playerCar.y - ped.y) < 170;
    if (!carNear && rng() < dt * 0.008) {
      const crossings = ped.axis === 'y' ? STREETS_Y : STREETS_X;
      for (const cross of crossings) {
        if (Math.abs(ped.s - cross) < 20) {
          ped.axis = ped.axis === 'y' ? 'x' : 'y';
          ped.road = cross;
          ped.s = ped.axis === 'y' ? ped.y : ped.x;
          break;
        }
      }
    }
    placePed(ped);
  }
}

// Knock a pedestrian down (hit by a car or a punch).
export function knockPed(ped) {
  if (ped.down > 0) return;
  ped.down = 1;
  ped.downTimer = 6;
}

export function nearestPed(peds, x, y, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const ped of peds) {
    if (ped.down > 0) continue;
    const dx = ped.x - x;
    const dy = ped.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = ped;
    }
  }
  return best;
}
