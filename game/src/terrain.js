// The valley the plane flies down: ridges, a winding river, fields, trees, a town
// and the runway, all generated from one seed so the same seed always builds the
// same valley. Pure data and maths — no drawing and no browser in here.

import { COURSE } from './config.js';

/** How many metres of valley one distance unit covers; only used for terrain shape. */
const SEGMENT = 400;

function smooth(a, b, t) {
  const u = t * t * (3 - 2 * t);
  return a + (b - a) * u;
}

/**
 * Build the valley for `seed`: ridge heights, the river's wander, tree clumps, the
 * balloons that drift over the course, and the ten target rings in three legs.
 */
export function createTerrain(random) {
  const ridgeFar = [];
  const ridgeNear = [];
  const riverX = [];
  for (let i = 0; i < 40; i += 1) {
    ridgeFar.push(0.25 + random() * 0.55);
    ridgeNear.push(0.35 + random() * 0.5);
    riverX.push(-0.55 + random() * 1.1);
  }
  const trees = [];
  for (let i = 0; i < 260; i += 1) {
    trees.push({
      z: 300 + random() * (COURSE.runwayAt + 600),
      x: -1.15 + random() * 2.3,
      size: 0.5 + random() * 0.9,
      shade: random(),
    });
  }
  const balloons = [];
  for (let i = 0; i < 7; i += 1) {
    balloons.push({
      z: 1600 + i * 1350 + random() * 500,
      x: -0.8 + random() * 1.6,
      altitude: 180 + random() * 260,
      hue: random(),
      bobPhase: random() * 6.28,
    });
  }
  const rings = [];
  const legEnds = [4, 7, 10];
  for (let i = 0; i < COURSE.ringCount; i += 1) {
    const leg = i < legEnds[0] ? 0 : i < legEnds[1] ? 1 : 2;
    const low = leg === 1;
    rings.push({
      z: COURSE.firstRingAt + i * COURSE.ringSpacing,
      x: -0.72 + random() * 1.44,
      altitude: low ? 110 + random() * 130 : 200 + random() * 260,
      radius: low ? 52 : 62,
      leg,
      passed: false,
      missed: false,
    });
  }

  /** Ridge height (0..1) at distance `z` for ridge `points`, sampled smoothly. */
  function ridgeAt(points, z) {
    const f = z / (SEGMENT * 2.2);
    const i = Math.max(0, Math.min(points.length - 2, Math.floor(f)));
    return smooth(points[i], points[i + 1], f - i);
  }

  /** The river's lateral centre (-1..1) at distance `z`. */
  function riverAt(z) {
    const f = z / (SEGMENT * 3.1);
    const i = Math.max(0, Math.min(riverX.length - 2, Math.floor(f)));
    return smooth(riverX[i], riverX[i + 1], f - i);
  }

  /**
   * Ground height in feet under the plane at distance `z` and lateral `x`: gentle
   * valley floor in the middle, rising steeply toward the valley walls at the sides,
   * plus rolling bumps along the course. Flying below this height is a crash.
   */
  function groundHeight(z, x) {
    const ax = Math.abs(x);
    // The valley walls rise only at the very edge, where the plane cannot
    // normally fly, so a ring chase never ends in an unfair wall.
    const wall = ax > 0.95 ? (ax - 0.95) * 1500 : 0;
    // The ground flattens out around the runway so a landing is judged on the
    // pilot's flying, not on a bump under the threshold.
    const flat = z > COURSE.runwayAt - 1400 ? 1 : 0;
    const bump = flat ? 0 : 26 * Math.sin(z / 620) + 18 * Math.sin(z / 271 + 1.7);
    const near = ridgeAt(ridgeNear, z) * 34 * ax * ax * (flat ? 0.3 : 1);
    return 12 + bump + wall + near;
  }

  return { ridgeFar, ridgeNear, riverX, trees, balloons, rings, ridgeAt, riverAt, groundHeight };
}
