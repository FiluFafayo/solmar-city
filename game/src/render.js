// Everything on screen: the city, the cars, the people, the HUD with its
// minimap, and the title, pause, busted and wasted screens. All canvas 2D,
// all drawn from the game state — no images.
import { WORLD, ROAD_W, STREETS_X, STREETS_Y, BEACH_Y, WATER_Y, VIEW, PALETTE, CAR, MAX_WANTED } from './config.js';
import { clamp, lerp } from './random.js';
import { missionMarker, objectiveText, currentJob } from './missions.js';

const MINIMAP = { w: 208, h: 156 };

export function render(S, ctx) {
  const { w, h } = VIEW;
  ctx.clearRect(0, 0, w, h);
  const cam = S.camera;
  const ox = Math.round(cam.x - w / 2);
  const oy = Math.round(cam.y - h / 2);

  drawGround(S, ctx, ox, oy);
  drawRoads(ctx, ox, oy);
  drawPark(S, ctx, ox, oy);
  drawBuildings(S, ctx, ox, oy);
  drawTrees(S, ctx, ox, oy);
  drawCash(S, ctx, ox, oy);
  drawMarker(S, ctx, ox, oy);
  drawTraffic(S, ctx, ox, oy);
  drawPeds(S, ctx, ox, oy);
  drawPolice(S, ctx, ox, oy);
  drawPlayer(S, ctx, ox, oy);
  drawParticles(S, ctx, ox, oy);

  if (S.screen === 'title') drawTitle(S, ctx);
  else if (S.screen === 'play' || S.screen === 'paused') {
    drawHUD(S, ctx);
    drawMinimap(S, ctx);
    if (S.screen === 'paused') drawPaused(ctx);
  } else if (S.screen === 'busted') {
    drawHUD(S, ctx);
    drawEndCard(ctx, 'BUSTED', 'The Solmar PD caught up with you.', 'Press Enter — hospital, $200 fine, heat cleared');
  } else if (S.screen === 'wasted') {
    drawHUD(S, ctx);
    drawEndCard(ctx, 'WASTED', 'Milo went down hard on the streets of Solmar.', 'Press Enter — hospital, $200 fine, heat cleared');
  }
}

// --- World ---------------------------------------------------------------

function drawGround(S, ctx, ox, oy) {
  const { w, h } = VIEW;
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, w, h);
  // Mow stripes on the grass, for a little texture.
  ctx.fillStyle = PALETTE.grassDark;
  const stripe = 120;
  const startX = -((ox % (stripe * 2)) + stripe * 2) % (stripe * 2);
  for (let x = startX; x < w; x += stripe * 2) ctx.fillRect(x, 0, stripe, h);
  // Sand and sea along the south edge.
  const sandY = BEACH_Y - oy;
  if (sandY < h) {
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(0, Math.max(0, sandY), w, h - Math.max(0, sandY));
    // Boardwalk planks.
    ctx.fillStyle = '#a87f4f';
    ctx.fillRect(0, Math.max(0, sandY), w, 10);
    const waterY = WATER_Y - oy;
    if (waterY < h) {
      ctx.fillStyle = PALETTE.water;
      ctx.fillRect(0, Math.max(0, waterY), w, h - Math.max(0, waterY));
      ctx.fillStyle = PALETTE.waterDeep;
      const waveOff = (S.time * 24) % 90;
      for (let x = -waveOff; x < w; x += 90) {
        ctx.fillRect(x, Math.max(0, waterY) + 14, 46, 3);
      }
    }
  }
}

