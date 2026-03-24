// ════════════════════════════════════════════════════════════════
//  DONYO SABUK AVENUE — Premium 3D Architectural Visualization
//  Version 3 — Realistic Render + Interactive Indoor/Outdoor
// ════════════════════════════════════════════════════════════════

const CONFIG = {
    FLOORS: 14,
    FLOOR_H: 3.3,
    PARKING: 3,
    PARK_H: 3.0,
    TW: 20,
    TD: 11,
    GAP: 16,
};

// ─── State ───
let scene, camera, renderer, clock;
let isNight = false, isWire = false, isXray = false, autoRotate = false;
let camAngle = 0.35, camPitch = 0.38, camDist = 130;
let tgtAngle = camAngle, tgtPitch = camPitch, tgtDist = camDist;
let pivot = new THREE.Vector3(0, 22, 0), tgtPivot = pivot.clone();
let dragging = false, panning = false, prevMX = 0, prevMY = 0;
let mx = 0, my = 0;
let raycaster, mVec;
let hovered = null;
let clickables = [];
let sunLight, ambLight, hemiLight;
let activeFP = 'AC';
let currentFloor = null;
let envMap = null;

// Interior state
let intScene, intCamera, intRenderer, intClock;
let intDragging = false, intPrevMX = 0, intPrevMY = 0;
let intAngle = 0.3, intPitch = 0.2, intDist = 8;
let intTgtAngle = intAngle, intTgtPitch = intPitch, intTgtDist = intDist;
let intPivot = new THREE.Vector3(0, 1.5, 0);
let intAnimId = null;
let currentInterior = 'reception';

const MAT = {};

function init() {
    scene = new THREE.Scene();
    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();
    mVec = new THREE.Vector2();

    camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 800);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    scene.fog = new THREE.FogExp2(0xb8c8d8, 0.0018);

    buildEnvMap();
    buildMaterials();
    buildLights();
    buildSky();
    buildGround();
    buildTowers();
    buildParking();
    buildAmenityPodium();
    buildPool();
    buildTrees();
    buildRoad();
    buildRiver();
    buildFloorSelector();
    buildCompass();
    setupEvents();
    setupNav();
    setupFloorPlanBtn();
    setupInteriorTabs();

    setTimeout(() => { document.getElementById('loader').classList.add('done'); }, 2400);
    setTimeout(() => { document.getElementById('instr').classList.add('fade'); }, 2000);

    animate();
}

// ═══════════════════════════════════
//  ENVIRONMENT MAP
// ═══════════════════════════════════
function buildEnvMap() {
    const envScene = new THREE.Scene();
    const envCam = new THREE.CubeCamera(1, 1000, new THREE.WebGLCubeRenderTarget(256));
    const gradientSphere = new THREE.Mesh(
        new THREE.SphereGeometry(400, 16, 16),
        new THREE.ShaderMaterial({
            side: THREE.BackSide,
            vertexShader: `varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
            fragmentShader: `varying vec3 vPos;void main(){float h=normalize(vPos).y;vec3 top=vec3(.35,.55,.8);vec3 bot=vec3(.75,.8,.85);gl_FragColor=vec4(mix(bot,top,max(h,0.)),1.);}`
        })
    );
    envScene.add(gradientSphere);
    envCam.update(renderer, envScene);
    envMap = envCam.renderTarget.texture;
}

// ═══════════════════════════════════
//  MATERIALS — Enhanced PBR
// ═══════════════════════════════════
function buildMaterials() {
    MAT.concrete = new THREE.MeshStandardMaterial({ color: 0xd8cfc2, roughness: 0.72, metalness: 0.02, envMap, envMapIntensity: 0.3 });
    MAT.concreteDark = new THREE.MeshStandardMaterial({ color: 0x9a9085, roughness: 0.6, metalness: 0.05, envMap, envMapIntensity: 0.2 });
    MAT.glass = new THREE.MeshStandardMaterial({ color: 0x2a5580, roughness: 0.02, metalness: 0.95, transparent: true, opacity: 0.42, envMap, envMapIntensity: 1.4 });
    MAT.glassRail = new THREE.MeshStandardMaterial({ color: 0x88bbdd, roughness: 0.0, metalness: 0.9, transparent: true, opacity: 0.18, envMap, envMapIntensity: 0.8 });
    MAT.balcony = new THREE.MeshStandardMaterial({ color: 0xcabd9e, roughness: 0.55, metalness: 0.05, envMap, envMapIntensity: 0.2 });
    MAT.steel = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.2, metalness: 0.95, envMap, envMapIntensity: 0.6 });
    MAT.wood = new THREE.MeshStandardMaterial({ color: 0x7a5533, roughness: 0.8, metalness: 0.0 });
    MAT.paving = new THREE.MeshStandardMaterial({ color: 0x888882, roughness: 0.85, metalness: 0.0 });
    MAT.road = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 });
    MAT.grass = new THREE.MeshStandardMaterial({ color: 0x3d7a35, roughness: 0.95 });
    MAT.water = new THREE.MeshStandardMaterial({ color: 0x0e8fbb, roughness: 0.0, metalness: 0.5, transparent: true, opacity: 0.7, envMap, envMapIntensity: 1.5 });
    MAT.poolDeck = new THREE.MeshStandardMaterial({ color: 0xc8b898, roughness: 0.5 });
    MAT.amenity = new THREE.MeshStandardMaterial({ color: 0xb8a880, roughness: 0.45, metalness: 0.08, envMap, envMapIntensity: 0.3 });
    MAT.parkingFloor = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 });
    MAT.crown = new THREE.MeshStandardMaterial({ color: 0x6a6055, roughness: 0.35, metalness: 0.15, envMap, envMapIntensity: 0.4 });
    MAT.greenPlay = new THREE.MeshStandardMaterial({ color: 0x228833, roughness: 1.0 });
    MAT.poolTile = new THREE.MeshStandardMaterial({ color: 0x1a6688, roughness: 0.1, metalness: 0.3, envMap, envMapIntensity: 0.8 });
    MAT.warmConcrete = new THREE.MeshStandardMaterial({ color: 0xc4b29a, roughness: 0.6, metalness: 0.03, envMap, envMapIntensity: 0.25 });
    MAT.glassPanel = new THREE.MeshStandardMaterial({ color: 0x1e4466, roughness: 0.05, metalness: 0.92, transparent: true, opacity: 0.5, envMap, envMapIntensity: 1.6 });
}

// ═══════════════════════════════════
//  LIGHTS — Golden Hour
// ═══════════════════════════════════
function buildLights() {
    ambLight = new THREE.AmbientLight(0x607888, 0.45);
    scene.add(ambLight);
    hemiLight = new THREE.HemisphereLight(0x8abbdd, 0x445530, 0.55);
    scene.add(hemiLight);
    sunLight = new THREE.DirectionalLight(0xffecd0, 1.3);
    sunLight.position.set(60, 90, 35);
    sunLight.castShadow = true;
    const s = sunLight.shadow;
    s.mapSize.set(2048, 2048);
    s.camera.near = 1; s.camera.far = 300;
    s.camera.left = s.camera.bottom = -90;
    s.camera.right = s.camera.top = 90;
    s.bias = -0.0005;
    scene.add(sunLight);

    const fill = new THREE.DirectionalLight(0xffd8a0, 0.25);
    fill.position.set(-40, 30, -60);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x88aadd, 0.3);
    rim.position.set(-50, 50, 50);
    scene.add(rim);
}

// ═══════════════════════════════════
//  SKY — Dusk gradient
// ═══════════════════════════════════
function buildSky() {
    const geo = new THREE.SphereGeometry(380, 32, 24);
    const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
            uTop: { value: new THREE.Color(0x3a6faa) },
            uMid: { value: new THREE.Color(0x8ab4d4) },
            uBot: { value: new THREE.Color(0xd8dde4) },
            uSun: { value: new THREE.Color(0xfff0d0) },
            uSunDir: { value: new THREE.Vector3(0.5, 0.3, 0.2).normalize() },
        },
        vertexShader: `varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `
      uniform vec3 uTop,uMid,uBot,uSun;uniform vec3 uSunDir;varying vec3 vPos;
      void main(){
vec3 d=normalize(vPos);float h=d.y;
vec3 col=h>0.?mix(uMid,uTop,pow(h,0.6)):mix(uMid,uBot,pow(-h,0.4));
float sun=pow(max(dot(d,uSunDir),0.),32.)*0.6;
col+=uSun*sun;
float haze=1.-abs(h);
col=mix(col,vec3(.82,.84,.86),pow(haze,6.)*0.5);
gl_FragColor=vec4(col,1.);
      }`,
    });
    mat.userData.sky = true;
    scene.add(new THREE.Mesh(geo, mat));
}

// ═══════════════════════════════════
//  GROUND & TERRAIN
// ═══════════════════════════════════
function buildGround() {
    const geo = new THREE.PlaneGeometry(350, 250, 60, 40);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        let z = x > 40 ? -(x - 40) * 0.2 : 0;
        z += Math.sin(x * 0.05) * Math.cos(y * 0.04) * 0.4;
        pos.setZ(i, z);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, MAT.grass);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const pv = new THREE.Mesh(new THREE.PlaneGeometry(85, 55), MAT.paving);
    pv.rotation.x = -Math.PI / 2;
    pv.position.y = 0.06;
    pv.receiveShadow = true;
    scene.add(pv);

    // Curved driveway
    const drivePts = [
        new THREE.Vector3(-42, 0.08, -18),
        new THREE.Vector3(-30, 0.08, -10),
        new THREE.Vector3(-15, 0.08, 0),
        new THREE.Vector3(5, 0.08, 12),
        new THREE.Vector3(20, 0.08, 20),
    ];
    const driveCurve = new THREE.CatmullRomCurve3(drivePts);
    const driveGeo = new THREE.TubeGeometry(driveCurve, 30, 1.5, 4, false);
    const driveway = new THREE.Mesh(driveGeo, MAT.paving);
    driveway.position.y = -1.4;
    scene.add(driveway);
}

// ═══════════════════════════════════
//  TOWER SHAPE — Wing form per plans
// ═══════════════════════════════════
function makeTowerShape(tw, td) {
    const s = new THREE.Shape();
    const hw = tw / 2, hd = td / 2;
    // Angular wing-like footprint matching the architectural plan
    s.moveTo(-hw, -hd);
    s.lineTo(hw * 0.85, -hd);
    s.lineTo(hw, -hd * 0.6);
    s.lineTo(hw, hd * 0.6);
    s.lineTo(hw * 0.85, hd);
    s.lineTo(-hw, hd);
    s.lineTo(-hw * 0.9, hd * 0.3);
    s.lineTo(-hw, -hd);
    return s;
}

