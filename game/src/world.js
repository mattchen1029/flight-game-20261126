// The game's rules and state, with no drawing and no browser in it: the plane's
// flight model (speed, throttle, altitude, heading, fuel, damage), the rings, the
// balloons, the terrain, the three legs and the runway landing. step() advances one
// fixed step and returns what happened as bit flags, so the caller can react —
// chime, thud, fanfare — without the world knowing about screens or sound.

import { COURSE, LEGS, PLANE } from './config.js';
import { createTerrain } from './terrain.js';

export const EVENT_RING = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_LANDED = 8;
export const EVENT_FUEL_LOW = 16;

export function createWorld(random) {
  const terrain = createTerrain(random);
  const plane = {
    x: 0,
    altitude: PLANE.startAltitude,
    speed: PLANE.cruiseSpeed,
    throttle: 0.62,
    heading: 0,
    bank: 0,
    verticalSpeed: 0,
    distance: 0,
    fuel: PLANE.startFuel,
    damage: 0,
  };
  const state = {
    plane,
    rings: terrain.rings,
    balloons: terrain.balloons,
    terrain,
    score: 0,
    ringsPassed: 0,
    ringsMissed: 0,
    leg: 0,
    elapsed: 0,
    message: '',
    messageTimer: 0,
    result: '',
    landingBonus: 0,
    over: false,
    landed: false,
    fuelWarned: false,
  };

  function reset() {
    for (const ring of terrain.rings) {
      ring.passed = false;
      ring.missed = false;
    }
    plane.x = 0;
    plane.altitude = PLANE.startAltitude;
    plane.speed = PLANE.cruiseSpeed;
    plane.throttle = 0.62;
    plane.heading = 0;
    plane.bank = 0;
    plane.verticalSpeed = 0;
    plane.distance = 0;
    plane.fuel = PLANE.startFuel;
    plane.damage = 0;
    state.score = 0;
    state.ringsPassed = 0;
    state.ringsMissed = 0;
    state.leg = 0;
    state.elapsed = 0;
    state.message = 'Follow the valley — fly through the rings!';
    state.messageTimer = 4;
    state.result = '';
    state.landingBonus = 0;
    state.over = false;
    state.landed = false;
    state.fuelWarned = false;
  }

  function legForRing(index) {
    return index < 4 ? 0 : index < 7 ? 1 : 2;
  }

  function crash(reason) {
    state.over = true;
    state.result = reason;
    return EVENT_OVER;
  }

  /**
   * One fixed step. `controls` is { steer -1..1, pitch -1..1, throttleDelta -1..1 }.
   * With `harmless` set (the title screen's backdrop) the plane flies itself, rings
   * are never scored and nothing can crash it.
   */
  function step(dt, controls, harmless) {
    if (state.over || state.landed) return 0;
    let events = 0;
    state.elapsed += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;

    // Throttle and speed: more throttle means more speed, and speed is what carries
    // the plane forward; too slow and it sinks, too fast and it is hard to turn.
    plane.throttle = Math.max(0.25, Math.min(1, plane.throttle + controls.throttleDelta * dt * 0.55));
    const targetSpeed = PLANE.minSpeed + plane.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
    plane.speed += (targetSpeed - plane.speed) * Math.min(1, dt * 0.8);
    // The title-screen backdrop flies itself forever: it never burns fuel.
    if (!harmless) plane.fuel = Math.max(0, plane.fuel - PLANE.fuelDrain * (0.5 + plane.throttle) * dt);

    // Steering banks the plane and turns the heading; the heading drifts the plane
    // sideways across the valley. Pitch climbs or descends, losing speed in a climb.
    const turnAuthority = 1.15 - (plane.speed - PLANE.minSpeed) / (PLANE.maxSpeed - PLANE.minSpeed);
    plane.bank += (controls.steer * PLANE.maxBank - plane.bank) * Math.min(1, dt * 5);
    plane.heading += controls.steer * 26 * turnAuthority * dt;
    plane.heading = Math.max(-38, Math.min(38, plane.heading));
    plane.x += Math.sin((plane.heading * Math.PI) / 180) * (plane.speed / 60) * dt * 2.4;
    plane.x = Math.max(-0.95, Math.min(0.95, plane.x));
    const climb = controls.pitch * (controls.pitch > 0 ? PLANE.climbRate : PLANE.sinkRate);
    plane.verticalSpeed += (climb - plane.verticalSpeed) * Math.min(1, dt * 3.5);
    plane.altitude += plane.verticalSpeed * dt;
    if (controls.pitch > 0) plane.speed = Math.max(PLANE.minSpeed, plane.speed - 14 * dt);
    if (plane.altitude > 900) plane.altitude = 900;

    const prevDistance = plane.distance;
    plane.distance += plane.speed * 1.9 * dt;

    // Fuel empty: the engine quits and the plane glides down.
    if (plane.fuel <= 0) {
      plane.throttle = 0.25;
      plane.verticalSpeed = Math.min(plane.verticalSpeed, -55);
      if (!state.fuelWarned) {
        state.fuelWarned = true;
        state.message = 'FUEL EMPTY — gliding! Find the runway!';
        state.messageTimer = 4;
        events |= EVENT_FUEL_LOW;
      }
    } else if (plane.fuel < 20 && !state.fuelWarned) {
      state.fuelWarned = true;
      state.message = 'LOW FUEL — rings refill your tanks!';
      state.messageTimer = 4;
      events |= EVENT_FUEL_LOW;
    }

    // Rings: crossing a ring's distance scores when the plane is inside it.
    // On the title screen's backdrop the plane flies through rings for show
    // only: nothing is marked, scored or refuelled there.
    for (let i = 0; i < terrain.rings.length; i += 1) {
      const ring = terrain.rings[i];
      if (ring.passed || ring.missed) continue;
      if (prevDistance < ring.z && plane.distance >= ring.z && !harmless) {
        const dx = (plane.x - ring.x) * 320;
        const dy = plane.altitude - ring.altitude;
        const inside = Math.sqrt(dx * dx + dy * dy) < ring.radius;
        if (inside) {
          ring.passed = true;
          state.ringsPassed += 1;
          const bonus = Math.max(0, Math.round(40 - Math.sqrt(dx * dx + dy * dy) * 0.4));
          state.score += COURSE.ringPoints + bonus;
          plane.fuel = Math.min(100, plane.fuel + PLANE.ringFuel);
          state.message = `RING ${state.ringsPassed}/${COURSE.ringCount}! +${COURSE.ringPoints + bonus}  ·  fuel +${PLANE.ringFuel}`;
          state.messageTimer = 2.5;
          state.leg = legForRing(Math.min(i + 1, COURSE.ringCount - 1));
          events |= EVENT_RING;
        } else {
          ring.missed = true;
          state.ringsMissed += 1;
          state.message = 'Ring missed — keep flying, the runway is ahead.';
          state.messageTimer = 2.5;
        }
      }
    }

    // Balloons drift over the course: clipping one costs damage and speed.
    for (const balloon of terrain.balloons) {
      const bob = Math.sin(state.elapsed * 0.7 + balloon.bobPhase) * 12;
      if (Math.abs(plane.distance - balloon.z) < 26) {
        const dx = Math.abs(plane.x - balloon.x);
        const dy = Math.abs(plane.altitude - (balloon.altitude + bob));
        if (dx < 0.09 && dy < 55 && !balloon.hit) {
          balloon.hit = true;
          plane.damage += PLANE.balloonDamage;
          plane.speed = Math.max(PLANE.minSpeed, plane.speed - 35);
          state.message = 'Balloon strike! Damage +45.';
          state.messageTimer = 2.5;
          events |= EVENT_HIT;
          if (plane.damage >= PLANE.maxDamage) return events | crash('Torn apart by a balloon strike.');
        }
      } else if (Math.abs(plane.distance - balloon.z) > 60) {
        balloon.hit = false;
      }
    }

    // Terrain: the valley floor and walls. Below the ground is a crash.
    const ground = terrain.groundHeight(plane.distance, plane.x);
    if (!harmless && plane.altitude <= ground + 4) {
      plane.damage += PLANE.terrainDamage;
      return events | crash(plane.verticalSpeed < -70 ? 'Dove into the valley floor.' : 'Clipped the terrain.');
    }

    // Time up with no landing is a failed sortie.
    if (!harmless && state.elapsed >= COURSE.timeLimit) {
      return events | crash('Out of time — the sortie ended over the valley.');
    }

    // The runway: past its threshold, a gentle touchdown on the strip is a landing.
    if (!harmless && plane.distance >= COURSE.runwayAt) {
      if (plane.altitude <= 40 && Math.abs(plane.x) <= COURSE.runwayHalfWidth && plane.verticalSpeed > -75) {
        state.landed = true;
        state.landingBonus = COURSE.landingPoints + Math.round(plane.fuel) * 2;
        state.score += state.landingBonus;
        state.result = `Landed! ${state.ringsPassed}/${COURSE.ringCount} rings · bonus +${state.landingBonus}`;
        return events | EVENT_LANDED;
      }
      if (plane.altitude <= ground + 4) return events | crash('Came down short of the runway.');
      if (plane.distance >= COURSE.runwayAt + 1400) {
        return events | crash('Flew past the runway — overshot the strip.');
      }
    }
    return events;
  }

  reset();
  return { state, terrain, reset, step };
}
