// blockout-editor.js — live layout tooling
//
// Edits LEVEL in place and rebuilds the blockout on change, so proportions
// can be judged from inside the space instead of guessed at in a config file.
// Export writes a ready-to-paste level-config.js to the clipboard.
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { LEVEL } from './level-config.js';

export class BlockoutEditor {
    constructor(app) {
        this.app = app;
        this.gui = new GUI({ title: 'layout' });
        this.gui.domElement.style.zIndex = 20;
        this.build();
    }

    // Debounced so dragging a slider doesn't rebuild 60 times a second
    touch() {
        clearTimeout(this._t);
        this._t = setTimeout(() => this.app.rebuild(), 90);
    }

    num(folder, obj, key, min, max, step = 1) {
        return folder.add(obj, key, min, max, step).onChange(() => this.touch());
    }

    build() {
        const g = this.gui;

        const room = g.addFolder('poolroom');
        this.num(room, LEVEL.poolroom, 'width', 40, 200);
        this.num(room, LEVEL.poolroom, 'depth', 40, 200);
        this.num(room, LEVEL.poolroom, 'ceiling', 8, 80);
        this.num(room, LEVEL.poolroom.oculus, 'width', 6, 70).name('oculus w');
        this.num(room, LEVEL.poolroom.oculus, 'depth', 6, 70).name('oculus d');
        this.num(room, LEVEL.poolroom.entrance, 'width', 3, 30).name('door w');
        this.num(room, LEVEL.poolroom.entrance, 'height', 3, 26).name('door h');
        this.num(room, LEVEL.poolroom.windows, 'countPerWall', 0, 12).name('windows');
        this.num(room, LEVEL.poolroom.windows, 'width', 2, 20).name('window w');
        this.num(room, LEVEL.poolroom.windows, 'height', 2, 24).name('window h');
        this.num(room, LEVEL.poolroom.windows, 'sill', 0, 20).name('sill');

        const pool = g.addFolder('pool');
        this.num(pool, LEVEL.pool, 'width', 10, 120);
        this.num(pool, LEVEL.pool, 'depth', 10, 120);
        this.num(pool, LEVEL.pool, 'depthBelow', 1, 20).name('depth below');
        this.num(pool, LEVEL.pool, 'passageDepth', 0, 200).name('passage depth');
        this.num(pool, LEVEL.pool, 'passageWidth', 2, 20).name('passage w');

        const pil = g.addFolder('pillars');
        this.num(pil, LEVEL.pillars, 'radius', 0.5, 8, 0.1);
        this.num(pil, LEVEL.pillars, 'spacing', 4, 40);
        this.num(pil, LEVEL.pillars, 'offsetX', 4, 60).name('offset x');
        this.num(pil, LEVEL.pillars, 'overshoot', 0, 40);
        this.num(pil, LEVEL.elevator, 'radius', 1, 15, 0.1).name('elevator r');

        const tower = g.addFolder('tower');
        this.num(tower, LEVEL.tower, 'width', 30, 200);
        this.num(tower, LEVEL.tower, 'depth', 30, 200);
        this.num(tower, LEVEL.tower, 'height', 40, 900);

        const wings = g.addFolder('wings');
        for (const name of Object.keys(LEVEL.wings)) {
            const w = LEVEL.wings[name];
            const f = wings.addFolder(name);
            this.num(f, w, 'gap', 5, 300);
            this.num(f, w, 'width', 8, 160);
            this.num(f, w, 'depth', 8, 160);
            this.num(f, w, 'height', 0, 60);
        }

        const gr = g.addFolder('grotto detail');
        this.num(gr, LEVEL.grotto, 'basinRadius', 4, 40).name('basin r');
        this.num(gr, LEVEL.grotto, 'caveWidth', 4, 50).name('cave w');
        this.num(gr, LEVEL.grotto, 'caveDepth', 4, 40).name('cave d');
        this.num(gr, LEVEL.grotto, 'caveHeight', 2, 15).name('cave h');
        this.num(gr, LEVEL.grotto, 'waterfallWidth', 1, 25).name('fall w');
        this.num(gr, LEVEL.grotto, 'spaRadius', 1, 15).name('spa r');
        gr.close();

        const field = g.addFolder('horizon');
        this.num(field, LEVEL.field, 'hillAmplitude', 0, 400).name('hill height');
        this.num(field, LEVEL.field, 'hillScale', 100, 4000).name('hill scale');
        this.num(field, LEVEL.field, 'towerCount', 0, 120).name('towers');
        this.num(field, LEVEL.field, 'towerRingInner', 200, 8000).name('ring inner');
        this.num(field, LEVEL.field, 'towerRingOuter', 400, 12000).name('ring outer');
        this.num(field, LEVEL.field, 'towerMaxHeight', 60, 1200).name('tower max h');
        field.close();

        const move = g.addFolder('player');
        move.add(LEVEL.player, 'walkSpeed', 1, 20, 0.1).onChange(v => this.app.controls.walkSpeed = v);
        move.add(LEVEL.player, 'sprintMultiplier', 1, 4, 0.05).onChange(v => this.app.controls.sprintMultiplier = v);
        move.add(LEVEL.player, 'jumpVelocity', 1, 20, 0.1).onChange(v => this.app.controls.jumpVelocity = v);
        move.close();

        const actions = {
            teleportRoof: () => {
                const y = LEVEL.poolroom.ceiling + LEVEL.tower.height + LEVEL.player.eyeHeight + 1;
                this.app.controls.setPosition(0, y, 0);
            },
            teleportSpawn: () => this.app.controls.setPosition(...LEVEL.player.spawn),
            teleportWing: () => {
                const names = Object.keys(LEVEL.wings);
                this._wi = ((this._wi || 0) + 1) % names.length;
                const [x, , z] = this.app.wingCenter(names[this._wi]);
                this.app.controls.setPosition(x, LEVEL.player.eyeHeight + 2, z);
            },
            save: () => this.app.tools.saveToDisk(LEVEL),
            copyConfig: () => this.copyConfig(),
            copyAuthored: () => this.app.tools.copyAuthored(),
            listNotes: () => console.log(this.app.tools.notesSummary()),
            clearHidden: () => this.app.rebuild(),
            rebuild: () => this.app.rebuild()
        };
        g.add(actions, 'teleportSpawn').name('go: spawn');
        g.add(actions, 'teleportRoof').name('go: roof');
        g.add(actions, 'teleportWing').name('go: next wing');
        g.add(actions, 'save').name('💾 save to disk');
        g.add(actions, 'copyConfig').name('copy config →');
        g.add(actions, 'copyAuthored').name('copy props + notes →');
        g.add(actions, 'listNotes').name('list notes (console)');
        g.add(actions, 'rebuild').name('force rebuild');
    }

    copyConfig() {
        const json = JSON.stringify(LEVEL, null, 4);
        navigator.clipboard.writeText(json).then(
            () => console.log('Layout copied. Paste over the LEVEL object in level-config.js.'),
            () => console.log(json)
        );
    }
}