function buildTowers() {
    for (let t = 0; t < 2; t++) {
        const grp = new THREE.Group();
        const zOff = t === 0 ? -CONFIG.GAP : CONFIG.GAP;
        grp.position.set(0, 0, zOff);
        if (t === 1) grp.rotation.y = Math.PI;

        const baseY = CONFIG.PARKING * CONFIG.PARK_H;

        for (let f = 0; f < CONFIG.FLOORS; f++) {
            const y = baseY + f * CONFIG.FLOOR_H;
            const floorGrp = new THREE.Group();

            // Slab — angular shape
            const slabShape = makeTowerShape(CONFIG.TW + 1, CONFIG.TD + 1);
            const slabGeo = new THREE.ExtrudeGeometry(slabShape, { depth: 0.3, bevelEnabled: false });
            const slab = new THREE.Mesh(slabGeo, MAT.concrete);
            slab.rotation.x = -Math.PI / 2;
            slab.position.y = y;
            slab.castShadow = true;
            slab.receiveShadow = true;
            floorGrp.add(slab);

            // Glass facade panels — dark blue tinted
            const glassShape = makeTowerShape(CONFIG.TW - 0.3, CONFIG.TD - 0.3);
            const glassGeo = new THREE.ExtrudeGeometry(glassShape, { depth: CONFIG.FLOOR_H - 0.65, bevelEnabled: false });
            const glassMat = MAT.glassPanel.clone();
            const glass = new THREE.Mesh(glassGeo, glassMat);
            glass.rotation.x = -Math.PI / 2;
            glass.position.y = y + 0.35;
            glass.userData = {
                name: f === 0 ? 'Reception Level' : f === 1 ? 'Amenity Level — Gym & Entertainment' : `Floor ${f + 1} — Residential`,
                floor: f + 1, tower: t,
                desc: f < 2 ? 'Common facilities level' : `Type ${t === 0 ? 'A/C' : 'B/D'} — 5,300 sqft`,
            };
            floorGrp.add(glass);
            clickables.push(glass);

            // Horizontal mullions
            for (let mh = 0; mh < 2; mh++) {
                const mullion = makeMesh(new THREE.BoxGeometry(CONFIG.TW + 1.2, 0.06, 0.06), MAT.steel);
                mullion.position.set(0, y + mh * (CONFIG.FLOOR_H * 0.45), CONFIG.TD / 2 + 0.15);
                floorGrp.add(mullion);
                const m2 = mullion.clone();
                m2.position.z = -CONFIG.TD / 2 - 0.15;
                floorGrp.add(m2);
            }

            // Vertical mullions
            for (let v = -3; v <= 3; v++) {
                const vm = makeMesh(new THREE.BoxGeometry(0.05, CONFIG.FLOOR_H - 0.4, 0.05), MAT.steel);
                vm.position.set(v * (CONFIG.TW / 7), y + CONFIG.FLOOR_H * 0.5, CONFIG.TD / 2 + 0.15);
                floorGrp.add(vm);
                const vm2 = vm.clone();
                vm2.position.z = -CONFIG.TD / 2 - 0.15;
                floorGrp.add(vm2);
            }

            // Staggered balconies — wavy organic pattern
            const balDepth = 2.4 + Math.sin(f * 1.1) * 0.6;
            const balW = CONFIG.TW * (0.38 + Math.sin(f * 0.7) * 0.1);
            const balXOff = Math.sin(f * 1.3) * 2.5;

            for (let side = -1; side <= 1; side += 2) {
                const bslab = makeMesh(new THREE.BoxGeometry(balW, 0.22, balDepth), MAT.warmConcrete);
                bslab.position.set(balXOff, y + 0.11, side * (CONFIG.TD / 2 + balDepth / 2));
                bslab.castShadow = true;
                floorGrp.add(bslab);

                // Glass railing
                const rail = makeMesh(new THREE.BoxGeometry(balW - 0.2, 1.1, 0.05), MAT.glassRail);
                rail.position.set(balXOff, y + 0.65, side * (CONFIG.TD / 2 + balDepth));
                floorGrp.add(rail);

                // Steel handrail cap
                const cap = makeMesh(new THREE.BoxGeometry(balW, 0.05, 0.07), MAT.steel);
                cap.position.set(balXOff, y + 1.2, side * (CONFIG.TD / 2 + balDepth));
                floorGrp.add(cap);

                // Warm LED soffit strip under each balcony
                if (f > 0) {
                    const lightStrip = makeMesh(
                        new THREE.BoxGeometry(balW * 0.7, 0.03, 0.03),
                        new THREE.MeshStandardMaterial({
                            color: 0xffe8c0,
                            emissive: 0xffe8c0,
                            emissiveIntensity: 0.4
                        })
                    );
                    lightStrip.position.set(balXOff, y + 0.02, side * (CONFIG.TD / 2 + balDepth * 0.4));
                    floorGrp.add(lightStrip);
                }
            }

            // Side balconies
            for (let side = -1; side <= 1; side += 2) {
                const sbW = CONFIG.TD * 0.28;
                const sbD = 1.8;
                const sb = makeMesh(new THREE.BoxGeometry(sbD, 0.2, sbW), MAT.warmConcrete);
                sb.position.set(side * (CONFIG.TW / 2 + sbD / 2), y + 0.1, Math.sin(f * 0.9 + t) * 2);
                sb.castShadow = true;
                floorGrp.add(sb);

                const sr = makeMesh(new THREE.BoxGeometry(0.05, 1.1, sbW - 0.2), MAT.glassRail);
                sr.position.set(side * (CONFIG.TW / 2 + sbD), y + 0.65, Math.sin(f * 0.9 + t) * 2);
                floorGrp.add(sr);
            }

            grp.add(floorGrp);
        }

        // Crown / parapet
        const crownY = baseY + CONFIG.FLOORS * CONFIG.FLOOR_H;
        const crownShape = makeTowerShape(CONFIG.TW + 3, CONFIG.TD + 3);
        const crownGeo = new THREE.ExtrudeGeometry(crownShape, { depth: 1.5, bevelEnabled: false });
        const crown = new THREE.Mesh(crownGeo, MAT.crown);
        crown.rotation.x = -Math.PI / 2;
        crown.position.y = crownY;
        crown.castShadow = true;
        crown.userData = { name: 'Rooftop — Water Tanks & Services', floor: 'R', tower: t };
        grp.add(crown);
        clickables.push(crown);

        // Rooftop water tanks
        for (let tx = -1; tx <= 1; tx += 2) {
            const tank = makeMesh(new THREE.BoxGeometry(4, 2.2, 3), MAT.concreteDark);
            tank.position.set(tx * 5, crownY + 2.6, 0);
            grp.add(tank);
        }

        // Hanging lines/splash on roof
        for (let hl = -1; hl <= 1; hl += 2) {
            const hangLine = makeMesh(new THREE.BoxGeometry(3.5, 0.1, 5), MAT.steel);
            hangLine.position.set(hl * 3, crownY + 1.8, 3);
            grp.add(hangLine);
        }

        // Elevator overrun
        const elev = makeMesh(new THREE.BoxGeometry(3.5, 3.5, 3.5), MAT.concreteDark);
        elev.position.set(0, crownY + 3.25, 0);
        grp.add(elev);

        scene.add(grp);
    }

    // Connecting bridge at amenity level
    const bridgeY = CONFIG.PARKING * CONFIG.PARK_H + CONFIG.FLOOR_H * 1.2;
    const bridgeLen = CONFIG.GAP * 2 - CONFIG.TD + 2;

    const bridge = makeMesh(new THREE.BoxGeometry(8, 4, bridgeLen), MAT.glass.clone());
    bridge.position.set(0, bridgeY, 0);
    bridge.castShadow = true;
    bridge.userData = { name: 'Sky Bridge — Connecting Amenity Level' };
    scene.add(bridge);
    clickables.push(bridge);

    const bRoof = makeMesh(new THREE.BoxGeometry(9, 0.3, bridgeLen + 1), MAT.concrete);
    bRoof.position.set(0, bridgeY + 2, 0);
    scene.add(bRoof);

    for (let side = -1; side <= 1; side += 2) {
        const bWall = makeMesh(new THREE.BoxGeometry(8.1, 3.5, 0.06), MAT.glassRail);
        bWall.position.set(0, bridgeY, side * 3);
        scene.add(bWall);
    }
}

// ═══════════════════════════════════
//  PARKING PODIUM
// ═══════════════════════════════════
function buildParking() {
    const pw = CONFIG.TW + 16, pd = CONFIG.GAP * 2 + CONFIG.TD + 10;
    for (let lv = 0; lv < CONFIG.PARKING; lv++) {
        const y = lv * CONFIG.PARK_H;
        const cars = lv === 0 ? 66 : lv === 1 ? 69 : 74;
        const slab = makeMesh(new THREE.BoxGeometry(pw, CONFIG.PARK_H - 0.15, pd), MAT.parkingFloor);
        slab.position.set(0, y + CONFIG.PARK_H / 2, 0);
        slab.castShadow = true;
        slab.receiveShadow = true;
        slab.userData = { name: `Parking Level ${lv + 1}`, desc: `${cars} spaces`, floor: `P${lv + 1}` };
        scene.add(slab);
        clickables.push(slab);

        for (let side = -1; side <= 1; side += 2) {
            const beam = makeMesh(new THREE.BoxGeometry(pw + 0.2, 0.5, 0.3), MAT.concrete);
            beam.position.set(0, y + CONFIG.PARK_H - 0.1, side * pd / 2);
            scene.add(beam);
        }

        for (let s = -1; s <= 1; s += 2) {
            for (let h = 0; h < 3; h++) {
                const louver = makeMesh(new THREE.BoxGeometry(pw + 0.1, 0.12, 0.6), MAT.concrete);
                louver.position.set(0, y + 0.8 + h * 0.9, s * (pd / 2 + 0.15));
                scene.add(louver);
            }
        }
    }

    const ramp = makeMesh(new THREE.BoxGeometry(6.1, 0.2, 24), MAT.road);
    ramp.position.set(-pw / 2 - 2.5, 3, -6);
    ramp.rotation.x = 0.12;
    ramp.userData = { name: 'Vehicle Entry Ramp — 6.10m Wide' };
    scene.add(ramp);
    clickables.push(ramp);

    const gate = makeMesh(new THREE.BoxGeometry(6.5, 2.8, 0.15), MAT.steel);
    gate.position.set(-pw / 2 - 1, 1.5, -18);
    gate.userData = { name: 'Main Gate' };
    scene.add(gate);
    clickables.push(gate);
}

// ═══════════════════════════════════
//  AMENITY PODIUM
// ═══════════════════════════════════
function buildAmenityPodium() {
    const baseY = CONFIG.PARKING * CONFIG.PARK_H + 0.15;

    const gym = makeMesh(new THREE.BoxGeometry(12, 4.5, 8), MAT.amenity);
    gym.position.set(18, baseY + 2.25, -12);
    gym.castShadow = true;
    gym.userData = { name: 'Gymnasium & Spa', desc: 'Full fitness center — Male/Female facilities' };
    scene.add(gym);
    clickables.push(gym);

    const gymG = makeMesh(new THREE.BoxGeometry(12.1, 3.8, 0.06), MAT.glass.clone());
    gymG.position.set(18, baseY + 2.15, -8);
    scene.add(gymG);

    const ent = makeMesh(new THREE.BoxGeometry(12, 4, 7), MAT.amenity);
    ent.position.set(18, baseY + 2, 12);
    ent.castShadow = true;
    ent.userData = { name: 'Entertainment Area & Residential Lounge', desc: 'Bar, lounge, terraces & event space' };
    scene.add(ent);
    clickables.push(ent);

    const entG = makeMesh(new THREE.BoxGeometry(12.1, 3.5, 0.06), MAT.glass.clone());
    entG.position.set(18, baseY + 1.95, 8.5);
    scene.add(entG);

    for (let side = -1; side <= 1; side += 2) {
        const play = makeMesh(new THREE.BoxGeometry(8, 0.25, 10), MAT.greenPlay);
        play.position.set(26, baseY, side * 14);
        play.userData = { name: "Kids' Play Area", desc: 'Secure outdoor playground' };
        scene.add(play);
        clickables.push(play);
    }

    const lounge = makeMesh(new THREE.BoxGeometry(8, 3.5, 6), MAT.amenity);
    lounge.position.set(14, baseY + 1.75, 0);
    lounge.castShadow = true;
    lounge.userData = { name: 'Residential Lounge', desc: 'Shared lounge between towers' };
    scene.add(lounge);
    clickables.push(lounge);

    const gh = makeMesh(new THREE.BoxGeometry(4, 3, 4), MAT.concrete);
    gh.position.set(-36, 1.5, -16);
    gh.castShadow = true;
    gh.userData = { name: 'Guard House', desc: '24/7 security checkpoint' };
    scene.add(gh);
    clickables.push(gh);

    const stp = makeMesh(new THREE.BoxGeometry(6, 2.5, 4), MAT.concreteDark);
    stp.position.set(-30, 1.25, -22);
    stp.userData = { name: 'UGWT & STP Plant', desc: 'Underground water treatment' };
    scene.add(stp);
    clickables.push(stp);

    const genset = makeMesh(new THREE.BoxGeometry(5, 2.5, 4), MAT.concreteDark);
    genset.position.set(-30, 1.25, -16);
    genset.userData = { name: 'Genset & Switch Room', desc: 'Backup power generation' };
    scene.add(genset);
    clickables.push(genset);

    // Jogging track arc
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 1.2 - Math.PI * 0.3;
        const r = 28;
        const seg = makeMesh(new THREE.BoxGeometry(4.5, 0.05, 1.5), MAT.paving);
        seg.position.set(Math.cos(angle) * r, baseY, Math.sin(angle) * r);
        seg.rotation.y = -angle + Math.PI / 2;
        scene.add(seg);
    }
}

