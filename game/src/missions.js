// The story: Milo Reyes, a courier new to Solmar City, takes jobs from
// Rosa, who runs a garage on the north side. Three story jobs, then the
// city keeps paying for courier gigs.
import { GARAGE, DOCKS, PICKUP } from './config.js';
import { dist2 } from './random.js';

const STORY = [
  {
    id: 'wheels',
    title: 'Job 1 — Wheels',
    brief: 'Steal any car and bring it to Rosa\'s Garage.',
    reward: 150,
  },
  {
    id: 'delivery',
    title: 'Job 2 — Hot Delivery',
    brief: 'Pick up the package at Café Marisol, then run it to the South Docks before the timer runs out.',
    reward: 300,
    timeLimit: 100,
  },
  {
    id: 'heat',
    title: 'Job 3 — Heat Wave',
    brief: 'Rattle the cops up to 2 stars, then lose them completely.',
    reward: 400,
  },
];

export function createMissions() {
  return {
    index: 0, // which story job is active
    stage: 'start', // start | pickup | drop | raise | lose | done
    timer: 0,
    gigs: 0, // repeatable courier gigs finished
    done: 0,
  };
}

export function currentJob(S) {
  const m = S.missions;
  if (m.index < STORY.length) return STORY[m.index];
  return {
    id: 'gig',
    title: `Courier Gig #${m.gigs + 1}`,
    brief: 'Pick up the package, then run it to the docks. 75 seconds.',
    reward: 200,
    timeLimit: 75,
  };
}

// Where the objective marker sits right now (null when there is none).
export function missionMarker(S) {
  const m = S.missions;
  const job = currentJob(S);
  if (job.id === 'wheels') return { x: GARAGE.x, y: GARAGE.y, color: '#3d7dd9', label: "Rosa's Garage" };
  if (job.id === 'delivery' || job.id === 'gig') {
    if (m.stage === 'start' || m.stage === 'pickup') return { x: PICKUP.x, y: PICKUP.y, color: '#e8b93d', label: 'Pickup' };
    return { x: DOCKS.x, y: DOCKS.y, color: '#e8b93d', label: 'Drop-off' };
  }
  return null; // heat job: the objective is the wanted level itself
}

export function objectiveText(S) {
  const job = currentJob(S);
  const m = S.missions;
  if (job.id === 'wheels') {
    return S.player.onFoot
      ? 'Steal a car — walk up to one and press E'
      : "Drive to Rosa's Garage (blue marker)";
  }
  if (job.id === 'delivery' || job.id === 'gig') {
    if (m.stage === 'start' || m.stage === 'pickup') return 'Pick up the package at Café Marisol';
    return `Deliver to the South Docks — ${Math.ceil(m.timer)}s left`;
  }
  if (job.id === 'heat') {
    if (m.stage === 'start' || m.stage === 'raise') return 'Get the heat up to ★★ (steal a car, hit something)';
    return 'Now lose the cops — stay clean until the stars are gone';
  }
  return '';
}

function completeJob(S) {
  const job = currentJob(S);
  const m = S.missions;
  S.player.money += job.reward;
  S.stats.earned += job.reward;
  m.done += 1;
  if (job.id === 'gig') m.gigs += 1;
  else m.index += 1;
  m.stage = 'start';
  m.timer = 0;
  S.banner = { text: `${job.title} — done!`, sub: `+$${job.reward}`, t: 3 };
  S.audio.fanfare();
  saveProgress(S);
}

export function updateMissions(S, dt) {
  const m = S.missions;
  const job = currentJob(S);
  const p = S.player;

  if (job.id === 'wheels') {
    if (!p.onFoot && dist2(p.x, p.y, GARAGE.x, GARAGE.y) < 90 * 90) completeJob(S);
    return;
  }
  if (job.id === 'delivery' || job.id === 'gig') {
    if (m.stage === 'start') m.stage = 'pickup';
    if (m.stage === 'pickup') {
      if (dist2(p.x, p.y, PICKUP.x, PICKUP.y) < 70 * 70) {
        m.stage = 'drop';
        m.timer = job.timeLimit;
        S.banner = { text: 'Package picked up!', sub: 'get it to the docks', t: 2 };
        S.audio.blip(660, 0.12);
      }
      return;
    }
    // stage 'drop': timed run to the docks.
    m.timer -= dt;
    if (dist2(p.x, p.y, DOCKS.x, DOCKS.y) < 80 * 80) {
      completeJob(S);
      return;
    }
    if (m.timer <= 0) {
      m.stage = 'start';
      m.timer = 0;
      S.banner = { text: 'Too slow — the package went cold', sub: 'try the pickup again', t: 2.5 };
      S.audio.sting();
    }
    return;
  }
  if (job.id === 'heat') {
    if (m.stage === 'start') m.stage = 'raise';
    if (m.stage === 'raise' && p.wanted >= 2) {
      m.stage = 'lose';
      S.banner = { text: 'Heat is on!', sub: 'now shake them off', t: 2 };
    } else if (m.stage === 'lose' && p.wanted === 0) {
      completeJob(S);
    }
  }
}

// Persist the player's best run to localStorage (best-effort).
const SAVE_KEY = 'solmar-city-save-v1';
export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { bestMoney: 0, jobsDone: 0, earned: 0 };
    const parsed = JSON.parse(raw);
    return {
      bestMoney: parsed.bestMoney || 0,
      jobsDone: parsed.jobsDone || 0,
      earned: parsed.earned || 0,
    };
  } catch {
    return { bestMoney: 0, jobsDone: 0, earned: 0 };
  }
}

export function saveProgress(S) {
  try {
    const save = {
      bestMoney: Math.max(S.save.bestMoney, S.player.money),
      jobsDone: Math.max(S.save.jobsDone, S.missions.done),
      earned: S.save.earned + 0, // total earned is tracked in stats
    };
    save.earned = Math.max(S.save.earned, S.stats.earned);
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    S.save = save;
  } catch {
    // Storage unavailable (private mode, file://): the game plays on.
  }
}
