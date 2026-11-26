// Keyboard, mouse and touch input. Held keys give steering, pitch and throttle;
// one-shot presses (start or restart, pause, mute) are queued as bit flags and
// taken once by the loop, so a press between two frames is never lost or counted
// twice. Pointer drag steers and pitches the plane the same way the keys do.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CLIMB = new Set(['ArrowUp', 'KeyW']);
const DESCEND = new Set(['ArrowDown', 'KeyS']);
const THROTTLE_UP = new Set(['KeyE', 'PageUp']);
const THROTTLE_DOWN = new Set(['KeyQ', 'PageDown']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  let left = false;
  let right = false;
  let climb = false;
  let descend = false;
  let throttleUp = false;
  let throttleDown = false;
  let actions = 0;
  let dragSteer = 0;
  let dragPitch = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragMoved = false;

  function releaseAll() {
    left = false;
    right = false;
    climb = false;
    descend = false;
    throttleUp = false;
    throttleDown = false;
    dragging = false;
    dragSteer = 0;
    dragPitch = 0;
  }

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CLIMB.has(event.code)) climb = true;
    else if (DESCEND.has(event.code)) descend = true;
    else if (THROTTLE_UP.has(event.code)) throttleUp = true;
    else if (THROTTLE_DOWN.has(event.code)) throttleDown = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (CLIMB.has(event.code)) climb = false;
    else if (DESCEND.has(event.code)) descend = false;
    else if (THROTTLE_UP.has(event.code)) throttleUp = false;
    else if (THROTTLE_DOWN.has(event.code)) throttleDown = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', releaseAll);

  // Pointer: a tap confirms (start / restart), a drag steers and pitches.
  target.addEventListener('pointerdown', (event) => {
    dragging = true;
    dragMoved = false;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    target.setPointerCapture(event.pointerId);
  });
  target.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) dragMoved = true;
    dragSteer = Math.max(-1, Math.min(1, dx / 160));
    dragPitch = Math.max(-1, Math.min(1, -dy / 160));
  });
  function endDrag() {
    if (dragging && !dragMoved) actions |= ACTION_CONFIRM;
    dragging = false;
    dragSteer = 0;
    dragPitch = 0;
  }
  target.addEventListener('pointerup', endDrag);
  target.addEventListener('pointercancel', () => {
    dragging = false;
    dragSteer = 0;
    dragPitch = 0;
  });

  return {
    /** Steering -1 (left) to 1 (right), from keys or pointer drag. */
    steer() {
      if (dragging && dragSteer !== 0) return dragSteer;
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** Pitch -1 (descend) to 1 (climb), from keys or pointer drag. */
    pitch() {
      if (dragging && dragPitch !== 0) return dragPitch;
      return (climb ? 1 : 0) - (descend ? 1 : 0);
    },
    /** Throttle change -1, 0 or 1 from Q/E (or PageUp/PageDown). */
    throttleDelta() {
      return (throttleUp ? 1 : 0) - (throttleDown ? 1 : 0);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