// ═══════════════════════════════════
//  POOL — Angular hexagonal shape
// ═══════════════════════════════════
function buildPool() {
    const py = 0.15;
    const deck = makeMesh(new THREE.BoxGeometry(20, 0.15, 14), MAT.poolDeck);
    deck.position.set(32, py, -24);
    deck.receiveShadow = true;
    scene.add(deck);

    const poolShape = new THREE.Shape();
    poolShape.moveTo(-5, -3.5);
    poolShape.lineTo(4, -3.5);
    poolShape.lineTo(6, -1);
    poolShape.lineTo(5, 3.5);
    poolShape.lineTo(-3, 3.5);
    poolShape.lineTo(-6, 1);
    poolShape.closePath();
    const poolGeo = new THREE.ExtrudeGeometry(poolShape, { depth: 0.8, bevelEnabled: false });
    const pool = new THREE.Mesh(poolGeo, MAT.poolTile);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(32, py + 0.1, -24);
    pool.userData = { name: 'Swimming Pool', desc: 'Infinity-edge pool at ground level' };
    scene.add(pool);
    clickables.push(pool);

    const waterSurface = new THREE.Mesh(new THREE.PlaneGeometry(11, 7), MAT.water);
    waterSurface.rotation.x = -Math.PI / 2;
    waterSurface.position.set(32, py + 0.85, -24);
    scene.add(waterSurface);
}

// ═══════════════════════════════════
//  TREES
// ═══════════════════════════════════
function buildTrees() {
    const positions = [
        [-28, 12], [-32, -6], [-22, -20], [38, 16], [42, -12], [32, 28], [-16, 28], [48, 2], [-38, 22], [40, -28],
        [-30, -22], [45, 22], [-20, 16], [28, -20], [-34, 10], [42, -18], [-24, -14], [22, 32], [-28, -28], [48, 14],
        [35, 0], [-10, -28], [50, -5], [-40, -10], [15, 30], [-35, -15], [46, 8], [-18, -25], [25, -28], [50, 18],
        [-42, 8], [-42, -5], [52, -15], [52, 10], [-36, 28], [38, -30], [45, -25], [-25, 25],
    ];
    positions.forEach(([x, z]) => {
        const tree = makeTree();
        tree.position.set(x, 0, z);
        tree.scale.setScalar(0.7 + Math.random() * 0.7);
        tree.rotation.y = Math.random() * Math.PI * 2;
        scene.add(tree);
    });
}

function makeTree() {
    const g = new THREE.Group();
    const trunkH = 2.5 + Math.random() * 2;
    const trunk = makeMesh(new THREE.CylinderGeometry(0.15, 0.3, trunkH, 6), MAT.wood);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    g.add(trunk);
    const leafColor = new THREE.Color().setHSL(0.27 + Math.random() * 0.1, 0.55 + Math.random() * 0.2, 0.2 + Math.random() * 0.12);
    const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.85 });
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
        const r = 1.2 + Math.random() * 1.5;
        const c = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), leafMat);
        c.position.set((Math.random() - 0.5) * 2, trunkH + Math.random() * 2, (Math.random() - 0.5) * 2);
        c.castShadow = true;
        g.add(c);
    }
    return g;
}

