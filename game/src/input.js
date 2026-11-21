// Keyboard and mouse state. WASD/arrows drive and walk, E enters and exits
// cars, Space punches, Shift sprints, P pauses, Enter confirms menus.
const KEYS = {};

export function attachInput(canvas, onFirstGesture) {
  const down = (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key] = true;
    if (onFirstGesture) onFirstGesture();
  };
  const up = (event) => {
    KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key] = false;
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => {
    for (const key of Object.keys(KEYS)) KEYS[key] = false;
  });
  canvas.addEventListener('mousedown', () => {
    if (onFirstGesture) onFirstGesture();
  });
}

export function key(name) {
  return !!KEYS[name];
}

// A snapshot of the driving/walking axes for this frame.
export function readAxes() {
  const up = key('w') || key('ArrowUp');
  const down = key('s') || key('ArrowDown');
  const left = key('a') || key('ArrowLeft');
  const right = key('d') || key('ArrowRight');
  return {
    up,
    down,
    left,
    right,
    steer: (right ? 1 : 0) - (left ? 1 : 0),
    throttle: (up ? 1 : 0) - (down ? 1 : 0),
    sprint: key('Shift'),
    punch: key(' '),
    interact: key('e'),
    pause: key('p') || key('Escape'),
    confirm: key('Enter'),
  };
}

// Edge-triggered "just pressed" for keys that act once per press.
const pressed = {};
export function justPressed(name) {
  const now = !!KEYS[name];
  const was = !!pressed[name];
  pressed[name] = now;
  return now && !was;
}

export function clearPressed() {
  for (const k of Object.keys(pressed)) pressed[k] = false;
}
