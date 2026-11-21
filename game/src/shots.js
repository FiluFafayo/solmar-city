// Screenshot scenes behind ?shot=cover|title|onfoot|mission. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot, so the frame is what real play looks like
// and the same seed always gives the same frame.
import { VIEW, GARAGE, DOCKS, PICKUP, PLAYER_START } from './config.js';
import { clamp, angleDiff } from './random.js';
import { stepWorld } from './step.js';
import { enterCar } from './player.js';

const STEP = 1 / 60;
const IDLE = {
  up: false, down: false, left: false, right: false,
  steer: 0, throttle: 0, sprint: false, punch: false,
  interact: false, pause: false, confirm: false,
};

function idleAxes() {
  return { ...IDLE };
}

/** Drive the player's car toward a point: steer at the target, foot down. */
function driveToward(S, target, seconds) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    const p = S.player;
    if (Math.abs(p.x - target.x) < 90 && Math.abs(p.y - target.y) < 90) break;
    const axes = idleAxes();
    axes.up = true;
    const desired = Math.atan2(target.y - p.y, target.x - p.x);
    const diff = angleDiff(p.angle, desired);
    axes.steer = clamp(diff * 1.8, -1, 1);
    stepWorld(S, STEP, axes);
  }
}

/** Patrol on foot between waypoints at a sprint: the player never stands
 * still long enough for a pursuing officer to hold them. */
function patrolWalk(S, points, seconds) {
  let pi = 0;
  for (let i = 0; i < seconds / STEP; i += 1) {
    const p = S.player;
    const target = points[pi];
    if (Math.abs(p.x - target.x) < 25 && Math.abs(p.y - target.y) < 25) {
      pi = (pi + 1) % points.length;
      continue;
    }
    const axes = idleAxes();
    axes.sprint = true;
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    if (Math.abs(dx) > 20) axes.steer = dx > 0 ? 1 : -1;
    if (dy < -20) axes.up = true;
    if (dy > 20) axes.down = true;
    stepWorld(S, STEP, axes);
  }
}

/** Walk toward a point on foot. */
function walkToward(S, target, seconds) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    const p = S.player;
    const axes = idleAxes();
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    if (Math.abs(dx) > 20) axes.steer = dx > 0 ? 1 : -1;
    if (dy < -20) axes.up = true;
    if (dy > 20) axes.down = true;
    stepWorld(S, STEP, axes);
  }
}

/**
 * Set the world to the named scene and return the screen to draw over it.
 * `cover` — a police chase at 3 stars, driving south down Ocean Avenue.
 * `title` — the title screen over the city.
 * `onfoot` — on foot at a busy intersection, 1 star, a cop closing in.
 * `mission` — the timed delivery run, car loaded, docks ahead.
 */
export function stageShot(name, S) {
  const p = S.player;
  if (name === 'title') {
    S.camera.x = 1200;
    S.camera.y = 900;
    S.screen = 'title';
    return;
  }

  if (name === 'onfoot') {
    S.screen = 'play';
    p.x = 1152;
    p.y = 948;
    p.angle = -Math.PI / 2;
    // One star already, a patrol car close behind.
    p.wanted = 1;
    p.lastCrime = S.time;
    S.police.cars.push({
      kind: 'police', x: 1200, y: 1350, angle: -Math.PI / 2,
      speed: 150, color: '#2f6fd0', siren: 0, ramCooldown: 0,
    });
    // Sprinting back and forth along the sidewalk: the officer is closing
    // in, but a moving target never gets held.
    patrolWalk(S, [{ x: 1152, y: 700 }, { x: 1152, y: 950 }], 5);
    return;
  }

  if (name === 'mission') {
    S.screen = 'play';
    // Job 2 in progress: package in hand, 62 seconds left, docks ahead.
    S.missions.index = 1;
    S.missions.stage = 'drop';
    S.missions.timer = 62;
    p.money = 450;
    const car = S.traffic[0];
    car.x = 1500;
    car.y = 1500;
    car.axis = 'x';
    car.road = 1500;
    car.s = 1500;
    car.dir = 1;
    car.speed = 0;
    car.color = '#e8b93d'; // bright yellow so the hero car reads at a glance
    p.x = car.x;
    p.y = car.y;
    enterCar(S, car);
    S.camera.x = p.x;
    S.camera.y = p.y;
    driveToward(S, { x: 2100, y: 1500 }, 3.5);
    return;
  }

  // Default: the cover — a three-star chase down the avenue.
  S.screen = 'play';
  S.missions.index = 0;
  p.money = 150;
  const car = S.traffic[1];
  car.x = 1200;
  car.y = 600;
  car.axis = 'y';
  car.road = 1200;
  car.s = 600;
  car.dir = 1;
  car.speed = 0;
  car.color = '#ff5a3c'; // bright red-orange so the hero car reads at a glance
  p.x = car.x;
  p.y = car.y;
  enterCar(S, car);
  p.wanted = 3;
  p.lastCrime = S.time;
  S.camera.x = p.x;
  S.camera.y = p.y;
  // Two patrol cars already in pursuit, far enough behind to stay in frame.
  S.police.cars.push(
    { kind: 'police', x: 1150, y: 250, angle: Math.PI / 2, speed: 300, color: '#2f6fd0', siren: 0 },
    { kind: 'police', x: 1250, y: 180, angle: Math.PI / 2, speed: 300, color: '#2f6fd0', siren: 0.7 },
  );
  // Drive south for a fixed burst: the car is still at speed when the
  // frame is taken, the chase still behind it.
  driveToward(S, { x: 1200, y: 2400 }, 2.2);
  // Freeze the camera on the chase for the frame.
  S.camera.x = clamp(p.x, VIEW.w / 2, 2400 - VIEW.w / 2);
  S.camera.y = clamp(p.y, VIEW.h / 2, 1800 - VIEW.h / 2);
}