// ═══════════════════════════════════
//  ROAD & RIVER
// ═══════════════════════════════════
function buildRoad() {
    const road = makeMesh(new THREE.PlaneGeometry(9, 250), MAT.road);
    road.rotation.x = -Math.PI / 2;
    road.position.set(-46, 0.04, 0);
    road.receiveShadow = true;
    road.userData = { name: 'Donyo Sabuk Avenue' };
    scene.add(road);
    clickables.push(road);

    for (let i = -14; i < 14; i++) {
        const mk = makeMesh(new THREE.PlaneGeometry(0.25, 2.5), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
        mk.rotation.x = -Math.PI / 2;
        mk.position.set(-46, 0.06, i * 8);
        scene.add(mk);
    }

    const sw = makeMesh(new THREE.BoxGeometry(2.5, 0.15, 250), MAT.paving);
    sw.position.set(-41, 0.075, 0);
    scene.add(sw);
}

function buildRiver() {
    const curve = [];
    for (let i = -60; i <= 60; i += 2) {
        curve.push(new THREE.Vector3(58 + Math.sin(i * 0.04) * 6, -1, i));
    }
    const path = new THREE.CatmullRomCurve3(curve);
    const tubeGeo = new THREE.TubeGeometry(path, 50, 3, 8, false);
    const river = new THREE.Mesh(tubeGeo, MAT.water);
    river.userData = { name: 'River Mathira' };
    scene.add(river);
    clickables.push(river);
}

// ═══════════════════════════════════
//  FLOOR SELECTOR UI
// ═══════════════════════════════════
function buildFloorSelector() {
    const cont = document.getElementById('floorSel');
    addFloorDot(cont, 'R', 'Rooftop — Water Tanks & Hanging Lines');
    for (let f = CONFIG.FLOORS; f >= 1; f--) {
        const label = f <= 1 ? 'Reception & Lobby' : f === 2 ? 'Amenity — Gym, Entertainment, Pool' : `Floor ${f} — Type A/B/C/D`;
        addFloorDot(cont, String(f), label);
    }
    const div = document.createElement('div');
    div.className = 'fl-divider';
    cont.appendChild(div);
    for (let p = CONFIG.PARKING; p >= 1; p--) {
        const cars = p === 1 ? 66 : p === 2 ? 69 : 74;
        addFloorDot(cont, `P${p}`, `Parking ${p} — ${cars} cars`);
    }
}

function addFloorDot(cont, id, label) {
    const el = document.createElement('div');
    el.className = 'fl';
    el.textContent = id;
    el.innerHTML += `<span class="tip">${label}</span>`;
    el.addEventListener('click', () => {
        document.querySelectorAll('.fl').forEach(f => f.classList.remove('active'));
        el.classList.add('active');
        currentFloor = id;
        updateFloorPlanBtn();
        focusOnFloor(id);
    });
    cont.appendChild(el);
}

function focusOnFloor(id) {
    let y;
    if (id === 'R') {
        y = CONFIG.PARKING * CONFIG.PARK_H + CONFIG.FLOORS * CONFIG.FLOOR_H + 1;
        updatePanel('Rooftop', 'Water Tanks & Services', 'Hanging lines, splash areas, and water storage');
    } else if (id.startsWith('P')) {
        const lv = parseInt(id.slice(1));
        y = (lv - 1) * CONFIG.PARK_H + CONFIG.PARK_H / 2;
        const cars = lv === 1 ? 66 : lv === 2 ? 69 : 74;
        updatePanel(`Parking Level ${lv}`, `${cars} Parking Spaces`, '3-level podium parking — 209 total capacity');
    } else {
        const f = parseInt(id);
        y = CONFIG.PARKING * CONFIG.PARK_H + (f - 1) * CONFIG.FLOOR_H + CONFIG.FLOOR_H / 2;
        const name = f <= 1 ? 'Reception & Lobby' : f === 2 ? 'Amenity Level' : `Floor ${f} — Residential`;
        const desc = f <= 1 ? 'Grand reception, coffee bar, concierge, studios' : f === 2 ? 'Gym, spa, entertainment, kids play, residential lounge' : 'Type A/C & B/D apartments — 5,300 sqft each';
        updatePanel(name, `Level ${f} of ${CONFIG.FLOORS}`, desc);
    }
    tgtPivot.set(0, y, 0);
    tgtDist = 65;
    tgtPitch = 0.12;
}

// ═══════════════════════════════════
//  FLOOR PLAN MAP BUTTON
// ═══════════════════════════════════
function setupFloorPlanBtn() {
    document.getElementById('fpMapBtn').addEventListener('click', () => {
        openFloorPlan();
    });
}

function updateFloorPlanBtn() {
    const btn = document.getElementById('fpMapBtn');
    const label = document.getElementById('fpMapLabel');
    if (currentFloor) {
        btn.classList.add('has-floor');
        label.textContent = currentFloor.startsWith('P') ? currentFloor : `F${currentFloor}`;
    } else {
        btn.classList.remove('has-floor');
        label.textContent = 'Plan';
    }
}

// ═══════════════════════════════════
//  FLOOR PLAN OVERLAY
// ═══════════════════════════════════
function openFloorPlan() {
    document.getElementById('floorPlanOverlay').classList.add('show');
    renderFloorPlan(activeFP);
}

function closeFloorPlan() {
    document.getElementById('floorPlanOverlay').classList.remove('show');
}

function setFPType(type) {
    activeFP = type;
    document.querySelectorAll('.fp-type-btn').forEach(b => b.classList.remove('on'));
    event.target.classList.add('on');
    renderFloorPlan(type);
    const names = { AC: 'Apartment Type A & C', BD: 'Apartment Type B & D', FULL: 'Full Floor — Both Types' };
    document.getElementById('fpName').textContent = names[type];
    document.getElementById('fpDesc').textContent = type === 'FULL'
        ? 'Complete floor showing 2 apartments per level'
        : '5,300 sq ft \u2022 3 Bedrooms + Master + Study + DSQ';
}

function getRoomsAC() {
    // Layout matches PDF: entry from left (core), living top, master upper-right,
    // bedrooms lower-right, service/DSQ lower-left
    return [
        // Row 1 — Living & Entertaining (top)
        { id: 'stair', name: 'Staircase', x: 2, y: 3, w: 8, h: 10, color: '#4a4a5a', sqft: 0 },
        { id: 'studio', name: 'Studio / Bar', x: 11, y: 3, w: 11, h: 10, color: '#6B4B5B', sqft: 216 },
        { id: 'dining', name: 'Dining', x: 23, y: 3, w: 15, h: 12, color: '#7B6345', sqft: 280 },
        { id: 'lounge', name: 'Lounge', x: 39, y: 3, w: 20, h: 12, color: '#8B7355', sqft: 420 },
        { id: 'terrace', name: 'Terrace', x: 60, y: 3, w: 18, h: 12, color: '#3B8B4B', sqft: 392 },
        // Row 2 — Core, Family, Master suite
        { id: 'lift', name: 'Lifts (Stretcher + 2)', x: 2, y: 14, w: 8, h: 10, color: '#4a4a5a', sqft: 0 },
        { id: 'void', name: 'Void', x: 11, y: 14, w: 8, h: 10, color: '#2a2a34', sqft: 0 },
        { id: 'family', name: 'Family Room', x: 23, y: 16, w: 15, h: 10, color: '#7B6B5B', sqft: 384 },
        { id: 'wic', name: 'Walk-in Closet', x: 39, y: 16, w: 12, h: 8, color: '#8B7B6B', sqft: 160 },
        { id: 'mbath', name: 'Master Bath', x: 52, y: 16, w: 8, h: 8, color: '#3B7B9B', sqft: 160 },
        { id: 'master', name: 'Master Bedroom', x: 60, y: 15, w: 18, h: 11, color: '#4B6B8B', sqft: 560 },
        // Bath corridor between WIC/M.Bath and bedrooms
        { id: 'bath1', name: 'Bath 01', x: 39, y: 24, w: 6, h: 2, color: '#3B7B9B', sqft: 36 },
        { id: 'bath2', name: 'Bath 02', x: 45, y: 24, w: 7, h: 2, color: '#3B7B9B', sqft: 36 },
        { id: 'bath3', name: 'Bath 03', x: 52, y: 24, w: 6, h: 2, color: '#3B7B9B', sqft: 36 },
        // Row 3 — Kitchen zone & bedrooms
        { id: 'kitchenette', name: 'Kitchenette', x: 2, y: 25, w: 8, h: 6, color: '#5B7B5B', sqft: 144 },
        { id: 'kitchen', name: 'Kitchen', x: 11, y: 25, w: 11, h: 9, color: '#5B8B5B', sqft: 200 },
        { id: 'pantry', name: 'Pantry', x: 23, y: 27, w: 8, h: 6, color: '#5B8B5B', sqft: 84 },
        { id: 'cloak', name: 'Cloak Room', x: 32, y: 27, w: 7, h: 6, color: '#7B7B6B', sqft: 96 },
        { id: 'bed1', name: 'Bedroom 01', x: 39, y: 26, w: 12, h: 10, color: '#4B6B7B', sqft: 240 },
        { id: 'bed2', name: 'Bedroom 02', x: 52, y: 26, w: 12, h: 10, color: '#4B6B7B', sqft: 240 },
        // Row 4 — Lower service & remaining bedrooms
        { id: 'yard', name: 'Yard', x: 2, y: 32, w: 8, h: 8, color: '#3B7B3B', sqft: 192 },
        { id: 'bed3', name: 'Bedroom 03', x: 39, y: 37, w: 12, h: 8, color: '#4B6B7B', sqft: 240 },
        { id: 'study', name: 'Study', x: 52, y: 37, w: 12, h: 8, color: '#6B5B4B', sqft: 240 },
        // Row 5 — DSQ
        { id: 'dsq1', name: 'DSQ 01', x: 2, y: 41, w: 9, h: 5, color: '#5B5B6B', sqft: 126 },
        { id: 'dsq2', name: 'DSQ 02', x: 12, y: 41, w: 9, h: 5, color: '#5B5B6B', sqft: 126 },
    ];
}

function getRoomsBD() {
    // Mirrored layout of Type A & C: core on RIGHT, terrace/master on LEFT
    return [
        // Row 1 — Living & Entertaining (top, mirrored)
        { id: 'terrace', name: 'Terrace', x: 2, y: 3, w: 18, h: 12, color: '#3B8B4B', sqft: 336 },
        { id: 'lounge', name: 'Lounge', x: 21, y: 3, w: 20, h: 12, color: '#8B7355', sqft: 420 },
        { id: 'dining', name: 'Dining', x: 42, y: 3, w: 15, h: 12, color: '#7B6345', sqft: 280 },
        { id: 'studio', name: 'Studio / Mini Bar', x: 58, y: 3, w: 11, h: 10, color: '#6B4B5B', sqft: 280 },
        { id: 'stair', name: 'Staircase', x: 70, y: 3, w: 8, h: 10, color: '#4a4a5a', sqft: 0 },
        // Row 2 — Core, Family, Master suite (mirrored)
        { id: 'master', name: 'Master Bedroom', x: 2, y: 15, w: 18, h: 11, color: '#4B6B8B', sqft: 560 },
        { id: 'mbath', name: 'Master Bath', x: 20, y: 16, w: 8, h: 8, color: '#3B7B9B', sqft: 160 },
        { id: 'wic', name: 'Walk-in Closet', x: 29, y: 16, w: 12, h: 8, color: '#8B7B6B', sqft: 160 },
        { id: 'family', name: 'Family Room', x: 42, y: 16, w: 15, h: 10, color: '#7B6B5B', sqft: 288 },
        { id: 'void', name: 'Void', x: 61, y: 14, w: 8, h: 10, color: '#2a2a34', sqft: 0 },
        { id: 'lift', name: 'Lifts (Stretcher + 2)', x: 70, y: 14, w: 8, h: 10, color: '#4a4a5a', sqft: 0 },
        // Bath corridor (mirrored)
        { id: 'bath1', name: 'Bath 01', x: 35, y: 24, w: 6, h: 2, color: '#3B7B9B', sqft: 36 },
        { id: 'bath2', name: 'Bath 02', x: 28, y: 24, w: 7, h: 2, color: '#3B7B9B', sqft: 36 },
        { id: 'bath3', name: 'Bath 03', x: 22, y: 24, w: 6, h: 2, color: '#3B7B9B', sqft: 36 },
        // Row 3 — Kitchen zone & bedrooms (mirrored)
        { id: 'bed1', name: 'Bedroom 01', x: 29, y: 26, w: 12, h: 10, color: '#4B6B7B', sqft: 240 },
        { id: 'bed2', name: 'Bedroom 02', x: 16, y: 26, w: 12, h: 10, color: '#4B6B7B', sqft: 240 },
        { id: 'cloak', name: 'Cloak Room', x: 41, y: 27, w: 7, h: 6, color: '#7B7B6B', sqft: 96 },
        { id: 'pantry', name: 'Pantry', x: 49, y: 27, w: 8, h: 6, color: '#5B8B5B', sqft: 96 },
        { id: 'kitchen', name: 'Kitchen', x: 58, y: 25, w: 11, h: 9, color: '#5B8B5B', sqft: 200 },
        { id: 'kitchenette', name: 'Kitchenette', x: 70, y: 25, w: 8, h: 6, color: '#5B7B5B', sqft: 168 },
        // Row 4 — Lower service & remaining bedrooms (mirrored)
        { id: 'bed3', name: 'Bedroom 03', x: 29, y: 37, w: 12, h: 8, color: '#4B6B7B', sqft: 240 },
        { id: 'study', name: 'Study', x: 16, y: 37, w: 12, h: 8, color: '#6B5B4B', sqft: 240 },
        { id: 'yard', name: 'Yard', x: 70, y: 32, w: 8, h: 8, color: '#3B7B3B', sqft: 224 },
        // Row 5 — DSQ (mirrored)
        { id: 'dsq1', name: 'DSQ 01', x: 69, y: 41, w: 9, h: 5, color: '#5B5B6B', sqft: 96 },
        { id: 'dsq2', name: 'DSQ 02', x: 59, y: 41, w: 9, h: 5, color: '#5B5B6B', sqft: 96 },
    ];
}

function renderFloorPlan(type) {
    let rooms;
    if (type === 'FULL') {
        const ac = getRoomsAC().map(r => ({ ...r, id: 'ac_' + r.id }));
        const bd = getRoomsBD().map(r => ({ ...r, id: 'bd_' + r.id, x: r.x, y: r.y + 48 }));
        rooms = [...ac, ...bd];
    } else if (type === 'BD') {
        rooms = getRoomsBD();
    } else {
        rooms = getRoomsAC();
    }

    const viewH = type === 'FULL' ? 98 : 52;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 82 ${viewH}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.width = '100%';
    svg.style.height = '100%';

    svg.appendChild(svgEl('rect', { x: 0, y: 0, width: 82, height: viewH, fill: '#0a0a14', rx: 1 }));

    const outline = type === 'FULL'
        ? `M3,2 L78,2 L80,8 L80,${viewH - 6} L78,${viewH - 2} L3,${viewH - 2} L2,${viewH - 8} L2,8 Z`
        : `M3,1.5 L78,1.5 L80,6 L80,${viewH - 4} L78,${viewH - 1.5} L3,${viewH - 1.5} L2,${viewH - 6} L2,6 Z`;
    svg.appendChild(svgEl('path', { d: outline, fill: 'none', stroke: '#c9a84c', 'stroke-width': 0.25, 'stroke-dasharray': '1.5,0.5' }));

    const titleText = type === 'FULL' ? 'FULL FLOOR — TYPE A/C (TOP) & TYPE B/D (BOTTOM)'
        : type === 'AC' ? 'APARTMENT TYPE A & C — 5,300 SQFT' : 'APARTMENT TYPE B & D — 5,300 SQFT';
    const title = svgEl('text', { x: 41, y: type === 'FULL' ? 1.2 : 1.4, 'text-anchor': 'middle', fill: '#c9a84c', 'font-size': '1.4', 'font-family': 'Cormorant Garamond, serif', 'font-weight': '600' });
    title.textContent = titleText;
    svg.appendChild(title);

    if (type === 'FULL') {
        svg.appendChild(svgEl('line', { x1: 5, y1: 48, x2: 77, y2: 48, stroke: '#c9a84c', 'stroke-width': 0.15, 'stroke-dasharray': '2,1' }));
        const labelA = svgEl('text', { x: 41, y: 2.5, 'text-anchor': 'middle', fill: '#6a6a78', 'font-size': '1', 'font-family': 'Outfit, sans-serif' });
        labelA.textContent = 'TYPE A & C';
        svg.appendChild(labelA);
        const labelB = svgEl('text', { x: 41, y: 50.5, 'text-anchor': 'middle', fill: '#6a6a78', 'font-size': '1', 'font-family': 'Outfit, sans-serif' });
        labelB.textContent = 'TYPE B & D';
        svg.appendChild(labelB);
    }

    rooms.forEach(room => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.style.cursor = 'pointer';
        g.addEventListener('mouseenter', () => highlightRoom(room.id));
        g.addEventListener('mouseleave', () => unhighlightRoom(room.id));

        const rect = svgEl('rect', {
            x: room.x, y: room.y, width: room.w, height: room.h,
            fill: room.color, 'fill-opacity': 0.22,
            stroke: room.color, 'stroke-width': 0.18,
            rx: 0.2, id: `room-${room.id}`,
        });
        g.appendChild(rect);

        if (room.w > 5 && room.h > 3.5) {
            const text = svgEl('text', {
                x: room.x + room.w / 2, y: room.y + room.h / 2 + 0.3,
                'text-anchor': 'middle', fill: '#e8e4dc', 'font-size': room.w > 12 ? '1.3' : '0.95',
                'font-family': 'Outfit, sans-serif', 'font-weight': '400',
            });
            text.textContent = room.name;
            g.appendChild(text);

            if (room.sqft > 0 && room.w > 8) {
                const dim = svgEl('text', {
                    x: room.x + room.w / 2, y: room.y + room.h / 2 + 1.8,
                    'text-anchor': 'middle', fill: '#6a6a78', 'font-size': '0.8',
                    'font-family': 'Outfit, sans-serif',
                });
                dim.textContent = `${room.sqft} sqft`;
                g.appendChild(dim);
            }
        }

        svg.appendChild(g);
    });

    const compass = svgEl('text', { x: 77, y: viewH - 2, fill: '#c9a84c', 'font-size': '1.8', 'font-family': 'serif', 'font-weight': 'bold' });
    compass.textContent = 'N\u2191';
    svg.appendChild(compass);

    const fpPlan = document.getElementById('fpPlan');
    fpPlan.innerHTML = '';
    fpPlan.appendChild(svg);

    const roomList = document.getElementById('roomList');
    roomList.innerHTML = '';
    const sizeRooms = rooms.filter(r => !['void', 'lift', 'stair'].includes(r.id.replace(/^(ac_|bd_)/, '')));
    sizeRooms.sort((a, b) => (b.sqft || 0) - (a.sqft || 0));
    sizeRooms.forEach(room => {
        const item = document.createElement('div');
        item.className = 'room-item';
        item.id = `rlist-${room.id}`;
        const label = room.sqft > 0 ? `${room.sqft} sqft` : '\u2014';
        item.innerHTML = `<span class="rname">${room.name}</span><span class="rsize">${label}</span>`;
        item.addEventListener('mouseenter', () => highlightRoom(room.id));
        item.addEventListener('mouseleave', () => unhighlightRoom(room.id));
        roomList.appendChild(item);
    });
}

function highlightRoom(id) {
    const rect = document.getElementById(`room-${id}`);
    if (rect) { rect.setAttribute('fill-opacity', '0.5'); rect.setAttribute('stroke-width', '0.4'); }
    const item = document.getElementById(`rlist-${id}`);
    if (item) item.classList.add('highlighted');
}

function unhighlightRoom(id) {
    const rect = document.getElementById(`room-${id}`);
    if (rect) { rect.setAttribute('fill-opacity', '0.22'); rect.setAttribute('stroke-width', '0.18'); }
    const item = document.getElementById(`rlist-${id}`);
    if (item) item.classList.remove('highlighted');
}

function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
}

