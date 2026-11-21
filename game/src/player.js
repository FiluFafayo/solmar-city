// The player: Milo Reyes, a courier new to Solmar City. On foot he walks,
// sprints and punches; in a car he drives. Crimes raise the wanted level.
import { WORLD, PLAYER, CAR, MAX_WANTED, PLAYER_START, HOSPITAL } from './config.js';
import { clamp, dist2, angleDiff } from './random.js';
import { collideCircle, insideBuilding, nearestStreetX, nearestStreetY } from './city.js';
import { nearestPed, knockPed } from './traffic.js';

export function createPlayer() {
  return {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    angle: -Math.PI / 2, // facing up the street
    onFoot: true,
    car: null, // the stolen/driven car object when driving
    speed: 0, // current speed (on foot or in car)
    health: 100,
    money: 0,
    wanted: 0,
    lastCrime: -999, // game time of the last crime
    punchTimer: 0,
    punchAnim: 0,
    invulnerable: 0,
    bustedTimer: 0, // seconds a cop has held the player
    moving: false,
  };
}

export function commitCrime(S, stars) {
  S.player.wanted = Math.min(MAX_WANTED, S.player.wanted + stars);
  S.player.lastCrime = S.time;
  S.police.alert = true;
}

// The nearest drivable car (traffic or parked) within reach.
export function nearestCar(S, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  const cars = S.traffic.concat(S.police.cars);
  for (const car of cars) {
    if (car === S.player.car) continue;
    const d = dist2(car.x, car.y, S.player.x, S.player.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function updatePlayer(S, dt, axes) {
  const p = S.player;
  p.punchTimer = Math.max(0, p.punchTimer - dt);
  p.punchAnim = Math.max(0, p.punchAnim - dt);
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  // Health creeps back when the player is not actively taking hits.
  if (p.health < 100 && p.invulnerable <= 0) p.health = Math.min(100, p.health + 1.5 * dt);

  if (p.onFoot) updateOnFoot(S, dt, axes);
  else updateDriving(S, dt, axes);

  // Cash pickups on the sidewalk.
  for (const cash of S.cash) {
    if (cash.taken) continue;
    if (dist2(cash.x, cash.y, p.x, p.y) < 34 * 34) {
      cash.taken = true;
      p.money += cash.value;
      S.stats.earned += cash.value;
      S.audio.blip(880, 0.09);
      S.banner = { text: `+$${cash.value}`, sub: 'pocketed cash', t: 1.2 };
    }
  }
}

function updateOnFoot(S, dt, axes) {
  const p = S.player;
  const mx = axes.steer;
  const my = (axes.down ? 1 : 0) - (axes.up ? 1 : 0);
  const len = Math.hypot(mx, my);
  p.moving = len > 0;
  if (len > 0) {
    const speed = axes.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    p.x += (mx / len) * speed * dt;
    p.y += (my / len) * speed * dt;
    p.angle = Math.atan2(my, mx);
    p.speed = speed;
    const pos = { x: p.x, y: p.y };
    collideCircle(S.city, pos, PLAYER.radius);
    p.x = pos.x;
    p.y = pos.y;
  } else {
    p.speed = 0;
  }

  if (axes.punch && p.punchTimer <= 0) {
    p.punchTimer = PLAYER.punchCooldown;
    p.punchAnim = 0.25;
    S.audio.blip(180, 0.07);
    const fx = p.x + Math.cos(p.angle) * PLAYER.punchRange;
    const fy = p.y + Math.sin(p.angle) * PLAYER.punchRange;
    const ped = nearestPed(S.peds, fx, fy, 34);
    if (ped) {
      knockPed(ped);
      commitCrime(S, 1);
      S.audio.thud();
    }
    // Punching a cop is a worse idea.
    for (const officer of S.police.officers) {
      if (officer.down > 0) continue;
      if (dist2(officer.x, officer.y, fx, fy) < 34 * 34) {
        officer.down = 3;
        commitCrime(S, 1);
        S.audio.thud();
      }
    }
  }

  if (axes.interact) {
    const car = nearestCar(S, 72);
    if (car) enterCar(S, car);
  }
}

export function enterCar(S, car) {
  const p = S.player;
  if (car.kind === 'traffic' && !car.playerOwned) {
    // Stealing a car with a driver in it is a crime — but getting back
    // into a car you just stepped out of is not.
    commitCrime(S, 1);
    S.banner = { text: 'Car stolen!', sub: 'the cops noticed', t: 1.6 };
    S.audio.sirenBlip();
  }
  p.onFoot = false;
  p.car = car;
  p.angle = car.angle;
  p.speed = 0;
  car.kind = 'player';
  car.speed = 0;
}

export function exitCar(S) {
  const p = S.player;
  if (p.onFoot || !p.car) return;
  const car = p.car;
  car.kind = 'traffic';
  car.playerOwned = true; // getting back in later is not a second theft
  car.axis = Math.abs(Math.cos(car.angle)) > Math.abs(Math.sin(car.angle)) ? 'x' : 'y';
  if (car.axis === 'x') {
    car.road = nearestStreetY(car.y);
    car.s = car.x;
    car.dir = Math.cos(car.angle) > 0 ? 1 : -1;
  } else {
    car.road = nearestStreetX(car.x);
    car.s = car.y;
    car.dir = Math.sin(car.angle) > 0 ? 1 : -1;
  }
  car.cruise = 200;
  p.onFoot = true;
  p.car = null;
  // Step out beside the car.
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  const pos = { x: p.x, y: p.y };
  collideCircle(S.city, pos, PLAYER.radius);
  p.x = pos.x;
  p.y = pos.y;
  p.angle = car.angle;
  p.speed = 0;
}

function updateDriving(S, dt, axes) {
  const p = S.player;
  const car = p.car;
  if (!car) {
    p.onFoot = true;
    return;
  }
  // Steering only bites while moving; faster means a wider, heavier turn.
  // Reversing flips the steering, like a real car.
  const speedRatio = clamp(Math.abs(car.speed) / CAR.maxSpeed, 0, 1);
  const steer = axes.steer * CAR.turnRate * (0.35 + 0.65 * speedRatio);
  car.angle += steer * dt * Math.sign(car.speed || 1);
  if (axes.up) car.speed += CAR.accel * dt;
  if (axes.down) {
    // S brakes toward a stop and only reverses once (nearly) stopped, so a
    // driver braking for a turn never accidentally backs into a wall.
    if (car.speed > 5) car.speed = Math.max(0, car.speed - CAR.brake * dt);
    else car.speed = Math.max(-CAR.reverseMax, car.speed - CAR.accel * 0.6 * dt);
  }
  // Drag and rolling resistance.
  car.speed -= car.speed * 0.55 * dt;
  if (Math.abs(car.speed) < 4 && !axes.up && !axes.down) car.speed = 0;
  car.speed = clamp(car.speed, -CAR.reverseMax, CAR.maxSpeed);
  p.speed = car.speed;

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const pos = { x: nx, y: ny };
  const hitWall = collideCircle(S.city, pos, CAR.radius);
  if (hitWall) {
    if (Math.abs(car.speed) > 260) {
      damagePlayer(S, 5);
      S.audio.thud();
      S.particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.5, max: 0.5, color: '#ffffff', r: 6 });
    }
    car.speed *= 0.45;
  }
  car.x = pos.x;
  car.y = pos.y;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  p.moving = Math.abs(car.speed) > 10;

  // Skid dust when turning hard at speed.
  if (Math.abs(axes.steer) > 0.5 && Math.abs(car.speed) > 300 && S.rng() < dt * 20) {
    S.particles.push({
      x: car.x - Math.cos(car.angle) * 20,
      y: car.y - Math.sin(car.angle) * 20,
      vx: 0, vy: 0, life: 0.4, max: 0.4, color: '#cccccc88', r: 5,
    });
  }

  // Hitting pedestrians with the car is a crime.
  if (Math.abs(car.speed) > 60) {
    const ped = nearestPed(S.peds, car.x, car.y, 30);
    if (ped) {
      knockPed(ped);
      commitCrime(S, 1);
      S.audio.thud();
      S.banner = { text: 'Hit and run!', sub: 'a witness called the cops', t: 1.6 };
    }
  }
  // Bumping traffic cars: a scrape, not a wall — one solid hit, then the
  // car ahead gets shoved forward so the player can slip past it.
  p.bumpCooldown = Math.max(0, (p.bumpCooldown || 0) - dt);
  for (const other of S.traffic) {
    if (other === car || other.kind !== 'traffic') continue;
    if (dist2(other.x, other.y, car.x, car.y) < 44 * 44 && p.bumpCooldown <= 0) {
      p.bumpCooldown = 0.6;
      car.speed *= 0.7;
      other.speed = Math.max(other.speed, Math.abs(car.speed) * 0.9);
      other.s += 24 * Math.sign(other.dir || 1);
      if (Math.abs(car.speed) > 200) S.audio.thud();
    }
  }

  if (axes.interact) exitCar(S);
}

export function damagePlayer(S, amount) {
  const p = S.player;
  if (p.invulnerable > 0) return;
  p.health -= amount;
  p.invulnerable = 0.5;
  if (p.health <= 0) {
    p.health = 0;
    S.screen = 'wasted';
    S.audio.sting();
  }
}

// Busted: respawn at the hospital, fined, heat cleared.
export function respawn(S) {
  const p = S.player;
  const fine = Math.min(200, p.money);
  p.money -= fine;
  p.health = 100;
  p.wanted = 0;
  p.bustedTimer = 0;
  p.onFoot = true;
  p.car = null;
  p.x = HOSPITAL.x;
  p.y = HOSPITAL.y + 70;
  p.angle = Math.PI / 2;
  p.speed = 0;
  S.police.cars = [];
  S.police.officers = [];
  S.camera.x = p.x;
  S.camera.y = p.y;
  S.screen = 'play';
  S.banner = { text: `Fined $${fine}`, sub: 'Solmar General patched you up', t: 2.5 };
}
