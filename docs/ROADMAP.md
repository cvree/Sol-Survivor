# Sol Survivor: roadmap to an iconic game

Written after the sixth build pass. `DESIGN_PLAN.md` records what exists; this file says
where the game goes next and in what order.

## 1. The honest starting point

What is strong today: a living base, a storm you can watch coming, astronauts with
energy, moods and personalities, everything earned by exploring, building by hand,
upgrades, a layout that matters, a daily word puzzle.

What holds it back from "iconic":

| Problem | Why it matters |
|---|---|
| Nothing lasts between missions except the album and records | Cookie Clicker, Clash and Fallout Shelter are all about a thing that is *yours* and keeps growing. Ours resets every 5 minutes. |
| No child has played it | Every number (energy, bricks, landers, storms) is a guess. Six passes of features were added without one playtest. |
| No single signature action | Cookie Clicker has the cookie. We have many small actions and no "one tap that always feels good". |
| Too many systems arrived at once | Power, air, shield, energy, mood, bricks, parts, landers, levels, zones. A 12-year-old can learn them, but only if they unlock one at a time. |
| NASA facts are unverified | Storms are still "practice storms" (the DONKI key is rejected), and most facts were typed from memory. |
| Sound has never been heard by a person | It was written blind. |

## 2. What to take from each game (and what to leave)

| Game | Take | Leave |
|---|---|---|
| **Cookie Clicker** | One tap that always pays. Numbers that climb forever. A rare golden bonus you must catch. Silly news lines. Achievements with jokes. Prestige: restart stronger. | Mindless idling. A game that plays itself. |
| **Clash of Clans** | Collect, upgrade, defend. The Town Hall gate. Builders as the bottleneck. Upgrades you can see. Short sessions. | Wait timers, gems, paying to skip, raids on other players. |
| **Fallout Shelter** | People with names, stats and stories. The right person in the right room. Rush a room at a risk. Room incidents. Explorers who send back a diary. New arrivals at the door. | Lunchbox gambling. |

Rules that do not bend: no shop, no currency you can buy, no timer that punishes
a missed day, nothing random that is paid for, every science claim true or labelled.

## 3. The identity: five things people will remember

1. **The Sun is the villain.** One object everyone watches. It swells, the fuse burns, time slows. Already built; make it the logo, the loading screen, the sound signature.
2. **Your crew are people.** Eight astronauts today. They chat, sulk, love one thing, and can die. Grow this into friendships and stories.
3. **Everything is earned by hand.** Nothing builds itself. Keep it sacred.
4. **It is real.** Every place, storm, discovery and machine is a real one, with its date. "This really happened" is the brand.
5. **M.A.R.V.** The funny robot is the voice of the game. Give him the Cookie Clicker news-ticker humour.

## 4. The loops, redrawn

| Loop | Length | Today | Target |
|---|---|---|---|
| Tap | 1 s | Flip a switch | **Wipe dust off a Solar Field** (see 5.1): the cookie |
| Job | 10 s | Drag an astronaut | Same, plus Rush |
| Crisis | 1 min | Storm fuse | Storms plus small room incidents |
| Lander | 2 min | Earn it, choose 2 plans and a crewmate | Same. It is the best loop in the game; protect it |
| Mission | 5 to 8 min | 30 sols, debrief | 30 sols, then **"Stay longer?"** endless mode for the record board |
| Career | days | Album, records | **Mission Control**: rank, patches, new landing sites, astronaut corps |
| Daily | 1 a day | Sol Check word | Sol Check plus Today's Sun mission |

## 5. Roadmap

Sizes: S = under a day, M = one to two days, L = three or more. Each phase ends
with a check that can fail.

### Phase 0: prove it works (do before anything new)

