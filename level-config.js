// level-config.js — single source of truth for level dimensions
//
// UNITS ARE METRES. 1 unit = 1 m throughout.
// Everything the blockout and the final geometry build from lives here.

const BASE = {

    poolroom: {
        width: 80,
        depth: 80,
        ceiling: 28,
        wallThickness: 1.2,

        oculus: { width: 26, depth: 26 },

        // Openings in the walls. y is the sill height.
        windows: { width: 7, height: 9, sill: 3, countPerWall: 5 },

        // A doorway on every side — one per wing
        entrance: { width: 9, height: 12 },
        entranceSides: ['-z', '+z', '-x', '+x']
    },

    pool: {
        width: 56,
        depth: 56,
        depthBelow: 6,          // believable for a real pool
        passageDepth: 60,       // the side passages are not believable, deliberately
        passageWidth: 7,
        waterLevel: -0.15,
        edgeWidth: 1.0
    },

    pillars: {
        radius: 2.1,
        // Three per long edge, spaced along Z at the pool's X edges
        spacing: 18,
        offsetX: 24,        // from centre, just inside the pool edge
        // Visible continuation above the ceiling line sells the atrium
        overshoot: 10
    },

    elevator: {
        radius: 4,
        doorArc: Math.PI * 0.55,    // curved door segment
        doorHeight: 5,
        facing: -Math.PI / 2,        // opens toward the temple (-Z)
        shaftDepth: 40               // how far it descends at the end
    },

    walkway: {
        width: 6,
        // Runs from the elevator to the temple-side pool edge
        from: [0, 0],
        toZ: -22
    },

    // Distances measured from the poolroom's outer wall to the wing's near edge.
    // Staggered on purpose — four equal spokes get disorienting under pressure.
    wings: {
        temple:  { dir: [0, -1], gap: 45,  width: 72, depth: 60, height: 20, enclosure: 'open',    label: 'Temple' },
        museum:  { dir: [-1, 0], gap: 70,  width: 66, depth: 56, height: 15, enclosure: 'indoor',  label: 'Museum' },
        grotto:  { dir: [1, 0],  gap: 95,  width: 52, depth: 46, height: 7,  enclosure: 'grotto',  label: 'Grotto' },
        nature:  { dir: [0, 1],  gap: 120, width: 76, depth: 62, height: 0,  enclosure: 'nature',  label: 'Nature' }
    },

    plaza: {
        // Paved area under and around the tower and wings
        radius: 200,
        y: 0
    },

    tower: {
        // Same footprint as the atrium below it — no setback, no ledge.
        // The base and the shaft are one continuous volume.
        width: 80,
        depth: 80,
        height: 340
    },

    // Covered links so the plaza reads as one complex rather than
    // separate buildings on a field.
    connectors: {
        width: 9,
        height: 6,
        // Routed as right angles through the plaza, not diagonals across it
        pairs: [['grotto', 'center'], ['grotto', 'nature']]
    },

    // Drawn from real mansion and resort grottos: a waterfall you swim
    // through, a cave behind it with bench seating and a swim-up bar,
    // a raised spa spilling into the main basin, and a dry patio entrance.
    grotto: {
        basinRadius: 15,
        basinDepth: 2.4,
        caveWidth: 18,
        caveDepth: 13,
        caveHeight: 4.2,
        waterfallWidth: 7,
        waterfallDrop: 3.4,
        spaRadius: 5,
        spaLift: 1.5,
        barLength: 9,
        stoolCount: 4,
        rockCount: 16
    },

    field: {
        radius: 9000,
        terrainSegments: 180,
        hillAmplitude: 90,
        hillScale: 900,
        flatRadius: 260,        // terrain stays flat under the plaza
        towerCount: 34,
        towerRingInner: 1600,
        towerRingOuter: 7000,
        towerMinHeight: 260,
        towerMaxHeight: 620,
        towerMinWidth: 70,
        towerMaxWidth: 150
    },

    player: {
        eyeHeight: 1.7,
        walkSpeed: 5.5,
        sprintMultiplier: 1.7,
        swimSpeed: 2.2,
        jumpVelocity: 4.6,
        gravity: 9.8,
        spawn: [0, 1.7, 30]
    },

    eye: {
        diameter: 300,
        // Held at a fixed distance and scaled instead of genuinely approaching —
        // visually identical here, and avoids a 400,000:1 depth ratio.
        renderDistance: 3000,
        startScale: 0.0093,   // subtends 0.53°, same as the real sun
        endScale: 1.0,
        approachSeconds: 90
    }
};

// Saved edits from the in-browser layout editor, deep-merged over the
// defaults above. Delete level-overrides.json to get back to these values.
import OVERRIDES from './level-overrides.json';

function deepMerge(base, patch) {
    if (!patch || typeof patch !== 'object') return base;
    const out = Array.isArray(base) ? base.slice() : { ...base };
    for (const k of Object.keys(patch)) {
        const v = patch[k];
        out[k] = (v && typeof v === 'object' && !Array.isArray(v))
            ? deepMerge(base[k] || {}, v)
            : v;
    }
    return out;
}

export const LEVEL = deepMerge(BASE, OVERRIDES);

// Wing world position, derived so nothing is duplicated
export function wingCenter(name) {
    const w = LEVEL.wings[name];
    const halfRoom = LEVEL.poolroom.width / 2;
    const dist = halfRoom + w.gap + (w.dir[0] !== 0 ? w.width : w.depth) / 2;
    return [w.dir[0] * dist, 0, w.dir[1] * dist];
}
