// The view: renderer, scene, instanced cars/people, markers, particles and the chase camera.
import * as THREE from './three.js';
import { makeUniforms, worldMaterial, skyMaterial } from './shaders.js';
import { makeShadowMap, makeSignAtlas, blobTexture, fenceTexture, softTexture, noiseTexture, DISPLAY_FONT } from './textures.js';
import { buildWorld } from './worldmesh.js';
import { buildCarGeometry, buildHumanGeometry, buildRoofSign, buildFlag, buildPhone, buildKeys, buildBike, BIKE } from './models.js';
import { INT, doorInto, inFlat } from './interior.js';
import { SHOP, bagInto } from './shop.js';
import { SEE, phoneOf } from './samuel.js';
import { GeomBuilder } from './geom.js';
import { CAPACITY } from './game.js';
import { PAINTS } from './vehicle.js';
import { SUN, CARWASH } from './config.js';
import { M } from './layout.js';
import { clamp, smooth, smoothAngle, wrapAngle } from './rng.js';

const MAX_HUMANS = 48;
const tmpM = new THREE.Matrix4(), tmpR = new THREE.Matrix4(), tmpS = new THREE.Matrix4(), tmpC = new THREE.Color();
const tmpV = new THREE.Vector3();

export class View {
  constructor(canvas, layout, quality = 'auto') {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false, alpha: false });
    this.renderer.setClearColor(0xeedac3);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.4, 900);
    this.U = makeUniforms();
    this.fog = new THREE.Fog(0xeedac3, 80, 280);
    this.scene.fog = this.fog;
    this.time = 0;

    // baked textures
    const shadow = makeShadowMap(layout);
    this.U.uShadow.value = shadow.tex;
    this.U.uShadowRect.value.set(shadow.rect.x0, shadow.rect.z0, 1 / shadow.rect.w, 1 / shadow.rect.h);
    this.atlas = makeSignAtlas(layout.signs);
    this.U.uSigns.value = this.atlas.tex;
    this.U.uNoise.value = noiseTexture();

    // materials
    this.matStatic = worldMaterial(this.U, 'static');
    this.matGround = worldMaterial(this.U, 'ground');
    this.matCar = worldMaterial(this.U, 'vehicle');
    this.matHuman = worldMaterial(this.U, 'human');
    this.matInterior = worldMaterial(this.U, 'interior');
    const fenceMat = new THREE.MeshBasicMaterial({ map: fenceTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false, color: 0xb8bec4, fog: true });

    // sky
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(820, 24, 12), skyMaterial(this.U));
    this.sky.renderOrder = 100; // drawn after all opaque geometry: only visible sky pixels get shaded
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    // town
    const world = buildWorld(layout, this.matStatic, this.matGround, fenceMat, this.atlas, this.matInterior);
    this.world = world;
    this.scene.add(world.group);
    if (world.interior) this.scene.add(world.interior);

    // cars
    this.cars = {};
    for (const type of ['sedan', 'van']) {
      const geo = buildCarGeometry(type, this.atlas.uv.bullbil);
      const n = CAPACITY[type];
      geo.setAttribute('iCar', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
      geo.setAttribute('iCar2', new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2));
      const mesh = new THREE.InstancedMesh(geo, this.matCar, n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.setColorAt(0, new THREE.Color(1, 1, 1));
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.cars[type] = mesh;
    }

    // people
    const hg = buildHumanGeometry();
    hg.setAttribute('iAnim', new THREE.InstancedBufferAttribute(new Float32Array(MAX_HUMANS * 4), 4));
    for (const n of ['iPants', 'iSkin', 'iHair']) hg.setAttribute(n, new THREE.InstancedBufferAttribute(new Float32Array(MAX_HUMANS * 3), 3));
    this.humans = new THREE.InstancedMesh(hg, this.matHuman, MAX_HUMANS);
    this.humans.setColorAt(0, new THREE.Color(1, 1, 1));
    this.humans.count = 0;
    this.humans.frustumCulled = false;
    this.scene.add(this.humans);
    // the player again, as a see-through silhouette on top of everything (only when hidden by a wall)
    this.matGhost = worldMaterial(this.U, 'ghost');
    this.ghost = new THREE.InstancedMesh(hg, this.matGhost, 1);
    this.ghost.count = 0;
    this.ghost.frustumCulled = false;
    this.ghost.renderOrder = 20;
    this.scene.add(this.ghost);
    this.ghostA = 0;

    // blob shadows for everything that moves
    const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.blobs = new THREE.InstancedMesh(blobGeo, new THREE.MeshBasicMaterial({ map: blobTexture(), color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 96);
    this.blobs.count = 0;
    this.blobs.frustumCulled = false;
    this.blobs.renderOrder = 1;
    this.scene.add(this.blobs);

    this.makeMarkers();
    // Sanna's pizza car wears a roof sign: one small mesh that follows that car
    this.roofSign = new THREE.Mesh(buildRoofSign(this.atlas.uv.pizzatak), this.matStatic);
    this.roofSign.matrixAutoUpdate = false;
    this.roofSign.visible = false;
    this.scene.add(this.roofSign);
    // tant Gun's flag: goes up her flagpole as you pull the rope (side quest)
    this.flagZone = layout.zones.gunFlag || null;
    if (this.flagZone) {
      this.gunFlag = new THREE.Group();
      this.gunFlagCloth = new THREE.Mesh(buildFlag(this.atlas.uv.flag0, this.atlas.uv.flagb0), this.matStatic);
      this.gunFlag.add(this.gunFlagCloth);
      this.gunFlag.position.set(this.flagZone.x + 0.07, this.flagZone.bottom, this.flagZone.z);
      this.scene.add(this.gunFlag);
    }
    this.particles = new Particles(this.scene, 160);
    this.makeCarWash();
    this.makeIndoor();
    this.makeGate(layout);
    this.makeBike();

    this.rig = new CameraRig(this.camera);
    this.quality = quality;
    this.dpr = 1;
    this.resize();
  }

  // Arne's delivery bike: one bike in moving parts – frame and box, wheels, steering (models.js)
  makeBike() {
    const P = buildBike(this.atlas.uv.konditori);
    const g = new THREE.Group();
    g.rotation.order = 'YXZ';
    const rear = new THREE.Mesh(P.rear, this.matStatic);
    rear.position.set(0, BIKE.rearR, BIKE.rearZ);
    const steer = new THREE.Group();
    steer.position.set(BIKE.pivot[0], BIKE.pivot[1], BIKE.pivot[2]);
    const front = new THREE.Mesh(P.front, this.matStatic);
    front.position.set(0, BIKE.frontR - BIKE.pivot[1], BIKE.frontZ - BIKE.pivot[2]);
    steer.add(new THREE.Mesh(P.steer, this.matStatic), front);
    g.add(new THREE.Mesh(P.frame, this.matStatic), rear, steer);
    g.visible = false;
    this.scene.add(g);
    this.bike = { g, rear, front, steer };
  }

  syncBike(game, dt) {
    const B = this.bike;
    if (!B) return;
    const v = game.vehicles.find((q) => q.type === 'bike' && !q.removed);
    B.g.visible = !!v && !this.indoor;
    if (!v) return;
    // standing on its kickstand, leaning into turns while ridden, or lying on its side after a fall
    const roll = v.fallen ? 1.42 : v.driver === 'player' ? v.lean || 0 : 0.12;
    v.bikeRoll = smooth(v.bikeRoll ?? roll, roll, v.fallen ? 9 : 10, dt);
    B.g.position.set(v.x, v.visY ?? v.y, v.z);
    B.g.rotation.set(0, v.h, v.bikeRoll);
    B.rear.rotation.x = v.spin;
    B.front.rotation.x = v.spin * (BIKE.rearR / BIKE.frontR);
    B.steer.rotation.y = -v.steer;
  }

  // the gate on the north bridge: two red-and-white halves that swing open toward Norrholmen,
  // and the AVSTÄNGT sign on top while it is shut
  makeGate(layout) {
    const Z = layout.zones.gateN;
    if (!Z) return;
    const L = 4.95;
    const half = (dir) => {
      const B = new GeomBuilder();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * L, b = ((i + 1) / 5) * L;
        B.box(dir > 0 ? a : -b, 0.36, -0.2, dir > 0 ? b : -a, 1.08, 0.2, i % 2 ? 0xf2f0ea : 0xd2342c, 0);
      }
      for (const f of [0.35, L - 0.5]) B.box(dir * f - 0.07, 0, -0.32, dir * f + 0.07, 0.38, 0.32, 0x3b4148);
      B.box(dir > 0 ? 0 : -0.16, 0, -0.16, dir > 0 ? 0.16 : 0, 1.25, 0.16, 0x3b4148); // the hinge post
      const m = new THREE.Mesh(B.toGeometry(THREE), this.matStatic);
      m.position.set(Z.x - dir * 5, Z.y, Z.z);
      this.scene.add(m);
      return m;
    };
    this.gateW = half(1); this.gateE = half(-1);
    const uv = this.atlas.uv.stangtz;
    if (uv) {
      const S = new GeomBuilder();
      const [u0, v0, u1, v1] = uv, w = 6.4, h = 1.3;
      S.quad([-w / 2, -h / 2, 0.22], [-w / 2, h / 2, 0.22], [w / 2, h / 2, 0.22], [w / 2, -h / 2, 0.22], 0xffffff, M.SIGN, [[u0, v0], [u0, v1], [u1, v1], [u1, v0]], [0, 0, 1]);
      S.box(-w / 2, -h / 2, 0.1, w / 2, h / 2, 0.2, 0xd2342c);
      this.gateSign = new THREE.Mesh(S.toGeometry(THREE), this.matStatic);
      this.gateSign.position.set(Z.x, 1.75, Z.z);
      this.scene.add(this.gateSign);
    }
  }

  makeMarkers() {
    // floating arrows above target cars (red: cars to steal, green: the pizza car)
    const ag = new THREE.ConeGeometry(0.42, 0.85, 4).rotateX(Math.PI);
    ag.translate(0, 0.42, 0);
    const shaft = new THREE.BoxGeometry(0.24, 0.6, 0.24).translate(0, 1.1, 0);
    const merged = mergeGeos([ag, shaft]);
    this.arrows = new THREE.InstancedMesh(merged, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true }), 24);
    this.arrows.setColorAt(0, new THREE.Color(1, 1, 1));
    this.arrows.count = 0;
    this.arrows.frustumCulled = false;
    this.scene.add(this.arrows);
    // glowing cylinders with a ground ring: gold for places to go, the contact's colour (plus a
    // floating letter badge) for mission markers
    const c = document.createElement('canvas'); c.width = 4; c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 64);
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = grd; g.fillRect(0, 0, 4, 64);
    const gt = new THREE.CanvasTexture(c);
    const cylGeo = new THREE.CylinderGeometry(1, 1, 3.2, 32, 1, true).translate(0, 1.6, 0);
    const ringGeo = new THREE.RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2).translate(0, 0.06, 0);
    this.markers = [];
    for (let i = 0; i < 6; i++) {
      const grp = new THREE.Group();
      const cyl = new THREE.Mesh(cylGeo, new THREE.MeshBasicMaterial({ map: gt, color: 0xffcf33, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
      const badge = new THREE.Sprite();
      badge.scale.set(1.5, 1.5, 1);
      badge.visible = false;
      grp.add(cyl, ring, badge);
      grp.visible = false;
      this.scene.add(grp);
      this.markers.push({ grp, cyl, ring, badge });
    }
    this.badgeMats = {};
    // street race checkpoints: standing rings across the road
    const tor = new THREE.TorusGeometry(4.5, 0.3, 8, 44);
    this.rings = [0, 1].map(() => {
      const m = new THREE.Mesh(tor, new THREE.MeshBasicMaterial({ color: 0xffcf33, transparent: true, opacity: 0.9, depthWrite: false, fog: true }));
      m.visible = false;
      m.renderOrder = 2;
      this.scene.add(m);
      return m;
    });
  }

  badge(letter, color) {
    const key = letter + color;
    if (this.badgeMats[key]) return this.badgeMats[key];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#111317'; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
    g.fillStyle = color; g.beginPath(); g.arc(64, 64, 51, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111317'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 80px ${DISPLAY_FONT}`;
    g.fillText(letter, 64, 69);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return (this.badgeMats[key] = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: true }));
  }

  makeCarWash() {
    this.brushes = [];
    const geo = new THREE.CylinderGeometry(0.55, 0.55, 3.2, 10, 1);
    const cols = [];
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const a = Math.atan2(pos.getZ(i), pos.getX(i));
      const k = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 10) % 2;
      const cc = k ? new THREE.Color(0x2c62a8) : new THREE.Color(0xf2f2f2);
      cols.push(cc.r, cc.g, cc.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
    const cx = (CARWASH.x0 + CARWASH.x1) / 2;
    for (const [x, z] of [[cx - 2.5, CARWASH.z0 + 0.8], [cx - 2.5, CARWASH.z1 - 0.8], [cx + 2.5, CARWASH.z0 + 0.8], [cx + 2.5, CARWASH.z1 - 0.8]]) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, 1.75, z);
      this.scene.add(m);
      this.brushes.push(m);
    }
    this.washing = false;
  }

  // ------------------------------------------------------------------ inside the tower
  makeIndoor() {
    const g = (this.indoorGroup = new THREE.Group());
    g.visible = false;
    this.scene.add(g);
    // Samuel's front door: swings on its hinge (open while you sneak about, shut when you leave)
    const DB = new GeomBuilder();
    doorInto(DB);
    this.door = new THREE.Mesh(DB.toGeometry(THREE), this.matInterior);
    this.door.position.set(INT.door.hinge[0], INT.y, INT.door.hinge[1]);
    this.door.rotation.y = -Math.PI / 2 + 0.25;
    g.add(this.door);
    // the bike keys on the kitchen table, with a little glint so you can spot them
    this.keys = new THREE.Mesh(buildKeys(), this.matStatic);
    this.keys.position.set(INT.keys.x, INT.keys.y, INT.keys.z);
    this.keys.rotation.y = 0.6;
    g.add(this.keys);
    this.glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: 0xfff1b0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.glint.position.set(INT.keys.x, INT.keys.y + 0.05, INT.keys.z);
    g.add(this.glint);
    // Hörnlivs: Yasmin's bag for the lighthouse keeper on the counter, until she hands it over
    const BB = new GeomBuilder();
    bagInto(BB);
    this.bag = new THREE.Mesh(BB.toGeometry(THREE), this.matInterior);
    this.bag.position.set(SHOP.bag.x, SHOP.bag.y, SHOP.bag.z);
    this.bag.rotation.y = 0.35;
    g.add(this.bag);
    // Samuel's phone (its screen lights up his face… well, it glows)
    this.phone = new THREE.Mesh(buildPhone(), this.matStatic);
    this.phone.scale.setScalar(1.35);
    g.add(this.phone);
    // where Samuel is looking: a fan of light on the floor, stopped by the walls
    const N = 22;
    this.coneN = N;
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N + 2) * 3), 3).setUsage(THREE.DynamicDrawUsage));
    cg.setAttribute('color', new THREE.BufferAttribute(new Float32Array((N + 2) * 4), 4).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < N; i++) idx.push(0, i + 2, i + 1);
    cg.setIndex(idx);
    this.cone = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    this.cone.frustumCulled = false;
    this.cone.renderOrder = 4;
    g.add(this.cone);
    this.indoor = false;
    this.outLight = { sun: this.U.uSunCol.value.clone(), sky: this.U.uSkyCol.value.clone(), gnd: this.U.uGndCol.value.clone() };
    this.outFog = [this.fog.near, this.fog.far];
  }

  // inside the tower the town is hidden, the light is softer and everything far away is dark
  setIndoor(on) {
    if (on === this.indoor) return;
    this.indoor = on;
    this.world.group.visible = !on;
    if (this.world.interior) this.world.interior.visible = on;
    this.indoorGroup.visible = on;
    for (const t in this.cars) this.cars[t].visible = !on;
    this.sky.visible = !on;
    for (const b of this.brushes) b.visible = !on;
    if (this.gunFlag) this.gunFlag.visible = !on;
    if (this.gateW) { this.gateW.visible = this.gateE.visible = !on; }
    const U = this.U, L = this.outLight;
    if (on) {
      U.uSunCol.value.setRGB(1.0, 0.86, 0.68).multiplyScalar(0.55);
      U.uSkyCol.value.setRGB(0.62, 0.68, 0.8).multiplyScalar(0.6);
      U.uGndCol.value.setRGB(0.52, 0.44, 0.38).multiplyScalar(0.5);
      this.fog.color.setHex(0x0d1015); this.fog.near = 14; this.fog.far = 46;
      this.renderer.setClearColor(0x0d1015);
    } else {
      U.uSunCol.value.copy(L.sun); U.uSkyCol.value.copy(L.sky); U.uGndCol.value.copy(L.gnd);
      this.fog.color.setHex(0xeedac3); this.fog.near = this.outFog[0]; this.fog.far = this.outFog[1];
      this.renderer.setClearColor(0xeedac3);
    }
  }

  syncIndoor(game, dt) {
    this.setIndoor(game.indoor);
    if (!this.indoor) return;
    const p = game.player, ind = game.indoors;
    // a wall between the camera and you: your silhouette shows through it
    this.ghostA = smooth(this.ghostA || 0, p.body.visible && this.occluded(game) ? 0.55 : 0, 10, dt);
    // the door: shut once you have left with the keys
    const shut = ind.doorShut;
    const goal = shut ? 0 : -Math.PI / 2 + 0.25;
    this.door.rotation.y += (goal - this.door.rotation.y) * Math.min(1, dt * 6);
    // the keys until you take them
    const job = game.mission.active;
    const taken = !(job && job.id === 'samuel' && !job.keys);
    this.keys.visible = !taken;
    this.glint.visible = !taken;
    this.bag.visible = !game.mission.done.has('livs') && !(job && job.id === 'livs' && job.bag);
    if (!taken) {
      const k = 0.13 + 0.07 * Math.max(0, Math.sin(this.time * 3.1)) ** 6;
      this.glint.scale.set(k, k, 1);
      this.glint.material.opacity = 0.55 + 0.45 * Math.sin(this.time * 3.1);
    }
    // Samuel's phone and the fan of his gaze
    const sam = ind.samuel;
    const lounging = sam && sam.ped.state === 'lounge';
    this.phone.visible = !!lounging;
    if (lounging) {
      const ph = phoneOf(sam.ped.body);
      this.phone.position.set(ph.at[0], ph.at[1], ph.at[2]);
      this.phone.lookAt(ph.look[0], ph.look[1], ph.look[2]);
    }
    this.syncCone(game, sam);
  }

  // is the line from the camera to the player's chest blocked by a wall or a tall cupboard?
  occluded(game) {
    const c = this.camera.position, p = game.player;
    const tx = p.x, ty = p.y + 1.05, tz = p.z;
    const dx = tx - c.x, dz = tz - c.z, len = Math.hypot(dx, dz);
    for (const b of game.world.query((c.x + tx) / 2, (c.z + tz) / 2, len / 2 + 0.5)) {
      if (b.t !== 'box' || b.h < INT.y + 1.2) continue;
      let t0 = 0, t1 = 0.97, hit = true;
      for (const [o, d, lo, hi] of [[c.x, dx, b.x0, b.x1], [c.z, dz, b.z0, b.z1]]) {
        if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) { hit = false; break; } continue; }
        let a0 = (lo - o) / d, a1 = (hi - o) / d;
        if (a0 > a1) { const q = a0; a0 = a1; a1 = q; }
        t0 = Math.max(t0, a0); t1 = Math.min(t1, a1);
        if (t0 > t1) { hit = false; break; }
      }
      if (hit && c.y + (ty - c.y) * t1 < b.h) return true;
    }
    return false;
  }

  syncCone(game, sam) {
    const c = sam ? sam.cone : null;
    const on = c ? c.on : 0;
    this.cone.visible = on > 0.02;
    if (!this.cone.visible) return;
    const N = this.coneN, geo = this.cone.geometry;
    const pos = geo.attributes.position.array, col = geo.attributes.color.array;
    const y = INT.y + 0.03, world = game.world;
    // warm yellow while he just looks around, red when he has noticed something
    const r = 1, gg = 0.8 - c.alert * 0.55, b = 0.28 - c.alert * 0.12;
    pos[0] = c.x; pos[1] = y; pos[2] = c.z;
    col[0] = r; col[1] = gg; col[2] = b; col[3] = 0.55 * on;
    for (let i = 0; i <= N; i++) {
      const a = c.dir - SEE.half + (2 * SEE.half * i) / N;
      const ex = c.x + Math.sin(a) * SEE.range, ez = c.z + Math.cos(a) * SEE.range;
      const f = world.raycast(c.x, c.z, ex, ez, INT.y + 1.5);
      const j = (i + 1) * 3, k = (i + 1) * 4;
      pos[j] = c.x + (ex - c.x) * f; pos[j + 1] = y; pos[j + 2] = c.z + (ez - c.z) * f;
      col[k] = r; col[k + 1] = gg; col[k + 2] = b; col[k + 3] = 0.16 * on;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  resize() {
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.width = w; this.height = h;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setDpr(d) {
    d = Math.round(d * 100) / 100;
    if (Math.abs(d - this.dpr) < 0.01) return;
    this.dpr = d;
    this.resize();
  }

  setFog(near, far) {
    this.outFog = [near, far];
    if (!this.indoor) { this.fog.near = near; this.fog.far = far; }
  }

  // ------------------------------------------------------------------ per frame
  sync(game, dt) {
    this.time += dt;
    this.U.uTime.value = this.time;
    this.syncCars(game, dt);
    this.syncBike(game, dt);
    this.syncHumans(game, dt);
    this.syncMarkers(game);
    this.syncFx(game, dt);
    this.syncIndoor(game, dt);
    if (this.world.crane) this.world.crane.rotation.y = Math.sin(this.time * 0.06) * 1.3 + 0.6;
    if (this.world.mill) this.world.mill.rotation.z = -this.time * 0.45;  // the windmill on Norrholmen
    if (this.gateW && game.gateN) {
      const a = game.gateN.k * Math.PI / 2 * 0.98;
      this.gateW.rotation.y = a; this.gateE.rotation.y = -a;
      if (this.gateSign) this.gateSign.visible = !this.indoor && game.gateN.k < 0.01;
    }
    if (this.gunFlag) {
      // folded at the foot of the pole; unfurls on the way up and flutters at the top
      const z = this.flagZone, h = game.mission.flag.h;
      const unf = Math.min(1, h / 0.35);
      this.gunFlag.position.y = z.bottom + (z.top - z.bottom) * h;
      this.gunFlagCloth.scale.set(0.22 + 0.78 * unf, 0.5 + 0.5 * unf, 1);
      this.gunFlag.rotation.y = Math.sin(this.time * 1.7) * 0.09 * unf + Math.sin(this.time * 4.3) * 0.02 * unf;
    }
  }

  syncCars(game, dt) {
    const counts = { sedan: 0, van: 0 };
    let b = 0;
    const blobs = this.blobs;
    for (const v of game.vehicles) {
      if (v.visY === undefined) { v.visY = v.y; v.visRoll = 0; v.visPitch = 0; }
      v.visY = Math.abs(v.y - v.visY) > 1 ? v.y : smooth(v.visY, v.y, v.air ? 60 : 22, dt);
      if (!v.spec.bike) { // (the bike has a mesh of its own: syncBike)
        const mesh = this.cars[v.type];
        const i = counts[v.type]++;
        v.visRoll = smooth(v.visRoll, clamp(v.accLat * 0.011, -0.075, 0.075), 7, dt);
        v.visPitch = smooth(v.visPitch, clamp(-v.accLong * 0.0055, -0.05, 0.05), 7, dt);
        tmpM.makeRotationY(v.h);
        if (v.rampPitch) { tmpR.makeRotationX(-v.rampPitch); tmpM.multiply(tmpR); }
        tmpM.setPosition(v.x, v.visY, v.z);
        mesh.setMatrixAt(i, tmpM);
        tmpC.setHex(PAINTS[v.paint].hex);
        mesh.setColorAt(i, tmpC);
        const a = mesh.geometry.attributes.iCar, a2 = mesh.geometry.attributes.iCar2;
        a.setXYZW(i, v.spin % (Math.PI * 2), -v.steer, v.visRoll, v.visPitch);
        a2.setXY(i, v.brakeLight, clamp((100 - v.health) / 100, 0, 1));
      }
      // blob shadow
      if (b < blobs.count + 96) {
        const gh = game.world.groundHeight(v.x, v.z);
        const lift = Math.max(0, v.visY - gh);
        const s = 1 + lift * 0.25;
        tmpS.makeScale(v.spec.wid * 1.35 * s, 1, v.spec.len * 1.15 * s);
        tmpM.makeRotationY(v.h).multiply(tmpS);
        tmpM.setPosition(v.x - SUN.x * 0.25 - SUN.x * lift, gh + 0.035, v.z - SUN.z * 0.25 - SUN.z * lift);
        blobs.setMatrixAt(b++, tmpM);
      }
    }
    // roof sign on the pizza car, with the same body roll and pitch as the shader gives the car
    const pz = game.pizzaCar, rs = this.roofSign;
    rs.visible = !!(pz && pz.pizza && !pz.removed);
    if (rs.visible) {
      const m = rs.matrix;
      m.makeRotationY(pz.h);
      if (pz.rampPitch) { tmpR.makeRotationX(-pz.rampPitch); m.multiply(tmpR); }
      m.setPosition(pz.x, pz.visY, pz.z);
      m.multiply(tmpR.makeTranslation(0, 0.6, 0));
      m.multiply(tmpR.makeRotationZ(pz.visRoll));
      m.multiply(tmpR.makeRotationX(pz.visPitch));
      m.multiply(tmpR.makeTranslation(0, -0.6, 0));
      rs.matrixWorldNeedsUpdate = true;
    }
    for (const type in this.cars) {
      const mesh = this.cars[type];
      mesh.count = counts[type];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.geometry.attributes.iCar.needsUpdate = true;
      mesh.geometry.attributes.iCar2.needsUpdate = true;
    }
    this.blobBase = b;
  }

  syncHumans(game) {
    const H = this.humans, geo = H.geometry;
    const anim = geo.attributes.iAnim, pants = geo.attributes.iPants, skin = geo.attributes.iSkin, hair = geo.attributes.iHair;
    let i = 0, b = this.blobBase || 0;
    const add = (body) => {
      if (!body.visible || i >= MAX_HUMANS) return;
      const L = body.look;
      tmpM.makeRotationY(body.h);
      if (body.lean) { tmpR.makeRotationX(body.lean); tmpM.multiply(tmpR); }
      if (body.roll) { tmpR.makeRotationZ(body.roll); tmpM.multiply(tmpR); }   // on the bike, leaning into a turn
      if (body.lie > 0) { tmpR.makeRotationX(body.lieDir * body.lie * Math.PI / 2); tmpM.multiply(tmpR); }
      tmpS.makeScale(L.bulk || 1, L.height || 1, L.bulk || 1);
      tmpM.multiply(tmpS);
      tmpM.setPosition(body.x, body.y + body.lie * 0.15, body.z);
      H.setMatrixAt(i, tmpM);
      tmpC.setHex(L.shirt); H.setColorAt(i, tmpC);
      tmpC.setHex(L.pants); pants.setXYZ(i, tmpC.r, tmpC.g, tmpC.b);
      tmpC.setHex(L.skin); skin.setXYZ(i, tmpC.r, tmpC.g, tmpC.b);
      tmpC.setHex(L.hair); hair.setXYZ(i, tmpC.r, tmpC.g, tmpC.b);
      if (body.pose === 4 || body.pose === 5) anim.setXYZW(i, body.headYaw || 0, body.phone || 0, body.headPitch || 0, body.pose); // lounging / sitting
      else anim.setXYZW(i, body.phase, body.legAmp, body.armAmp, body.pose);
      i++;
      if (b < 96) {
        tmpM.makeScale(0.8 + body.lie, 1, 0.8 + body.lie * 0.4);
        tmpM.setPosition(body.x - SUN.x * 0.2, body.y + 0.04, body.z - SUN.z * 0.2);
        this.blobs.setMatrixAt(b++, tmpM);
      }
    };
    add(game.player.body);
    // the silhouette uses the player's slot (instance 0) of the shared animation attributes
    const ga = this.indoor ? this.ghostA : 0;
    this.ghost.count = ga > 0.02 && i > 0 ? 1 : 0;
    if (this.ghost.count) {
      H.getMatrixAt(0, tmpM);
      this.ghost.setMatrixAt(0, tmpM);
      this.ghost.instanceMatrix.needsUpdate = true;
      this.matGhost.uniforms.uGhost.value = ga;
    }
    for (const p of game.peds.list) add(p.body);
    H.count = i;
    H.instanceMatrix.needsUpdate = true;
    if (H.instanceColor) H.instanceColor.needsUpdate = true;
    anim.needsUpdate = pants.needsUpdate = skin.needsUpdate = hair.needsUpdate = true;
    this.blobs.count = b;
    this.blobs.instanceMatrix.needsUpdate = true;
  }

  syncMarkers(game) {
    const t = this.time, p = game.player;
    let n = 0, m = 0, r = 0;
    const T = game.missionActive ? game.mission.targets : [];
    for (const tg of T) {
      if (tg.kind === 'item' && n < 24) {
        // something small to pick up: a little arrow bobbing over it
        tmpM.makeRotationY(t * 2.2);
        tmpS.makeScale(0.42, 0.42, 0.42);
        tmpM.multiply(tmpS);
        tmpM.setPosition(tg.x, tg.y + 0.55 + Math.sin(t * 3.2) * 0.08, tg.z);
        this.arrows.setMatrixAt(n, tmpM);
        tmpC.setHex(0xffcf33);
        this.arrows.setColorAt(n, tmpC);
        n++;
        continue;
      }
      if (tg.kind === 'car') {
        const v = tg.car;
        if (n >= 24 || Math.hypot(v.x - p.x, v.z - p.z) < 7.5) continue; // the action button is enough up close
        tmpM.makeRotationY(t * 2.2);
        tmpM.setPosition(v.x, (v.visY ?? v.y) + v.spec.height + 1.1 + Math.sin(t * 3.2 + v.id) * 0.22, v.z);
        this.arrows.setMatrixAt(n, tmpM);
        tmpC.setHex(tg.color ?? 0xff3b2f);
        this.arrows.setColorAt(n, tmpC);
        n++;
      } else if ((tg.kind === 'zone' || (tg.kind === 'contact' && !tg.mapOnly)) && m < this.markers.length) {
        if (tg.badgeOnly && Math.hypot(tg.x - p.x, tg.z - p.z) < 6) continue; // up close the PRATA button is enough
        const mk = this.markers[m++];
        const col = tg.kind === 'zone' ? 0xffcf33 : parseInt(tg.color.slice(1), 16);
        const k = 1 + Math.sin(t * 4 + m) * 0.04;
        mk.grp.visible = true;
        mk.grp.position.set(tg.x, game.world.groundHeight(tg.x, tg.z) + 0.02, tg.z);
        mk.cyl.scale.set(tg.r * k, 1, tg.r * k);
        mk.cyl.material.color.setHex(col);
        mk.cyl.material.opacity = 0.42 + Math.sin(t * 4 + m) * 0.12;
        mk.ring.scale.set(tg.r, 1, tg.r);
        mk.ring.material.color.setHex(col);
        // people who give quests just get the letter above their head
        mk.cyl.visible = mk.ring.visible = !tg.badgeOnly;
        mk.badge.visible = tg.kind === 'contact';
        if (mk.badge.visible) {
          mk.badge.material = this.badge(tg.letter, tg.color);
          mk.badge.position.y = (tg.badgeY ?? 4.1) + Math.sin(t * 2.4 + m) * 0.18;
          const s = tg.badgeOnly ? 1.1 : 1.5;
          mk.badge.scale.set(s, s, 1);
        }
      } else if (tg.kind === 'ring' && r < this.rings.length) {
        const ring = this.rings[r++];
        ring.visible = true;
        ring.position.set(tg.x, 4.75, tg.z);
        ring.rotation.set(0, tg.h, 0);
        const k = tg.dim ? 0.92 : 1 + Math.sin(t * 5) * 0.025;
        ring.scale.set(k, k, k);
        ring.material.opacity = tg.dim ? 0.3 : 0.9;
        ring.material.color.setHex(tg.finish ? 0xffffff : 0xffcf33);
      }
    }
    this.arrows.count = n;
    this.arrows.instanceMatrix.needsUpdate = true;
    if (this.arrows.instanceColor) this.arrows.instanceColor.needsUpdate = true;
    for (; m < this.markers.length; m++) this.markers[m].grp.visible = false;
    for (; r < this.rings.length; r++) this.rings[r].visible = false;
  }

  syncFx(game, dt) {
    const P = this.particles;
    const pc = game.player.inCar ? game.player.car : null;
    for (const v of game.vehicles) {
      const near = Math.abs(v.x - this.camera.position.x) + Math.abs(v.z - this.camera.position.z) < 120;
      if (!near) continue;
      // smoke from damaged engines
      if (v.health < 45 && Math.random() < dt * (v.health < 20 ? 22 : 10)) {
        const p = v.local((Math.random() - 0.5) * 0.6, v.spec.len / 2 - 0.6);
        const dark = v.health < 20 ? 0.25 : 0.55;
        P.emit(p.x, v.y + (v.type === 'van' ? 1.2 : 0.95), p.z, v.vx * 0.3 + (Math.random() - 0.5) * 0.4, 1.2 + Math.random(), v.vz * 0.3, 0.8, 1.6 + Math.random(), dark, dark, dark, 0.5, 2.2);
      }
      // tyre smoke when sliding
      if (v === pc && v.slip > 4.5 && !v.air && Math.random() < dt * 30) {
        for (const lz of [-v.spec.wheelbase / 2]) {
          for (const lx of [-0.8, 0.8]) {
            const p = v.local(lx, lz);
            P.emit(p.x, v.y + 0.2, p.z, (Math.random() - 0.5) * 0.6, 0.5 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6, 0.6, 1.0, 0.92, 0.92, 0.92, 0.35, 2.6);
          }
        }
      }
    }
    // car wash spray + brushes
    const spin = this.washing ? 9 : 0;
    for (const br of this.brushes) br.rotation.y += spin * dt;
    if (this.washing && Math.random() < dt * 40) {
      const x = CARWASH.x0 + Math.random() * (CARWASH.x1 - CARWASH.x0);
      P.emit(x, 3.6, CARWASH.z0 + 0.5 + Math.random() * (CARWASH.z1 - CARWASH.z0 - 1), 0, -2, 0, 0.35, 0.8, 0.75, 0.85, 1.0, 0.5, 1.5);
    }
    P.update(dt, this.camera, this.renderer);
  }

  sparks(x, y, z, n, k = 1) {
    for (let i = 0; i < n; i++) {
      this.particles.emit(x, y, z, (Math.random() - 0.5) * 7 * k, 1 + Math.random() * 4 * k, (Math.random() - 0.5) * 7 * k, 0.16, 0.35 + Math.random() * 0.3, 1.0, 0.75, 0.3, 1.0, 0, true);
    }
  }

  dust(x, y, z, n) {
    for (let i = 0; i < n; i++) this.particles.emit(x + (Math.random() - 0.5) * 2, y + 0.2, z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3, 0.6 + Math.random(), (Math.random() - 0.5) * 3, 0.9, 1.2, 0.62, 0.52, 0.4, 0.45, 2.2);
  }

  project(x, y, z, out) {
    tmpV.set(x, y, z).project(this.camera);
    out.x = (tmpV.x * 0.5 + 0.5) * this.width;
    out.y = (-tmpV.y * 0.5 + 0.5) * this.height;
    out.visible = tmpV.z < 1 && tmpV.z > -1 && out.x > -40 && out.x < this.width + 40 && out.y > -40 && out.y < this.height + 40;
    return out;
  }

  render() {
    this.sky.position.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }

  get stats() {
    const i = this.renderer.info;
    return { calls: i.render.calls, tris: i.render.triangles };
  }
}

// ------------------------------------------------------------------ camera
export class CameraRig {
  constructor(camera) {
    this.cam = camera;
    this.yaw = Math.PI;
    this.manual = 0;
    this.manualT = 9;
    this.shake = 0;
    this.k = 1;
    this.blend = 1;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.fromPos = new THREE.Vector3();
    this.fromLook = new THREE.Vector3();
    this.fov = 58;
    this.titleT = 0;
    this.fPos = new THREE.Vector3(); // the last point a mission wanted the camera on (eases out from there)
    this.fNear = false;
  }

  startBlend() {
    this.fromPos.copy(this.cam.position);
    this.fromLook.copy(this.look);
    this.blend = 0;
  }

  title(dt) {
    this.titleT += dt;
    const a = this.titleT * 0.045 + 2.2;
    this.cam.position.set(Math.cos(a) * 155, 62 + Math.sin(this.titleT * 0.1) * 6, Math.sin(a) * 155);
    this.look.set(Math.cos(a + 0.6) * 20, 4, Math.sin(a + 0.6) * 20);
    this.cam.lookAt(this.look);
    this.cam.fov = 50;
    this.cam.updateProjectionMatrix();
  }

  update(dt, game, input, aspect, world) {
    const p = game.player;
    const car = p.inCar ? p.car : null;
    const portrait = aspect < 0.9;
    let dist, height, lookH, ahead, fov, rate = 0, target = this.yaw;
    if (car && car.spec.bike) {
      // on the bike: closer and lower than in a car
      const sp = car.speed, f = Math.min(sp / 9, 1);
      dist = (portrait ? 7.6 : 5.1) + f * 1.0;
      height = portrait ? 5.6 : 2.3;
      lookH = 1.05; ahead = portrait ? 2.6 : 1.5;
      fov = (portrait ? 62 : 55) + f * 6;
      let hd = car.h;
      if (sp > 1.5 && car.fwdSpeed > 0) hd = car.h + wrapAngle(Math.atan2(car.vx, car.vz) - car.h) * 0.45;
      target = hd; rate = 2.6;
    } else if (car) {
      const sp = car.speed, f = Math.min(sp / 30, 1);
      dist = (portrait ? 11.5 : 8.4) + f * 1.6;
      height = portrait ? 8.6 : 3.5;
      lookH = 1.1; ahead = portrait ? 4.5 : 2.2;
      fov = (portrait ? 66 : 58) + f * 9;
      if (car.type === 'van') { dist += 0.8; height += 0.5; }
      let hd = car.h;
      if (sp > 3 && car.fwdSpeed > 0) hd = car.h + wrapAngle(Math.atan2(car.vx, car.vz) - car.h) * 0.45;
      target = hd; rate = car.air ? 1.5 : 3.0;
    } else if (game.indoor) {
      // inside the tower: look down into the rooms from above (the walls in the way open up).
      // The camera keeps its direction (east, along the corridor) unless you turn it yourself,
      // so "up" on the stick stays the same while you sneak.
      dist = portrait ? 4.4 : 3.8;
      height = portrait ? 12.6 : 9.4;
      lookH = 0.5; ahead = portrait ? 1.2 : 0.4; fov = portrait ? 62 : 52;
    } else {
      dist = portrait ? 8.2 : 5.4;
      height = portrait ? 6.4 : 2.5;
      lookH = 1.45; ahead = 0.5; fov = portrait ? 64 : 55;
      const sp = Math.hypot(p.vx, p.vz);
      if (sp > 0.6 && p.state === 'foot') { target = p.h; rate = 1.4 * Math.min(1, sp / 4); }
    }
    // a mission can point the camera at something (tant Gun's flag on its way up), or come in close
    // on a conversation (near: the bench on the pier) – then it frames the point between the two of
    // you from the side (yaw), low enough that the dialogue box does not cover anyone
    const F = game.camFocus;
    if (F) {
      this.fNear = !!F.near;
      if ((this.fk || 0) < 0.02) this.fPos.set(F.x, F.y, F.z);
      else { this.fPos.x = smooth(this.fPos.x, F.x, 3, dt); this.fPos.y = smooth(this.fPos.y, F.y, 3, dt); this.fPos.z = smooth(this.fPos.z, F.z, 3, dt); }
    }
    this.fk = smooth(this.fk || 0, F && !car ? 1 : 0, 2.5, dt);
    const near = this.fNear && this.fk > 0.01;
    if (this.fk > 0.01) {
      const k = this.fk;
      if (near) {
        dist += ((portrait ? 6.2 : 4.6) - dist) * k; height += ((portrait ? 3.6 : 2.1) - height) * k;
        lookH += (this.fPos.y - lookH) * k; ahead *= 1 - k; fov += ((portrait ? 58 : 48) - fov) * k;
      } else { dist += 3.4 * k; height += 0.6 * k; }
      if (F) { target = F.yaw ?? Math.atan2(F.x - p.x, F.z - p.z); rate = near ? 3 : 2.2; }
    }
    // manual orbit from dragging
    if (input.camDX) { this.manual -= input.camDX * 0.0065; this.manualT = 0; }
    else this.manualT += dt;
    if (car) { if (this.manualT > 1.0) this.manual *= Math.exp(-3 * dt); }
    else { this.yaw += this.manual; this.manual = 0; }
    if (rate > 0 && (!car || this.manualT > 0.3)) this.yaw = smoothAngle(this.yaw, target, rate, dt);
    const yaw = this.yaw + this.manual;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    let tx = (car ? car.x : p.x), tz = (car ? car.z : p.z);
    const ty = (car ? (car.visY ?? car.y) : p.y);
    // in Samuel's flat the view leans toward the middle of the room, so he stays in the picture
    const fl = game.indoor && inFlat(p.x, p.z) ? 1 : 0;
    this.flatK = smooth(this.flatK || 0, fl, 2.5, dt);
    if (this.flatK > 0.001) {
      const F = INT.flat, k = this.flatK * (portrait ? 0.4 : 0.32);
      tx += ((F.x0 + F.x1) / 2 - tx) * k; tz += ((F.z0 + F.z1) / 2 + 0.6 - tz) * k;
    }
    // in Hörnlivs, the same: the whole little shop stays in view
    this.shopK = game.indoor && game.indoors.where === 'shop' ? smooth(this.shopK || 0, 1, 2.5, dt) : 0; // (gone at once outside)
    if (this.shopK > 0.001) {
      const S = SHOP.room, k = this.shopK * (portrait ? 0.45 : 0.35);
      tx += ((S.x0 + S.x1) / 2 - tx) * k; tz += ((S.z0 + S.z1) / 2 + 0.4 - tz) * k;
      // while Yasmin talks, the room slides up the screen so the dialogue box does not hide you
      const j = game.mission.active, talking = j && j.id === 'livs' && j.stage === 'talk' ? 1 : 0;
      this.talkK = smooth(this.talkK || 0, talking, 3, dt);
      tz += this.talkK * this.shopK * (portrait ? 1.6 : 2.6);
    }
    if (near) { tx += (this.fPos.x - tx) * this.fk; tz += (this.fPos.z - tz) * this.fk; }
    // keep the camera out of buildings
    const want = dist;
    const hit = game.indoor ? 1 : world.raycast(tx, tz, tx - fx * (want + 0.8), tz - fz * (want + 0.8), Math.max(2.5, height * 0.9));
    const kT = hit < 1 ? Math.max(0.18, (hit * (want + 0.8) - 0.8) / want) : 1;
    this.k = smooth(this.k, kT, kT < this.k ? 14 : 2.5, dt);
    const d = want * this.k;
    const hh = height * (0.55 + 0.45 * this.k);
    this.pos.set(tx - fx * d, ty + hh, tz - fz * d);
    this.look.set(tx + fx * ahead, ty + lookH, tz + fz * ahead);
    if (this.fk > 0.01 && !near) {
      const k = this.fk, P = this.fPos;
      this.look.x += (P.x - this.look.x) * 0.4 * k;
      this.look.y += (P.y - this.look.y) * 0.55 * k;
      this.look.z += (P.z - this.look.z) * 0.4 * k;
    }
    // shake
    if (this.shake > 0.001) {
      this.pos.x += (Math.random() - 0.5) * this.shake;
      this.pos.y += (Math.random() - 0.5) * this.shake;
      this.pos.z += (Math.random() - 0.5) * this.shake;
      this.shake *= Math.exp(-7 * dt);
    }
    this.fov = smooth(this.fov, fov, 3, dt);
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / 1.8);
      const e = this.blend < 0.5 ? 2 * this.blend * this.blend : 1 - Math.pow(-2 * this.blend + 2, 2) / 2;
      this.cam.position.lerpVectors(this.fromPos, this.pos, e);
      tmpV.lerpVectors(this.fromLook, this.look, e);
      this.cam.lookAt(tmpV);
    } else {
      this.cam.position.copy(this.pos);
      this.cam.lookAt(this.look);
    }
    if (Math.abs(this.cam.fov - this.fov) > 0.05) { this.cam.fov = this.fov; this.cam.updateProjectionMatrix(); }
    return yaw;
  }
}

