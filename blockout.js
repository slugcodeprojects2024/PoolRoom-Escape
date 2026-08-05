// blockout.js — grey-box level for walking and judging proportion
//
// No textures, no detail. The point is to answer one question: does
// 80 x 80 x 28 read as an atrium or just a big room?
import * as THREE from 'three';
import { LEVEL, wingCenter } from './level-config.js';

const MAT = {
    floor:    new THREE.MeshStandardMaterial({ color: 0xbdbdb8, roughness: 0.9 }),
    wall:     new THREE.MeshStandardMaterial({ color: 0xd6d6d1, roughness: 0.85 }),
    ceiling:  new THREE.MeshStandardMaterial({ color: 0xccccc7, roughness: 0.9 }),
    pillar:   new THREE.MeshStandardMaterial({ color: 0xa8a8a3, roughness: 0.8 }),
    elevator: new THREE.MeshStandardMaterial({ color: 0xc99a5c, roughness: 0.7 }),
    poolWall: new THREE.MeshStandardMaterial({ color: 0x9fb4bd, roughness: 0.8 }),
    water:    new THREE.MeshStandardMaterial({ color: 0x4b9ec4, roughness: 0.15,
                                               transparent: true, opacity: 0.55 }),
    plaza:    new THREE.MeshStandardMaterial({ color: 0xe2e0da, roughness: 0.95 }),
    wing:     new THREE.MeshStandardMaterial({ color: 0xb5b0a4, roughness: 0.85 }),
    tower:    new THREE.MeshStandardMaterial({ color: 0xdedcd6, roughness: 0.6 }),
    ground:   new THREE.MeshStandardMaterial({ color: 0xd8c9a8, roughness: 1.0 }),
    hill:     new THREE.MeshStandardMaterial({ color: 0x8fae5e, roughness: 1.0 }),
    trunk:    new THREE.MeshStandardMaterial({ color: 0x6b5238, roughness: 0.9 }),
    foliage:  new THREE.MeshStandardMaterial({ color: 0x5f8f42, roughness: 1.0 }),
    shaft:    new THREE.MeshStandardMaterial({ color: 0x2b4450, roughness: 0.9 }),
    rock:     new THREE.MeshStandardMaterial({ color: 0x8a8175, roughness: 1.0 })
};

export class Blockout {
    constructor(scene) {
        this.scene = scene;
        this.root = new THREE.Group();
        this.collision = [];      // meshes the ground query raycasts against
        scene.add(this.root);
    }

    build() {
        this.buildGround();
        this.buildPlaza();
        this.buildPoolroom();
        this.buildPool();
        this.buildPillars();
        this.buildElevator();
        this.buildWalkway();
        this.buildWings();
        this.buildConnectors();
        this.buildTower();
        this.buildField();
        this.root.traverse(o => {
            if (!o.isMesh) return;
            o.castShadow = !o.userData.noCast;
            o.receiveShadow = true;
        });
        return this;
    }

    add(mesh, solid = true) {
        this.root.add(mesh);
        if (solid) this.collision.push(mesh);
        return mesh;
    }