// ═══════════════════════════════════
//  3D INTERIOR SCENES — Real Three.js
// ═══════════════════════════════════
const INTERIORS = {
    reception: {
        title: 'Grand Reception & Lobby',
        desc: 'Double-height entrance with marble floors, indoor greenery, and a signature coffee bar',
        cam: { angle: 0.3, pitch: 0.2, dist: 10, pivot: [0, 2, 0] },
        features: [
            { title: 'Marble Reception Desk', desc: 'Dark marble with brass accents and ambient LED lighting' },
            { title: 'Coffee Shop / Bar', desc: 'Artisanal coffee bar with display shelving and warm finishes' },
            { title: 'Indoor Garden Atrium', desc: 'Full-height trees in brass planters, natural light' },
            { title: 'Concierge & Lounge', desc: 'Seated lounge area with designer furniture' },
        ]
    },
    apartment: {
        title: 'Living & Lounge',
        desc: 'Open-plan lounge flowing into dining, with panoramic glazing and terrace access',
        cam: { angle: 0.5, pitch: 0.25, dist: 9, pivot: [0, 1.5, 0] },
        features: [
            { title: 'Open-Plan Lounge (420 sqft)', desc: 'Floor-to-ceiling windows, engineered hardwood, terrace access' },
            { title: 'Dining Area (280 sqft)', desc: 'Adjoining the lounge with views through to the kitchen' },
            { title: 'Family Room (384 sqft)', desc: 'Secondary living space connecting lounge to bedrooms' },
            { title: 'Private Terrace', desc: 'Glass-railed balcony with River Mathira views' },
        ]
    },
    master: {
        title: 'Master Suite',
        desc: 'Expansive 560 sqft master bedroom with ensuite bath and walk-in closet',
        cam: { angle: -0.2, pitch: 0.2, dist: 8, pivot: [0, 1.4, 0] },
        features: [
            { title: 'Master Bedroom (560 sqft)', desc: 'King suite with ambient lighting and wall panels' },
            { title: 'Master Bath (160 sqft)', desc: 'Freestanding tub, rain shower, double vanity' },
            { title: 'Walk-in Closet (160 sqft)', desc: 'Custom cabinetry with integrated lighting' },
            { title: 'Ensuite Study', desc: 'Adjacent space convertible to office or nursery' },
        ]
    },
    kitchen: {
        title: 'Kitchen & Pantry',
        desc: 'Chef-grade kitchen with island, pantry, and separate DSQ kitchenette',
        cam: { angle: 0.4, pitch: 0.3, dist: 8, pivot: [0, 1.5, 0] },
        features: [
            { title: 'Main Kitchen (200 sqft)', desc: 'Quartz countertops, built-in appliances, island prep' },
            { title: 'Pantry (84 sqft)', desc: 'Walk-in pantry with floor-to-ceiling shelving' },
            { title: 'DSQ Kitchenette', desc: 'Separate kitchenette for domestic staff' },
            { title: 'Yard & Service Area', desc: 'Enclosed yard for laundry and service access' },
        ]
    },
    gym: {
        title: 'Gymnasium & Spa',
        desc: 'Full-service fitness center with separate facilities and wellness areas',
        cam: { angle: 0.3, pitch: 0.2, dist: 12, pivot: [0, 1.8, 0] },
        features: [
            { title: 'Main Gym Floor', desc: 'Cardio and weights with floor-to-ceiling glass' },
            { title: 'Male & Female Facilities', desc: 'Separate locker rooms with showers' },
            { title: 'Spa & Wellness Zone', desc: 'Treatment rooms, sauna, relaxation areas' },
            { title: 'Equipment', desc: 'Professional machines, free weights, functional training' },
        ]
    },
    pool: {
        title: 'Swimming Pool & Terrace',
        desc: 'Ground-level infinity pool with sun deck and landscaped gardens',
        cam: { angle: 0.6, pitch: 0.35, dist: 14, pivot: [0, 1, 0] },
        features: [
            { title: 'Infinity Pool', desc: 'Hexagonal pool with infinity edge and lighting' },
            { title: 'Sun Deck', desc: 'Loungers and poolside service on stone decking' },
            { title: 'Garden Setting', desc: 'Mature trees and paths creating a resort atmosphere' },
            { title: 'River Views', desc: 'Views of River Mathira and surrounding canopy' },
        ]
    },
    entertainment: {
        title: 'Entertainment & Lounge',
        desc: 'Residents-only area with bar, curved lounge seating, and terrace',
        cam: { angle: 0.2, pitch: 0.15, dist: 10, pivot: [0, 1.5, 0] },
        features: [
            { title: 'Residential Lounge', desc: 'Curved designer seating, ambient lighting, art' },
            { title: 'Bar & Pantry', desc: 'Fully equipped bar with wine storage and display' },
            { title: "Kids' Play Area", desc: 'Secure indoor/outdoor play zones' },
            { title: 'Outdoor Terrace', desc: 'Covered terrace with gazebo seating' },
        ]
    }
};

function setupInteriorTabs() {
    document.querySelectorAll('.int-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const room = btn.dataset.room;
            document.querySelectorAll('.int-tab').forEach(t => t.classList.remove('on'));
            btn.classList.add('on');
            switchInterior(room);
        });
    });
}

function openInterior() {
    document.getElementById('interiorOverlay').classList.add('show');
    setTimeout(() => {
        initInteriorRenderer();
        switchInterior('reception');
        document.getElementById('intOrbitHint').classList.remove('fade');
        setTimeout(() => document.getElementById('intOrbitHint').classList.add('fade'), 4000);
    }, 100);
}

function closeInterior() {
    document.getElementById('interiorOverlay').classList.remove('show');
    destroyInteriorRenderer();
}

function initInteriorRenderer() {
    if (intRenderer) return;
    const vp = document.getElementById('intViewport');
    intScene = new THREE.Scene();
    intClock = new THREE.Clock();
    intCamera = new THREE.PerspectiveCamera(50, vp.clientWidth / vp.clientHeight, 0.1, 100);
    intRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    intRenderer.setSize(vp.clientWidth, vp.clientHeight);
    intRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    intRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    intRenderer.toneMappingExposure = 1.0;
    intRenderer.outputEncoding = THREE.sRGBEncoding;
    intRenderer.shadowMap.enabled = true;
    intRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    vp.appendChild(intRenderer.domElement);

    // Interior mouse events
    const el = intRenderer.domElement;
    el.addEventListener('mousedown', e => { intDragging = true; intPrevMX = e.clientX; intPrevMY = e.clientY; });
    el.addEventListener('mousemove', e => {
        if (!intDragging) return;
        intTgtAngle -= (e.clientX - intPrevMX) * 0.006;
        intTgtPitch = Math.max(-0.3, Math.min(0.8, intTgtPitch + (e.clientY - intPrevMY) * 0.006));
        intPrevMX = e.clientX; intPrevMY = e.clientY;
    });
    el.addEventListener('mouseup', () => intDragging = false);
    el.addEventListener('mouseleave', () => intDragging = false);
    el.addEventListener('wheel', e => {
        intTgtDist = Math.max(3, Math.min(20, intTgtDist + e.deltaY * 0.025));
    });

    // Touch
    el.addEventListener('touchstart', e => {
        e.preventDefault();
        if (e.touches.length === 1) { intDragging = true; intPrevMX = e.touches[0].clientX; intPrevMY = e.touches[0].clientY; }
    }, { passive: false });
    el.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && intDragging) {
            intTgtAngle -= (e.touches[0].clientX - intPrevMX) * 0.006;
            intTgtPitch = Math.max(-0.3, Math.min(0.8, intTgtPitch + (e.touches[0].clientY - intPrevMY) * 0.006));
            intPrevMX = e.touches[0].clientX; intPrevMY = e.touches[0].clientY;
        }
    }, { passive: false });
    el.addEventListener('touchend', () => intDragging = false);

    intAnimId = requestAnimationFrame(animateInterior);
}

function destroyInteriorRenderer() {
    if (intAnimId) cancelAnimationFrame(intAnimId);
    intAnimId = null;
    if (intRenderer) {
        intRenderer.dispose();
        const vp = document.getElementById('intViewport');
        if (intRenderer.domElement.parentNode === vp) vp.removeChild(intRenderer.domElement);
        intRenderer = null;
    }
    intScene = null;
    intCamera = null;
}

function switchInterior(room) {
    currentInterior = room;
    const data = INTERIORS[room];

    // Reset camera
    const cam = data.cam;
    intTgtAngle = intAngle = cam.angle;
    intTgtPitch = intPitch = cam.pitch;
    intTgtDist = intDist = cam.dist;
    intPivot.set(cam.pivot[0], cam.pivot[1], cam.pivot[2]);

    // Update info
    document.getElementById('intInfoTitle').textContent = data.title;
    document.getElementById('intInfoDesc').textContent = data.desc;

    const featCont = document.getElementById('intFeatures');
    featCont.innerHTML = '';
    data.features.forEach(f => {
        const card = document.createElement('div');
        card.className = 'int-feat-card';
        card.innerHTML = `<h4>${f.title}</h4><p>${f.desc}</p>`;
        featCont.appendChild(card);
    });

    // Build the 3D scene for this room
    if (intScene) {
        while (intScene.children.length) intScene.remove(intScene.children[0]);
        buildInteriorRoom(room);
    }
}

function buildInteriorRoom(room) {
    // Common: ambient + hemisphere
    intScene.add(new THREE.AmbientLight(0x404050, 0.5));
    intScene.add(new THREE.HemisphereLight(0x8899aa, 0x443322, 0.4));

    switch (room) {
        case 'reception': buildReceptionRoom(); break;
        case 'apartment': buildApartmentRoom(); break;
        case 'master': buildMasterRoom(); break;
        case 'kitchen': buildKitchenRoom(); break;
        case 'gym': buildGymRoom(); break;
        case 'pool': buildPoolRoom(); break;
        case 'entertainment': buildEntertainmentRoom(); break;
    }
}

// ─── Interior Room Builders ───
function intMat(color, rough, metal) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough !== undefined ? rough : 0.8, metalness: metal || 0 });
}

function addWallLight(scene, x, y, z, color) {
    const light = new THREE.PointLight(color || 0xffe8c0, 0.6, 8);
    light.position.set(x, y, z);
    scene.add(light);
    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.05),
        new THREE.MeshStandardMaterial({ color: 0xffe8c0, emissive: 0xffe8c0, emissiveIntensity: 2 })
    );
    glow.position.copy(light.position);
    scene.add(glow);
}

function buildReceptionRoom() {
    const s = intScene;
    // Key light
    const keyLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    keyLight.position.set(3, 5, 2);
    keyLight.castShadow = true;
    s.add(keyLight);

    // Floor — dark marble
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), intMat(0x1a1a22, 0.15, 0.3));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), intMat(0x121218, 0.9));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 4.5;
    s.add(ceil);

    // Back wall
    const bwall = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.5), intMat(0x1e1e28, 0.7));
    bwall.position.set(0, 2.25, -5);
    s.add(bwall);

    // Side walls
    for (let side = -1; side <= 1; side += 2) {
        const sw = new THREE.Mesh(new THREE.PlaneGeometry(10, 4.5), intMat(0x1e1e28, 0.7));
        sw.rotation.y = -side * Math.PI / 2;
        sw.position.set(side * 7, 2.25, 0);
        s.add(sw);
    }

    // Glass windows (front) — sky view
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x4477aa, roughness: 0.05, metalness: 0.8, transparent: true, opacity: 0.25 });
    for (let i = -2; i <= 2; i++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.5), windowMat);
        win.position.set(i * 2.6, 2, 5);
        win.rotation.y = Math.PI;
        s.add(win);
        // Mullion
        const mull = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.5, 0.05), intMat(0x444444, 0.2, 0.9));
        mull.position.set(i * 2.6 + 1.1, 2, 4.98);
        s.add(mull);
    }

    // Ceiling gold LED strip
    const strip = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.02, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xc9a84c, emissive: 0xc9a84c, emissiveIntensity: 1.5 })
    );
    strip.position.set(0, 4.48, 0);
    s.add(strip);
    const strip2 = strip.clone();
    strip2.position.z = -2;
    s.add(strip2);

    // Reception desk — curved dark marble
    const deskGeo = new THREE.CylinderGeometry(1.8, 1.8, 1.1, 16, 1, false, 0, Math.PI);
    const desk = new THREE.Mesh(deskGeo, intMat(0x2a2530, 0.15, 0.2));
    desk.position.set(0, 0.55, -2);
    desk.castShadow = true;
    s.add(desk);
    // Gold edge on desk
    const deskEdge = new THREE.Mesh(
        new THREE.TorusGeometry(1.8, 0.03, 8, 16, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xc9a84c, metalness: 0.9, roughness: 0.2 })
    );
    deskEdge.position.set(0, 1.1, -2);
    deskEdge.rotation.x = Math.PI / 2;
    s.add(deskEdge);

    // Indoor trees
    for (let side = -1; side <= 1; side += 2) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 2.5, 6), intMat(0x5a4030));
        trunk.position.set(side * 4.5, 1.25, -3);
        trunk.castShadow = true;
        s.add(trunk);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a5a2a, roughness: 0.85 });
        for (let j = 0; j < 4; j++) {
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.5 + Math.random() * 0.3, 6, 4), leafMat);
            leaf.position.set(side * 4.5 + (Math.random() - 0.5) * 0.5, 2.8 + Math.random() * 0.8, -3 + (Math.random() - 0.5) * 0.5);
            s.add(leaf);
        }
        // Brass planter
        const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.4, 8), intMat(0x8a6d2b, 0.3, 0.7));
        planter.position.set(side * 4.5, 0.2, -3);
        s.add(planter);
    }

    // Lounge seating
    for (let side = -1; side <= 1; side += 2) {
        const sofa = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 0.8), intMat(0x5a4a3a));
        sofa.position.set(side * 3.5, 0.4, 1);
        sofa.castShadow = true;
        s.add(sofa);
        const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.15), intMat(0x5a4a3a));
        back.position.set(side * 3.5, 0.7, 0.6);
        s.add(back);
    }

    // Coffee table
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 16), intMat(0x3a3028, 0.3, 0.4));
    table.position.set(0, 0.45, 1);
    s.add(table);
    const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6), intMat(0x444444, 0.2, 0.9));
    tableLeg.position.set(0, 0.22, 1);
    s.add(tableLeg);

    // Wall lights
    addWallLight(s, -6.9, 3, -2, 0xffe8c0);
    addWallLight(s, 6.9, 3, -2, 0xffe8c0);
    addWallLight(s, 0, 3.5, -4.9, 0xffe8c0);

    // Overhead spotlight
    const spot = new THREE.SpotLight(0xfff0d0, 0.8, 8, 0.5, 0.5);
    spot.position.set(0, 4.4, -2);
    spot.target.position.set(0, 0, -2);
    s.add(spot);
    s.add(spot.target);
}