// ------------------------------------------------------------------ particles
class Particles {
  constructor(scene, max) {
    this.max = max;
    this.list = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCol', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: softTexture() }, uScale: { value: 400 } },
      vertexShader: /* glsl */ `
        attribute vec4 aCol; attribute float aSize; uniform float uScale; varying vec4 vCol;
        void main() { vCol = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(0.5, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; varying vec4 vCol;
        void main() { float a = texture2D(uMap, gl_PointCoord).a * vCol.a; if (a < 0.01) discard; gl_FragColor = vec4(vCol.rgb, a); }`,
      transparent: true, depthWrite: false,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    scene.add(this.points);
  }

  emit(x, y, z, vx, vy, vz, size, life, r, gg, b, alpha, grow = 1, gravity = false) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push({ x, y, z, vx, vy, vz, size, life, age: 0, r, g: gg, b, alpha, grow, gravity });
  }

  update(dt, camera, renderer) {
    const L = this.list;
    let n = 0;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.age += dt;
      if (p.age >= p.life) { L.splice(i, 1); continue; }
    }
    for (const p of L) {
      if (p.gravity) p.vy -= 14 * dt;
      else { p.vx *= Math.exp(-1.2 * dt); p.vz *= Math.exp(-1.2 * dt); p.vy *= Math.exp(-0.6 * dt); }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.3; }
      const t = p.age / p.life;
      this.pos[n * 3] = p.x; this.pos[n * 3 + 1] = p.y; this.pos[n * 3 + 2] = p.z;
      this.col[n * 4] = p.r; this.col[n * 4 + 1] = p.g; this.col[n * 4 + 2] = p.b;
      this.col[n * 4 + 3] = p.alpha * (1 - t) * Math.min(1, t * 8 + 0.2);
      this.size[n] = p.size * (1 + p.grow * t);
      n++;
    }
    const g = this.points.geometry;
    g.setDrawRange(0, n);
    g.attributes.position.needsUpdate = g.attributes.aCol.needsUpdate = g.attributes.aSize.needsUpdate = true;
    const h = renderer.getDrawingBufferSize(tmpV2).y;
    this.mat.uniforms.uScale.value = h / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }
}
const tmpV2 = new THREE.Vector2();

function mergeGeos(geos) {
  const pos = [], nrm = [];
  for (const g0 of geos) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    pos.push(...g.attributes.position.array);
    nrm.push(...g.attributes.normal.array);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return g;
}