    box(w, h, d, mat, x, y, z) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        return m;
    }

    buildGround() {
        const g = new THREE.Mesh(new THREE.CircleGeometry(LEVEL.field.radius, 64), MAT.ground);
        g.rotation.x = -Math.PI / 2;
        g.position.y = -0.05;
        g.userData.noCast = true;
        this.add(g);
    }

    buildPlaza() {
        const p = new THREE.Mesh(new THREE.CircleGeometry(LEVEL.plaza.radius, 48), MAT.plaza);
        p.rotation.x = -Math.PI / 2;
        p.position.y = 0;
        p.userData.noCast = true;
        this.add(p);
    }

    buildPoolroom() {
        const R = LEVEL.poolroom;
        const hw = R.width / 2, hd = R.depth / 2;
        const t = R.wallThickness;

        // Floor is a ring around the pool so the pool void stays open
        const pw = LEVEL.pool.width / 2, pd = LEVEL.pool.depth / 2;
        const strips = [
            [R.width, hd - pd, 0, (pd + hd) / 2],
            [R.width, hd - pd, 0, -(pd + hd) / 2],
            [hw - pw, LEVEL.pool.depth, (pw + hw) / 2, 0],
            [hw - pw, LEVEL.pool.depth, -(pw + hw) / 2, 0]
        ];
        for (const [w, d, x, z] of strips) {
            const s = this.box(w, 0.4, d, MAT.floor, x, -0.2, z);
            s.userData.noCast = true;
            this.add(s);
        }

        // Walls with window gaps and an entrance on the temple/nature sides
        const win = R.windows;
        const ent = R.entrance;
        // One doorway per side, so every wing has a way in
        const sides = [
            { axis: 'z', sign: -1, entrance: true },
            { axis: 'z', sign: 1,  entrance: true },
            { axis: 'x', sign: -1, entrance: true },
            { axis: 'x', sign: 1,  entrance: true }
        ];

        for (const side of sides) {
            const along = side.axis === 'z' ? R.width : R.depth;
            const pos = side.axis === 'z' ? hd : hw;
            const segs = this.wallSegments(along, win, side.entrance ? ent.width : 0);

            for (const seg of segs) {
                const w = side.axis === 'z' ? seg.len : t;
                const d = side.axis === 'z' ? t : seg.len;
                const x = side.axis === 'z' ? seg.center : side.sign * pos;
                const z = side.axis === 'z' ? side.sign * pos : seg.center;
                this.add(this.box(w, seg.h, d, MAT.wall, x, seg.y, z));
            }
        }

        // Ceiling as four slabs around the oculus
        const oc = R.oculus.width / 2;
        const slabs = [
            [R.width, hd - oc, 0, (oc + hd) / 2],
            [R.width, hd - oc, 0, -(oc + hd) / 2],
            [hw - oc, R.oculus.depth, (oc + hw) / 2, 0],
            [hw - oc, R.oculus.depth, -(oc + hw) / 2, 0]
        ];
        for (const [w, d, x, z] of slabs) {
            this.add(this.box(w, 0.8, d, MAT.ceiling, x, R.ceiling, z), false);
        }
    }

    // Splits a wall run into solid segments, leaving window gaps and a
    // centre entrance. Returns pieces with their own height and centre.
    wallSegments(length, win, entranceWidth) {
        const H = LEVEL.poolroom.ceiling;
        const half = length / 2;
        const gaps = [];

        if (entranceWidth > 0) {
            gaps.push({ a: -entranceWidth / 2, b: entranceWidth / 2, top: LEVEL.poolroom.entrance.height });
        }
        const n = win.countPerWall;
        const step = length / (n + 1);
        for (let i = 1; i <= n; i++) {
            const c = -half + i * step;
            if (entranceWidth > 0 && Math.abs(c) < entranceWidth / 2 + win.width) continue;
            gaps.push({ a: c - win.width / 2, b: c + win.width / 2, top: win.sill + win.height, bottom: win.sill });
        }
        gaps.sort((p, q) => p.a - q.a);

        const out = [];
        let cursor = -half;
        for (const g of gaps) {
            if (g.a > cursor) {
                out.push({ len: g.a - cursor, center: (cursor + g.a) / 2, h: H, y: H / 2 });
            }
            // lintel above the opening
            if (g.top < H) {
                out.push({ len: g.b - g.a, center: (g.a + g.b) / 2, h: H - g.top, y: (H + g.top) / 2 });
            }
            // sill below a window
            if (g.bottom > 0) {
                out.push({ len: g.b - g.a, center: (g.a + g.b) / 2, h: g.bottom, y: g.bottom / 2 });
            }
            cursor = g.b;
        }
        if (cursor < half) {
            out.push({ len: half - cursor, center: (cursor + half) / 2, h: H, y: H / 2 });
        }
        return out;
    }

    buildPool() {
        const P = LEVEL.pool;
        const hw = P.width / 2, hd = P.depth / 2;

        const bottom = this.box(P.width, 0.4, P.depth, MAT.poolWall, 0, -P.depthBelow, 0);
        bottom.userData.noCast = true;
        this.add(bottom);

        const walls = [
            [P.width, 0.4, 0, -hd], [P.width, 0.4, 0, hd],
            [0.4, P.depth, -hw, 0], [0.4, P.depth, hw, 0]
        ];
        for (const [w, d, x, z] of walls) {
            this.add(this.box(w, P.depthBelow, d, MAT.poolWall, x, -P.depthBelow / 2, z), false);
        }

        // Side passages. Believable pool depth, unbelievable shafts leading off it.
        const pw = P.passageWidth;
        for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const px = dx * (hw + pw / 2);
            const pz = dz * (hd + pw / 2);
            const shaft = this.box(
                dx !== 0 ? pw : pw * 1.6,
                P.passageDepth,
                dz !== 0 ? pw : pw * 1.6,
                MAT.shaft,
                px, -P.depthBelow - P.passageDepth / 2 + 2, pz
            );
            shaft.userData.noCast = true;
            this.root.add(shaft);
        }

        const water = this.box(P.width, 0.05, P.depth, MAT.water, 0, P.waterLevel, 0);
        water.userData.noCast = true;
        this.root.add(water);
        this.water = water;
    }

    buildPillars() {
        const C = LEVEL.pillars;
        const H = LEVEL.poolroom.ceiling + C.overshoot;
        const geo = new THREE.CylinderGeometry(C.radius, C.radius, H, 20);
        for (const sx of [-1, 1]) {
            for (let i = -1; i <= 1; i++) {
                const m = new THREE.Mesh(geo, MAT.pillar);
                m.position.set(sx * C.offsetX, H / 2 - LEVEL.pool.depthBelow, i * C.spacing);
                this.add(m, false);
            }
        }
    }

    buildElevator() {
        const E = LEVEL.elevator;
        const H = LEVEL.poolroom.ceiling + LEVEL.pillars.overshoot;
        const shaft = new THREE.Mesh(
            new THREE.CylinderGeometry(E.radius, E.radius, H, 28),
            MAT.elevator
        );
        shaft.position.set(0, H / 2 - LEVEL.pool.depthBelow, 0);
        this.add(shaft, false);

        // Door as a curved segment facing the temple
        const door = new THREE.Mesh(
            new THREE.CylinderGeometry(E.radius + 0.06, E.radius + 0.06, E.doorHeight, 20, 1, true,
                                       E.facing - E.doorArc / 2, E.doorArc),
            new THREE.MeshStandardMaterial({ color: 0x6f4a22, roughness: 0.6, side: THREE.DoubleSide })
        );
        door.position.set(0, E.doorHeight / 2, 0);
        this.root.add(door);
        this.elevatorDoor = door;
    }

    buildWalkway() {
        const W = LEVEL.walkway;
        const len = Math.abs(W.toZ);
        const m = this.box(W.width, 0.4, len, MAT.floor, 0, -0.2, W.toZ / 2);
        m.userData.noCast = true;
        this.add(m);
    }

    buildWings() {
        for (const name of Object.keys(LEVEL.wings)) {
            const w = LEVEL.wings[name];
            const [cx, , cz] = wingCenter(name);

            const slab = this.box(w.width, 0.4, w.depth, MAT.plaza, cx, 0.05, cz);
            slab.userData.noCast = true;
            this.add(slab);

            if (w.height <= 0) continue;

            if (w.enclosure === 'open') {
                // Temple: roof on columns, no walls
                const colGeo = new THREE.CylinderGeometry(1.1, 1.1, w.height, 14);
                const nx = 6, nz = 4;
                for (let i = 0; i < nx; i++) {
                    for (let j = 0; j < nz; j++) {
                        if (i > 0 && i < nx - 1 && j > 0 && j < nz - 1) continue;
                        const c = new THREE.Mesh(colGeo, MAT.pillar);
                        c.position.set(
                            cx - w.width / 2 + 3 + i * ((w.width - 6) / (nx - 1)),
                            w.height / 2,
                            cz - w.depth / 2 + 3 + j * ((w.depth - 6) / (nz - 1))
                        );
                        this.add(c, false);
                    }
                }
                this.add(this.box(w.width, 1.2, w.depth, MAT.wing, cx, w.height, cz), false);
            } else if (w.enclosure === 'nature') {
                // Pond, trees, and walkways to wander
                const pondR = Math.min(w.width, w.depth) * 0.3;
                const pond = new THREE.Mesh(new THREE.CircleGeometry(pondR, 32), MAT.water);
                pond.rotation.x = -Math.PI / 2;
                pond.position.set(cx, 0.15, cz);
                pond.userData.noCast = true;
                this.root.add(pond);

                const basin = new THREE.Mesh(new THREE.CylinderGeometry(pondR, pondR * 0.8, 3, 32), MAT.poolWall);
                basin.position.set(cx, -1.5, cz);
                this.add(basin, false);

                const trunk = new THREE.CylinderGeometry(0.4, 0.55, 6, 8);
                const canopy = new THREE.SphereGeometry(3.4, 10, 8);
                for (let i = 0; i < 14; i++) {
                    const a = (i / 14) * Math.PI * 2 + Math.random();
                    const r = pondR + 5 + Math.random() * (w.width / 2 - pondR - 6);
                    const tx = cx + Math.cos(a) * r, tz = cz + Math.sin(a) * r;
                    this.add(new THREE.Mesh(trunk, MAT.trunk).translateX(tx).translateY(3).translateZ(tz), false);
                    const c = new THREE.Mesh(canopy, MAT.foliage);
                    c.position.set(tx, 7.5, tz);
                    c.scale.set(1, 0.8, 1);
                    this.root.add(c);
                }

                for (const ang of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
                    const path = this.box(3.5, 0.3, w.depth / 2, MAT.plaza,
                        cx + Math.cos(ang) * (pondR + w.width / 6),
                        0.1,
                        cz + Math.sin(ang) * (pondR + w.depth / 6));
                    path.rotation.y = ang;
                    path.userData.noCast = true;
                    this.add(path);
                }
            } else if (w.enclosure === 'indoor') {
                // Museum: enclosed, with internal hallways and exhibit bays
                const t = 1.0;
                const hw2 = w.width / 2, hd2 = w.depth / 2;
                this.add(this.box(w.width, w.height, t, MAT.wing, cx, w.height / 2, cz - hd2), false);
                this.add(this.box(w.width, w.height, t, MAT.wing, cx, w.height / 2, cz + hd2), false);
                this.add(this.box(t, w.height, w.depth, MAT.wing, cx - hw2, w.height / 2, cz), false);
                // Entry wall facing the plaza, with a doorway gap
                for (const sgn of [-1, 1]) {
                    this.add(this.box(t, w.height, w.depth / 2 - 4, MAT.wing,
                                      cx + hw2, w.height / 2, cz + sgn * (w.depth / 4 + 2)), false);
                }

                // Internal partitions forming hallways and bays
                for (const sgn of [-1, 1]) {
                    this.add(this.box(w.width * 0.55, w.height, t, MAT.wing,
                                      cx - w.width * 0.12, w.height / 2, cz + sgn * w.depth * 0.22), false);
                }
                this.add(this.box(t, w.height, w.depth * 0.34, MAT.wing,
                                  cx + w.width * 0.16, w.height / 2, cz), false);

                // Exhibit plinths
                for (const [ex, ez] of [[-0.28, -0.32], [-0.28, 0.32], [0.3, -0.3], [0.3, 0.3], [0.02, 0]]) {
                    this.add(this.box(3, 1.2, 3, MAT.pillar, cx + ex * w.width, 0.6, cz + ez * w.depth), false);
                }

                // Roof with skylight slots
                for (const sgn of [-1, 1]) {
                    this.add(this.box(w.width, 0.8, w.depth / 2 - 5, MAT.wing,
                                      cx, w.height, cz + sgn * (w.depth / 4 + 2.5)), false);
                }
            } else if (w.enclosure === 'grotto') {
                this.buildGrotto(cx, cz, w);
            }
        }
    }

    connectorLeg(a, b, C) {
        const dx = b[0] - a[0], dz = b[2] - a[2];
        const len = Math.hypot(dx, dz);
        if (len < 2) return;
        const alongX = Math.abs(dx) > Math.abs(dz);
        const mid = [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2];
        const w = alongX ? len : C.width;
        const d = alongX ? C.width : len;

        const deck = this.box(w, 0.4, d, MAT.plaza, mid[0], 0.05, mid[2]);
        deck.userData.noCast = true;
        this.add(deck);
        this.add(this.box(w, 0.4, d, MAT.wing, mid[0], C.height, mid[2]), false);

        const n = Math.max(2, Math.round(len / 12));
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            for (const side of [-1, 1]) {
                const px = a[0] + dx * t + (alongX ? 0 : side * (C.width / 2 - 0.8));
                const pz = a[2] + dz * t + (alongX ? side * (C.width / 2 - 0.8) : 0);
                this.add(this.box(0.6, C.height, 0.6, MAT.pillar, px, C.height / 2, pz), false);
            }
        }
    }

    buildTower() {
        const T = LEVEL.tower;
        // Starts at the atrium ceiling and shares its footprint, so base and
        // shaft read as one continuous volume with no setback.
        const base = LEVEL.poolroom.ceiling;
        const m = this.box(T.width, T.height, T.depth, MAT.tower, 0, base + T.height / 2, 0);
        this.add(m, false);

        // Roof slab — the opening scene stands here
        const roof = this.box(T.width, 0.6, T.depth, MAT.plaza, 0, base + T.height, 0);
        this.add(roof);
    }

    // Layered value noise. Hemispheres read as blobs because their silhouette
    // is a hard circle; a displaced surface gives continuous ridges instead.
    hillHeight(x, z) {
        const F = LEVEL.field;
        const n = (px, pz) =>
            Math.sin(px * 1.0) * Math.cos(pz * 0.9) +
            Math.sin(px * 2.1 + 1.3) * Math.cos(pz * 1.7 - 0.6) * 0.5 +
            Math.sin(px * 4.3 - 2.1) * Math.cos(pz * 3.9 + 1.1) * 0.24;

        const s = F.hillScale;
        let h = n(x / s, z / s) * F.hillAmplitude;

        // Flatten under the plaza and blend out over the next 200 m
        const d = Math.hypot(x, z);
        const blend = Math.min(1, Math.max(0, (d - F.flatRadius) / 200));
        return h * blend * blend;
    }

    buildField() {
        const F = LEVEL.field;

        const geo = new THREE.PlaneGeometry(F.radius * 2, F.radius * 2, F.terrainSegments, F.terrainSegments);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), y = pos.getY(i);
            pos.setZ(i, this.hillHeight(x, y));
        }
        geo.computeVertexNormals();
        const terrain = new THREE.Mesh(geo, MAT.hill);
        terrain.rotation.x = -Math.PI / 2;
        terrain.position.y = -1;
        terrain.castShadow = false;
        terrain.receiveShadow = true;
        terrain.userData.noCast = true;
        this.root.add(terrain);

        const m4 = new THREE.Matrix4();
        const towerGeo = new THREE.BoxGeometry(1, 1, 1);
        const towers = new THREE.InstancedMesh(towerGeo, MAT.tower, F.towerCount);
        for (let i = 0; i < F.towerCount; i++) {
            const a = (i / F.towerCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
            const r = F.towerRingInner + Math.random() * (F.towerRingOuter - F.towerRingInner);
            const h = F.towerMinHeight + Math.random() * (F.towerMaxHeight - F.towerMinHeight);
            const w = F.towerMinWidth + Math.random() * (F.towerMaxWidth - F.towerMinWidth);
            const x = Math.cos(a) * r, z = Math.sin(a) * r;
            m4.makeScale(w, h, w);
            m4.setPosition(x, this.hillHeight(x, z) + h / 2 - 2, z);
            towers.setMatrixAt(i, m4);
        }
        towers.instanceMatrix.needsUpdate = true;
        towers.castShadow = false;
        this.root.add(towers);
    }

    // Modelled on real resort grottos: swim through the waterfall into a
    // cave with bench seating and a swim-up bar, with a raised spa spilling
    // into the basin and a dry entrance from the patio.
    buildGrotto(cx, cz, wing) {
        const G = LEVEL.grotto;

        const basin = new THREE.Mesh(
            new THREE.CylinderGeometry(G.basinRadius, G.basinRadius * 0.85, G.basinDepth, 40),
            MAT.poolWall
        );
        basin.position.set(cx, -G.basinDepth / 2, cz);
        this.add(basin, false);

        const water = new THREE.Mesh(new THREE.CircleGeometry(G.basinRadius - 0.4, 40), MAT.water);
        water.rotation.x = -Math.PI / 2;
        water.position.set(cx, -0.2, cz);
        water.userData.noCast = true;
        this.root.add(water);

        // Cave on the far side, its mouth facing the basin
        const caveZ = cz - G.basinRadius - G.caveDepth / 2 + 3;
        this.add(this.box(G.caveWidth, G.caveHeight, 1.2, MAT.rock, cx, G.caveHeight / 2, caveZ - G.caveDepth / 2), false);
        for (const sgn of [-1, 1]) {
            this.add(this.box(1.2, G.caveHeight, G.caveDepth, MAT.rock,
                              cx + sgn * G.caveWidth / 2, G.caveHeight / 2, caveZ), false);
        }
        this.add(this.box(G.caveWidth + 2.4, 1.0, G.caveDepth + 1.2, MAT.rock, cx, G.caveHeight, caveZ), false);

        const caveFloor = this.box(G.caveWidth, 0.4, G.caveDepth, MAT.rock, cx, -0.2, caveZ);
        caveFloor.userData.noCast = true;
        this.add(caveFloor);

        // The waterfall curtain you swim through to get in
        const fall = this.box(G.waterfallWidth, G.waterfallDrop, 0.35, MAT.water,
                              cx, G.caveHeight - G.waterfallDrop / 2, caveZ + G.caveDepth / 2);
        fall.userData.noCast = true;
        this.root.add(fall);

        // Swim-up bar inside the cave, stools on the water side
        this.add(this.box(G.barLength, 1.1, 1.4, MAT.wing, cx, 0.55, caveZ - 2), false);
        for (let i = 0; i < G.stoolCount; i++) {
            const sx = cx - G.barLength / 2 + (i + 0.5) * (G.barLength / G.stoolCount);
            this.add(this.box(0.9, 0.6, 0.9, MAT.pillar, sx, 0.3, caveZ - 0.2), false);
        }

        // Bench seating along the cave's back wall
        this.add(this.box(G.caveWidth - 3, 0.5, 1.2, MAT.rock, cx, 0.25, caveZ - G.caveDepth / 2 + 1.4), false);

        // Raised spa spilling into the basin
        const spaZ = cz + G.basinRadius * 0.55;
        const spa = new THREE.Mesh(
            new THREE.CylinderGeometry(G.spaRadius, G.spaRadius, G.spaLift + 1.2, 28),
            MAT.rock
        );
        spa.position.set(cx, G.spaLift / 2 - 0.4, spaZ);
        this.add(spa, false);
        const spaWater = new THREE.Mesh(new THREE.CircleGeometry(G.spaRadius - 0.5, 28), MAT.water);
        spaWater.rotation.x = -Math.PI / 2;
        spaWater.position.set(cx, G.spaLift + 0.15, spaZ);
        spaWater.userData.noCast = true;
        this.root.add(spaWater);

        // Dry patio approach from the plaza side
        const patio = this.box(wing.width * 0.5, 0.4, 8, MAT.plaza, cx, 0.05, cz + G.basinRadius + 5);
        patio.userData.noCast = true;
        this.add(patio);

        // Rockwork ring
        for (let i = 0; i < G.rockCount; i++) {
            const a = (i / G.rockCount) * Math.PI * 2;
            const r = G.basinRadius + 2.5 + Math.random() * 2;
            const sz = 1.6 + Math.random() * 2.6;
            const rock = this.box(sz, sz * 0.8, sz, MAT.rock,
                                  cx + Math.cos(a) * r, sz * 0.3, cz + Math.sin(a) * r);
            rock.rotation.y = Math.random() * Math.PI;
            this.add(rock, false);
        }
    }

    buildConnectors() {
        const C = LEVEL.connectors;
        for (const [a, b] of C.pairs) {
            // 'center' means the poolroom doorway on the facing wall, not
            // the middle of the pool — a covered walk should meet the building.
            const doorOf = (other) => {
                const w = LEVEL.wings[other];
                const half = LEVEL.poolroom.width / 2;
                return [w.dir[0] * half, 0, w.dir[1] * half];
            };
            const pa = a === 'center' ? doorOf(b) : wingCenter(a);
            const pb = b === 'center' ? doorOf(a) : wingCenter(b);
            // Two axis-aligned legs via a corner, so nothing cuts diagonally
            // across the plaza grid.
            const corner = [pb[0], 0, pa[2]];
            this.connectorLeg(pa, corner, C);
            this.connectorLeg(corner, pb, C);
        }
    }
}
