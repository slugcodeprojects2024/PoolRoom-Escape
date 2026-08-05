// blockout-tools.js — selection, transform, prop spawning, and notes
//
// Two modes. Play mode is pointer-locked WASD. Edit mode (Tab) releases the
// cursor, turns on a transform gizmo, and lets you click things.
//
// Props and notes live in their own group so a LEVEL rebuild never destroys
// them — that separation is what makes live config editing and hand placement
// usable at the same time.
import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

const PRIMITIVES = {
    box:      () => new THREE.BoxGeometry(4, 4, 4),
    slab:     () => new THREE.BoxGeometry(10, 0.6, 10),
    wall:     () => new THREE.BoxGeometry(10, 6, 0.6),
    column:   () => new THREE.CylinderGeometry(1.2, 1.2, 8, 16),
    ramp:     () => new THREE.BoxGeometry(8, 0.5, 14),
    platform: () => new THREE.CylinderGeometry(5, 5, 0.6, 24),
    marker:   () => new THREE.ConeGeometry(1.2, 3, 8)
};

const PROP_MAT = new THREE.MeshStandardMaterial({ color: 0xc08a4a, roughness: 0.8 });
const SELECT_COLOR = 0x36c9ff;

function noteSprite(text) {
    const pad = 16, font = 26;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    ctx.font = `${font}px monospace`;
    const lines = text.split('\n');
    const w = Math.max(...lines.map(l => ctx.measureText(l).width));
    c.width = Math.ceil(w + pad * 2);
    c.height = Math.ceil(lines.length * font * 1.35 + pad * 2);

    const g = c.getContext('2d');
    g.fillStyle = 'rgba(18,18,20,0.88)';
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = '#ffcf5c';
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, c.width - 3, c.height - 3);
    g.font = `${font}px monospace`;
    g.fillStyle = '#ffe9b0';
    g.textBaseline = 'top';
    lines.forEach((l, i) => g.fillText(l, pad, pad + i * font * 1.35));

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, depthTest: false, transparent: true
    }));
    sprite.scale.set(c.width / 34, c.height / 34, 1);
    sprite.renderOrder = 999;
    return sprite;
}

export class BlockoutTools {
    constructor(app) {
        this.app = app;
        this.scene = app.scene;
        this.camera = app.camera;
        this.dom = app.renderer.domElement;

        this.props = [];       // { id, type, mesh }
        this.notes = [];       // { id, text, sprite, pin }
        this.selected = null;
        this.editMode = false;
        this.nextId = 1;

        // Survives blockout rebuilds
        this.group = new THREE.Group();
        this.group.name = 'authored';
        this.scene.add(this.group);

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();

        this.gizmo = new TransformControls(this.camera, this.dom);
        this.gizmo.setSize(0.8);
        this.gizmo.addEventListener('dragging-changed', e => { this.dragging = e.value; });
        const helper = this.gizmo.getHelper ? this.gizmo.getHelper() : this.gizmo;
        this.scene.add(helper);
        this.gizmoHelper = helper;
        helper.visible = false;

        this.selectionBox = new THREE.BoxHelper(undefined, SELECT_COLOR);
        this.selectionBox.visible = false;
        this.scene.add(this.selectionBox);

        this.bindKeys();
        this.bindPointer();
        this.buildBanner();
    }

    // ---- modes -----------------------------------------------------------

    setEditMode(on) {
        this.editMode = on;
        if (on) {
            if (document.pointerLockElement) document.exitPointerLock();
        }
        this.gizmoHelper.visible = on && !!this.selected;
        this.banner.style.display = on ? 'block' : 'none';
        if (!on) this.deselect();
    }

