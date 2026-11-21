// The city of Solmar: a street grid, blocks of buildings, a central park,
// a beachfront boardwalk and the sea. Generation is seeded, so the same
// seed always builds the same city.
import { WORLD, ROAD_W, STREETS_X, STREETS_Y, BEACH_Y, PALETTE } from './config.js';
import { range, int, pick } from './random.js';

// Block edges between neighbouring streets (road half-width kept clear).
function blockRanges(streets, far) {
  const ranges = [];
  let prev = 48;
  for (const s of streets) {
    ranges.push([prev, s - ROAD_W / 2]);
    prev = s + ROAD_W / 2;
  }
  ranges.push([prev, far - 48]);
  return ranges;
}

export function buildCity(rng) {
  const buildings = [];
  const trees = [];
  const parks = [];
  const xs = blockRanges(STREETS_X, WORLD.w);
  const ys = blockRanges(STREETS_Y, BEACH_Y);

  for (let bx = 0; bx < xs.length; bx += 1) {
    for (let by = 0; by < ys.length; by += 1) {
      const [x0, x1] = xs[bx];
      const [y0, y1] = ys[by];
      const w = x1 - x0;
      const h = y1 - y0;
      // The block at column 3, row 2 is the central park.
      if (bx === 3 && by === 2) {
        parks.push({ x: x0, y: y0, w, h });
        for (let i = 0; i < 14; i += 1) {
          trees.push({ x: range(rng, x0 + 14, x1 - 14), y: range(rng, y0 + 14, y1 - 14), r: range(rng, 10, 16) });
        }
        continue;
      }
      // One to three buildings per block, with a margin for the sidewalk.
      const count = int(rng, 1, 3);
      for (let i = 0; i < count; i += 1) {
        const bw = range(rng, w * 0.28, w * 0.62);
        const bh = range(rng, h * 0.3, h * 0.62);
        const bx0 = range(rng, x0 + 8, x1 - 8 - bw);
        const by0 = range(rng, y0 + 8, y1 - 8 - bh);
        const rect = { x: bx0, y: by0, w: bw, h: bh, color: pick(rng, PALETTE.building) };
        let overlaps = false;
        for (const other of buildings) {
          if (rect.x < other.x + other.w + 10 && rect.x + rect.w + 10 > other.x &&
              rect.y < other.y + other.h + 10 && rect.y + rect.h + 10 > other.y) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) buildings.push(rect);
      }
      // A few street trees on the block corners.
      if (rng() < 0.7) {
        trees.push({ x: x0 + 10, y: y0 + 10, r: range(rng, 9, 13) });
        trees.push({ x: x1 - 10, y: y1 - 10, r: range(rng, 9, 13) });
      }
    }
  }
  return { buildings, trees, parks };
}

export function isOnRoad(x, y) {
  const half = ROAD_W / 2;
  for (const sx of STREETS_X) if (Math.abs(x - sx) <= half) return true;
  for (const sy of STREETS_Y) if (Math.abs(y - sy) <= half) return true;
  return false;
}

export function nearestStreetX(x) {
  let best = STREETS_X[0];
  for (const sx of STREETS_X) if (Math.abs(sx - x) < Math.abs(best - x)) best = sx;
  return best;
}

export function nearestStreetY(y) {
  let best = STREETS_Y[0];
  for (const sy of STREETS_Y) if (Math.abs(sy - y) < Math.abs(best - y)) best = sy;
  return best;
}

// Push a circle out of every building it overlaps. Returns true on a hit.
export function collideCircle(city, pos, radius) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(pos.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(pos.y, b.y + b.h));
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= radius * radius) continue;
    hit = true;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      pos.x = cx + (dx / d) * radius;
      pos.y = cy + (dy / d) * radius;
    } else {
      // Centre inside the rect: push out along the smallest penetration.
      const left = pos.x - b.x;
      const right = b.x + b.w - pos.x;
      const top = pos.y - b.y;
      const bottom = b.y + b.h - pos.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) pos.x = b.x - radius;
      else if (m === right) pos.x = b.x + b.w + radius;
      else if (m === top) pos.y = b.y - radius;
      else pos.y = b.y + b.h + radius;
    }
  }
  // The sea is not walkable and not drivable.
  if (pos.y > WORLD.h - 6) pos.y = WORLD.h - 6;
  if (pos.y < 6) pos.y = 6;
  if (pos.x < 6) pos.x = 6;
  if (pos.x > WORLD.w - 6) pos.x = WORLD.w - 6;
  return hit;
}

// Point-in-rect test used by the spawn and pickup code.
export function insideBuilding(city, x, y) {
  for (const b of city.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}
