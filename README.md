[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/FiluFafayo/solmar-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard)
[![reward](https://make.fun/badge/gta6-01/FiluFafayo/solmar-city/reward.svg)](https://make.fun/bounty/gta6-01)

# Solmar City — an open-world crime game

An original top-down open-world crime game, built for the
[make.fun](https://make.fun/bounty/gta6-01) Make GTA 6 bounty.

Milo Reyes just got off the bus in Solmar City with $0 and a phone number.
Rosa at the garage has jobs. The cops have opinions. The city has cars.

## The city

A sun-soaked coastal city on a street grid: a central park with a pond,
a beachfront boardwalk and the sea to the south, 14 traffic cars following
the roads, 26 pedestrians strolling the sidewalks, and cash bundles
dropped on street corners for whoever gets there first.

## How to play

Open `game/index.html` in a desktop browser (or serve `game/` with any
static server — `node serve.ts`). No build step, no network request:
every scene is drawn with canvas primitives, and every sound is a
Web Audio synth.

- **WASD / arrows** — walk, and drive when in a car
- **E** — steal the nearest car / step out (getting back into a car you
  just left is not a second theft)
- **Space** — punch
- **Shift** — sprint
- **P** — pause

## The law

Every crime raises the wanted level, up to 5 stars. Patrol cars chase
you and ram your car; on foot, officers get out and run you down — if
one holds you for a second, you're **BUSTED**. Outdrive them and stay
clean and the heat cools off, a star at a time. Getting wasted or busted
sends you to Solmar General with a $200 fine.

## The jobs

1. **Wheels** — steal any car and bring it to Rosa's Garage ($150)
2. **Hot Delivery** — pick up the package at Café Marisol and run it to
   the South Docks before the timer runs out ($300)
3. **Heat Wave** — rattle the cops up to 2 stars, then lose them
   completely ($400)

After that, Rosa keeps paying for courier gigs. Best run and jobs done
are saved in the browser.

## Screenshots

The four screenshots in `screenshots/` are real renders of the game's own
code, staged with `?shot=cover|title|onfoot|mission&seed=1` (see
`shots.json`): a three-star chase, the title screen, on foot with a cop
closing in, and the timed delivery run.