function buildApartmentRoom() {
    const s = intScene;
    const keyLight = new THREE.DirectionalLight(0xffeedd, 0.9);
    keyLight.position.set(4, 5, 3);
    keyLight.castShadow = true;
    s.add(keyLight);

    // Floor — engineered hardwood
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), intMat(0x3a3020, 0.7));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), intMat(0x151520, 0.9));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 3.3;
    s.add(ceil);

    // Recessed ceiling lights
    [[-2, 0], [0, -1], [2, 0]].forEach(([x, z]) => {
        const light = new THREE.PointLight(0xfff8e0, 0.5, 5);
        light.position.set(x, 3.2, z);
        s.add(light);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshStandardMaterial({ emissive: 0xfff8e0, emissiveIntensity: 3 }));
        bulb.position.copy(light.position);
        s.add(bulb);
    });

    // Back wall
    const bwall = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.3), intMat(0x1a1a24, 0.7));
    bwall.position.set(0, 1.65, -4);
    s.add(bwall);

    // Side wall with art
    const swall = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.3), intMat(0x1a1a24, 0.7));
    swall.rotation.y = Math.PI / 2;
    swall.position.set(-6, 1.65, 0);
    s.add(swall);

    // Art frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 1.6), intMat(0x2a2a34, 0.5));
    frame.position.set(-5.95, 2, 0);
    s.add(frame);
    const art = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1, 1.4), intMat(0x1a3a4a, 0.6));
    art.position.set(-5.93, 2, 0);
    s.add(art);

    // Full-height windows (right)
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x4477aa, roughness: 0.05, metalness: 0.7, transparent: true, opacity: 0.2 });
    for (let i = -1; i <= 1; i++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3), windowMat);
        win.rotation.y = -Math.PI / 2;
        win.position.set(6, 1.65, i * 2.5);
        s.add(win);
    }

    // L-shaped sofa
    const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.35, 1.2), intMat(0x4a3a28));
    sofaSeat.position.set(-1, 0.35, 0.5);
    sofaSeat.castShadow = true;
    s.add(sofaSeat);
    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.6, 0.15), intMat(0x4a3a28));
    sofaBack.position.set(-1, 0.7, -0.1);
    s.add(sofaBack);
    const sofaArm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 1.2), intMat(0x4a3a28));
    sofaArm.position.set(1.15, 0.35, -0.5);
    sofaArm.rotation.y = Math.PI / 2;
    s.add(sofaArm);

    // Cushions
    [[-1.8, 0x6a5a44], [-0.8, 0x7a6a50], [0.2, 0x6a5a44]].forEach(([x, c]) => {
        const cush = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.4), intMat(c));
        cush.position.set(x, 0.58, 0.5);
        s.add(cush);
    });

    // Coffee table
    const ctTop = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 16), intMat(0x3a3028, 0.3));
    ctTop.position.set(-1, 0.42, 2);
    s.add(ctTop);
    const ctLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.4, 6), intMat(0x444444, 0.2, 0.9));
    ctLeg.position.set(-1, 0.2, 2);
    s.add(ctLeg);

    // Plant
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1), intMat(0x5a4030));
    trunk.position.set(4, 0.5, -2);
    s.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 4), intMat(0x2a5a2a));
    leaves.position.set(4, 1.2, -2);
    s.add(leaves);

    // Floor lamp
    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6), intMat(0x555555, 0.2, 0.8));
    lampPole.position.set(-4, 0.8, 1);
    s.add(lampPole);
    const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.15, 12), intMat(0x333333));
    lampShade.position.set(-4, 1.6, 1);
    s.add(lampShade);
    addWallLight(s, -4, 1.55, 1, 0xfff8e0);
}

function buildMasterRoom() {
    const s = intScene;
    const keyLight = new THREE.DirectionalLight(0xffeedd, 0.6);
    keyLight.position.set(2, 4, 3);
    s.add(keyLight);

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), intMat(0x2a2520, 0.7));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), intMat(0x121218, 0.9));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 3.3;
    s.add(ceil);

    // Back wall panel
    const wallPanel = new THREE.Mesh(new THREE.BoxGeometry(5, 2.8, 0.1), intMat(0x222232, 0.6));
    wallPanel.position.set(0, 1.6, -3.95);
    s.add(wallPanel);

    // LED strip behind panel
    const ledStrip = new THREE.Mesh(
        new THREE.BoxGeometry(5, 0.02, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xc9a84c, emissive: 0xc9a84c, emissiveIntensity: 2 })
    );
    ledStrip.position.set(0, 3.05, -3.94);
    s.add(ledStrip);
    // Side LEDs
    for (let side = -1; side <= 1; side += 2) {
        const sled = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 2.8, 0.02),
            new THREE.MeshStandardMaterial({ color: 0xc9a84c, emissive: 0xc9a84c, emissiveIntensity: 1 })
        );
        sled.position.set(side * 2.5, 1.6, -3.94);
        s.add(sled);
    }

    // Side walls
    for (let side = -1; side <= 1; side += 2) {
        const sw = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.3), intMat(0x1e1e28, 0.7));
        sw.rotation.y = -side * Math.PI / 2;
        sw.position.set(side * 5, 1.65, 0);
        s.add(sw);
    }

    // Window
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x3a5a7a, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.2 });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.8), windowMat);
    win.position.set(0, 1.65, 4);
    win.rotation.y = Math.PI;
    s.add(win);

    // Curtains
    for (let side = -1; side <= 1; side += 2) {
        const curtain = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.05), intMat(0x3a3540, 0.8));
        curtain.position.set(side * 2.3, 1.5, 3.97);
        s.add(curtain);
    }

    // Bed — headboard
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 0.15), intMat(0x4a4035));
    headboard.position.set(0, 1.3, -3.3);
    s.add(headboard);

    // Bed frame
    const bed = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 2.4), intMat(0xf0e8d8, 0.6));
    bed.position.set(0, 0.55, -2);
    bed.castShadow = true;
    s.add(bed);

    // Pillows
    [[-0.7, 0xe0d8c8], [0, 0xe0d8c8], [0.7, 0xd8d0c0]].forEach(([x, c]) => {
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.35), intMat(c, 0.6));
        pillow.position.set(x, 0.75, -2.8);
        s.add(pillow);
    });

    // Throw
    const throwBlanket = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 0.5), intMat(0x8a7a60));
    throwBlanket.position.set(0, 0.72, -1.2);
    s.add(throwBlanket);

    // Bedside tables + lamps
    for (let side = -1; side <= 1; side += 2) {
        const bst = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.4), intMat(0x2a2520));
        bst.position.set(side * 2.2, 0.25, -2.8);
        s.add(bst);
        addWallLight(s, side * 2.2, 0.8, -2.8, 0xffe8c0);
    }

    // Pendant light
    const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), intMat(0x333333));
    pendant.position.set(0, 2.8, -1);
    s.add(pendant);
    const pLight = new THREE.PointLight(0xfff8e0, 0.4, 5);
    pLight.position.set(0, 2.6, -1);
    s.add(pLight);
}

function buildKitchenRoom() {
    const s = intScene;
    const keyLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    keyLight.position.set(2, 5, 2);
    keyLight.castShadow = true;
    s.add(keyLight);

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), intMat(0x2a2520, 0.6));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), intMat(0x151520, 0.9));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 3.3;
    s.add(ceil);

    // Back wall with cabinets
    const bwall = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.3), intMat(0x1a1a24, 0.7));
    bwall.position.set(0, 1.65, -4);
    s.add(bwall);

    // Upper cabinets
    for (let i = -2; i <= 1; i++) {
        const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.5), intMat(0x2a2a36, 0.5));
        cab.position.set(i * 1.8, 2.6, -3.7);
        s.add(cab);
        // Handle
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.02), intMat(0xc9a84c, 0.2, 0.9));
        handle.position.set(i * 1.8, 2.5, -3.4);
        s.add(handle);
    }

    // Under-cabinet LED
    const ucLed = new THREE.Mesh(
        new THREE.BoxGeometry(7, 0.02, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xc9a84c, emissive: 0xc9a84c, emissiveIntensity: 2 })
    );
    ucLed.position.set(-0.5, 2, -3.65);
    s.add(ucLed);

    // Countertop
    const counter = new THREE.Mesh(new THREE.BoxGeometry(8, 0.08, 0.7), intMat(0xe8e4dc, 0.2, 0.1));
    counter.position.set(-0.5, 0.92, -3.5);
    s.add(counter);

    // Base cabinets
    const baseCab = new THREE.Mesh(new THREE.BoxGeometry(8, 0.88, 0.65), intMat(0x2a2a36, 0.5));
    baseCab.position.set(-0.5, 0.44, -3.5);
    s.add(baseCab);

    // Sink
    const sink = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.4), intMat(0xb8b4ac, 0.1, 0.5));
    sink.position.set(1.5, 0.94, -3.5);
    s.add(sink);

    // Cooktop
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
            const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.01, 12), intMat(0x333333, 0.3, 0.5));
            burner.position.set(-1.5 + c * 0.4, 0.96, -3.5 + r * 0.3 - 0.15);
            s.add(burner);
        }
    }

    // Island
    const island = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.92, 1), intMat(0x2a2a34));
    island.position.set(0, 0.46, -0.5);
    island.castShadow = true;
    s.add(island);
    const islandTop = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.06, 1.1), intMat(0xe0dcd4, 0.15, 0.1));
    islandTop.position.set(0, 0.95, -0.5);
    s.add(islandTop);

    // Stools
    for (let i = -1; i <= 1; i++) {
        const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 10), intMat(0x4a3a28));
        stoolSeat.position.set(i * 1, 0.72, 0.3);
        s.add(stoolSeat);
        const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), intMat(0x555555, 0.2, 0.8));
        stoolLeg.position.set(i * 1, 0.35, 0.3);
        s.add(stoolLeg);
    }

    // Pendant lights
    for (let i = -1; i <= 1; i += 2) {
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.5, 4), intMat(0x555555));
        wire.position.set(i * 0.8, 2.55, -0.5);
        s.add(wire);
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.12, 12), intMat(0x2a2520));
        shade.position.set(i * 0.8, 1.8, -0.5);
        s.add(shade);
        addWallLight(s, i * 0.8, 1.75, -0.5, 0xfff8e0);
    }

    // Pantry doorway
    const pantryDoor = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.6), intMat(0x181822));
    pantryDoor.rotation.y = -Math.PI / 2;
    pantryDoor.position.set(5, 1.3, -2);
    s.add(pantryDoor);
}