function drawRoads(ctx, ox, oy) {
  const { w, h } = VIEW;
  ctx.fillStyle = PALETTE.road;
  for (const sx of STREETS_X) {
    const x = sx - ox - ROAD_W / 2;
    if (x + ROAD_W < 0 || x > w) continue;
    ctx.fillRect(x, 0, ROAD_W, h);
  }
  for (const sy of STREETS_Y) {
    const y = sy - oy - ROAD_W / 2;
    if (y + ROAD_W < 0 || y > h) continue;
    ctx.fillRect(0, y, w, ROAD_W);
  }
  // Sidewalk edging: pale strips where road meets grass.
  ctx.fillStyle = PALETTE.sidewalk;
  for (const sx of STREETS_X) {
    const x = sx - ox;
    if (x < -ROAD_W || x > w + ROAD_W) continue;
    ctx.fillRect(x - ROAD_W / 2 - 8, 0, 8, h);
    ctx.fillRect(x + ROAD_W / 2, 0, 8, h);
  }
  for (const sy of STREETS_Y) {
    const y = sy - oy;
    if (y < -ROAD_W || y > h + ROAD_W) continue;
    ctx.fillRect(0, y - ROAD_W / 2 - 8, w, 8);
    ctx.fillRect(0, y + ROAD_W / 2, w, 8);
  }
  // Dashed centre lines.
  ctx.fillStyle = PALETTE.line;
  for (const sx of STREETS_X) {
    const x = sx - ox;
    if (x < 0 || x > w) continue;
    for (let y = -((oy % 64) + 64) % 64; y < h; y += 64) ctx.fillRect(x - 2, y, 4, 30);
  }
  for (const sy of STREETS_Y) {
    const y = sy - oy;
    if (y < 0 || y > h) continue;
    for (let x = -((ox % 64) + 64) % 64; x < w; x += 64) ctx.fillRect(x, y - 2, 30, 4);
  }
}

