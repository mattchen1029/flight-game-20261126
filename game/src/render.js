// Everything the player sees: the chase view over the valley (sky, sun, clouds,
// ridges, river, fields, trees, balloons, rings and the runway), the aircraft in
// frame, the lit instruments and HUD, and the title, pause and end screens.
// Pure drawing from the world state — it never changes the game.

import { COURSE, FIELD, FONT, LEGS, PALETTE, PLANE } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;
export const SCREEN_LANDED = 4;

const VIEW_AHEAD = 3000;

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

/** Project a point ahead of the plane onto the screen: d is metres ahead. */
function project(plane, d, x, altitude) {
  const t = clamp(1 - d / VIEW_AHEAD, 0.02, 1);
  const depth = Math.pow(t, 0.62);
  const screenX = FIELD.width / 2 + (x - plane.x) * 700 * (0.2 + 0.8 * depth);
  const groundY = FIELD.horizonY + (FIELD.height - FIELD.horizonY) * (1 - depth);
  // Height above the ground shrinks with distance, like everything else.
  const screenY = groundY - altitude * 0.55 * depth;
  return { x: screenX, y: screenY, scale: depth, t };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(320, Math.round(rect.width * dpr));
    canvas.height = Math.max(240, Math.round(rect.height * dpr));
  }
  fit();
  window.addEventListener('resize', fit);

  function drawSky(state) {
    const plane = state.plane;
    const horizonShift = clamp(-plane.verticalSpeed * 0.25, -46, 46);
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.horizonY + horizonShift);
    grad.addColorStop(0, PALETTE.skyTop);
    grad.addColorStop(0.55, PALETTE.skyMid);
    grad.addColorStop(1, PALETTE.skyLow);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.horizonY + horizonShift + 2);
    // Sun, upper right, with a soft halo.
    const sunX = 1060;
    const sunY = 92;
    const halo = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 120);
    halo.addColorStop(0, 'rgba(255, 243, 196, 0.95)');
    halo.addColorStop(0.35, 'rgba(255, 223, 107, 0.45)');
    halo.addColorStop(1, 'rgba(255, 223, 107, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(sunX - 130, sunY - 130, 260, 260);
    ctx.fillStyle = PALETTE.sunCore;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
    ctx.fill();
    // Clouds drift with distance: fixed slots that scroll slowly past.
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    for (let i = 0; i < 9; i += 1) {
      const cz = (i * 613 + 200) % VIEW_AHEAD;
      const d = (cz - (plane.distance % VIEW_AHEAD) + VIEW_AHEAD) % VIEW_AHEAD;
      const t = 1 - d / VIEW_AHEAD;
      const cx = 80 + ((i * 173 + 40) % 1120);
      const cy = 46 + (i % 4) * 52 + t * 40;
      const s = 0.5 + t * 0.9;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 62 * s, 17 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 44 * s, cy + 6 * s, 44 * s, 13 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 46 * s, cy + 7 * s, 40 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return horizonShift;
  }

  function drawRidges(state, horizonShift) {
    const terrain = state.terrain;
    const horizonY = FIELD.horizonY + horizonShift;
    for (const [points, colour, base] of [
      [terrain.ridgeFar, PALETTE.mountainFar, 0.55],
      [terrain.ridgeNear, PALETTE.mountainNear, 0.8],
    ]) {
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.moveTo(0, horizonY + 2);
      for (let sx = 0; sx <= FIELD.width; sx += 32) {
        const f = sx / FIELD.width;
        const ridge = points[Math.floor(f * (points.length - 1))];
        ctx.lineTo(sx, horizonY - ridge * 150 * base + 8);
      }
      ctx.lineTo(FIELD.width, horizonY + 2);
      ctx.closePath();
      ctx.fill();
      // Snow caps on the far ridge.
      if (colour === PALETTE.mountainFar) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let sx = 0; sx < FIELD.width; sx += 32) {
          const f = sx / FIELD.width;
          const ridge = points[Math.floor(f * (points.length - 1))];
          if (ridge > 0.62) {
            ctx.beginPath();
            ctx.arc(sx + 16, horizonY - ridge * 150 * base + 10, 12, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  function drawValley(state, horizonShift) {
    const plane = state.plane;
    const terrain = state.terrain;
    const horizonY = FIELD.horizonY + horizonShift;
    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, FIELD.height);
    groundGrad.addColorStop(0, PALETTE.valley);
    groundGrad.addColorStop(1, '#5d9c48');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, FIELD.width, FIELD.height - horizonY);
    // Field patchwork: bands ahead of the plane, alternating crop colours.
    for (let band = 0; band < 7; band += 1) {
      const d0 = band * 420;
      const d1 = d0 + 420;
      const y0 = project(plane, d1, 0, 0).y;
      const y1 = project(plane, d0, 0, 0).y;
      if (y1 <= horizonY) continue;
      for (let col = -3; col <= 3; col += 1) {
        const left0 = project(plane, d1, col * 0.32, 0).x;
        const right0 = project(plane, d1, (col + 1) * 0.32, 0).x;
        const left1 = project(plane, d0, col * 0.32, 0).x;
        const right1 = project(plane, d0, (col + 1) * 0.32, 0).x;
        ctx.fillStyle = (band + col) % 2 === 0 ? PALETTE.fieldA : PALETTE.fieldB;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(left0, y0);
        ctx.lineTo(right0, y0);
        ctx.lineTo(right1, y1);
        ctx.lineTo(left1, y1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // The river winds down the valley toward the plane.
    ctx.strokeStyle = PALETTE.river;
    ctx.lineCap = 'round';
    for (let band = 0; band < 10; band += 1) {
      const d0 = band * 300;
      const d1 = d0 + 300;
      const p0 = project(plane, d1, terrain.riverAt(plane.distance + d1), 0);
      const p1 = project(plane, d0, terrain.riverAt(plane.distance + d0), 0);
      ctx.lineWidth = 2 + p1.scale * 16;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    // Trees scrolling past on both sides of the valley.
    for (const tree of terrain.trees) {
      const d = tree.z - plane.distance;
      if (d < 20 || d > VIEW_AHEAD) continue;
      const p = project(plane, d, tree.x, 0);
      const size = 14 * p.scale * tree.size + 4;
      ctx.fillStyle = tree.shade > 0.5 ? PALETTE.treeLight : PALETTE.tree;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - size * 1.6);
      ctx.lineTo(p.x - size * 0.55, p.y);
      ctx.lineTo(p.x + size * 0.55, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(p.x - 1.5, p.y, 3, size * 0.35);
    }
  }

  function drawRunway(state) {
    const plane = state.plane;
    const d = COURSE.runwayAt - plane.distance;
    if (d < -200 || d > VIEW_AHEAD) return;
    const near = project(plane, Math.max(0, d - 700), 0, 0);
    const far = project(plane, d, 0, 0);
    const nearHalf = 150 * near.scale + 26;
    const farHalf = 150 * far.scale + 6;
    ctx.fillStyle = PALETTE.runway;
    ctx.beginPath();
    ctx.moveTo(far.x - farHalf, far.y);
    ctx.lineTo(far.x + farHalf, far.y);
    ctx.lineTo(near.x + nearHalf, near.y);
    ctx.lineTo(near.x - nearHalf, near.y);
    ctx.closePath();
    ctx.fill();
    // Centreline dashes and threshold chevrons.
    ctx.fillStyle = PALETTE.runwayMark;
    for (let i = 0; i < 5; i += 1) {
      const dd = Math.max(0, d - 120 - i * 130);
      const p = project(plane, dd, 0, 0);
      const w = 3 + p.scale * 7;
      ctx.fillRect(p.x - w / 2, p.y - 4 - p.scale * 10, w, 8 + p.scale * 20);
    }
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(far.x - farHalf - 6, far.y, 4, 0, Math.PI * 2);
    ctx.arc(far.x + farHalf + 6, far.y, 4, 0, Math.PI * 2);
    ctx.fill();
    // Runway label ahead.
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 ${Math.round(15 + far.scale * 13)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('RUNWAY 27', far.x, far.y - 26 - far.scale * 30);
  }

  function drawBalloons(state) {
    const plane = state.plane;
    const hues = ['#e0533d', '#f2a541', '#4f9fd8', '#8e6fc0'];
    for (const balloon of state.balloons) {
      const d = balloon.z - plane.distance;
      if (d < 10 || d > VIEW_AHEAD) continue;
      const bob = Math.sin(state.elapsed * 0.7 + balloon.bobPhase) * 12;
      const p = project(plane, d, balloon.x, balloon.altitude + bob);
      const r = 26 * p.scale + 5;
      ctx.fillStyle = hues[Math.floor(balloon.hue * hues.length)];
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x - r * 0.35, p.y - r * 0.4, r * 0.3, r * 0.45, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5a4632';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x - r * 0.5, p.y + r * 0.7);
      ctx.lineTo(p.x, p.y + r * 1.25);
      ctx.moveTo(p.x + r * 0.5, p.y + r * 0.7);
      ctx.lineTo(p.x, p.y + r * 1.25);
      ctx.stroke();
      ctx.fillStyle = '#7a5a34';
      ctx.fillRect(p.x - r * 0.28, p.y + r * 1.25, r * 0.56, r * 0.4);
    }
  }

  function drawRings(state, screen) {
    const plane = state.plane;
    for (const ring of state.rings) {
      const d = ring.z - plane.distance;
      if (d < -40 || d > VIEW_AHEAD) continue;
      const p = project(plane, Math.max(0, d), ring.x, ring.altitude);
      const radius = Math.max(6, ring.radius * p.scale * 1.15);
      const passed = ring.passed;
      const missed = ring.missed;
      ctx.save();
      ctx.globalAlpha = passed ? 0.55 : missed ? 0.35 : 1;
      ctx.strokeStyle = passed ? PALETTE.ringDone : PALETTE.ring;
      ctx.lineWidth = Math.max(3, 9 * p.scale + 2);
      ctx.shadowColor = passed ? PALETTE.ringDone : PALETTE.ringGlow;
      ctx.shadowBlur = 18 * p.scale + 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1.5, 2.5 * p.scale + 1);
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      if (!passed && !missed && d < 1200) {
        ctx.fillStyle = PALETTE.text;
        ctx.font = `700 ${Math.round(13 + p.scale * 9)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(d)} m`, p.x, p.y - radius - 10);
      }
      ctx.restore();
    }
    // Next-ring guide arrow, under the compass strip and clear of the HUD bar.
    // Not on the title screen: the overlay already says where to go.
    const next = state.rings.find((ring) => !ring.passed && !ring.missed);
    if (next && screen !== SCREEN_TITLE) {
      const d = next.z - plane.distance;
      if (d > 0 && d < VIEW_AHEAD) {
        const p = project(plane, d, next.x, next.altitude);
        const cx = clamp(p.x, 60, FIELD.width - 60);
        ctx.fillStyle = PALETTE.ring;
        ctx.beginPath();
        ctx.moveTo(cx, 132);
        ctx.lineTo(cx - 12, 116);
        ctx.lineTo(cx + 12, 116);
        ctx.closePath();
        ctx.fill();
        ctx.font = `700 15px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(`NEXT RING ${Math.round(d)} m`, cx, 110);
      }
    }
  }

  function drawPlane(state, screen) {
    const plane = state.plane;
    const cx = FIELD.width / 2;
    const cy = 492 + clamp(-plane.verticalSpeed * 0.12, -18, 18);
    const blink = Math.floor(state.elapsed * 2) % 2 === 0;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-plane.bank * 0.55);
    // Shadow on the valley below.
    ctx.fillStyle = 'rgba(20, 30, 20, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 150 - plane.altitude * 0.08, 120, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    // Main wing (seen from behind and slightly above).
    ctx.fillStyle = PALETTE.planeBelly;
    ctx.beginPath();
    ctx.moveTo(-150, 6);
    ctx.lineTo(-34, -14);
    ctx.lineTo(34, -14);
    ctx.lineTo(150, 6);
    ctx.lineTo(138, 20);
    ctx.lineTo(-138, 20);
    ctx.closePath();
    ctx.fill();
    // Fuselage.
    const bodyGrad = ctx.createLinearGradient(0, -52, 0, 34);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.6, PALETTE.planeBody);
    bodyGrad.addColorStop(1, PALETTE.planeBelly);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(0, -56);
    ctx.quadraticCurveTo(30, -48, 34, -8);
    ctx.quadraticCurveTo(36, 22, 22, 34);
    ctx.quadraticCurveTo(0, 42, -22, 34);
    ctx.quadraticCurveTo(-36, 22, -34, -8);
    ctx.quadraticCurveTo(-30, -48, 0, -56);
    ctx.fill();
    // Red cheatline and tail stripe.
    ctx.fillStyle = PALETTE.planeTrim;
    ctx.fillRect(-33, -2, 66, 7);
    ctx.beginPath();
    ctx.moveTo(-16, -52);
    ctx.lineTo(16, -52);
    ctx.lineTo(10, -30);
    ctx.lineTo(-10, -30);
    ctx.closePath();
    ctx.fill();
    // Tail fin.
    ctx.fillStyle = PALETTE.planeTrim;
    ctx.beginPath();
    ctx.moveTo(-12, -46);
    ctx.lineTo(0, -96);
    ctx.lineTo(12, -46);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-6, -52);
    ctx.lineTo(0, -82);
    ctx.lineTo(6, -52);
    ctx.closePath();
    ctx.fill();
    // Cockpit glass (the pilot's view back at us) and windows.
    ctx.fillStyle = PALETTE.planeGlass;
    ctx.beginPath();
    ctx.ellipse(0, -34, 17, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(-6, -38, 6, 3.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // Engines under the wings.
    ctx.fillStyle = '#9fb0bf';
    ctx.beginPath();
    ctx.ellipse(-72, 14, 20, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(72, 14, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c3648';
    ctx.beginPath();
    ctx.ellipse(-72, 14, 9, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(72, 14, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Navigation lights: red left, green right, white strobe blinking.
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath();
    ctx.arc(-150, 12, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4dff88';
    ctx.beginPath();
    ctx.arc(150, 12, 5, 0, Math.PI * 2);
    ctx.fill();
    if (blink && screen === SCREEN_PLAY) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 40, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function gauge(x, y, radius, label, valueText, fraction, colour) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = PALETTE.gaugeFace;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 7, -Math.PI * 0.75, -Math.PI * 0.75 + Math.PI * 1.5 * clamp(fraction, 0, 1));
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 ${Math.round(radius * 0.42)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(valueText, 0, 1);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 ${Math.round(radius * 0.26)}px ${FONT}`;
    ctx.fillText(label, 0, radius * 0.52);
    ctx.restore();
  }

  function drawHud(state, screen, best) {
    const plane = state.plane;
    // Top instrument bar.
    ctx.fillStyle = 'rgba(10, 16, 26, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, 64);
    ctx.fillStyle = PALETTE.gaugeLit;
    ctx.fillRect(0, 64, FIELD.width, 2);
    const heading = Math.round(((plane.heading + 360) % 360));
    const items = [
      ['ALT', `${Math.round(plane.altitude)} ft`],
      ['SPD', `${Math.round(plane.speed)} kt`],
      ['HDG', `${String(heading).padStart(3, '0')}°`],
      ['FUEL', `${Math.round(plane.fuel)}%`],
      ['SCORE', `${state.score}`],
      ['RINGS', `${state.ringsPassed}/${COURSE.ringCount}`],
      ['TIME', `${Math.max(0, Math.ceil(COURSE.timeLimit - state.elapsed))}s`],
    ];
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    let hx = 24;
    for (const [label, value] of items) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 13px ${FONT}`;
      ctx.fillText(label, hx, 24);
      ctx.fillStyle = label === 'FUEL' && plane.fuel < 20 ? PALETTE.gaugeRed : PALETTE.text;
      ctx.font = `700 24px ${FONT}`;
      ctx.fillText(value, hx, 52);
      hx += label === 'SCORE' ? 150 : 138;
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText(LEGS[state.leg].name, FIELD.width - 24, 24);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText(`BEST ${best}`, FIELD.width - 24, 52);
    // Compass strip under the bar.
    ctx.fillStyle = 'rgba(10, 16, 26, 0.55)';
    ctx.fillRect(FIELD.width / 2 - 220, 72, 440, 26);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 14px ${FONT}`;
    ctx.textAlign = 'center';
    for (let offset = -4; offset <= 4; offset += 1) {
      const hdg = (heading + offset * 10 + 360) % 360;
      const label = hdg === 0 ? 'N' : hdg === 90 ? 'E' : hdg === 180 ? 'S' : hdg === 270 ? 'W' : String(hdg);
      ctx.fillText(label, FIELD.width / 2 + offset * 48, 90);
    }
    ctx.fillStyle = PALETTE.ring;
    ctx.beginPath();
    ctx.moveTo(FIELD.width / 2, 100);
    ctx.lineTo(FIELD.width / 2 - 7, 90);
    ctx.lineTo(FIELD.width / 2 + 7, 90);
    ctx.closePath();
    ctx.fill();
    // Message banner, below the compass strip and the ring guide.
    if (state.messageTimer > 0 && state.message) {
      ctx.fillStyle = 'rgba(10, 16, 26, 0.72)';
      const w = ctx.measureText(state.message).width + 44;
      ctx.fillRect(FIELD.width / 2 - w / 2, 148, w, 36);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `700 17px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(state.message, FIELD.width / 2, 172);
    }
    // Bottom instrument panel: lit dials, fuel and damage.
    ctx.fillStyle = 'rgba(10, 16, 26, 0.82)';
    ctx.fillRect(0, FIELD.height - 104, FIELD.width, 104);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(0, FIELD.height - 104, FIELD.width, 2);
    gauge(92, FIELD.height - 52, 40, 'ALT ft', String(Math.round(plane.altitude)), plane.altitude / 900, PALETTE.gaugeLit);
    gauge(196, FIELD.height - 52, 40, 'SPD kt', String(Math.round(plane.speed)), (plane.speed - PLANE.minSpeed) / (PLANE.maxSpeed - PLANE.minSpeed), PALETTE.gaugeAmber);
    gauge(300, FIELD.height - 52, 40, 'HDG', String(heading).padStart(3, '0'), heading / 360, '#7db8e8');
    // Artificial horizon.
    ctx.save();
    ctx.translate(404, FIELD.height - 52);
    ctx.fillStyle = PALETTE.gaugeFace;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.clip();
    ctx.rotate(-plane.bank * 0.55);
    ctx.fillStyle = '#7db8e8';
    ctx.fillRect(-44, -44 + clamp(plane.verticalSpeed * 0.25, -30, 30), 88, 44);
    ctx.fillStyle = '#8a6a42';
    ctx.fillRect(-44, clamp(plane.verticalSpeed * 0.25, -30, 30), 88, 44);
    ctx.restore();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.fillRect(-16, -2, 32, 4);
    ctx.restore();
    // Fuel bar and damage bar.
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText('FUEL', 470, FIELD.height - 76);
    ctx.fillStyle = '#233044';
    ctx.fillRect(470, FIELD.height - 68, 220, 14);
    ctx.fillStyle = plane.fuel < 20 ? PALETTE.gaugeRed : PALETTE.gaugeLit;
    ctx.fillRect(470, FIELD.height - 68, 220 * (plane.fuel / 100), 14);
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('DAMAGE', 470, FIELD.height - 34);
    ctx.fillStyle = '#233044';
    ctx.fillRect(470, FIELD.height - 26, 220, 14);
    ctx.fillStyle = plane.damage > 60 ? PALETTE.gaugeRed : PALETTE.gaugeAmber;
    ctx.fillRect(470, FIELD.height - 26, 220 * (plane.damage / 100), 14);
    // Throttle indicator and controls hint.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText(`THROTTLE ${Math.round(plane.throttle * 100)}%  (Q/E)`, 730, FIELD.height - 76);
    ctx.fillText('Arrows / WASD fly · drag to steer · P pause · M mute', 730, FIELD.height - 34);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(`SCORE ${state.score}`, FIELD.width - 24, FIELD.height - 44);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText(`Rings ${state.ringsPassed} passed · ${state.ringsMissed} missed`, FIELD.width - 24, FIELD.height - 20);
  }

  function overlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(8, 14, 24, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = `800 64px ${FONT}`;
    ctx.fillText(title, FIELD.width / 2, 250);
    let y = 310;
    ctx.fillStyle = PALETTE.text;
    for (const line of lines) {
      ctx.font = line.bold ? `700 22px ${FONT}` : `400 19px ${FONT}`;
      ctx.fillText(line.text, FIELD.width / 2, y);
      y += 36;
    }
  }

  function draw(state, screen, best) {
    const scaleX = canvas.width / FIELD.width;
    const scaleY = canvas.height / FIELD.height;
    const scale = Math.min(scaleX, scaleY);
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - FIELD.width * scale) / 2, (canvas.height - FIELD.height * scale) / 2);
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    // Base fill first, unrotated, so the banked scene never leaves bare corners.
    ctx.fillStyle = PALETTE.skyMid;
    ctx.fillRect(0, 0, FIELD.width, FIELD.horizonY + 60);
    ctx.fillStyle = PALETTE.valley;
    ctx.fillRect(0, FIELD.horizonY + 60, FIELD.width, FIELD.height - FIELD.horizonY - 60);
    // Clip the banked scene to the frame so rotated field bands never poke
    // out past the edges of the screen.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, FIELD.width, FIELD.height);
    ctx.clip();
    ctx.save();
    // The whole scene rolls gently with the plane's bank.
    ctx.translate(FIELD.width / 2, 430);
    ctx.rotate(-state.plane.bank * 0.06);
    ctx.translate(-FIELD.width / 2, -430);
    const horizonShift = drawSky(state);
    drawRidges(state, horizonShift);
    drawValley(state, horizonShift);
    drawRunway(state);
    drawBalloons(state);
    drawRings(state, screen);
    ctx.restore();
    ctx.restore();
    drawPlane(state, screen);
    drawHud(state, screen, best);
    if (screen === SCREEN_TITLE) {
      overlay('SKYLINE RINGS', [
        { text: 'A valley flight game — fly the rings, dodge the balloons, land the runway.', bold: true },
        { text: 'Arrow keys / WASD to fly · Q / E throttle · drag on touch · P pause · M mute', bold: false },
        { text: '10 rings in 3 legs. Each ring refuels you. Land gently on Runway 27 to win.', bold: false },
        { text: best > 0 ? `Best score ${best} — press Space or tap to fly` : 'Press Space or tap to fly', bold: true },
      ], PALETTE.ring);
    } else if (screen === SCREEN_PAUSED) {
      overlay('PAUSED', [
        { text: 'Take a breath, pilot.', bold: true },
        { text: 'Press P or Space to keep flying.', bold: false },
      ], PALETTE.text);
    } else if (screen === SCREEN_OVER) {
      overlay('SORTIE OVER', [
        { text: state.result || 'The flight ended over the valley.', bold: true },
        { text: `Score ${state.score} · Rings ${state.ringsPassed}/${COURSE.ringCount} · Best ${best}`, bold: false },
        { text: 'Press Space or tap to fly again.', bold: false },
      ], PALETTE.gaugeRed);
    } else if (screen === SCREEN_LANDED) {
      overlay('LANDED!', [
        { text: state.result || 'A gentle touchdown on Runway 27.', bold: true },
        { text: `Score ${state.score} (landing bonus +${state.landingBonus}) · Rings ${state.ringsPassed}/${COURSE.ringCount} · Best ${best}`, bold: false },
        { text: 'Press Space or tap to fly again.', bold: false },
      ], PALETTE.ringDone);
    }
  }

  return { draw };
}