function buildGymRoom() {
    const s = intScene;
    const keyLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    keyLight.position.set(5, 6, 3);
    keyLight.castShadow = true;
    s.add(keyLight);

    // Rubberized floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), intMat(0x2a2a24, 0.9));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);

    // Ceiling with organic curved elements
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), intMat(0x181822, 0.9));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 4;
    s.add(ceil);

    // Ceiling gold accent curve
    const curvePts = [];
    for (let i = 0; i <= 20; i++) {
        const t = (i / 20) * Math.PI;
        curvePts.push(new THREE.Vector3(-6 + i * 0.6, 3.9, Math.sin(t) * 0.5 - 2));
    }
    const curvePath = new THREE.CatmullRomCurve3(curvePts);
    const curveGeo = new THREE.TubeGeometry(curvePath, 20, 0.03, 6, false);
    const curveMesh = new THREE.Mesh(curveGeo, new THREE.MeshStandardMaterial({ color: 0xc9a84c, emissive: 0xc9a84c, emissiveIntensity: 0.8 }));
    s.add(curveMesh);

    // Glass wall (front)
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x3a5a7a, roughness: 0.05, metalness: 0.7, transparent: true, opacity: 0.15 });
    const glassWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 3.5), windowMat);
    glassWall.position.set(0, 2, 5);
    glassWall.rotation.y = Math.PI;
    s.add(glassWall);
    // Mullions
    for (let i = -4; i <= 4; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.5, 0.05), intMat(0x444444, 0.2, 0.9));
        m.position.set(i * 2, 2, 4.98);
        s.add(m);
    }

    // Treadmills
    for (let i = -1; i <= 1; i++) {
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 1.5), intMat(0x333333, 0.3));
        base.position.set(i * 2.5, 0.6, 2);
        base.castShadow = true;
        s.add(base);
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.05), intMat(0x1a3a4a, 0.3, 0.5));
        screen.position.set(i * 2.5, 1.4, 1.3);
        s.add(screen);
        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 1.2), intMat(0x222222));
        belt.position.set(i * 2.5, 0.15, 2);
        s.add(belt);
    }

    // Weight rack
    const rack = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 0.3), intMat(0x444444, 0.3, 0.5));
    rack.position.set(5, 0.9, -3);
    s.add(rack);
    // Dumbbells on rack
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
            const db = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.25), intMat(0x333333, 0.4, 0.6));
            db.position.set(4.4 + c * 0.4, 0.3 + r * 0.5, -3);
            s.add(db);
        }
    }

    // Bench
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.5), intMat(0x2a2a34));
    bench.position.set(2, 0.5, -3);
    s.add(bench);
    for (let side = -1; side <= 1; side += 2) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), intMat(0x444444, 0.2, 0.8));
        leg.position.set(2 + side * 0.6, 0.25, -3);
        s.add(leg);
    }

    // Plant
    const plant = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 4), intMat(0x2a5a2a));
    plant.position.set(-6, 1.5, -3);
    s.add(plant);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8), intMat(0x5a4030));
    pot.position.set(-6, 1, -3);
    s.add(pot);

    // Overhead lighting
    for (let i = -2; i <= 2; i++) {
        const light = new THREE.PointLight(0xfff8e0, 0.4, 6);
        light.position.set(i * 3, 3.8, 0);
        s.add(light);
    }
}

function buildPoolRoom() {
    const s = intScene;
    // Outdoor scene — sky dome
    const skyGeo = new THREE.SphereGeometry(50, 16, 12);
    const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        vertexShader: `varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec3 vPos;void main(){float h=normalize(vPos).y;vec3 col=mix(vec3(.5,.7,.9),vec3(.25,.45,.7),max(h,0.));gl_FragColor=vec4(col,1.);}`
    });
    s.add(new THREE.Mesh(skyGeo, skyMat));

    const sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    sunLight.position.set(10, 15, 8);
    sunLight.castShadow = true;
    s.add(sunLight);

    // Ground/deck
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), intMat(0xc8b898, 0.5));
    deck.rotation.x = -Math.PI / 2;
    deck.receiveShadow = true;
    s.add(deck);

    // Pool — hexagonal
    const poolShape = new THREE.Shape();
    poolShape.moveTo(-2.5, -2);
    poolShape.lineTo(2, -2);
    poolShape.lineTo(3, -0.5);
    poolShape.lineTo(2.5, 2);
    poolShape.lineTo(-1.5, 2);
    poolShape.lineTo(-3, 0.5);
    poolShape.closePath();
    const poolGeo = new THREE.ExtrudeGeometry(poolShape, { depth: 0.6, bevelEnabled: false });
    const poolMesh = new THREE.Mesh(poolGeo, intMat(0x1a6688, 0.1, 0.3));
    poolMesh.rotation.x = -Math.PI / 2;
    poolMesh.position.set(0, 0.05, 0);
    s.add(poolMesh);

    // Water surface
    const water = new THREE.Mesh(
        new THREE.PlaneGeometry(5.5, 4),
        new THREE.MeshStandardMaterial({ color: 0x0e8fbb, roughness: 0.0, metalness: 0.5, transparent: true, opacity: 0.65 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.6, 0);
    s.add(water);

    // Loungers
    for (let i = 0; i < 2; i++) {
        const lounger = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 2), intMat(0x8a7a60));
        lounger.position.set(5 + i * 1.2, 0.35, 1);
        lounger.castShadow = true;
        s.add(lounger);
        const headRest = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.5), intMat(0x8a7a60));
        headRest.position.set(5 + i * 1.2, 0.45, -0.3);
        headRest.rotation.x = -0.3;
        s.add(headRest);
    }

    // Parasol
    const parasol = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.5, 6), intMat(0x555555, 0.3, 0.5));
    parasol.position.set(5.5, 1.25, 1);
    s.add(parasol);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.3, 8), intMat(0xd8d0c0, 0.7));
    shade.position.set(5.5, 2.5, 1);
    s.add(shade);

    // Trees
    for (let i = 0; i < 3; i++) {
        const angle = i * Math.PI * 0.4 - 0.3;
        const r = 7 + i * 1.5;
        const tx = Math.cos(angle) * r, tz = Math.sin(angle) * r;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 2), intMat(0x5a4030));
        trunk.position.set(tx, 1, tz);
        s.add(trunk);
        const lc = new THREE.Color().setHSL(0.28 + Math.random() * 0.05, 0.5, 0.22);
        for (let j = 0; j < 3; j++) {
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.6 + Math.random() * 0.4, 6, 4), new THREE.MeshStandardMaterial({ color: lc, roughness: 0.85 }));
            leaf.position.set(tx + (Math.random() - 0.5) * 0.5, 2.3 + Math.random() * 0.5, tz + (Math.random() - 0.5) * 0.5);
            s.add(leaf);
        }
    }

    // Tower backdrop silhouettes
    for (let side = -1; side <= 1; side += 2) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(2, 12, 4), intMat(0xc4b29a, 0.6, 0.05));
        tower.position.set(side * 4, 6, -7);
        s.add(tower);
        // Balcony lines
        for (let f = 0; f < 8; f++) {
            const bal = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 4.2), intMat(0xb8a880, 0.5));
            bal.position.set(side * 4, 1 + f * 1.3, -7);
            s.add(bal);
        }
    }

    // Grass edges
    for (let side = -1; side <= 1; side += 2) {
        const grass = new THREE.Mesh(new THREE.PlaneGeometry(4, 16), intMat(0x3d7a35, 0.95));
        grass.rotation.x = -Math.PI / 2;
        grass.position.set(side * 8, 0.01, 0);
        s.add(grass);
    }
}

function buildEntertainmentRoom() {
    const s = intScene;
    const keyLight = new THREE.DirectionalLight(0xffeedd, 0.6);
    keyLight.position.set(3, 5, 2);
    s.add(keyLight);

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), intMat(0x2a2520, 0.7));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), intMat(0x151520, 0.9));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 3.5;
    s.add(ceil);

    // Organic ceiling light curve
    const curvePts = [];
    for (let i = 0; i <= 20; i++) {
        const t = (i / 20) * Math.PI * 1.5;
        curvePts.push(new THREE.Vector3(-4 + i * 0.4, 3.45, Math.sin(t) * 1.5));
    }
    const curvePath = new THREE.CatmullRomCurve3(curvePts);
    const curveGeo = new THREE.TubeGeometry(curvePath, 20, 0.03, 6, false);
    s.add(new THREE.Mesh(curveGeo, new THREE.MeshStandardMaterial({ color: 0xfff8e0, emissive: 0xfff8e0, emissiveIntensity: 1 })));

    // Glass back wall
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x3a5a7a, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.15 });
    const glassWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), windowMat);
    glassWall.position.set(0, 1.65, -5);
    s.add(glassWall);

    // Curved sofa (the signature piece)
    const sofaPoints = [];
    for (let i = 0; i <= 12; i++) {
        const angle = (i / 12) * Math.PI - Math.PI / 2;
        sofaPoints.push(new THREE.Vector3(Math.cos(angle) * 2.5, 0, Math.sin(angle) * 2.5 + 1));
    }
    const sofaCurve = new THREE.CatmullRomCurve3(sofaPoints);
    const sofaGeo = new THREE.TubeGeometry(sofaCurve, 20, 0.3, 8, false);
    const sofa = new THREE.Mesh(sofaGeo, intMat(0x5a4a35));
    sofa.position.y = 0.3;
    sofa.castShadow = true;
    s.add(sofa);

    // Sofa seat cushion (flat)
    const seatShape = new THREE.Shape();
    for (let i = 0; i <= 20; i++) {
        const angle = (i / 20) * Math.PI - Math.PI / 2;
        const x = Math.cos(angle) * 2.3;
        const z = Math.sin(angle) * 2.3 + 1;
        if (i === 0) seatShape.moveTo(x, z);
        else seatShape.lineTo(x, z);
    }
    const seatGeo = new THREE.ExtrudeGeometry(seatShape, { depth: 0.15, bevelEnabled: false });
    const seat = new THREE.Mesh(seatGeo, intMat(0x4a3a28));
    seat.rotation.x = -Math.PI / 2;
    seat.position.y = 0.35;
    s.add(seat);

    // Round coffee table
    const ct = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 16), intMat(0x3a3028, 0.3, 0.4));
    ct.position.set(0, 0.4, 1);
    s.add(ct);
    const ctLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.38, 6), intMat(0x444444, 0.2, 0.9));
    ctLeg.position.set(0, 0.19, 1);
    s.add(ctLeg);

    // Bar area (right side)
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 3.5), intMat(0x2a2530));
    bar.position.set(5, 0.55, -1);
    bar.castShadow = true;
    s.add(bar);
    // Gold edge
    const barEdge = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.03, 3.55), intMat(0xc9a84c, 0.2, 0.9));
    barEdge.position.set(5, 1.12, -1);
    s.add(barEdge);

    // Shelves behind bar
    const shelfWall = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.5), intMat(0x1a1a22));
    shelfWall.rotation.y = -Math.PI / 2;
    shelfWall.position.set(6, 2, -1);
    s.add(shelfWall);
    for (let h = 0; h < 4; h++) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 3), intMat(0x8a6d2b, 0.3, 0.5));
        shelf.position.set(5.95, 1.3 + h * 0.45, -1);
        s.add(shelf);
    }

    // Bar stools
    for (let i = -1; i <= 1; i++) {
        const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 10), intMat(0x4a3a28));
        stool.position.set(4, 0.72, -1 + i * 1);
        s.add(stool);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), intMat(0x555555, 0.2, 0.8));
        leg.position.set(4, 0.35, -1 + i * 1);
        s.add(leg);
    }

    // Art installation (left)
    const artFrame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 1.2), intMat(0x2a2a34));
    artFrame.position.set(-5.95, 2, -2);
    s.add(artFrame);
    const artCircle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 16), intMat(0xc9a84c, 0.2, 0.9));
    artCircle.position.set(-5.92, 2, -2);
    artCircle.rotation.y = Math.PI / 2;
    s.add(artCircle);

    // Plant
    const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.3, 8), intMat(0x8a6d2b, 0.3, 0.7));
    planter.position.set(-4, 0.15, -3);
    s.add(planter);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 4), intMat(0x2a5a2a));
    leaves.position.set(-4, 0.7, -3);
    s.add(leaves);

    // Pendant light
    const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), intMat(0x2a2520));
    pendant.position.set(0, 2.8, 1);
    s.add(pendant);
    const pLight = new THREE.PointLight(0xfff8e0, 0.5, 6);
    pLight.position.set(0, 2.5, 1);
    s.add(pLight);

    addWallLight(s, -5.9, 2.5, 0, 0xffe8c0);
    addWallLight(s, 5.9, 2.5, 2, 0xffe8c0);
}

