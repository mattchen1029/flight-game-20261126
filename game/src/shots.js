// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (aim at the next ring, hold altitude, keep the throttle up), so the
// frame is what a real game really looks like and the same seed always gives the
// same frame. The end scene's pilot flies the whole course and lands.

import { COURSE, STEP } from './config.js';
import { EVENT_LANDED, EVENT_OVER } from './world.js';
import { SCREEN_LANDED, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 300;

/** Steer toward the next ring (or the runway), climb or descend toward its height. */
function autopilot(state) {
  const plane = state.plane;
  const next = state.rings.find((ring) => !ring.passed && !ring.missed);
  let targetX = 0;
  let targetAlt = 300;
  if (next) {
    targetX = next.x;
    targetAlt = next.altitude;
  } else if (plane.distance < COURSE.runwayAt) {
    // No rings left: join the glide slope early and ride it to the threshold.
    targetX = 0;
    targetAlt = Math.max(18, Math.min(260, (COURSE.runwayAt - plane.distance) * 0.09));
  } else {
    // Final approach: a gentle 3-degree glide slope onto the strip.
    targetX = 0;
    targetAlt = Math.max(18, (COURSE.runwayAt - plane.distance) * 0.09);
  }
  // Never fly into the ground chasing a low ring: stay above the terrain.
  // On final approach the floor drops to just above the ground itself, so the
  // glide slope — not the safety floor — decides the touchdown height.
  const onApproach = !next && plane.distance > COURSE.runwayAt - 1600;
  const ground = state.terrain.groundHeight(plane.distance + 300, plane.x);
  targetAlt = Math.max(targetAlt, ground + (onApproach ? 16 : 130));
  const steer = Math.max(-1, Math.min(1, (targetX - plane.x) * 3.0 - plane.heading * 0.03));
  const pitch = Math.max(-1, Math.min(1, (targetAlt - plane.altitude) / 70));
  return { steer, pitch, throttleDelta: 0 };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, autopilot(world.state), true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  for (let index = 0; index < limit / STEP; index += 1) {
    const events = world.step(STEP, autopilot(world.state), false);
    if (events & EVENT_LANDED) return { screen: SCREEN_LANDED, best: world.state.score };
    if (events & EVENT_OVER) return { screen: SCREEN_OVER, best: world.state.score };
  }
  return { screen: SCREEN_PLAY, best: world.state.score };
}
