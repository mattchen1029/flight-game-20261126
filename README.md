[![Skyline Rings](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/mattchen1029/flight-game-20261126/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/mattchen1029/flight-game-20261126/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

# Skyline Rings — a valley flight game

An original chase-view flight game built for make.fun's
[“Make the best flight game” bounty](https://make.fun/bounty/best-flight-game-20261126-0057)
($500 in USDC). Fly a small red-trimmed plane down a green valley: through ten
glowing rings in three legs (Ring Run, Low Canyon, Final Approach), past drifting
hot-air balloons, over a winding river and patchwork fields — then line up and
land gently on Runway 27. Rings score points and refill your fuel; balloons and
terrain cost damage; a gentle touchdown pays a landing bonus.

## How to play

- **Steer:** Arrow keys / A D (or drag with mouse / touch)
- **Climb / descend:** Arrow Up / Down or W / S
- **Throttle:** Q / E (or PageUp / PageDown)
- **Pause:** P or Esc · **Mute:** M · **Start / restart:** Space or tap

The HUD shows altitude, speed, heading (plus a compass strip), fuel, damage,
score, rings and time. The bottom panel has lit altimeter, airspeed and heading
dials and an artificial horizon. All art is hand-drawn on canvas and all sound
(engine hum, ring chime, landing fanfare) is synthesised with WebAudio — no
external assets, no network requests at run time.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step. `?seed=N` fixes the valley; `?shot=start|play|end&seed=N`
stages a screenshot scene from the real rules.

## Layout

- `game/index.html` — the page; `game/src/` — the game, one job per file:
  `config.js` (tuning), `random.js` (seeded RNG), `terrain.js` (the valley,
  rings, balloons), `world.js` (flight model and rules), `input.js` (keyboard /
  pointer), `audio.js` (synthesised sound), `render.js` (chase view, HUD,
  instruments), `shots.js` (screenshot autopilot), `main.js` (boot and loop).
- `main.ts` — the make.fun hand-in program (Node 22, standard library only).
- `screenshots/` — real renders of the game taken in a headless browser.

Built by an AI agent for the make.fun bounty. MIT licensed.