function animateInterior() {
    intAnimId = requestAnimationFrame(animateInterior);
    if (!intRenderer || !intScene || !intCamera) return;

    const dt = Math.min(intClock.getDelta(), 0.05);
    const lerp = 1 - Math.pow(0.00001, dt);

    intAngle += (intTgtAngle - intAngle) * lerp;
    intPitch += (intTgtPitch - intPitch) * lerp;
    intDist += (intTgtDist - intDist) * lerp;

    const cx = intPivot.x + intDist * Math.cos(intPitch) * Math.sin(intAngle);
    const cy = intPivot.y + intDist * Math.sin(intPitch);
    const cz = intPivot.z + intDist * Math.cos(intPitch) * Math.cos(intAngle);
    intCamera.position.set(cx, Math.max(cy, 0.5), cz);
    intCamera.lookAt(intPivot);

    intRenderer.render(intScene, intCamera);
}

// ═══════════════════════════════════
//  COMPASS
// ═══════════════════════════════════
function buildCompass() { updateCompass(); }

function updateCompass() {
    const svg = document.getElementById('compassSvg');
    const angle = -camAngle * (180 / Math.PI);
    svg.innerHTML = `
    <circle cx="24" cy="24" r="22" fill="rgba(8,8,14,0.85)" stroke="rgba(201,168,76,0.2)" stroke-width="1"/>
    <g transform="rotate(${angle},24,24)">
      <polygon points="24,6 27,22 24,20 21,22" fill="#c9a84c" opacity="0.9"/>
      <polygon points="24,42 27,26 24,28 21,26" fill="#4a4a58" opacity="0.5"/>
      <text x="24" y="5" text-anchor="middle" fill="#c9a84c" font-size="6" font-family="Outfit" font-weight="600">N</text>
    </g>`;
}

// ═══════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════
function setupNav() {
    document.querySelectorAll('.nav button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav button').forEach(b => b.classList.remove('on'));
            btn.classList.add('on');
            const view = btn.dataset.view;
            if (view === 'floorplan') { openFloorPlan(); return; }
            if (view === 'interiors') { openInterior(); return; }
            closeFloorPlan();
            closeInterior();
            switch (view) {
                case 'hero':
                    tgtAngle = 0.35; tgtPitch = 0.38; tgtDist = 130;
                    tgtPivot.set(0, 22, 0);
                    updatePanel('Project Overview', 'Studio Infinity LLP Architects', 'A ZEN-inspired living experience nestled along River Mathira, Westlands');
                    break;
                case 'aerial':
                    tgtAngle = 0.1; tgtPitch = 1.15; tgtDist = 150;
                    tgtPivot.set(0, 15, 0);
                    updatePanel('Aerial View', 'Site Plan — Plot 1870/11/257 & 258', '~46% ground coverage \u00b7 60%+ green space \u00b7 River Mathira boundary');
                    break;
                case 'street':
                    tgtAngle = Math.PI * 0.5; tgtPitch = 0.06; tgtDist = 50;
                    tgtPivot.set(-15, 6, 0);
                    updatePanel('Street Level', 'Donyo Sabuk Avenue Entrance', 'Guard house, 6.10m vehicle ramp, pedestrian approach');
                    break;
                case 'amenity':
                    tgtAngle = -0.3; tgtPitch = 0.3; tgtDist = 60;
                    tgtPivot.set(20, 12, 0);
                    updatePanel('Amenity Level', 'Gym \u00b7 Pool \u00b7 Entertainment \u00b7 Play Area', 'Connected by sky bridge between towers');
                    break;
            }
        });
    });
}

// ═══════════════════════════════════
//  CONTROLS
// ═══════════════════════════════════
function toggleDayNight() {
    isNight = !isNight;
    document.getElementById('btnDay').classList.toggle('on', isNight);

    if (isNight) {
        scene.fog = new THREE.FogExp2(0x060610, 0.004);
        sunLight.intensity = 0.08;
        sunLight.color.set(0x223344);
        ambLight.intensity = 0.12;
        ambLight.color.set(0x1a1a33);
        hemiLight.intensity = 0.1;
        renderer.toneMappingExposure = 0.4;
        clickables.forEach(m => {
            if (m.userData.floor && typeof m.userData.floor === 'number' && m.userData.floor > 2) {
                m.material.emissive = new THREE.Color(0xffdd88);
                m.material.emissiveIntensity = 0.18;
            }
        });
        scene.traverse(c => {
            if (c.material?.userData?.sky) {
                c.material.uniforms.uTop.value.set(0x000008);
                c.material.uniforms.uMid.value.set(0x050510);
                c.material.uniforms.uBot.value.set(0x0a0a1a);
                c.material.uniforms.uSun.value.set(0x112233);
            }
        });
    } else {
        scene.fog = new THREE.FogExp2(0xb8c8d8, 0.0018);
        sunLight.intensity = 1.3;
        sunLight.color.set(0xffecd0);
        ambLight.intensity = 0.45;
        ambLight.color.set(0x607888);
        hemiLight.intensity = 0.55;
        renderer.toneMappingExposure = 1.15;
        clickables.forEach(m => {
            if (m.material?.emissive) { m.material.emissive.set(0); m.material.emissiveIntensity = 0; }
        });
        scene.traverse(c => {
            if (c.material?.userData?.sky) {
                c.material.uniforms.uTop.value.set(0x3a6faa);
                c.material.uniforms.uMid.value.set(0x8ab4d4);
                c.material.uniforms.uBot.value.set(0xd8dde4);
                c.material.uniforms.uSun.value.set(0xfff0d0);
            }
        });
    }
}

function toggleWire() {
    isWire = !isWire;
    document.getElementById('btnWire').classList.toggle('on', isWire);
    scene.traverse(c => { if (c.isMesh && c.material) c.material.wireframe = isWire; });
}

function toggleXray() {
    isXray = !isXray;
    document.getElementById('btnXray').classList.toggle('on', isXray);
    scene.traverse(c => {
        if (c.isMesh && c.material && !c.material.userData?.sky) {
            const isTransMat = c.material === MAT.glass || c.material === MAT.glassRail || c.material === MAT.water || c.material === MAT.glassPanel;
            c.material.transparent = isXray ? true : (isTransMat || c.material.opacity < 1);
            if (isXray && !isTransMat) {
                c.material.opacity = 0.25;
            } else if (!isXray && !isTransMat) {
                c.material.opacity = 1.0;
                c.material.transparent = false;
            }
        }
    });
}

function toggleAutoRotate() {
    autoRotate = !autoRotate;
    document.getElementById('btnRotate').classList.toggle('on', autoRotate);
}

function resetView() {
    tgtAngle = 0.35; tgtPitch = 0.38; tgtDist = 130;
    tgtPivot.set(0, 22, 0);
    updatePanel('Project Overview', 'Studio Infinity LLP Architects', 'A ZEN-inspired living experience nestled along River Mathira, Westlands');
    document.querySelectorAll('.nav button').forEach(b => b.classList.remove('on'));
    document.querySelector('.nav button[data-view="hero"]').classList.add('on');
    document.querySelectorAll('.fl').forEach(f => f.classList.remove('active'));
    currentFloor = null;
    updateFloorPlanBtn();
    closeFloorPlan();
    closeInterior();
}

function updatePanel(title, eye, sub) {
    document.getElementById('pTitle').textContent = title;
    document.getElementById('pEye').textContent = eye;
    document.getElementById('pSub').textContent = sub;
}

// ═══════════════════════════════════
//  EVENTS
// ═══════════════════════════════════
function setupEvents() {
    const c = renderer.domElement;
    c.addEventListener('mousedown', e => {
        if (e.button === 0) dragging = true;
        if (e.button === 2) panning = true;
        prevMX = e.clientX; prevMY = e.clientY;
    });
    c.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        mVec.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
        if (dragging) {
            tgtAngle -= (e.clientX - prevMX) * 0.004;
            tgtPitch = Math.max(0.03, Math.min(1.35, tgtPitch + (e.clientY - prevMY) * 0.004));
            prevMX = e.clientX; prevMY = e.clientY;
        }
        if (panning) {
            const right = new THREE.Vector3();
            camera.getWorldDirection(right);
            right.cross(new THREE.Vector3(0, 1, 0)).normalize();
            const ps = camDist * 0.002;
            tgtPivot.addScaledVector(right, (e.clientX - prevMX) * -ps);
            tgtPivot.y += (e.clientY - prevMY) * ps * 0.5;
            prevMX = e.clientX; prevMY = e.clientY;
        }
    });
    c.addEventListener('mouseup', () => { dragging = false; panning = false; });
    c.addEventListener('contextmenu', e => e.preventDefault());
    c.addEventListener('wheel', e => { tgtDist = Math.max(25, Math.min(220, tgtDist + e.deltaY * 0.15)); });

    let touchDist = 0;
    c.addEventListener('touchstart', e => {
        e.preventDefault();
        if (e.touches.length === 1) { dragging = true; prevMX = e.touches[0].clientX; prevMY = e.touches[0].clientY; }
        if (e.touches.length === 2) { touchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
    }, { passive: false });
    c.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && dragging) {
            tgtAngle -= (e.touches[0].clientX - prevMX) * 0.004;
            tgtPitch = Math.max(0.03, Math.min(1.35, tgtPitch + (e.touches[0].clientY - prevMY) * 0.004));
            prevMX = e.touches[0].clientX; prevMY = e.touches[0].clientY;
        }
        if (e.touches.length === 2) {
            const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            tgtDist = Math.max(25, Math.min(220, tgtDist - (d - touchDist) * 0.5));
            touchDist = d;
        }
    }, { passive: false });
    c.addEventListener('touchend', () => { dragging = false; });

    c.addEventListener('click', e => {
        const cv = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
        raycaster.setFromCamera(cv, camera);
        const hits = raycaster.intersectObjects(clickables);
        if (hits.length) {
            const obj = hits[0].object;
            if (obj.userData.name) {
                updatePanel(obj.userData.name, obj.userData.desc || '', obj.userData.floor ? `Tower ${obj.userData.tower === 0 ? 'A' : 'B'} \u00b7 Level ${obj.userData.floor}` : '');
                const wp = new THREE.Vector3();
                obj.getWorldPosition(wp);
                tgtPivot.lerp(wp, 0.4);
            }
        }
    });

    window.addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);

        // Also resize interior if active
        if (intRenderer && intCamera) {
            const vp = document.getElementById('intViewport');
            if (vp) {
                intCamera.aspect = vp.clientWidth / vp.clientHeight;
                intCamera.updateProjectionMatrix();
                intRenderer.setSize(vp.clientWidth, vp.clientHeight);
            }
        }
    });
}

// ═══════════════════════════════════
//  ANIMATION
// ═══════════════════════════════════
function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const lerp = 1 - Math.pow(0.00001, dt);

    if (autoRotate) tgtAngle += dt * 0.15;

    camAngle += (tgtAngle - camAngle) * lerp;
    camPitch += (tgtPitch - camPitch) * lerp;
    camDist += (tgtDist - camDist) * lerp;
    pivot.lerp(tgtPivot, lerp);

    const cx = pivot.x + camDist * Math.cos(camPitch) * Math.sin(camAngle);
    const cy = pivot.y + camDist * Math.sin(camPitch);
    const cz = pivot.z + camDist * Math.cos(camPitch) * Math.cos(camAngle);
    camera.position.set(cx, Math.max(cy, 1.5), cz);
    camera.lookAt(pivot);

    // Hover
    raycaster.setFromCamera(mVec, camera);
    const hits = raycaster.intersectObjects(clickables);
    const tip = document.getElementById('tip');

    if (hits.length && hits[0].object.userData.name) {
        const obj = hits[0].object;
        if (hovered !== obj) {
            if (hovered?.material) { hovered.material.emissiveIntensity = isNight && hovered.userData.floor > 2 ? 0.18 : 0; }
            hovered = obj;
            if (obj.material) { obj.material.emissive = new THREE.Color(0xc9a84c); obj.material.emissiveIntensity = 0.2; }
        }
        tip.textContent = obj.userData.name;
        tip.style.left = mx + 14 + 'px';
        tip.style.top = my - 12 + 'px';
        tip.classList.add('on');
        renderer.domElement.style.cursor = 'pointer';
    } else {
        if (hovered?.material) {
            hovered.material.emissive = isNight && hovered.userData.floor > 2 ? new THREE.Color(0xffdd88) : new THREE.Color(0);
            hovered.material.emissiveIntensity = isNight && hovered.userData.floor > 2 ? 0.18 : 0;
        }
        hovered = null;
        tip.classList.remove('on');
        renderer.domElement.style.cursor = dragging ? 'grabbing' : 'grab';
    }

    updateCompass();
    renderer.render(scene, camera);
}

function makeMesh(geo, mat) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
}

// Boot
init();