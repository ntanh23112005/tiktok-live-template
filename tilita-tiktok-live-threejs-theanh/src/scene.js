import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DRAW_END, WALL_TRAVEL_SECONDS } from './timing.js';

const coral = '#ee5266';
const clamp = THREE.MathUtils.clamp;
const smooth = value => value * value * (3 - 2 * value);
const random = seed => { let n = seed; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; };

export function sampleAvatar() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d');
  c.fillStyle = '#eacb76'; c.fillRect(0, 0, 256, 256);
  c.fillStyle = '#f7e6ab'; c.beginPath(); c.arc(205, 62, 90, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ed5d58'; c.beginPath(); c.ellipse(130, 263, 105, 100, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#db4945'; c.beginPath(); c.moveTo(60, 220); c.lineTo(89, 176); c.lineTo(128, 210); c.lineTo(165, 175); c.lineTo(200, 222); c.fill();
  c.fillStyle = '#d9a77f'; c.fillRect(108, 151, 39, 39);
  c.fillStyle = '#f0c39b'; c.beginPath(); c.ellipse(128, 110, 61, 73, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(68, 119, 9, 17, -.15, 0, Math.PI * 2); c.ellipse(188, 119, 9, 17, .15, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#263535'; c.beginPath(); c.moveTo(68, 119); c.bezierCurveTo(28, 36, 93, 6, 130, 21); c.bezierCurveTo(178, 3, 217, 58, 188, 120); c.lineTo(178, 75); c.quadraticCurveTo(143, 100, 100, 64); c.quadraticCurveTo(94, 91, 75, 89); c.closePath(); c.fill();
  c.strokeStyle = '#263535'; c.lineWidth = 4; c.lineCap = 'round';
  for (const x of [102, 155]) { c.beginPath(); c.moveTo(x - 9, 106); c.quadraticCurveTo(x, 101, x + 8, 106); c.stroke(); c.beginPath(); c.ellipse(x, 120, 3, 4, 0, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = '#c58767'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(127, 122); c.lineTo(124, 137); c.lineTo(131, 138); c.stroke();
  c.fillStyle = '#fff6e6'; c.beginPath(); c.moveTo(108, 151); c.quadraticCurveTo(129, 177, 150, 151); c.closePath(); c.fill();
  c.fillStyle = '#dd9e80'; c.globalAlpha = .5; for (const x of [89, 166]) { c.beginPath(); c.ellipse(x, 139, 11, 6, 0, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1;
  c.strokeStyle = '#ffe8d3'; c.lineWidth = 3; for (const x of [110, 147]) { c.beginPath(); c.moveTo(x, 209); c.lineTo(x - 2, 238); c.stroke(); }
  return canvas;
}

function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function textCanvas(text, { color = '#233d43', background = null, size = 76, width = 1024, height = 180 } = {}) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const c = canvas.getContext('2d');
  if (background) { c.fillStyle = background; c.fillRect(0, 0, width, height); }
  c.font = `800 ${size}px "Be Vietnam Pro", sans-serif`;
  const measured = c.measureText(text).width;
  if (measured > width - 40) c.font = `800 ${size * (width - 40) / measured}px "Be Vietnam Pro", sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = color; c.fillText(text, width / 2, height / 2);
  return canvas;
}

export class LiveScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#dce9e7');
    this.scene.fog = new THREE.Fog('#dce9e7', 27, 65);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.setAttribute('aria-label', '3D scene: a character draws viewer names and avatars on a wall');
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(44, 1, .1, 12000);
    this.shake = .32; this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.enablePan = false;
    this.controls.minDistance = 7; this.controls.maxDistance = 25;
    this.controls.minPolarAngle = .45; this.controls.maxPolarAngle = Math.PI / 2 - .04;
    this.controls.minAzimuthAngle = -.75; this.controls.maxAzimuthAngle = .75;
    this.scene.add(new THREE.HemisphereLight('#eff9ff', '#a09178', 1.65));
    const sun = new THREE.DirectionalLight('#fff0d6', 2.5);
    sun.position.set(-7, 13, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
    sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -10; sun.shadow.normalBias = .035;
    sun.shadow.bias = -.00015; this.scene.add(sun);
    const fill = new THREE.DirectionalLight('#d4e8f3', .75); fill.position.set(10, 6, -4); this.scene.add(fill);
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environmentTarget = pmrem.fromScene(environment, .04);
    this.scene.environment = this.environmentTarget.texture; this.scene.environmentIntensity = .45;
    environment.dispose(); pmrem.dispose();
    this.materials = new Map(); this.geometries = new Map();
    this.avatar = sampleAvatar(); this.art = new THREE.Group(); this.scene.add(this.art);
    this.artPoints = []; this.avatarLayers = []; this.retiredArt = []; this.flying = []; this.statue = null;
    this.wallIndex = 0; this.wallOffset = 0; this.travelDuration = WALL_TRAVEL_SECONDS; this.travelProgress = 0;
    const existing = new Set(this.scene.children); this.makeWorld();
    this.worldObjects = this.scene.children.filter(object => !existing.has(object));
    this.worldObjects.forEach(object => { object.userData.originX = object.position.x; });
    this.normalFog = this.scene.fog;
    this.makeCharacter(); this.makeProjectiles();
    this.elapsed = 0; this.progress = 1; this.playing = false; this.duration = 7; this.cameraMode = 'wide';
    this.setCamera('wide');
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container);
    this.lastTime = performance.now(); this.frameCount = 0;
    this.renderer.setAnimationLoop(time => this.frame(time));
    this.renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); this.playing = false; this.onError?.('The 3D scene paused. Reload the page to restore it.'); });
  }

  material(color, options = {}) {
    const key = `${color}:${JSON.stringify(options)}`;
    if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .78, ...options }));
    return this.materials.get(key);
  }

  box(w, h, d, color, x, y, z, { parent = this.scene, radius = .07, material = null, shadow = true } = {}) {
    const key = `box:${w}:${h}:${d}:${radius}`;
    if (!this.geometries.has(key)) this.geometries.set(key, radius ? new RoundedBoxGeometry(w, h, d, 2, radius) : new THREE.BoxGeometry(w, h, d));
    const mesh = new THREE.Mesh(this.geometries.get(key), material ?? this.material(color));
    mesh.position.set(x, y, z); mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }

  sphere(radius, color, x, y, z, parent = this.scene, detail = 18) {
    const key = `sphere:${radius}:${detail}`;
    if (!this.geometries.has(key)) this.geometries.set(key, new THREE.SphereGeometry(radius, detail, 12));
    const mesh = new THREE.Mesh(this.geometries.get(key), this.material(color));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }

  planeLabel(text, width, height, x, y, z, color = '#314e50', parent = this.scene, size = 64) {
    const texture = canvasTexture(textCanvas(text, text.length <= 2 ? { color, size: 130, width: 160, height: 180 } : { color, size }));
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }

  makeWorld() {
    const rng = random(42);
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const context = c.getContext('2d'); context.fillStyle = '#dbe2da'; context.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 12000; i++) { const v = 160 + Math.floor(rng() * 80); context.fillStyle = `rgba(${v},${v + 4},${v},${rng() * .22})`; context.fillRect(rng() * 256, rng() * 256, rng() * 2, rng() * 2); }
    const wallTexture = canvasTexture(c); wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping; wallTexture.repeat.set(7, 3);
    this.wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, color: '#e3e7dd', roughness: .95 });
    this.box(38.4, 7.4, .45, '', 0, 3.7, -2.9, { material: this.wallMaterial, radius: .03 });
    for (let x = -19.2; x <= 19.3; x += 6.4) this.box(.045, 7.35, .035, '#c2cec4', x, 3.7, -2.65, { radius: 0, shadow: false });
    this.box(38.7, .18, .65, '#98ada3', 0, 7.43, -2.9);
    this.box(38.6, .25, .65, '#9aada0', 0, .15, -2.85);
    this.box(100, .2, 28, '#d8c8ad', 0, -.17, 3, { radius: 0 });
    this.box(100, .06, 11, '#dfd1b7', 0, -.025, 3.1, { radius: 0 });
    for (let x = -48; x <= 48; x += 1.6) this.box(.012, .008, 11, '#c7b99e', x, .01, 3.2, { radius: 0, shadow: false });
    for (let z = -2; z <= 9; z += 1.6) this.box(100, .008, .012, '#c7b99e', 0, .01, z, { radius: 0, shadow: false });
    for (const side of [-1, 1]) {
      this.box(2.3, .17, 18, '#82976b', side * 10.3, -.03, 3, { radius: 0 });
      this.box(.22, .22, 17, '#e5ddc8', side * 9.05, .02, 3);
      for (let i = 0; i < 11; i++) {
        const shrub = this.sphere(.55 + rng() * .25, ['#81986a', '#a1ad73', '#719475'][i % 3], side * (10 + rng() * .5), .3, -2 + i * .8, this.scene, 8);
        shrub.scale.set(1.1, .7, 1);
      }
    }
    const lamp = this.box(.14, 4, .14, '#5a6c63', -8.1, 2, 1.1);
    this.box(.8, .16, .5, '#f9f3d8', lamp.position.x, 4, 1.1);
    this.box(2.3, .32, .6, '#81967e', 7.5, .7, 0);
    for (const x of [6.65, 8.35]) this.box(.13, .7, .3, '#5f756b', x, .3, 0);
  }

  makeCharacter() {
    const root = new THREE.Group(); this.scene.add(root); root.position.set(-3.25, 0, 2.4); root.rotation.y = 2.57;
    this.character = root;
    this.box(.96, .96, .66, coral, 0, 1.58, 0, { parent: root, radius: .19 });
    this.box(.72, .2, .6, '#d84358', 0, 1.13, 0, { parent: root });
    this.sphere(.4, '#df4659', 0, 1.98, -.22, root).scale.set(1.1, .65, .6);
    this.box(.24, .24, .22, '#e7b891', 0, 2.2, 0, { parent: root });
    this.box(.98, 1.0, .88, '#f1caa4', 0, 2.75, 0, { parent: root, radius: .24 });
    this.box(1.04, .5, .94, '#34433c', 0, 3.12, -.04, { parent: root, radius: .2 });
    this.box(.87, .54, .19, '#34433c', 0, 2.9, -.41, { parent: root, radius: .08 });
    this.box(.32, .22, .16, '#34433c', -.34, 3.00, .4, { parent: root });
    this.legs = [];
    for (const side of [-1, 1]) {
      this.sphere(.13, '#e9bb94', side * .5, 2.72, 0, root);
      this.box(.17, .065, .03, '#34433c', side * .2, 2.77, .447, { parent: root, radius: .025 });
      this.legs.push(this.box(.34, .56, .43, '#eee6cc', side * .25, .76, 0, { parent: root }));
      this.box(.44, .3, .75, '#f2eee1', side * .25, .25, .11, { parent: root, radius: .1 });
      this.box(.44, .08, .76, '#bf9b65', side * .25, .12, .11, { parent: root, radius: .03 });
    }
    this.box(.17, .045, .03, '#b46b55', 0, 2.5, .45, { parent: root, radius: .02 });
    this.leftArm = new THREE.Group(); this.leftArm.position.set(-.6, 1.99, 0); root.add(this.leftArm);
    this.rightArm = new THREE.Group(); this.rightArm.position.set(.6, 1.99, 0); root.add(this.rightArm);
    for (const arm of [this.leftArm, this.rightArm]) {
      this.box(.3, .67, .32, coral, 0, -.27, 0, { parent: arm, radius: .11 });
      this.sphere(.16, '#edc19a', 0, -.65, 0, arm);
    }
    this.leftArm.rotation.x = -1.1; this.leftArm.rotation.z = -.25;
    this.rightArm.rotation.x = -1.3;
    this.gun = new THREE.Group(); this.gun.position.set(.62, 1.94, .7); root.add(this.gun);
    this.box(.47, .44, .75, '#314e51', 0, 0, 0, { parent: this.gun, radius: .12 });
    this.box(.17, .4, .25, '#34433c', 0, -.3, -.1, { parent: this.gun });
    this.sphere(.29, coral, 0, .29, .05, this.gun);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.115, .16, .75, 16), this.material('#faf4de', { metalness: .3, roughness: .3 }));
    barrel.rotation.x = Math.PI / 2; barrel.position.z = .62; this.gun.add(barrel);
    this.muzzle = new THREE.Object3D(); this.muzzle.position.set(0, 0, 1.05); this.gun.add(this.muzzle);
    this.flash = this.sphere(.15, '#ffd687', 0, 0, 1.05, this.gun); this.flash.material = new THREE.MeshBasicMaterial({ color: '#ffd687' }); this.flash.visible = false;
  }

  makeProjectiles() {
    this.bullets = new THREE.InstancedMesh(new THREE.SphereGeometry(.045, 7, 5), new THREE.MeshBasicMaterial({ color: coral }), 14);
    this.bullets.frustumCulled = false; this.bullets.visible = false; this.scene.add(this.bullets);
    this.dummy = new THREE.Object3D(); this.muzzlePosition = new THREE.Vector3();
  }

  makeDots(canvas, width, height, x, y, z, dynamic = true, fixedColor = null) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const points = [];
    const step = canvas.width > 512 ? 7 : 4;
    for (let py = 0; py < canvas.height; py += step) for (let px = 0; px < canvas.width; px += step) {
      const i = (py * canvas.width + px) * 4;
      if (data[i + 3] < 110) continue;
      points.push({ x: (px / canvas.width - .5) * width, y: (.5 - py / canvas.height) * height, color: fixedColor ?? `rgb(${data[i]},${data[i + 1]},${data[i + 2]})` });
    }
    const material = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
    const mesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 7), material, Math.max(points.length, 1));
    mesh.position.set(x, y, z); mesh.frustumCulled = false;
    const dummy = new THREE.Object3D(); const color = new THREE.Color();
    const radius = step / canvas.width * width * .43;
    points.forEach((p, index) => {
      dummy.position.set(p.x, p.y, 0); dummy.scale.set(radius, Math.min(radius, step / canvas.height * height * .43), 1); dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix); mesh.setColorAt(index, color.set(p.color));
    });
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = points.length;
    (dynamic ? this.art : this.scene).add(mesh);
    const item = { mesh, points, total: points.length };
    if (dynamic) this.artPoints.push(item);
    return item;
  }

  avatarCanvas() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
    const context = canvas.getContext('2d'); context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
    context.beginPath(); context.arc(512, 512, 500, 0, Math.PI * 2); context.clip();
    const image = this.avatar; const sourceSize = Math.min(image.width, image.height);
    context.drawImage(image, (image.width - sourceSize) / 2, (image.height - sourceSize) / 2, sourceSize, sourceSize, 0, 0, 1024, 1024);
    return canvas;
  }

  makeAvatar(width, height, x, y, z) {
    const canvas = this.avatarCanvas();
    const dots = this.makeDots(canvas, width, height, x, y, z);
    dots.mesh.material.toneMapped = false;
    const texture = canvasTexture(canvas); texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const reveal = { value: 1 };
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    material.onBeforeCompile = shader => {
      shader.uniforms.avatarReveal = reveal;
      shader.fragmentShader = 'uniform float avatarReveal;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\nif (vMapUv.y < 1.0 - avatarReveal) discard;');
    };
    material.customProgramCacheKey = () => 'tilita-avatar-sharp-v1';
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.position.set(x, y, z + .012); this.art.add(mesh);
    const layer = { mesh, dots, reveal, resolution: 1024 }; this.avatarLayers.push(layer);
    return layer;
  }

  disposeArt(group) {
    const geometries = new Set(this.geometries.values()), materials = new Set(this.materials.values());
    group.traverse(object => { if(object.geometry&&!geometries.has(object.geometry))object.geometry.dispose();if(object.material&&!materials.has(object.material)){object.material.map?.dispose();object.material.dispose();} });
    group.removeFromParent(); group.clear();
  }

  clearArt(keepPrevious = false) {
    if(keepPrevious && this.art.children.length){this.retiredArt.push(this.art);while(this.retiredArt.length>2)this.disposeArt(this.retiredArt.shift());}
    else this.disposeArt(this.art);
    this.art = new THREE.Group(); this.scene.add(this.art);
    this.artPoints = []; this.avatarLayers = []; this.flying = []; this.statue = null;
  }

  select(rule, username, options = {}) {
    const nextWall = Number.isInteger(options.wallIndex) ? options.wallIndex : 0;
    const keep = rule.kind !== 'statue' && this.rule?.kind !== 'statue' && nextWall !== this.wallIndex;
    this.stop(); this.clearArt(keep);
    this.rule = rule; this.username = username; this.duration = rule.duration; this.wallIndex = nextWall;
    this.travelProgress=0;this.character.position.y=0;this.character.rotation.y=2.57;this.legs?.forEach(leg=>{leg.rotation.x=0;});
    this.wallOffset = rule.kind === 'statue' ? 0 : (nextWall % 64) * 6.4;
    // Floating origin: retain only the two recent panels and wrap coordinates every 64 walls.
    for(const old of [...this.retiredArt]){
      if(old.position.x>this.wallOffset+6.4)old.position.x-=64*6.4;
      if(Math.abs(old.position.x-this.wallOffset)<.1){this.retiredArt=this.retiredArt.filter(g=>g!==old);this.disposeArt(old);}
    }
    if(rule.kind==='statue'){this.retiredArt.forEach(group=>this.disposeArt(group));this.retiredArt=[];}
    this.art.position.x = this.wallOffset;
    this.worldObjects.forEach(object=>{object.position.x=object.userData.originX+this.wallOffset;});
    const name = textCanvas(username, { size: 115, width: 1100, height: 190, color: '#293e3d' });
    this.target = new THREE.Vector3(.65 + this.wallOffset, 3.7, -2.64);
    this.worldObjects.forEach(object => { object.visible = rule.kind !== 'statue'; });
    this.scene.background.set(rule.kind === 'statue' ? '#142c46' : '#dce9e7');
    this.scene.fog = rule.kind === 'statue' ? new THREE.Fog('#142c46', 1800, 7000) : this.normalFog;
    this.fireworks=null;this.confetti=null;
    this.controls.maxDistance = rule.kind === 'statue' ? 6000 : 25;
    this.controls.minDistance = rule.kind === 'statue' ? 300 : 7;
    if (rule.kind === 'statue') this.makeStatue(username);
    else {
      if (rule.kind === 'avatar' || rule.kind === 'combo') {
        const y = rule.kind === 'combo' ? 4.1 : 3.7;
        this.makeAvatar(rule.size, rule.size, .65, y, -2.63);
        this.target.y = y;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(rule.size / 2 + .12, .02, 6, 90), this.material('#f5d385'));
        ring.position.set(.65, y, -2.65); this.art.add(ring);
      }
      if (rule.kind === 'name' || rule.kind === 'combo') {
        const y = rule.kind === 'combo' ? 1.76 : 3.65;
        this.makeDots(name, 5.2, .91, .65, y, -2.62);
        this.box(4.6, .055, .03, coral, .65, y - .6, -2.63, { parent: this.art, radius: .02, shadow: false });
      }
    }
    this.setProgress(1); this.gun.lookAt(this.target); this.onProgress?.(1);
    if (rule.kind === 'statue') this.statueCamera(1);
  }

  makeStatue(username) {
    this.statueScale = 200;
    this.statue = new THREE.Group(); this.art.add(this.statue); this.statue.position.set(.65, 0, -300);
    const gold = this.material('#d8af55', { metalness: .74, roughness: .28 });
    const pale = this.material('#f1deac', { metalness: .35, roughness: .4 });
    const parent = this.statue;
    this.box(3.8, .28, 2.45, '#bbc6b2', 0, .14, 0, { parent, radius: .1 });
    this.box(3.3, .55, 2.1, '', 0, .51, 0, { parent, material: gold, radius: .08 });
    this.box(3.5, .12, 2.3, '', 0, .85, 0, { parent, material: pale });
    this.box(1.9, 1.8, 1.05, '', 0, 1.8, 0, { parent, material: gold, radius: .3 });
    this.box(.6, .6, .6, '', 0, 2.95, 0, { parent, material: gold });
    this.box(2.65, 2.1, 1.3, '', 0, 4.05, 0, { parent, material: gold, radius: .4 });
    this.box(2.1, .7, 1.35, '', 0, 3.25, .1, { parent, material: gold, radius: .2 });
    // A deliberately oversized jaw, smug eyebrows and grin give the monument its meme expression.
    for (const side of [-1, 1]) {
      this.box(.58, .24, .08, '#fff6d6', side * .55, 4.22, .68, { parent, radius: .05, shadow: false });
      this.box(.17, .19, .05, '#263d36', side * .42, 4.22, .74, { parent, radius: .04, shadow: false });
      const brow = this.box(.68, .13, .1, '#544224', side * .55, 4.49, .7, { parent, radius: .04 }); brow.rotation.z = side * -.18;
      this.sphere(.57, '#dbb05b', side * 1.05, 2.5, 0, parent).material = gold;
    }
    const smile = new THREE.CatmullRomCurve3([new THREE.Vector3(-.55,3.67,.73),new THREE.Vector3(0,3.51,.78),new THREE.Vector3(.62,3.77,.73)]);
    const smirk = new THREE.Mesh(new THREE.TubeGeometry(smile,16,.055,6,false),this.material('#6b4f27')); parent.add(smirk);
    this.box(.5,.09,.035,'#fff7d4',.18,3.65,.8,{parent,radius:.03,shadow:false});
    for (const side of [-1, 1]) {
      const arm = this.box(.45, 1.5, .5, '', side * 1.35, 2.25, 0, { parent, material: gold, radius: .15 }); arm.rotation.z = side * -.4;
      const hand = this.sphere(.28, '#dfb55c', side * 1.58, 2.9, 0, parent); hand.material = gold;
    }
    const portrait = this.makeAvatar(1.52, 1.52, 0, 2.14, .56);
    parent.add(portrait.mesh); parent.add(portrait.dots.mesh);
    const medal = new THREE.Mesh(new THREE.TorusGeometry(.82, .055, 8, 64), gold); medal.position.set(0, 2.14, .57); parent.add(medal);
    this.planeLabel('MEGA STATUE · 200×', 2.8, .35, 0, .52, 1.065, '#66522e', parent, 48);
    this.box(2.8, .14, 1.4, '', 0, 5.15, 0, { parent, material: pale });
    for (let i = 0; i < 5; i++) {
      const crown = new THREE.Mesh(new THREE.ConeGeometry(.23, .62, 4), gold);
      crown.position.set(-.84 + i * .42, 5.52 + (i === 2 ? .1 : 0), 0); parent.add(crown);
    }
    const rng = random(29);
    const chars = [...username].slice(0, 25);
    const spacing = Math.min(.44, 7 / chars.length);
    chars.forEach((char, i) => {
      const baseX = (i - (chars.length - 1) / 2) * spacing;
      const letter = this.planeLabel(char, .7, .8, 0, 0, 0, '#fff2bc', this.art, 140);
      letter.material.toneMapped=false;
      letter.scale.setScalar(200);
      letter.userData = { baseX, rise: .2 + rng() * .6, drift: (rng() - .5) * .8, turn: (rng() - .5) * .9 }; this.flying.push(letter);
    });
    this.burst = new THREE.InstancedMesh(new THREE.OctahedronGeometry(7), new THREE.MeshBasicMaterial({ color: '#f2c86f' }), 80);
    this.burst.userData.particles = Array.from({ length: 80 }, () => ({ angle: rng() * Math.PI * 2, radius: .6 + rng() * 3, y: rng() * 3 }));
    this.burst.frustumCulled = false; this.art.add(this.burst);
    this.target.set(.65, 428, -188);
    this.box(7000, 1, 7000, '#a6b895', 0, -1.3, -300, { parent: this.art, radius: 0, shadow: false });
    this.box(1000, .6, 800, '#d4c4a7', 0, -.2, -300, { parent: this.art, radius: 0, shadow: false });
    const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:'#e1e3d5',roughness:.9}), 120);
    const placement = new THREE.Object3D(); const color = new THREE.Color();
    for(let i=0;i<120;i++) { const angle=rng()*Math.PI*2; const radius=650+rng()*1300; const h=6+rng()*38;
      placement.position.set(Math.cos(angle)*radius,h/2,Math.sin(angle)*radius-300);placement.scale.set(12+rng()*20,h,12+rng()*20);placement.updateMatrix();city.setMatrixAt(i,placement.matrix);city.setColorAt(i,color.set(['#d8d8c5','#c4d0bd','#ece0c5','#a7bdb0'][i%4])); }
    city.instanceMatrix.needsUpdate=true;city.instanceColor.needsUpdate=true; this.art.add(city);
    const clouds=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.35,depthWrite:false}),50);
    for(let i=0;i<50;i++){placement.position.set((rng()-.5)*3300,360+rng()*1000,-500-rng()*2000);placement.scale.set(100+rng()*150,16+rng()*25,40+rng()*60);placement.updateMatrix();clouds.setMatrixAt(i,placement.matrix);}clouds.instanceMatrix.needsUpdate=true;this.art.add(clouds);
    this.makeCelebration();
  }

  makeCelebration() {
    const rng=random(2304),palette=['#ffd875','#ff7298','#8af7d4','#a7c7ff','#fff4c9','#ee9f5f'];
    const centers=[[-450,850,-340],[430,1040,-520],[-350,1210,-650],[510,680,-200],[-580,610,-180],[240,1370,-650]];
    const count=centers.length*80,positions=new Float32Array(count*6),colors=new Float32Array(count*6),pointPositions=new Float32Array(count*3),pointColors=new Float32Array(count*3);
    const particles=[];const color=new THREE.Color();
    for(let i=0;i<count;i++){const burst=Math.floor(i/80),angle=(i%80)/80*Math.PI*2;particles.push({burst,angle,speed:120+rng()*120,depth:(rng()-.5)*160});color.set(palette[burst]);color.toArray(pointColors,i*3);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.95,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));lines.frustumCulled=false;this.art.add(lines);
    const pointsGeometry=new THREE.BufferGeometry();pointsGeometry.setAttribute('position',new THREE.BufferAttribute(pointPositions,3));pointsGeometry.setAttribute('color',new THREE.BufferAttribute(pointColors,3));
    const points=new THREE.Points(pointsGeometry,new THREE.PointsMaterial({size:9,sizeAttenuation:true,vertexColors:true,transparent:true,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));points.frustumCulled=false;this.art.add(points);
    this.fireworks={lines,points,particles,centers,positions,colors,pointPositions,pointColors};
    const confetti=new THREE.InstancedMesh(new THREE.PlaneGeometry(6,15),new THREE.MeshBasicMaterial({side:THREE.DoubleSide,toneMapped:false}),240);
    const data=[];for(let i=0;i<240;i++){data.push({x:(rng()-.5)*1300,y:rng()*1500,z:-80+rng()*300,spin:rng()*Math.PI*2,speed:85+rng()*95});confetti.setColorAt(i,color.set(palette[i%palette.length]));}confetti.frustumCulled=false;this.art.add(confetti);this.confetti={mesh:confetti,data};
    const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=256;const context=glowCanvas.getContext('2d');const gradient=context.createRadialGradient(128,128,4,128,128,126);gradient.addColorStop(0,'rgba(255,205,95,.65)');gradient.addColorStop(.4,'rgba(255,205,95,.18)');gradient.addColorStop(1,'rgba(255,205,95,0)');context.fillStyle=gradient;context.fillRect(0,0,256,256);
    const glow=new THREE.Mesh(new THREE.PlaneGeometry(1800,1800),new THREE.MeshBasicMaterial({map:canvasTexture(glowCanvas),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));glow.position.set(0,750,-800);this.art.add(glow);
  }

  updateCelebration(seconds) {
    const effect=this.fireworks;if(!effect)return;
    for(let i=0;i<effect.particles.length;i++){
      const p=effect.particles[i],start=seconds-1.1-p.burst*.34,phase=start<0?-1:(start%2.7)/2.7,center=effect.centers[p.burst];
      const radius=phase<0?0:(1-Math.pow(1-phase,3))*p.speed,tail=Math.max(0,radius-15),fall=Math.max(0,phase*phase*100),brightness=phase<0?0:Math.pow(1-phase,.5);
      const x=center[0]+Math.cos(p.angle)*radius,y=center[1]+Math.sin(p.angle)*radius-fall,z=center[2]+p.depth*Math.max(0,phase);
      effect.positions.set([x,y,z,center[0]+Math.cos(p.angle)*tail,center[1]+Math.sin(p.angle)*tail-fall,z],i*6);effect.pointPositions.set([x,y,z],i*3);
      for(let c=0;c<3;c++){const v=effect.pointColors[i*3+c]*brightness;effect.colors[i*6+c]=v;effect.colors[i*6+3+c]=v*.15;}
    }
    effect.lines.geometry.attributes.position.needsUpdate=true;effect.lines.geometry.attributes.color.needsUpdate=true;effect.points.geometry.attributes.position.needsUpdate=true;
    if(this.confetti){this.confetti.mesh.visible=seconds>1;this.confetti.data.forEach((p,i)=>{this.dummy.position.set(p.x+Math.sin(seconds*.8+p.spin)*50,1550-((p.y+seconds*p.speed)%1650),p.z);this.dummy.rotation.set(seconds*1.1+p.spin,seconds*.6+p.spin,seconds*.8+p.spin);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.confetti.mesh.setMatrixAt(i,this.dummy.matrix);});this.confetti.mesh.instanceMatrix.needsUpdate=true;}
  }

  setProgress(progress) {
    this.progress = clamp(progress, 0, 1);
    const draw = smooth(clamp((progress - .08) / .61, 0, 1));
    for (const item of this.artPoints) item.mesh.count = Math.floor(item.total * draw);
    for (const layer of this.avatarLayers) { layer.reveal.value = draw; layer.dots.mesh.visible = draw < .999; }
    if (this.statue) {
      this.partyClock=progress*this.duration;
      this.updateCelebration(progress*this.duration);
      const rise = smooth(clamp(progress / .25, 0, 1));
      this.statue.scale.setScalar(Math.max(.001, rise * this.statueScale));
      const explosion = smooth(clamp((progress - .55) / .45, 0, 1));
      for (const letter of this.flying) {
        const u = letter.userData;
        letter.position.set(.65 + (u.baseX + u.drift * explosion) * 200, (1.3 + explosion * (4.1 + u.rise)) * 200, -300 + (1.2 + explosion * .7) * 200);
        letter.rotation.z = u.turn * explosion;
        letter.material.opacity = 1;
      }
      this.burst.visible = progress > .55;
      this.burst.userData.particles.forEach((p, i) => {
        this.dummy.position.set(.65 + Math.cos(p.angle) * p.radius * explosion * 200, (2.4 + Math.sin(p.angle) * p.radius * explosion + p.y * explosion) * 200, -300 + (.7 + Math.cos(i) * explosion) * 200);
        this.dummy.rotation.set(i, explosion * i, 0); this.dummy.scale.setScalar(1 - explosion * .3); this.dummy.updateMatrix(); this.burst.setMatrixAt(i, this.dummy.matrix);
      }); this.burst.instanceMatrix.needsUpdate = true;
    }
    this.onProgress?.(progress);
  }

  setCamera(mode) {
    this.cameraMode = mode;
    if (this.rule?.kind === 'statue') { this.statueCamera(this.progress); return; }
    const poses = {
      wide: { position: [7.8, 6.1, 15.7], target: [0, 3.0, -.5], fov: 40 },
      front: { position: [.65, 4.8, 16.8], target: [.65, 3.1, -1], fov: 37 },
      statue: { position: [7.5, 5.4, 12.3], target: [.5, 2.9, -.1], fov: 42 },
      portrait: { position: [-.4, 4.8, 17.5], target: [-.4, 2.9, -.7], fov: 42 }
    };
    const pose = poses[mode] ?? poses.wide;
    if (this.character) this.character.position.x = (mode === 'portrait' ? -2.5 : -3.25) + this.wallOffset;
    this.camera.position.fromArray(pose.position); this.controls.target.fromArray(pose.target);
    this.camera.position.x += this.wallOffset; this.controls.target.x += this.wallOffset;
    this.baseCamera = this.camera.position.clone(); this.baseLook = this.controls.target.clone();
    this.camera.fov = pose.fov; this.camera.updateProjectionMatrix(); this.controls.update();
    if (this.gun && this.target) this.gun.lookAt(this.target);
  }

  setWallTravel(seconds) {
    if(this.statue || !this.baseCamera)return;
    const raw=clamp((seconds-this.duration*DRAW_END)/this.travelDuration,0,1), t=this.reducedMotion?(raw>=1?1:0):smooth(raw);
    this.travelProgress=raw;const shift=t*6.4;
    this.camera.position.copy(this.baseCamera);this.camera.position.x+=shift;
    this.controls.target.copy(this.baseLook);this.controls.target.x+=shift;
    this.character.position.x=(this.cameraMode==='portrait'?-2.5:-3.25)+this.wallOffset+shift;
    this.character.rotation.y=2.57-Math.sin(raw*Math.PI)*1.0;
    this.character.position.y=raw>0&&raw<1?Math.abs(Math.sin(raw*Math.PI*6))*.075:0;
    this.legs?.forEach((leg,i)=>{leg.rotation.x=raw>0&&raw<1?Math.sin(raw*Math.PI*6+i*Math.PI)*.35:0;});
    this.camera.lookAt(this.controls.target);
    if(raw>0)this.gun.lookAt(new THREE.Vector3(.65+this.wallOffset+shift,3.7,-2.64));
  }

  statueCamera(progress) {
    const rise = smooth(clamp(progress / .25, 0, 1)); const scale = Math.max(3, rise * 200);
    this.camera.fov = 50; this.camera.position.set(.8 * scale, 4.25 * scale, -300 + 10.5 * scale);
    this.controls.target.set(.65, 2.9 * scale, -300); this.camera.lookAt(this.controls.target);this.camera.updateProjectionMatrix();
  }
  play(callback, offset = 0) { this.elapsed = offset; this.playing = true; this.finished = callback; this.lastShot = -1; this.exploded = offset / this.duration > .55; this.setProgress(offset / this.duration); }
  stop() { this.playing = false; this.flash && (this.flash.visible = false); this.bullets && (this.bullets.visible = false); }
  resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
  }
  setAvatar(image) { this.avatar = image; if (this.rule) this.select(this.rule, this.username); }
  frame(time) {
    if(this.targetFps && time-(this.lastRender??0)<1000/this.targetFps-1)return;
    this.lastRender=time;
    this.renderer.info.reset();
    const dt = Math.min((time - this.lastTime) / 1000, .06); this.lastTime = time;
    if (this.playing) {
      const external=this.externalClock?.();this.elapsed=Number.isFinite(external)?external:this.elapsed+dt;this.setProgress(this.elapsed / this.duration);
      if(this.statue) this.statueCamera(this.progress); else this.setWallTravel(this.elapsed);
      const shooting = this.progress > .1 && this.progress < DRAW_END;
      this.flash.visible = shooting && Math.sin(time * .045) > .1;
      this.bullets.visible = shooting;
      const shotIndex = Math.floor(this.elapsed * 13);
      if(shooting && shotIndex !== this.lastShot) { this.lastShot=shotIndex;this.onShot?.(shotIndex); }
      if(this.statue && this.progress > .55 && !this.exploded){this.exploded=true;this.onBoom?.();}
      if(this.elapsed<this.duration*DRAW_END)this.character.position.y = Math.sin(time * .01) * .012;
      this.gun.position.z = .7 - (shooting ? Math.max(0, Math.sin(time * .045)) * .07 : 0);
      if (shooting && this.artPoints.length) {
        const item = this.artPoints[0]; const point = item.points[Math.min(item.total - 1, item.mesh.count)];
        if (point) {
          const target = new THREE.Vector3(point.x, point.y, 0); item.mesh.localToWorld(target); this.gun.lookAt(target);
          this.muzzle.getWorldPosition(this.muzzlePosition);
          for (let i = 0; i < 14; i++) {
            const t = (time * .0025 + i / 14) % 1;
            this.dummy.position.lerpVectors(this.muzzlePosition, target, t);
            this.dummy.scale.setScalar((this.statue ? 80 : 1) * (.6 + t * .4)); this.dummy.updateMatrix(); this.bullets.setMatrixAt(i, this.dummy.matrix);
          } this.bullets.instanceMatrix.needsUpdate = true;
        }
      }
      if (this.elapsed >= (this.statue ? this.duration : this.duration*DRAW_END + this.travelDuration)) { const done = this.finished; this.stop(); this.finished = null; done?.(); }
    }
    if(this.statue&&!this.playing&&!this.reducedMotion&&!this.isEffectPaused?.()){
      this.partyClock=(this.partyClock??this.progress*this.duration)+dt;this.updateCelebration(this.partyClock);
    }
    this.controls.enabled = !this.playing;
    if(!this.playing || !this.statue) this.controls.update();
    const originalPosition=this.camera.position.clone();const originalQuaternion=this.camera.quaternion.clone();
    if(this.playing && !this.reducedMotion && this.shake>0){
      const active=this.progress>.1&&this.progress<DRAW_END; const burst=this.statue?Math.max(0,1-Math.abs(this.progress-.56)*35):0;
      const strength=(active ? .0016 : 0)+burst*.0045;const distance=this.camera.position.distanceTo(this.controls.target);
      this.camera.position.x+=Math.sin(time*.095)*distance*strength*this.shake;this.camera.position.y+=Math.cos(time*.081)*distance*strength*this.shake*.6;
      this.camera.rotateZ(Math.sin(time*.07)*strength*this.shake*.3);
    }
    this.renderer.setScissorTest(false);this.renderer.setViewport(0,0,this.container.clientWidth,this.container.clientHeight);this.renderer.render(this.scene, this.camera);
    this.camera.position.copy(originalPosition);this.camera.quaternion.copy(originalQuaternion);
    this.frameCount++;
  }
  stats() { return { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, points: this.artPoints.reduce((sum, item) => sum + item.total, 0), geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures, frames: this.frameCount }; }
}