function drawPark(S, ctx, ox, oy) {
  for (const park of S.city.parks) {
    const x = park.x - ox;
    const y = park.y - oy;
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(x, y, park.w, park.h);
    // A pond in the middle of the park.
    ctx.fillStyle = PALETTE.water;
    ctx.beginPath();
    ctx.ellipse(x + park.w / 2, y + park.h / 2, 34, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff55';
    ctx.beginPath();
    ctx.ellipse(x + park.w / 2 - 8, y + park.h / 2 - 6, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBuildings(S, ctx, ox, oy) {
  const { w, h } = VIEW;
  for (const b of S.city.buildings) {
    const x = b.x - ox;
    const y = b.y - oy;
    if (x + b.w < 0 || x > w || y + b.h < 0 || y > h) continue;
    // Drop shadow, then the roof slab.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 6, y + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, b.w - 3, b.h - 3);
    // Rooftop details: an AC box and a skylight.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x + b.w * 0.14, y + b.h * 0.18, Math.min(26, b.w * 0.24), Math.min(18, b.h * 0.22));
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x + b.w * 0.6, y + b.h * 0.55, Math.min(22, b.w * 0.2), Math.min(14, b.h * 0.18));
  }
}

function drawTrees(S, ctx, ox, oy) {
  for (const t of S.city.trees) {
    const x = t.x - ox;
    const y = t.y - oy;
    if (x < -20 || x > VIEW.w + 20 || y < -20 || y > VIEW.h + 20) continue;
    ctx.fillStyle = PALETTE.treeDark;
    ctx.beginPath();
    ctx.arc(x + 2, y + 3, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.tree;
    ctx.beginPath();
    ctx.arc(x, y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff22';
    ctx.beginPath();
    ctx.arc(x - t.r * 0.3, y - t.r * 0.3, t.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCash(S, ctx, ox, oy) {
  for (const cash of S.cash) {
    if (cash.taken) continue;
    const x = cash.x - ox;
    const y = cash.y - oy;
    if (x < -20 || x > VIEW.w + 20 || y < -20 || y > VIEW.h + 20) continue;
    const bob = Math.sin(S.time * 3 + cash.x) * 2;
    ctx.fillStyle = '#2f9e4f';
    ctx.fillRect(x - 9, y - 6 + bob, 18, 12);
    ctx.fillStyle = '#e8d44f';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', x, y + 3 + bob);
  }
}

function drawMarker(S, ctx, ox, oy) {
  if (S.screen === 'title') return; // no objective on the title screen
  const marker = missionMarker(S);
  if (!marker) return;
  const x = marker.x - ox;
  const y = marker.y - oy;
  const pulse = 1 + Math.sin(S.time * 4) * 0.15;
  const onScreen = x > 40 && x < VIEW.w - 40 && y > 40 && y < VIEW.h - 40;
  if (onScreen) {
    // A beacon column and a bouncing diamond over the target.
    const grad = ctx.createLinearGradient(x, y - 130, x, y);
    grad.addColorStop(0, 'rgba(232,185,61,0)');
    grad.addColorStop(1, 'rgba(232,185,61,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 12, y - 130, 24, 130);
    const by = y - 46 - Math.sin(S.time * 3) * 8;
    ctx.fillStyle = marker.color;
    ctx.save();
    ctx.translate(x, by);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-11 * pulse, -11 * pulse, 22 * pulse, 22 * pulse);
    ctx.restore();
    ctx.strokeStyle = marker.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 26 + Math.sin(S.time * 4) * 4, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Off-screen: an arrow on the screen edge pointing at the target.
    const cx = clamp(x, 30, VIEW.w - 30);
    const cy = clamp(y, 30, VIEW.h - 30);
    const ang = Math.atan2(y - VIEW.h / 2, x - VIEW.w / 2);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.fillStyle = marker.color;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, -11);
    ctx.lineTo(-10, 11);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// --- Actors ----------------------------------------------------------------

function drawCarShape(ctx, x, y, angle, color, police) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.roundRect(-CAR.length / 2 + 3, -CAR.width / 2 + 3, CAR.length, CAR.width, 7);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 7);
  ctx.fill();
  // Windshield and rear window.
  ctx.fillStyle = '#1d2b38';
  ctx.fillRect(6, -CAR.width / 2 + 3, 9, CAR.width - 6);
  ctx.fillRect(-15, -CAR.width / 2 + 3, 7, CAR.width - 6);
  // Headlights.
  ctx.fillStyle = '#ffe9a3';
  ctx.fillRect(CAR.length / 2 - 2, -CAR.width / 2 + 2, 2, 4);
  ctx.fillRect(CAR.length / 2 - 2, CAR.width / 2 - 6, 2, 4);
  if (police) {
    // Light bar, flashing red/blue.
    const phase = Math.floor(Date.now() / 260) % 2 === 0;
    ctx.fillStyle = phase ? '#ff2d2d' : '#2d7bff';
    ctx.fillRect(-4, -CAR.width / 2 + 2, 8, 5);
    ctx.fillStyle = phase ? '#2d7bff' : '#ff2d2d';
    ctx.fillRect(-4, CAR.width / 2 - 7, 8, 5);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
  }
  ctx.restore();
}

function drawTraffic(S, ctx, ox, oy) {
  for (const car of S.traffic) {
    const x = car.x - ox;
    const y = car.y - oy;
    if (x < -60 || x > VIEW.w + 60 || y < -60 || y > VIEW.h + 60) continue;
    drawCarShape(ctx, x, y, car.angle, car.color, false);
  }
}

function drawPeds(S, ctx, ox, oy) {
  for (const ped of S.peds) {
    const x = ped.x - ox;
    const y = ped.y - oy;
    if (x < -30 || x > VIEW.w + 30 || y < -30 || y > VIEW.h + 30) continue;
    if (ped.down > 0) {
      // Knocked flat: a fallen figure and a few stars.
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(0.6);
      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.roundRect(-11, -5, 22, 10, 5);
      ctx.fill();
      ctx.fillStyle = ped.skin;
      ctx.beginPath();
      ctx.arc(13, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#e8d44f';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('*', x - 8, y - 14 + Math.sin(S.time * 5) * 2);
      continue;
    }
    const bob = Math.sin(S.time * 8 + ped.x * 0.1) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(x, y + bob * 0.4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(x, y - 9 + bob * 0.4, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPolice(S, ctx, ox, oy) {
  for (const car of S.police.cars) {
    const x = car.x - ox;
    const y = car.y - oy;
    if (x < -60 || x > VIEW.w + 60 || y < -60 || y > VIEW.h + 60) continue;
    drawCarShape(ctx, x, y, car.angle, car.color, true);
  }
  for (const officer of S.police.officers) {
    const x = officer.x - ox;
    const y = officer.y - oy;
    if (x < -30 || x > VIEW.w + 30 || y < -30 || y > VIEW.h + 30) continue;
    if (officer.down > 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(0.6);
      ctx.fillStyle = '#2f4a6b';
      ctx.beginPath();
      ctx.roundRect(-11, -5, 22, 10, 5);
      ctx.fill();
      ctx.restore();
      continue;
    }
    const bob = Math.sin(S.time * 10) * 2;
    ctx.fillStyle = '#2f4a6b';
    ctx.beginPath();
    ctx.arc(x, y + bob * 0.3, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b48a';
    ctx.beginPath();
    ctx.arc(x, y - 9 + bob * 0.3, 5.5, 0, Math.PI * 2);
    ctx.fill();
    // Cap.
    ctx.fillStyle = '#1d2b38';
    ctx.fillRect(x - 5, y - 15 + bob * 0.3, 10, 3);
  }
}

function drawPlayer(S, ctx, ox, oy) {
  const p = S.player;
  const x = p.x - ox;
  const y = p.y - oy;
  if (p.onFoot) {
    const bob = p.moving ? Math.sin(S.time * 11) * 2 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 9, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Red jacket, dark jeans, the courier's cap.
    ctx.fillStyle = '#e33e2b';
    ctx.beginPath();
    ctx.arc(x, y + bob * 0.3, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath();
    ctx.arc(x, y - 10 + bob * 0.3, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b2b30';
    ctx.fillRect(x - 6, y - 17 + bob * 0.3, 12, 4);
    ctx.fillRect(x + 2, y - 17 + bob * 0.3, 7, 3);
    if (p.punchAnim > 0) {
      const fx = x + Math.cos(p.angle) * 22;
      const fy = y + Math.sin(p.angle) * 22;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(fx, fy, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    // "You are here" ring so the player never gets lost in a crowd.
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 15 + Math.sin(S.time * 3) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  // When driving, the car itself is drawn by drawTraffic (kind 'player').
}

function drawParticles(S, ctx, ox, oy) {
  for (const pt of S.particles) {
    const a = clamp(pt.life / pt.max, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x - ox, pt.y - oy, pt.r * a + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// --- HUD -------------------------------------------------------------------

function drawHUD(S, ctx) {
  const p = S.player;
  const { w } = VIEW;
  // Top-left: wanted stars and health.
  ctx.textAlign = 'left';
  ctx.font = 'bold 26px sans-serif';
  for (let i = 0; i < MAX_WANTED; i += 1) {
    ctx.fillStyle = i < p.wanted ? '#ffd21f' : 'rgba(255,255,255,0.35)';
    ctx.fillText('★', 18 + i * 30, 40);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(18, 52, 150, 12);
  ctx.fillStyle = p.health > 30 ? '#58c96b' : '#e33e2b';
  ctx.fillRect(18, 52, 150 * (p.health / 100), 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('HEALTH', 18, 78);
  // Top-right: money.
  ctx.textAlign = 'right';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = '#58e07a';
  ctx.fillText(`$${p.money.toLocaleString('en-US')}`, w - 18, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`JOBS DONE: ${S.missions.done}`, w - 18, 58);
  // Top-centre: the current objective.
  const job = currentJob(S);
  const text = objectiveText(S);
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px sans-serif';
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(w / 2 - tw / 2 - 16, 12, tw + 32, 46, 8);
  ctx.fill();
  ctx.fillStyle = '#e8b93d';
  ctx.fillText(job.title.toUpperCase(), w / 2, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px sans-serif';
  ctx.fillText(text, w / 2, 47);
  // Bottom-left: speed when driving, hint when on foot.
  ctx.textAlign = 'left';
  if (!p.onFoot) {
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.round(Math.abs(p.speed) * 0.24)}`, 18, VIEW.h - 34);
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('KM/H — E TO STEP OUT', 18, VIEW.h - 16);
  } else {
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('WASD MOVE · SHIFT RUN · SPACE PUNCH · E STEAL CAR · P PAUSE', 18, VIEW.h - 16);
  }
  // Centre banner (mission complete, pickup, fine...).
  if (S.banner && S.banner.t > 0) {
    const a = clamp(S.banner.t, 0, 1);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(S.banner.text, w / 2, VIEW.h / 2 - 90);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#e8b93d';
    ctx.fillText(S.banner.sub, w / 2, VIEW.h / 2 - 64);
    ctx.globalAlpha = 1;
  }
}

function drawMinimap(S, ctx) {
  const { w, h } = VIEW;
  const mx = w - MINIMAP.w - 16;
  const my = h - MINIMAP.h - 16;
  const sx = MINIMAP.w / WORLD.w;
  const sy = MINIMAP.h / WORLD.h;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(mx - 4, my - 4, MINIMAP.w + 8, MINIMAP.h + 8, 8);
  ctx.fill();
  ctx.fillStyle = '#5d8a48';
  ctx.fillRect(mx, my, MINIMAP.w, MINIMAP.h);
  // Sea.
  ctx.fillStyle = '#3f8fb5';
  ctx.fillRect(mx, my + (WATER_Y * sy), MINIMAP.w, MINIMAP.h - WATER_Y * sy);
  // Roads.
  ctx.fillStyle = '#4a4a52';
  for (const rx of STREETS_X) ctx.fillRect(mx + rx * sx - 2, my, 4, MINIMAP.h);
  for (const ry of STREETS_Y) ctx.fillRect(mx, my + ry * sy, MINIMAP.w, 4);
  // Mission marker.
  const marker = missionMarker(S);
  if (marker) {
    ctx.fillStyle = marker.color;
    ctx.beginPath();
    ctx.arc(mx + marker.x * sx, my + marker.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Police in blue, traffic in pale dots, player as a white arrow.
  ctx.fillStyle = '#7fd0ff';
  for (const car of S.police.cars) {
    ctx.fillRect(mx + car.x * sx - 2, my + car.y * sy - 2, 4, 4);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (const car of S.traffic) {
    if (car.kind === 'player') continue;
    ctx.fillRect(mx + car.x * sx - 1, my + car.y * sy - 1, 2, 2);
  }
  const p = S.player;
  ctx.save();
  ctx.translate(mx + p.x * sx, my + p.y * sy);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -4);
  ctx.lineTo(-5, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Viewport rectangle.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + (S.camera.x - VIEW.w / 2) * sx, my + (S.camera.y - VIEW.h / 2) * sy, VIEW.w * sx, VIEW.h * sy);
}

// --- Screens ---------------------------------------------------------------

function drawTitle(S, ctx) {
  const { w, h } = VIEW;
  // Golden-hour wash over the city behind the title.
  ctx.fillStyle = 'rgba(20,16,40,0.45)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8b93d';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('WELCOME TO', w / 2, h / 2 - 118);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('SOLMAR CITY', w / 2, h / 2 - 44);
  ctx.fillStyle = '#ffb3a0';
  ctx.font = 'italic 19px sans-serif';
  ctx.fillText('Sun, sea, and everybody else\'s car.', w / 2, h / 2 - 8);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px sans-serif';
  ctx.fillText('Milo Reyes just got off the bus with $0 and a phone number.', w / 2, h / 2 + 30);
  ctx.fillText('Rosa at the garage has jobs. The cops have opinions. The city has cars.', w / 2, h / 2 + 52);
  ctx.fillStyle = '#e8b93d';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PRESS ENTER TO START', w / 2, h / 2 + 108);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '13px sans-serif';
  ctx.fillText('WASD move / drive · E steal & exit cars · SPACE punch · SHIFT sprint · P pause', w / 2, h / 2 + 138);
  if (S.save.bestMoney > 0 || S.save.jobsDone > 0) {
    ctx.fillText(`Best run: $${S.save.bestMoney.toLocaleString('en-US')} · ${S.save.jobsDone} job${S.save.jobsDone === 1 ? '' : 's'} done`, w / 2, h / 2 + 164);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '12px sans-serif';
  ctx.fillText('An original game. No real city, no real gang, no borrowed names.', w / 2, h - 18);
}

function drawPaused(ctx) {
  const { w, h } = VIEW;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('PAUSED', w / 2, h / 2 - 10);
  ctx.font = '16px sans-serif';
  ctx.fillText('Press P to keep playing', w / 2, h / 2 + 26);
}

function drawEndCard(ctx, title, line, hint) {
  const { w, h } = VIEW;
  ctx.fillStyle = 'rgba(10,10,20,0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a4a';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText(title, w / 2, h / 2 - 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px sans-serif';
  ctx.fillText(line, w / 2, h / 2 + 18);
  ctx.fillStyle = '#e8b93d';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(hint, w / 2, h / 2 + 52);
}
