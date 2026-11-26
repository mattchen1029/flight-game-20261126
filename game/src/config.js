// Every tuning number and colour for Skyline Rings in one place. The playfield is a
// fixed 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size.

export const FIELD = { width: 1280, height: 720, horizonY: 330 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Flight model: altitude in feet, speed in knots, lateral position -1 (far left) to 1. */
export const PLANE = {
  cruiseSpeed: 145,
  minSpeed: 70,
  maxSpeed: 210,
  climbRate: 95,
  sinkRate: 110,
  steerRate: 0.55,
  maxBank: 0.6,
  startAltitude: 320,
  startFuel: 100,
  fuelDrain: 0.32,
  ringFuel: 7,
  maxDamage: 100,
  balloonDamage: 45,
  terrainDamage: 100,
};

/** The course: 10 rings in three legs, then the runway at the end of the valley. */
export const COURSE = {
  ringCount: 10,
  ringSpacing: 950,
  firstRingAt: 900,
  runwayAt: 11200,
  runwayHalfWidth: 0.13,
  timeLimit: 240,
  ringPoints: 100,
  landingPoints: 500,
};

/** Seconds of play per leg; the legs are Ring Run, Low Canyon, Final Approach. */
export const LEGS = [
  { name: 'LEG 1 · RING RUN', rings: 4 },
  { name: 'LEG 2 · LOW CANYON', rings: 3 },
  { name: 'LEG 3 · FINAL APPROACH', rings: 3 },
];

export const PALETTE = {
  skyTop: '#2f6fb4',
  skyMid: '#7db8e8',
  skyLow: '#cfe8f7',
  sun: '#fff3c4',
  sunCore: '#ffdf6b',
  mountainFar: '#7d9cc4',
  mountainNear: '#5d8a6a',
  valley: '#79b264',
  fieldA: '#8fbf5f',
  fieldB: '#c2b25e',
  river: '#4f9fd8',
  road: '#8a7a5a',
  tree: '#2f6b33',
  treeLight: '#4c8a3f',
  cloud: '#ffffff',
  runway: '#3c4148',
  runwayMark: '#f4f6f0',
  ring: '#ffb02e',
  ringGlow: '#ffd97a',
  ringDone: '#58d68d',
  planeBody: '#eef2f6',
  planeBelly: '#c7d3de',
  planeTrim: '#e0533d',
  planeGlass: '#1d3a5f',
  panel: '#141a24',
  panelEdge: '#2c3648',
  gaugeFace: '#0e1520',
  gaugeLit: '#7ee787',
  gaugeAmber: '#ffb02e',
  gaugeRed: '#ff5a4e',
  text: '#f2f6fa',
  muted: '#b9c6d4',
  darkText: '#16222e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'skyline-rings.best';
