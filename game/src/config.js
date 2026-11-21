// Solmar City — tuning constants and the shared palette.
// An original sun-soaked coastal city. Nothing here is borrowed from any
// commercial game: the streets, names and colours are invented for this game.
export const WORLD = { w: 2400, h: 1800 };
export const ROAD_W = 96;
export const VIEW = { w: 1280, h: 800 };

// Street centre lines. The grid is 300 units apart; the beach sits south.
export const STREETS_X = [300, 600, 900, 1200, 1500, 1800, 2100];
export const STREETS_Y = [300, 600, 900, 1200, 1500];
export const BEACH_Y = 1680; // sand starts here
export const WATER_Y = 1752; // sea starts here

// Landmarks (road points the missions and the respawn use).
export const GARAGE = { x: 1800, y: 600, name: "Rosa's Garage" };
export const DOCKS = { x: 2100, y: 1620, name: 'South Docks' };
export const HOSPITAL = { x: 300, y: 300, name: 'Solmar General' };
export const PICKUP = { x: 900, y: 1200, name: 'Café Marisol' };
export const PLAYER_START = { x: 1200, y: 948 };

export const PLAYER = {
  walkSpeed: 175,
  sprintSpeed: 250,
  radius: 14,
  punchRange: 46,
  punchCooldown: 0.45,
};

export const CAR = {
  accel: 430,
  brake: 700,
  reverseMax: 130,
  maxSpeed: 540,
  turnRate: 2.7,
  length: 46,
  width: 22,
  radius: 20,
};

export const TRAFFIC_SPEED = [170, 260];
export const POLICE_CAR_SPEED = 500; // below the player's 540 top speed at low wanted, so a clean getaway works; at 4-5 stars the multiplier makes them faster
export const OFFICER_SPEED = 188;
export const MAX_WANTED = 5;

// Warm, sun-soaked palette for the whole city.
export const PALETTE = {
  grass: '#7fae62',
  grassDark: '#74a158',
  sand: '#e8d39a',
  water: '#3f8fb5',
  waterDeep: '#2f7ba3',
  road: '#4a4a52',
  roadEdge: '#3a3a41',
  sidewalk: '#b9b3a4',
  line: '#e8d44f',
  building: ['#e8b48a', '#d98c6a', '#f2d8a7', '#c96f5e', '#8fb8a8', '#e0a458', '#b7c9d9', '#d9c7a7', '#e5a3b0'],
  roofEdge: '#00000033',
  tree: '#3f7d44',
  treeDark: '#2f6334',
  park: '#6da352',
  police: '#2f6fd0',
  player: '#e33e2b',
};

export const CAR_COLORS = [
  '#d94f3d', '#3d7dd9', '#e8b93d', '#58a34a', '#8a5fc0', '#e8e8e8',
  '#2b2b30', '#d97b2f', '#4fb3a9', '#c23d6e', '#7a8a99', '#b8d94f',
];