    buildBanner() {
        const b = document.createElement('div');
        b.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);' +
            'background:rgba(0,0,0,.75);color:#ffe9b0;font:12px monospace;padding:8px 14px;' +
            'border-radius:6px;z-index:30;display:none;line-height:1.7;text-align:center';
        b.innerHTML =
            'EDIT MODE &mdash; tab to return to walking<br>' +
            'click select &middot; G move &middot; R rotate &middot; T scale &middot; ' +
            'X delete &middot; D duplicate<br>' +
            '1-7 spawn prop &middot; N add note &middot; E edit note text';
        document.body.appendChild(b);
        this.banner = b;
    }

    bindKeys() {
        addEventListener('keydown', e => {
            if (e.code === 'Tab') { e.preventDefault(); this.setEditMode(!this.editMode); return; }
            if (!this.editMode) return;
            if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

            switch (e.code) {
                case 'KeyG': this.gizmo.setMode('translate'); break;
                case 'KeyR': this.gizmo.setMode('rotate'); break;
                case 'KeyT': this.gizmo.setMode('scale'); break;
                case 'KeyX': case 'Delete': this.deleteSelected(); break;
                case 'KeyD': this.duplicateSelected(); break;
                case 'KeyN': this.addNoteAtCrosshair(); break;
                case 'KeyE': this.editSelectedNote(); break;
                case 'Digit1': this.spawn('box'); break;
                case 'Digit2': this.spawn('slab'); break;
                case 'Digit3': this.spawn('wall'); break;
                case 'Digit4': this.spawn('column'); break;
                case 'Digit5': this.spawn('ramp'); break;
                case 'Digit6': this.spawn('platform'); break;
                case 'Digit7': this.spawn('marker'); break;
                case 'Escape': this.deselect(); break;
            }
        });
    }

    bindPointer() {
        this.dom.addEventListener('pointerdown', e => {
            if (!this.editMode || this.dragging) return;
            const r = this.dom.getBoundingClientRect();
            this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
            this.pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
            this.raycaster.setFromCamera(this.pointer, this.camera);

            const targets = [
                ...this.props.map(p => p.mesh),
                ...this.notes.map(n => n.pin),
                ...this.app.blockout.root.children
            ];
            const hit = this.raycaster.intersectObjects(targets, true)[0];
            if (hit) this.select(this.ownerOf(hit.object));
            else this.deselect();
        });
    }

    ownerOf(obj) {
        for (const p of this.props) if (p.mesh === obj) return p.mesh;
        for (const n of this.notes) if (n.pin === obj) return n.pin;
        return obj;
    }

    // ---- selection -------------------------------------------------------

    select(obj) {
        if (!obj) return this.deselect();
        this.selected = obj;
        this.gizmo.attach(obj);
        this.gizmoHelper.visible = true;
        this.selectionBox.setFromObject(obj);
        this.selectionBox.visible = true;
    }

    deselect() {
        this.selected = null;
        this.gizmo.detach();
        this.gizmoHelper.visible = false;
        this.selectionBox.visible = false;
    }

    // ---- props -----------------------------------------------------------

    crosshairPoint(distance = 12) {
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        const targets = [...this.app.blockout.collision, ...this.props.map(p => p.mesh)];
        const hit = this.raycaster.intersectObjects(targets, false)[0];
        if (hit) return hit.point.clone();
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        return this.camera.position.clone().addScaledVector(dir, distance);
    }

    spawn(type) {
        const geo = PRIMITIVES[type];
        if (!geo) return;
        const mesh = new THREE.Mesh(geo(), PROP_MAT.clone());
        mesh.position.copy(this.crosshairPoint());
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.authored = { type, id: this.nextId++ };
        this.group.add(mesh);
        this.props.push({ id: mesh.userData.authored.id, type, mesh });
        this.select(mesh);
        return mesh;
    }

    duplicateSelected() {
        const p = this.props.find(p => p.mesh === this.selected);
        if (!p) return;
        const copy = p.mesh.clone();
        copy.position.x += 3;
        copy.userData.authored = { type: p.type, id: this.nextId++ };
        this.group.add(copy);
        this.props.push({ id: copy.userData.authored.id, type: p.type, mesh: copy });
        this.select(copy);
    }

    deleteSelected() {
        if (!this.selected) return;
        const pi = this.props.findIndex(p => p.mesh === this.selected);
        if (pi >= 0) {
            this.group.remove(this.props[pi].mesh);
            this.props[pi].mesh.geometry.dispose();
            this.props.splice(pi, 1);
            return this.deselect();
        }
        const ni = this.notes.findIndex(n => n.pin === this.selected);
        if (ni >= 0) {
            this.group.remove(this.notes[ni].pin);
            this.group.remove(this.notes[ni].sprite);
            this.notes.splice(ni, 1);
            return this.deselect();
        }
        // Generated geometry: hide rather than delete, since a rebuild
        // regenerates it from LEVEL anyway.
        this.selected.visible = false;
        this.deselect();
    }

    // ---- notes -----------------------------------------------------------

    addNoteAtCrosshair(text) {
        const body = text || prompt('Note for this spot:');
        if (!body) return;
        const at = this.crosshairPoint();

        const pin = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.7),
            new THREE.MeshBasicMaterial({ color: 0xffcf5c })
        );
        pin.position.copy(at);
        pin.userData.note = { id: this.nextId++, text: body };
        this.group.add(pin);

        const sprite = noteSprite(body);
        sprite.position.copy(at).add(new THREE.Vector3(0, 3, 0));
        this.group.add(sprite);

        this.notes.push({ id: pin.userData.note.id, text: body, pin, sprite });
        return pin;
    }

    editSelectedNote() {
        const n = this.notes.find(n => n.pin === this.selected);
        if (!n) return;
        const next = prompt('Edit note:', n.text);
        if (next === null) return;
        n.text = next;
        n.pin.userData.note.text = next;
        this.group.remove(n.sprite);
        n.sprite = noteSprite(next);
        n.sprite.position.copy(n.pin.position).add(new THREE.Vector3(0, 3, 0));
        this.group.add(n.sprite);
    }

    // Keep sprites above their pins when a pin is dragged
    update() {
        for (const n of this.notes) {
            n.sprite.position.copy(n.pin.position).add(new THREE.Vector3(0, 3, 0));
        }
        if (this.selected && this.selectionBox.visible) {
            this.selectionBox.setFromObject(this.selected);
        }
    }

    // ---- export ----------------------------------------------------------

    exportAuthored() {
        const round = v => Math.round(v * 100) / 100;
        return {
            props: this.props.map(p => ({
                type: p.type,
                position: p.mesh.position.toArray().map(round),
                rotation: p.mesh.rotation.toArray().slice(0, 3).map(round),
                scale: p.mesh.scale.toArray().map(round)
            })),
            notes: this.notes.map(n => ({
                text: n.text,
                position: n.pin.position.toArray().map(round)
            }))
        };
    }

    copyAuthored() {
        const json = JSON.stringify(this.exportAuthored(), null, 4);
        navigator.clipboard.writeText(json).then(
            () => console.log('Props and notes copied to clipboard.'),
            () => console.log(json)
        );
    }

    loadAuthored(data) {
        if (!data) return;
        for (const p of data.props || []) {
            const mesh = this.spawn(p.type);
            if (!mesh) continue;
            mesh.position.fromArray(p.position);
            mesh.rotation.fromArray(p.rotation);
            mesh.scale.fromArray(p.scale);
        }
        for (const n of data.notes || []) {
            const pin = this.addNoteAtCrosshair(n.text);
            if (pin) {
                pin.position.fromArray(n.position);
                const rec = this.notes[this.notes.length - 1];
                rec.sprite.position.copy(pin.position).add(new THREE.Vector3(0, 3, 0));
            }
        }
        this.deselect();
    }

    async saveToDisk(level) {
        try {
            const res = await fetch('/__save-layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level, authored: this.exportAuthored() })
            });
            const out = await res.json();
            if (out.ok) console.log('Layout written to level-overrides.json and blockout-authored.json');
            else console.error('Save failed:', out.error);
            return out.ok;
        } catch (e) {
            console.error('Save failed (dev server only):', e);
            return false;
        }
    }

    async loadFromDisk() {
        try {
            const res = await fetch('/blockout-authored.json', { cache: 'no-store' });
            if (!res.ok) return;
            this.loadAuthored(await res.json());
        } catch (e) { /* nothing saved yet */ }
    }

    notesSummary() {
        if (this.notes.length === 0) return 'No notes placed.';
        return this.notes.map((n, i) => {
            const p = n.pin.position;
            return `${i + 1}. (${p.x.toFixed(0)}, ${p.y.toFixed(0)}, ${p.z.toFixed(0)}) — ${n.text}`;
        }).join('\n');
    }
}
