# Robotics Plant Floor Sim

A browser-based discrete-event simulation of a phased robotics assembly plant (about 100,000 sq ft). It turns a facility-layout methodology into a working floor you can watch and stress-test:

- Plan of Record phases
- PFEP storage classes
- A kanban supermarket
- Paced flow lines and arm cells
- End-of-line test as the constraint, with its repair loop
- A charging hub sized with Little's Law
- Crating and dock doors
- People flow and EHS segregation

Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page layout: controls, KPI strip, floor canvas, capacity plan, inspector, event log |
| `styles.css` | Styling, with light and dark themes that follow the OS setting |
| `app.js` | Simulation engine, pathfinding, task logic, rendering, guided tour |
| `.nojekyll` | Tells GitHub Pages to serve files as-is |

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish on GitHub Pages

1. Create a public repository, e.g. `robotics-plant-sim`.
2. Upload these files, or push with git:
   ```bash
   git init && git add . && git commit -m "Robotics Plant Floor Sim"
   git branch -M main
   git remote add origin https://github.com/<your-username>/robotics-plant-sim.git
   git push -u origin main
   ```
3. Go to **Settings → Pages**. Set the source to **Deploy from a branch**, the branch to **main**, and the folder to **/ (root)**.
4. The site will be live at `https://<your-username>.github.io/robotics-plant-sim/`.

## Controls

| Control | What it does |
|---|---|
| Plan of Record | Restarts the shift at POR phase 1 (350/day), 2 (650/day) or 3 (1,000/day). Phase 2 activates arm cells; phase 3 adds a second drive-unit line in the expansion bay. |
| Line-side delivery | Tugger milk run (drivers, batched loops) or the plant's own AMRs (no drivers, one bin per trip). |
| Breakdowns | Random station, cell and test-rig failures with maintenance response. |
| + Test rig | Installs another rig through MOC, to relieve the test constraint. |
| + Inbound truck | Adds a supplier truck. |

## What it models

**Receiving and QC.** Trucks with 12 pallets dock at R1 to R3. Electronics, optics and battery packs get incoming QC; failures are held and returned.

**PFEP storage.** Each part class has its own storage type:
- Selective racking for mechanical parts.
- Floor storage for oversized chassis.
- An ESD cage for electronics and optics.
- A fire-separated battery room with a 480-kit fire-area limit.

**Supermarket and kanban.**
- Forklifts keep flow-rack lanes above 48 kits.
- Line-side bins hold 12 kits and raise a card at 5.
- The milk run or the AMRs deliver full bins.

**Assembly.** Drive units and mobile robots run on paced 4-station lines. A unit launches every takt, and station cycle times are 70–78% of takt. Picking arms are built in cells, paced to the phase's arm demand. Andon states are working, starved, blocked and down.

**End-of-line test.** Test times are 14, 11 and 9 minutes by family. Each rig needs a technician hookup. First-pass yields are 90%, 92% and 94%. Failures go to repair and return to the head of the buffer.

**Charging hub.** Drive units charge for 40 minutes and mobile robots for 30. Arms skip charging.

**Crating and shipping.** Crating takes about 3.2 minutes per unit. Trailers hold 24 crates and depart when full or after 150 minutes.

**People flow.** The plant has a forklift and AMR lane, a separate pedestrian walkway, a visitor gallery route, and ancillary rooms along the south wall.

## Sizing rules in the capacity panel

| Resource | Rule |
|---|---|
| Line stations | max station cycle time ≤ takt, where takt = 1,200 available min ÷ line demand |
| Test rigs | Σ(demand × test time ÷ FPY) ÷ (1,200 × 80% effectiveness) |
| Charging pads | units/hr × charge hrs × 1.2 (Little's Law) |
| Arm cells | demand × cell CT ÷ (1,200 × 90%) |
| Crating | demand × 3.2 min ÷ (1,200 × 85%) |
| Dock doors | trucks/day × dwell ÷ (1,200 × 75%) |

## KPIs

| KPI | Definition |
|---|---|
| Units shipped | Crates loaded onto trailers |
| Run rate | Crated units in the last 2 hours, scaled to a 20-hour day |
| Plant takt | 1,200 min ÷ POR daily demand; also names the current constraint |
| Test OEE | Availability × performance × quality across test rigs |
| First-pass yield | Units passing test on their first attempt |
| WIP | Units in the building |
| Units / labor hour | Finished units ÷ (headcount × hours) |
| Flow distance | Loaded material travel (pallets, bins, units, crates) per finished unit, in feet |
| Dock utilization | Door-occupied time ÷ available door time, target 70–80% |
| Test buffer | Units queued in front of the constraint |

## Tuning

Most assumptions sit at the top of `app.js`:

| What | Where |
|---|---|
| Demand, mix, equipment counts, staffing per phase | `PHASES` |
| Test time, charge time, FPY, BOM, failure modes per family | `FAM` |
| Part classes and suppliers | `CLS` |
| Bin size and reorder point | `BIN`, `ROP` |
| Line balance (station CT as a share of takt) | `bal` inside `init()` |
| Breakdown frequency (MTBF) | the `breakdown(...)` calls in `lineStep`, `cellStep` and `testStep` |

All figures are illustrative planning assumptions, not measured data. 1 floor unit ≈ 3.6 ft; 1 second on screen = 1 floor minute at 1×.