| # | Work | Size |
|---|---|---|
| 0.1 | **Watch three children (9 to 12) play for 15 minutes each.** Say nothing. Write down where they stop, what they never touch, when they laugh. | S |
| 0.2 | Fix the NASA key, run `npm run fetch-nasa`, so storms are real DONKI records with dates | S |
| 0.3 | Check every hand-typed fact against a NASA page; add the link beside each | M |
| 0.4 | Listen to the sound on laptop speakers and a phone; fix volume and anything annoying | S |
| 0.5 | **Unlock systems one at a time**: sol 1 air and power only; mood appears with the second astronaut; bricks and upgrades after the Hab; dome zones with the first dome. Hide header chips until their system exists. | M |
| 0.6 | Play it on a phone and a tablet; fix what breaks | M |
| 0.7 | Tune balance from the playtests. Targets: a first-time child survives to sol 10 on Easy; a careful player wins about 95% Easy, 75% Normal, 45% Hard | M |

Done when: two of three children ask to play again without being prompted.

### Phase 1: the cookie and the spice (makes every minute fun)

| # | Feature | From | Real science | Size |
|---|---|---|---|---|
| 1.1 | **Dusty panels.** Dust slowly settles on Solar Fields and power drops. Tap a panel to wipe it: a puff, a sparkle, +power pop. A passing dust devil cleans them all for free. | Cookie Clicker's tap | Dust ended the InSight lander in 2022; wind "cleaning events" saved Spirit and Opportunity | M |
| 1.2 | **The golden moment.** Now and then something rare crosses the sky for a few seconds: a meteor, Phobos crossing the Sun, a blue sunset. Tap it in time for a bonus and an album entry. | Golden cookie | Rovers have photographed all three | M |
| 1.3 | **Rush.** Hold a module to overdrive it for a burst (finish a build, double the air). Small chance of a breakdown that needs a spare part. | Fallout Shelter rush | Game rule, labelled as such | M |
| 1.4 | **Room incidents.** Small problems that need the right person fast: an air leak (Engineer), a wilting crop (Botanist), a stuck drill, a bumped head (Medic). | Fallout Shelter incidents | A real Station air leak in 2018 was first plugged with a finger and tape; InSight's "mole" drill really got stuck | L |
| 1.5 | **Explorer diary.** An astronaut on a trip sends short lines home ("Found my own footprints. Walked in a circle."). | Fallout wasteland log | Flavour | S |
| 1.6 | **Mars Daily.** M.A.R.V. headlines that react to what you did ("Local commander wipes panel, feels powerful"). | Cookie Clicker news | Flavour | S |
| 1.7 | **Numbers that feel big.** A lifetime counter on the title screen: sols survived, bricks dug, panels wiped, data sent to Earth. | Cookie Clicker | n/a | S |

Done when: a new player touches something at least every 5 seconds without being told to, and laughs at least once.

### Phase 2: a thing that is yours (reasons to come back)

| # | Feature | From | Size |
|---|---|---|---|
| 2.1 | **Mission Control career.** Every mission earns mission points (sols, crew alive, finds, storms beaten). Points raise your rank: Cadet, Pilot, Commander, Flight Director. Ranks unlock things, never power you pay for. | Prestige | M |
| 2.2 | **Landing sites.** Start with Gale Crater. Unlock Jezero (Perseverance, an old river delta), Meridiani (Opportunity), Elysium (InSight, quakes and extra dust), Arcadia (buried ice, colder). Each has its own finds album and one rule twist. | Town Halls, new worlds | L |
| 2.3 | **Stay longer.** After sol 30, choose to go home or keep going. Storms grow each week. The record board becomes "longest stay". | Endless score chase | M |
| 2.4 | **Storm Cards.** Every real storm you survive becomes a card with its date and class. Needs 0.2. | Collection | M |
| 2.5 | **Crew friendships.** Astronauts who work together fill a heart. At full heart they unlock a short story and a pair bonus. Hearts persist between missions. | Fallout dwellers | L |
| 2.6 | **Astronaut corps.** Unlock new recruits by doing things (wipe 100 panels: the dust-obsessed geologist). Aim for 16. | Collection | M |
| 2.7 | **Mission patches.** Achievements drawn as embroidered patches with real-mission jokes: "90-Sol Warranty" (survive 90 sols; Opportunity was built for 90 and lasted over 5,000), "Seven Minutes" (finish the intro fast). A patch wall on the title screen. | Cookie Clicker achievements | M |
| 2.8 | **Today's Sun.** One daily mission, same for everyone, storm strength from the last 30 days of live flares. One scored try, a result to share. | Daily | M |
| 2.9 | **Name your base and crew.** | Ownership | S |

