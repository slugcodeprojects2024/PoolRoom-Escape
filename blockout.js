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
    rock:     new THREE.MeshStandardMaterial({ color: 0x8a8175, roughness: 1.0 }),
    thatch:   new THREE.MeshStandardMaterial({ color: 0xc9a86a, roughness: 1.0 }),
    wood:     new THREE.MeshStandardMaterial({ color: 0x8a6134, roughness: 0.85 }),
    gravel:   new THREE.MeshStandardMaterial({ color: 0xd8d3c6, roughness: 1.0 }),
    dg:        new THREE.MeshStandardMaterial({ color: 0xcfc3ab, roughness: 1.0 }),
    terracotta:new THREE.MeshStandardMaterial({ color: 0xc4664a, roughness: 0.95 }),
    concrete:  new THREE.MeshStandardMaterial({ color: 0xe0ddd5, roughness: 0.9 }),
    mulch:     new THREE.MeshStandardMaterial({ color: 0x6b5745, roughness: 1.0 }),
    grass:     new THREE.MeshStandardMaterial({ color: 0x8fae4e, roughness: 1.0 }),
    canopy:    new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.6, metalness: 0.2 }),
    seatRed:   new THREE.MeshStandardMaterial({ color: 0xe23b34, roughness: 0.5 }),
    seatLime:  new THREE.MeshStandardMaterial({ color: 0xc2d63f, roughness: 0.5 }),
    tableTop:  new THREE.MeshStandardMaterial({ color: 0xd8d5cc, roughness: 0.4 }),
    signPost:  new THREE.MeshStandardMaterial({ color: 0xd9e04a, roughness: 0.5 }),
    conifer:  new THREE.MeshStandardMaterial({ color: 0x2f5c3a, roughness: 1.0 }),
    maple:    new THREE.MeshStandardMaterial({ color: 0x7fb04a, roughness: 1.0 }),
    shrub:    new THREE.MeshStandardMaterial({ color: 0x4a7a3d, roughness: 1.0 }),
    groundcover: new THREE.MeshStandardMaterial({ color: 0x6d9c4e, roughness: 1.0 }),
    metal:    new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.3 }),
    // Distinct tint per body of water so they read apart at a glance
    waterPool:   new THREE.MeshStandardMaterial({ color: 0x3fa0d8, roughness: 0.12, transparent: true, opacity: 0.5 }),
    waterGrotto: new THREE.MeshStandardMaterial({ color: 0x2fc4b0, roughness: 0.12, transparent: true, opacity: 0.5 }),
    waterSpa:    new THREE.MeshStandardMaterial({ color: 0x8ad4e8, roughness: 0.10, transparent: true, opacity: 0.55 }),
    waterPond:   new THREE.MeshStandardMaterial({ color: 0x4f8f6a, roughness: 0.2,  transparent: true, opacity: 0.6 }),
    waterFall:   new THREE.MeshStandardMaterial({ color: 0xa8e4f0, roughness: 0.1,  transparent: true, opacity: 0.7 })
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

    // Horizontal colour bands every metre, darkening with depth, with a
    // brighter stripe every 5 m. Reads like a bathymetric chart — you can
    // judge how deep you are without a HUD.
    bandMaterial(depth, maxDepth, hue) {
        const t = Math.min(1, depth / Math.max(1, maxDepth));
        const c = new THREE.Color().setHSL(hue, 0.55, 0.62 - t * 0.42);
        if (depth % 5 < 1 && depth > 0) c.offsetHSL(0, 0.15, 0.12);
        return new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
    }

    // Stacked 1 m bands forming one wall of a rectangular basin.
    depthBandWall(w, d, x, z, top, bottom, hue, rotY = 0) {
        const total = top - bottom;
        for (let i = 0; i < Math.ceil(total); i++) {
            const h = Math.min(1, total - i);
            const yTop = top - i;
            const m = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, d),
                this.bandMaterial(i, total, hue)
            );
            m.position.set(x, yTop - h / 2, z);
            m.rotation.y = rotY;
            m.userData.noCast = true;
            this.add(m, false);
        }
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

        // Banded walls: one metre per band, brighter every five
        this.depthBandWall(P.width, 0.4, 0, -hd, 0, -P.depthBelow, 0.55);
        this.depthBandWall(P.width, 0.4, 0,  hd, 0, -P.depthBelow, 0.55);
        this.depthBandWall(0.4, P.depth, -hw, 0, 0, -P.depthBelow, 0.55);
        this.depthBandWall(0.4, P.depth,  hw, 0, 0, -P.depthBelow, 0.55);

        // Three short alcoves plus one long descent. Only the deep one
        // breaks physical plausibility, which is what makes it read as
        // intentional rather than as a modelling accident.
        const pw = P.passageWidth;
        const sides = [['-x', -1, 0], ['+x', 1, 0], ['-z', 0, -1], ['+z', 0, 1]];
        this.descentMouth = null;

        for (const [name, dx, dz] of sides) {
            const isDescent = name === P.descentSide;
            const len = isDescent ? P.passageDepth : P.alcoveDepth;
            const px = dx * (hw + pw / 2);
            const pz = dz * (hd + pw / 2);

            if (isDescent) {
                // Vertical shaft dropping away from the pool floor
                const bandH = 10;
                const top = -P.depthBelow;
                for (let i = 0; i < Math.ceil(len / bandH); i++) {
                    const t = i / (len / bandH);
                    const seg = new THREE.Mesh(
                        new THREE.BoxGeometry(pw * 1.5, bandH, pw * 1.5),
                        new THREE.MeshStandardMaterial({
                            color: new THREE.Color().setHSL(0.56, 0.5, 0.30 - t * 0.27),
                            roughness: 0.95
                        })
                    );
                    seg.position.set(px, top - i * bandH - bandH / 2, pz);
                    seg.userData.noCast = true;
                    this.root.add(seg);
                }
                this.descentMouth = new THREE.Vector3(px, top, pz);
            } else {
                // Horizontal alcove at the pool floor
                const aw = dx !== 0 ? len : pw;
                const ad = dz !== 0 ? len : pw;
                const ax = dx * (hw + (dx !== 0 ? len / 2 : 0));
                const az = dz * (hd + (dz !== 0 ? len / 2 : 0));
                const alcove = this.box(aw, 4.5, ad, MAT.shaft, ax, -P.depthBelow + 2.25, az);
                alcove.userData.noCast = true;
                this.root.add(alcove);
            }
        }

        const water = this.box(P.width, 0.05, P.depth, MAT.waterPool, 0, P.waterLevel, 0);
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

            // Dispatch by enclosure first. Nature and grotto are open
            // landscapes with height 0, so a height guard here would skip
            // them entirely — which it did.
            if (w.enclosure === 'nature') { this.buildNature(cx, cz, w); continue; }
            if (w.enclosure === 'grotto') { this.buildGrotto(cx, cz, w); continue; }
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

        // Shallow shelf ring first, deep lagoon cut into it
        const shelf = new THREE.Mesh(
            new THREE.CylinderGeometry(G.shelfRadius, G.shelfRadius, G.shelfDepth, 48),
            MAT.poolWall
        );
        shelf.position.set(cx, -G.shelfDepth / 2, cz);
        shelf.userData.noCast = true;
        this.add(shelf, false);

        for (let i = 0; i < Math.ceil(G.lagoonDepth); i++) {
            const h = Math.min(1, G.lagoonDepth - i);
            const ring = new THREE.Mesh(
                new THREE.CylinderGeometry(G.lagoonRadius, G.lagoonRadius * 0.94, h, 48),
                this.bandMaterial(i, G.lagoonDepth, 0.46)
            );
            ring.position.set(cx, -i - h / 2, cz);
            ring.userData.noCast = true;
            this.add(ring, false);
        }

        const water = new THREE.Mesh(new THREE.CircleGeometry(G.shelfRadius - 0.5, 48), MAT.waterGrotto);
        water.rotation.x = -Math.PI / 2;
        water.position.set(cx, -0.2, cz);
        water.userData.noCast = true;
        this.root.add(water);

        // Rock massif on the -Z side, cave hollowed behind it
        const mz = cz - G.lagoonRadius - G.massifDepth / 2 + 4;
        for (const sgn of [-1, 1]) {
            this.add(this.box((G.massifWidth - G.caveWidth) / 2, G.massifHeight, G.massifDepth, MAT.rock,
                cx + sgn * (G.caveWidth + (G.massifWidth - G.caveWidth) / 2) / 2, G.massifHeight / 2, mz), false);
        }
        this.add(this.box(G.massifWidth, G.massifHeight - G.caveHeight, G.massifDepth, MAT.rock,
            cx, G.caveHeight + (G.massifHeight - G.caveHeight) / 2, mz), false);
        this.add(this.box(G.caveWidth, G.caveHeight, 1.2, MAT.rock,
            cx, G.caveHeight / 2, mz - G.massifDepth / 2), false);

        const caveFloor = this.box(G.caveWidth, 0.4, G.caveDepth, MAT.rock, cx, -0.2, mz);
        caveFloor.userData.noCast = true;
        this.add(caveFloor);

        // The waterfall curtain — swimming through it is the only way in
        const fall = this.box(G.waterfallWidth, G.waterfallDrop, 0.4, MAT.waterFall,
            cx, G.caveHeight - G.waterfallDrop / 2, mz + G.massifDepth / 2);
        fall.userData.noCast = true;
        this.root.add(fall);

        this.add(this.box(G.barLength, 1.1, 1.4, MAT.wing, cx, 0.55, mz - 3), false);
        for (let i = 0; i < G.stoolCount; i++) {
            const sx = cx - G.barLength / 2 + (i + 0.5) * (G.barLength / G.stoolCount);
            this.add(this.box(0.9, 0.7, 0.9, MAT.pillar, sx, 0.35, mz - 1.2), false);
        }
        this.add(this.box(G.caveWidth - 4, 0.5, 1.2, MAT.rock, cx, 0.25, mz - G.caveDepth / 2 + 1.4), false);

        // Raised spa spilling into the lagoon
        const spaZ = cz + G.lagoonRadius * 0.5;
        const spaX = cx + G.lagoonRadius * 0.5;
        this.add(new THREE.Mesh(
            new THREE.CylinderGeometry(G.spaRadius, G.spaRadius, G.spaLift + 1.4, 28), MAT.rock
        ).translateX(spaX).translateY(G.spaLift / 2 - 0.5).translateZ(spaZ), false);
        const spaWater = new THREE.Mesh(new THREE.CircleGeometry(G.spaRadius - 0.6, 28), MAT.waterSpa);
        spaWater.rotation.x = -Math.PI / 2;
        spaWater.position.set(spaX, G.spaLift + 0.2, spaZ);
        spaWater.userData.noCast = true;
        this.root.add(spaWater);

        // Slide: starts on top of the massif and lands in the lagoon.
        // Anchored at both ends and propped, so it can't float over the plaza.
        const steps = 18;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const a = Math.PI * 1.15 + t * Math.PI * 0.62;
            const r = G.lagoonRadius * (0.95 - t * 0.35);
            const x = cx + Math.cos(a) * r;
            const z = cz + Math.sin(a) * r;
            const y = G.slideHeight * (1 - t) * (1 - t) + 0.4;

            const seg = this.box(3.4, 0.35, 4.2, MAT.furniture, x, y, z);
            seg.rotation.y = -a;
            this.add(seg, false);

            if (i % 3 === 0 && y > 1.6) {
                this.add(this.box(0.45, y, 0.45, MAT.pillar, x, y / 2, z), false);
            }
        }

        // Palapas standing in the shallow shelf
        for (let i = 0; i < G.palapaCount; i++) {
            const a = Math.PI * 0.25 + (i / G.palapaCount) * Math.PI * 0.7;
            const r = (G.lagoonRadius + G.shelfRadius) / 2;
            const px = cx + Math.cos(a) * r, pz = cz + Math.sin(a) * r;
            this.add(this.box(0.4, 3.4, 0.4, MAT.trunk, px, 1.7, pz), false);
            this.add(new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.5, 10), MAT.thatch)
                .translateX(px).translateY(4.1).translateZ(pz), false);
        }

        const patio = this.box(wing.width * 0.45, 0.4, 9, MAT.plaza, cx - 10, 0.05, cz + G.shelfRadius + 5);
        patio.userData.noCast = true;
        this.add(patio);

        for (let i = 0; i < G.rockCount; i++) {
            const a = (i / G.rockCount) * Math.PI * 2;
            const r = G.shelfRadius + 2.5 + Math.random() * 3;
            const sz = 1.8 + Math.random() * 3;
            const rock = this.box(sz, sz * 0.8, sz, MAT.rock,
                cx + Math.cos(a) * r, sz * 0.3, cz + Math.sin(a) * r);
            rock.rotation.y = Math.random() * Math.PI;
            this.add(rock, false);
        }

        for (let i = 0; i < G.palmCount; i++) {
            const a = (i / G.palmCount) * Math.PI * 2 + 0.3;
            const r = G.shelfRadius + 7 + Math.random() * 6;
            const px = cx + Math.cos(a) * r, pz = cz + Math.sin(a) * r;
            this.add(this.box(0.4, 8, 0.4, MAT.trunk, px, 4, pz), false);
            const crown = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), MAT.foliage);
            crown.position.set(px, 8.5, pz);
            crown.scale.set(1, 0.5, 1);
            this.root.add(crown);
        }

        this.buildRiver(cx, cz, G);
    }

    // One-way channel, grotto to nature. Registered as a current volume so
    // the controller can push the player along it.
    buildRiver(gx, gz, G) {
        const R = LEVEL.river;
        const nature = wingCenter('nature');
        const start = new THREE.Vector3(gx, 0, gz + G.shelfRadius);
        const end = new THREE.Vector3(nature[0] + 18, 0, nature[2] - 14);

        this.riverPath = [];
        const ctrlX = gx + 6, ctrlZ = (start.z + end.z) / 2;

        for (let i = 0; i <= R.segments; i++) {
            const t = i / R.segments;
            const mt = 1 - t;
            const x = mt * mt * start.x + 2 * mt * t * ctrlX + t * t * end.x;
            const z = mt * mt * start.z + 2 * mt * t * ctrlZ + t * t * end.z;
            this.riverPath.push(new THREE.Vector3(x, 0, z));
        }

        for (let i = 0; i < this.riverPath.length - 1; i++) {
            const a = this.riverPath[i], b = this.riverPath[i + 1];
            const mid = a.clone().lerp(b, 0.5);
            const len = a.distanceTo(b) * 1.25;
            const ang = Math.atan2(b.z - a.z, b.x - a.x);

            const bed = this.box(len, 0.4, R.width, MAT.poolWall, mid.x, -R.depth, mid.z);
            bed.rotation.y = -ang;
            bed.userData.noCast = true;
            this.add(bed);

            for (const sgn of [-1, 1]) {
                const bank = this.box(len, R.depth + R.bankHeight, 0.8, MAT.rock,
                    mid.x - Math.sin(-ang) * sgn * (R.width / 2),
                    (-R.depth + R.bankHeight) / 2,
                    mid.z - Math.cos(-ang) * sgn * (R.width / 2));
                bank.rotation.y = -ang;
                this.add(bank, false);
            }

            const surf = this.box(len, 0.05, R.width - 0.6, MAT.waterGrotto, mid.x, -0.25, mid.z);
            surf.rotation.y = -ang;
            surf.userData.noCast = true;
            this.root.add(surf);
        }
    }

    // Corporate campus landscape: sparse planting, decomposed granite,
    // colour-blocked paving, coloured furniture, shade canopies. The river
    // arrives as a rill and ends in a shallow reflecting basin.
    buildNature(cx, cz, wing) {
        const W = wing.width, D = wing.depth;

        // Ground plane in two paving tones with a concrete edge band between
        const deck = this.box(W, 0.3, D, MAT.dg, cx, 0.1, cz);
        deck.userData.noCast = true;
        this.add(deck);

        const terrace = this.box(W * 0.42, 0.34, D * 0.44, MAT.terracotta,
                                 cx + W * 0.16, 0.14, cz + D * 0.12);
        terrace.userData.noCast = true;
        this.add(terrace);

        for (const [bx, bz, bw, bd] of [
            [cx + W * 0.16, cz + D * 0.12 - D * 0.22, W * 0.42, 0.5],
            [cx + W * 0.16, cz + D * 0.12 + D * 0.22, W * 0.42, 0.5],
            [cx + W * 0.16 - W * 0.21, cz + D * 0.12, 0.5, D * 0.44],
            [cx + W * 0.16 + W * 0.21, cz + D * 0.12, 0.5, D * 0.44]
        ]) {
            const band = this.box(bw, 0.36, bd, MAT.concrete, bx, 0.15, bz);
            band.userData.noCast = true;
            this.add(band);
        }

        // The rill: river arrives, runs straight through the paving, ends in
        // a shallow basin. This is the join the plan always needed.
        const rillZ = cz - D * 0.18;
        const rillLen = W * 0.62;
        const rillX = cx + W * 0.08;
        const channel = this.box(rillLen, 0.5, LEVEL.river.width, MAT.poolWall, rillX, -0.25, rillZ);
        channel.userData.noCast = true;
        this.add(channel);
        const rillWater = this.box(rillLen, 0.05, LEVEL.river.width - 0.8, MAT.waterPond, rillX, -0.05, rillZ);
        rillWater.userData.noCast = true;
        this.root.add(rillWater);
        for (const sgn of [-1, 1]) {
            const kerb = this.box(rillLen, 0.45, 0.6, MAT.concrete,
                                  rillX, 0.15, rillZ + sgn * (LEVEL.river.width / 2 + 0.3));
            kerb.userData.noCast = true;
            this.add(kerb);
        }

        // Reflecting basin at the end of the rill
        const basinR = 11;
        const bx = rillX - rillLen / 2 - basinR + 2;
        for (let i = 0; i < 2; i++) {
            const ring = new THREE.Mesh(
                new THREE.CylinderGeometry(basinR - i * 0.6, basinR - (i + 1) * 0.8, 1, 40),
                this.bandMaterial(i, 2, 0.32)
            );
            ring.position.set(bx, -i - 0.5, rillZ);
            ring.userData.noCast = true;
            this.add(ring, false);
        }
        const basinWater = new THREE.Mesh(new THREE.CircleGeometry(basinR - 0.4, 40), MAT.waterPond);
        basinWater.rotation.x = -Math.PI / 2;
        basinWater.position.set(bx, -0.1, rillZ);
        basinWater.userData.noCast = true;
        this.root.add(basinWater);

        // Planting beds: mulch with clustered ornamental grasses, low and loose
        const beds = [
            [cx - W * 0.28, cz - D * 0.02, 16, 12],
            [cx - W * 0.06, cz + D * 0.30, 22, 10],
            [cx + W * 0.30, cz - D * 0.30, 14, 14],
            [cx + W * 0.02, cz - D * 0.36, 20, 8]
        ];
        for (const [px, pz, bw, bd] of beds) {
            const bed = this.box(bw, 0.32, bd, MAT.mulch, px, 0.14, pz);
            bed.userData.noCast = true;
            this.add(bed);
            const n = Math.round(bw * bd / 14);
            for (let i = 0; i < n; i++) {
                const gx = px + (Math.random() - 0.5) * (bw - 2);
                const gz = pz + (Math.random() - 0.5) * (bd - 2);
                this.grassClump(gx, gz, 0.7 + Math.random() * 0.6);
            }
        }

        // Young specimen trees, loosely spaced
        for (const [tx, tz, sc] of [
            [cx - W * 0.30, cz - D * 0.26, 1.0], [cx - W * 0.12, cz - D * 0.10, 0.85],
            [cx + W * 0.04, cz + D * 0.06, 1.1], [cx + W * 0.22, cz + D * 0.30, 0.9],
            [cx - W * 0.24, cz + D * 0.22, 1.0], [cx + W * 0.34, cz - D * 0.08, 0.8],
            [cx - W * 0.02, cz + D * 0.34, 0.95], [cx + W * 0.16, cz - D * 0.34, 1.05]
        ]) {
            this.youngTree(tx, tz, sc);
        }

        // Shade canopies over the terrace
        this.canopy(cx + W * 0.30, cz + D * 0.22, 16, 9);
        this.canopy(cx - W * 0.30, cz + D * 0.06, 12, 8);

        // Seating clusters, deliberately casual
        this.seatCluster(cx + W * 0.14, cz + D * 0.10);
        this.seatCluster(cx + W * 0.26, cz + D * 0.02);
        this.seatCluster(cx - W * 0.18, cz + D * 0.26);

        // Interpretive sign posts
        for (const [sx, sz] of [[cx + W * 0.06, cz + D * 0.24], [cx - W * 0.20, cz - D * 0.14]]) {
            this.add(this.box(0.16, 2.4, 0.16, MAT.signPost, sx, 1.2, sz), false);
            const face = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 20), MAT.concrete);
            face.rotation.x = Math.PI / 2;
            face.position.set(sx, 2.5, sz);
            this.root.add(face);
        }
    }

    grassClump(x, z, scale = 1) {
        const n = 5;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const blade = this.box(0.18 * scale, 1.5 * scale, 0.18 * scale, MAT.grass,
                x + Math.cos(a) * 0.3 * scale, 0.75 * scale, z + Math.sin(a) * 0.3 * scale);
            blade.rotation.z = Math.cos(a) * 0.28;
            blade.rotation.x = Math.sin(a) * 0.28;
            blade.userData.noCast = true;
            this.root.add(blade);
        }
    }

    youngTree(x, z, scale = 1) {
        const h = 6.5 * scale;
        this.add(this.box(0.28 * scale, h, 0.28 * scale, MAT.trunk, x, h / 2, z), false);
        const crown = new THREE.Mesh(new THREE.SphereGeometry(2.4 * scale, 8, 6), MAT.foliage);
        crown.position.set(x, h + 1.4 * scale, z);
        crown.scale.set(1, 1.15, 1);
        crown.castShadow = true;
        this.root.add(crown);
        // Nursery stakes — small detail, reads instantly as a planted campus
        for (const sgn of [-1, 1]) {
            const stake = this.box(0.1, 3 * scale, 0.1, MAT.trunk, x + sgn * 0.7 * scale, 1.5 * scale, z);
            stake.userData.noCast = true;
            this.root.add(stake);
        }
    }

    canopy(x, z, w, d) {
        const h = 4.2;
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            this.add(this.box(0.22, h, 0.22, MAT.metal,
                x + sx * (w / 2 - 0.8), h / 2, z + sz * (d / 2 - 0.8)), false);
        }
        const roof = this.box(w, 0.22, d, MAT.canopy, x, h, z);
        this.add(roof, false);
    }

    seatCluster(x, z) {
        const colors = [MAT.seatRed, MAT.seatLime, MAT.seatRed];
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + Math.random();
            const sx = x + Math.cos(a) * 2.2, sz = z + Math.sin(a) * 2.2;
            const seat = this.box(0.85, 0.12, 0.85, colors[i], sx, 0.45, sz);
            seat.rotation.y = -a;
            this.add(seat, false);
            const back = this.box(0.85, 0.75, 0.12, colors[i], sx, 0.82, sz);
            back.rotation.y = -a;
            back.position.x -= Math.cos(a) * 0.36;
            back.position.z -= Math.sin(a) * 0.36;
            this.add(back, false);
            for (const sgn of [-1, 1]) {
                this.add(this.box(0.06, 0.45, 0.06, colors[i],
                    sx + Math.sin(a) * sgn * 0.35, 0.22, sz + Math.cos(a) * sgn * 0.35), false);
            }
        }
        this.add(this.box(0.08, 0.65, 0.08, MAT.metal, x, 0.32, z), false);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.07, 16), MAT.tableTop);
        top.position.set(x, 0.68, z);
        this.root.add(top);
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
            // Two axis-aligned legs via a corner. Which corner matters: for
            // wing-to-wing the inner corner lands on the origin and drives the
            // walk straight through the building, so take the outer one.
            const wingToWing = a !== 'center' && b !== 'center';
            const corner = wingToWing ? [pa[0], 0, pb[2]] : [pb[0], 0, pa[2]];
            this.connectorLeg(pa, corner, C);
            this.connectorLeg(corner, pb, C);
        }
    }
}