Done when: a player who finishes one mission starts another the next day because of something they want (a site, a patch, a friend's heart), not because they were reminded.

### Phase 3: depth for the keen 12-year-old

| # | Feature | Size |
|---|---|---|
| 3.1 | Module branches at level 3: choose one of two (Oxygen Maker: more air, or less power) | M |
| 3.2 | Rover you drive on longer trips with risk and bigger finds | L |
| 3.3 | Water as a third supply, melted from buried ice | L |
| 3.4 | Seasons: a dust season in the middle of long stays | M |
| 3.5 | Classroom mode: a code so a whole class plays the same mission and compares | M |
| 3.6 | Save up to three base layouts | S |

### Phase 4: polish and launch

- Music with a tune people hum: calm theme, storm theme, victory sting. Record or commission; synth is a placeholder.
- A 20-second trailer cut from real play: land, build, fuse, slow motion, "Storm survived".
- Install to home screen (PWA), offline play, save in progress.
- Accessibility: colour-blind check, reduced motion (kept working so far), full keyboard play, screen-reader labels.
- Performance on a cheap Chromebook, the real school machine.
- A parents and teachers page: what is real, what is simplified, no data collected.

## 6. The first ten minutes we are aiming for

| Time | The player | Feels |
|---|---|---|
| 0:00 | Picks an astronaut with a silly quirk | "That one is me" |
| 0:20 | Capsule thumps down. Steps outside. | Alone on Mars |
| 0:40 | Drags the ground, taps a sparkle, walks out to it | "I found a real thing" |
| 1:15 | First lander: two plans from four | A real choice |
| 1:45 | Drags the commander onto the site; the Hab pops up | "I built that" |
| 2:30 | Panels get dusty; wipes them | The tap |
| 3:30 | Energy bar runs low; puts the commander to bed; night falls | Care |
| 4:30 | Second lander: chooses a crewmate | A friend |
| 5:30 | The Sun swells. Fuse. Slow motion. Shield holds. Stars. | The story they tell later |
| 7:00 | Something goes wrong; someone is hurt | Stakes |
| 9:00 | Debrief: rank goes up, a new site is 40% unlocked | "One more" |

## 7. Order I recommend

1. Phase 0, all of it. Nothing else is worth building on untested numbers.
2. 1.1 dusty panels, 1.2 golden moment, 1.6 Mars Daily, 1.7 lifetime counter: the cheapest fun.
3. 2.1 career, 2.3 stay longer, 2.7 patches: the cheapest reasons to return.
4. 2.2 landing sites: the biggest single addition, and the most NASA content.
5. 1.3 rush, 1.4 incidents, 2.5 friendships.
6. Phase 3 only after children are replaying without being asked.

If the Space Apps deadline is close: Phase 0, then 1.1, 1.6, 2.1, 2.7, and stop.

## 8. Not building

- Shops, gems, paid speed-ups, loot boxes.
- Real-time wait timers ("come back in 4 hours").
- Streaks that can be lost; notifications that nag.
- Online raids, clans, chat.
- A base that plays itself while you are away.
- Any invented NASA number.

## 9. Decisions for Connor

1. When is the submission deadline? It decides how far down section 7 we get.
2. Can you get three children in front of it this week? Phase 0.1 gates everything.
3. Keep missions at 30 sols with "stay longer", or make the base permanent like Clash? I recommend the first: it keeps deaths meaningful and sessions short.
4. Is it acceptable that crew can die, for the youngest players? Consider a "gentle mode" where they are evacuated instead.
5. Who fixes the NASA API key?

All facts in this file were written from memory and need checking against NASA pages before they go in the game.
