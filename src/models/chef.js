import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// All geometry, including the cloth, face, footwear and spoon, is authored here.
// Local convention: soles at Y=0; face points along +Z.
export function createChef() {
  const root = new THREE.Group();
  root.name = 'Chef — Sage & Saffron (Sanger)';
  const mat = (color, roughness = 0.76, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const skin = mat('#a96843', 0.72);
  const skinLight = mat('#b57850');
  const earInner = mat('#8c4d35');
  const cream = mat('#f4e5ca');
  const seam = mat('#ddceb2');
  const sage = mat('#748b69');
  const sageLight = mat('#92a47e');
  const sageDark = mat('#536d51');
  const terra = mat('#b95d43');
  const terraLight = mat('#cd7857');
  const hair = mat('#30251e');
  const hairLight = mat('#423025');
  const eyeWhite = mat('#f7e9d0', 0.38);
  const iris = mat('#513522', 0.32);
  const dark = mat('#231b16', 0.4);
  const lip = mat('#703c2c');
  const lowerLip = mat('#9d6147');
  const eyelid = mat('#68452f');
  const trousers = mat('#414e47');
  const leather = mat('#704f36', 0.57);
  const sole = mat('#38362e');
  const wood = mat('#b98347', 0.58);
  const woodInside = mat('#9e6837', 0.66);
  const brass = mat('#c6a363', 0.43, { metalness: 0.4 });

  function mesh(name, geometry, material, parent = root) {
    const obj = new THREE.Mesh(geometry, material);
    obj.name = name;
    obj.castShadow = obj.receiveShadow = true;
    parent.add(obj);
    return obj;
  }
  function ball(name, position, scale, material, parent = root) {
    const obj = mesh(name, new THREE.SphereGeometry(1, 28, 20), material, parent);
    obj.position.set(...position);
    obj.scale.set(...scale);
    return obj;
  }
  function rounded(name, position, size, radius, material, parent = root) {
    const obj = mesh(name, new RoundedBoxGeometry(...size, 4, radius), material, parent);
    obj.position.set(...position);
    return obj;
  }
  function tube(name, points, radius, material, parent = root) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(name, new THREE.TubeGeometry(curve, Math.max(12, points.length * 7), radius, 8, false), material, parent);
  }
  function limb(name, a, b, ra, rb, material, parent = root) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const obj = mesh(name, new THREE.CylinderGeometry(rb, ra, start.distanceTo(end), 28, 1), material, parent);
    obj.position.copy(start).add(end).multiplyScalar(0.5);
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return obj;
  }
  function surface(name, fn, nu, nv, material, parent = root) {
    const positions = [], uv = [], indices = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      positions.push(...fn(i / nu, j / nv)); uv.push(i / nu, j / nv);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + nu + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(indices); geo.computeVertexNormals();
    return mesh(name, geo, material, parent);
  }
  // Smooth elliptical cross-sections, optionally softly pleated and leaning.
  function tailored(name, rings, material, options = {}) {
    const curve = new THREE.CatmullRomCurve3(rings.map(r => new THREE.Vector3(r[1], r[0], r[2])));
    const obj = surface(name, (u, v) => {
      const p = curve.getPoint(v), angle = u * Math.PI * 2;
      const ripple = 1 + (options.pleat || 0) * Math.sin(angle * 7 + v * 0.7) * Math.sin(v * Math.PI);
      return [p.x * Math.cos(angle) * ripple + (options.lean || 0) * v,
        p.y + (options.tilt || 0) * Math.cos(angle), p.z * Math.sin(angle) * ripple];
    }, 64, 40, material);
    return obj;
  }
  function ribbon(name, points, width, material, parent = root) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return surface(name, (u, v) => {
      const p = curve.getPoint(v), tangent = curve.getTangent(v);
      const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 0, 1)).normalize();
      p.addScaledVector(side, (u - 0.5) * width);
      return p.toArray();
    }, 4, 36, material, parent);
  }
  // Thin textiles have a visible reverse when seen from below or behind.
  const cloth = m => { const copy = m.clone(); copy.side = THREE.DoubleSide; return copy; };

  // Shoes use a plan-view last and stacked soles, with a broad toe and narrow heel.
  function shoe(side) {
    const group = new THREE.Group(); group.name = `${side < 0 ? 'Left' : 'Right'} shaped kitchen clog`;
    group.position.set(side * 0.43, 0, 0.04); group.rotation.y = side * -0.10; root.add(group);
    function last(name, sections, material) {
      const points = [
        [-0.24, -0.34], [-0.33, -0.16], [-0.34, 0.32], [-0.29, 0.57],
        [-0.12, 0.66], [0.12, 0.66], [0.29, 0.57], [0.34, 0.32],
        [0.33, -0.16], [0.24, -0.34], [0, -0.39],
      ].reverse().map(([x, z]) => new THREE.Vector3(x, 0, z));
      const outline = new THREE.CatmullRomCurve3(points, true);
      const profile = new THREE.CatmullRomCurve3(sections.map(([y, s, z]) => new THREE.Vector3(s, y, z)));
      return surface(name, (u, v) => {
        const p = outline.getPoint(u), r = profile.getPoint(v);
        return [p.x * r.x, r.y, p.z * r.x + r.z];
      }, 48, 20, material, group);
    }
    last('Flat rubber outsole', [[0, 0.94, 0], [0.04, 1, 0], [0.14, 1, 0], [0.18, 0.96, 0]], sole);
    last('Leather toe box and instep', [[0.14, 0.96, 0], [0.23, 0.98, 0], [0.36, 0.87, -0.04], [0.47, 0.58, -0.12], [0.49, 0.02, -0.12]], leather);
    tube('Stitched clog welt', [[-0.28, .18, -.22], [-.32, .18, .25], [-.23, .18, .57], [0, .18, .63], [.23, .18, .57], [.32, .18, .25], [.28, .18, -.22]], .012, seam, group);
    tube('Heel support strap', [[-.29, .35, .0], [-.25, .42, -.32], [0, .43, -.38], [.25, .42, -.32], [.29, .35, 0]], .04, leather, group);
    for (const s of [-1, 1]) ball('Brass clog strap rivet', [s * .296, .34, .01], [.025, .035, .035], brass, group);
  }
  shoe(-1); shoe(1);
  for (const s of [-1, 1]) {
    const leg = tailored(`${s < 0 ? 'Left' : 'Right'} tapered trouser leg`, [[.37, .24, .25], [.56, .26, .27], [1.12, .29, .30], [1.65, .34, .33], [1.8, .30, .30]], trousers);
    leg.position.x = s * .43;
    rounded('Turned trouser cuff', [s * .43, .56, 0], [.52, .17, .55], .07, trousers);
    tube('Trouser front crease', [[s * .43, .72, .275], [s * .43 + .02, 1.05, .30], [s * .43, 1.38, .32]], .009, sageDark);
  }

  tailored('Cream tailored double-breasted coat', [[1.5, .48, .33], [1.60, .77, .47], [1.86, .87, .54], [2.4, .91, .57], [2.94, .81, .50], [3.25, .69, .43], [3.43, .44, .33], [3.48, .05, .1]], cream);
  tube('Coat lower hem', [[-.71, 1.63, .30], [-.38, 1.59, .47], [0, 1.59, .49], [.4, 1.59, .46], [.71, 1.63, .30]], .018, seam);
  tube('Rear coat center seam', [[0, 3.32, -.38], [0, 2.9, -.51], [0, 2.35, -.58], [0, 1.66, -.5]], .009, seam);
  limb('Visible neck', [0, 3.35, 0], [0, 3.87, 0], .31, .32, skin);
  // Collar pieces sit against the neckline rather than floating in front of it.
  for (const s of [-1, 1]) {
    const collar = rounded('Folded cream collar', [s * .22, 3.43, .29], [.35, .30, .12], .05, cream);
    collar.rotation.z = s * .39; collar.rotation.x = -.22;
  }
  const scarf = tailored('Terracotta neckerchief around neck', [[3.43, .32, .32], [3.49, .35, .34], [3.56, .32, .32]], terra);
  scarf.position.z = .015;
  ball('Neckerchief soft knot', [.05, 3.42, .43], [.145, .13, .105], terraLight);
  ribbon('Left neckerchief tail', [[.01, 3.42, .46], [-.13, 3.26, .49], [-.28, 3.08, .49]], .18, cloth(terra));
  ribbon('Right neckerchief tail', [[.08, 3.41, .46], [.22, 3.26, .5], [.25, 3.03, .52]], .19, cloth(terra));
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const y = 3.13 - i * .24, x = s * (.54 + i * .04);
    ball('Ivory double-breasted coat button', [x, y, .37 + i * .055], [.048, .048, .027], seam);
    ball('Button center', [x, y, .397 + i * .055], [.018, .018, .007], cream);
  }

  tailored('Apron wraparound waistband', [[2.38, .927, .585], [2.49, .925, .582]], sageDark);
  function apronPoint(u, v, offset = 0) {
    const y = 1.35 + v * 1.76;
    const w = v < .58 ? .79 + .045 * Math.sin(v / .58 * Math.PI) : .79 - (v - .58) / .42 * .35;
    const x = (u * 2 - 1) * w;
    const z = .64 - .23 * (x / .92) ** 2 - .15 * Math.max(0, (v - .6) / .4);
    return [x, y + .045 * (x / w) ** 2, z + offset + .012 * Math.sin(u * Math.PI * 6) * (1 - v)];
  }
  surface('Sage apron curved bib and skirt', (u, v) => apronPoint(u, v), 40, 36, cloth(sage));
  for (const u of [0.02, .98]) tube('Apron edge topstitch', Array.from({ length: 20 }, (_, i) => apronPoint(u, i / 19, .012)), .008, sageLight);
  tube('Apron bottom topstitch', Array.from({ length: 25 }, (_, i) => apronPoint(i / 24, .028, .012)), .009, sageLight);
  tube('Apron bib top binding', Array.from({ length: 17 }, (_, i) => apronPoint(i / 16, 1, .012)), .018, sageDark);
  for (const s of [-1, 1]) {
    ribbon('Apron shoulder strap', [[s * .36, 3.08, .50], [s * .44, 3.37, .31], [s * .42, 3.46, .03], [s * .40, 3.33, -.34], [s * .25, 2.9, -.52], [-s * .22, 2.46, -.60]], .115, cloth(sage));
    ball('Apron strap brass rivet', [s * .355, 3.05, .52], [.033, .033, .015], brass);
  }
  // A bulging pocket follows the apron curvature; its mouth has a small dark recess.
  surface('Apron generous rounded pocket', (u, v) => {
    const x = (u - .5) * .88;
    return [x, 1.82 + .42 * v + .06 * (2 * u - 1) ** 4, .68 - .22 * (x / .92) ** 2 + .035 * Math.sin(v * Math.PI)];
  }, 24, 16, cloth(sageLight));
  tube('Pocket opening shadow', [[-.43, 2.28, .63], [0, 2.25, .691], [.43, 2.28, .63]], .014, sageDark);
  tube('Pocket center dividing stitch', [[0, 1.85, .689], [0, 2.06, .725], [0, 2.23, .698]], .008, sage);
  rounded('Woven apron label', [.29, 2.08, .704], [.15, .09, .012], .012, cream);
  tube('Label herb stem', [[.28, 2.045, .716], [.30, 2.105, .716]], .006, sageDark);
  ball('Label embroidered leaf', [.28, 2.09, .717], [.025, .012, .004], sageDark);
  // Complete back bow, with broad soft loops and two independently hanging tails.
  ball('Back apron bow knot', [0, 2.43, -.635], [.11, .10, .07], sage);
  for (const s of [-1, 1]) {
    ribbon('Back apron bow loop', [[0, 2.44, -.64], [s * .31, 2.59, -.66], [s * .40, 2.46, -.69], [s * .23, 2.34, -.70], [0, 2.43, -.66]], .09, cloth(sage));
    ribbon('Back apron hanging tie', [[s * .04, 2.42, -.66], [s * .15, 2.17, -.64], [s * .21, 1.83 + s * .07, -.59]], .12, cloth(sage));
  }

  // Relaxed left arm, and right elbow bent to support the spoon grip.
  for (const s of [-1, 1]) {
    const shoulder = [s * .72, 3.15, 0];
    const elbow = [s * 1.09, 2.76, .035];
    ball('Rounded coat shoulder', shoulder, [.32, .34, .33], cream);
    limb('Short coat sleeve', shoulder, elbow, .31, .27, cream);
    limb('Turned sleeve cuff', [s * 1.045, 2.81, .03], [s * 1.13, 2.72, .035], .278, .282, seam);
    ball('Elbow transition', [s * 1.105, 2.72, .04], [.225, .22, .225], skin);
  }
  limb('Relaxed left forearm', [-1.10, 2.76, .03], [-1.25, 2.32, .13], .215, .16, skin);
  ball('Left wrist transition', [-1.25, 2.32, .13], [.16, .17, .15], skin);
  const handL = new THREE.Group(); handL.name = 'Relaxed left five-finger hand';
  handL.position.set(-1.27, 2.20, .14); handL.rotation.z = -.12; root.add(handL);
  ball('Left palm', [0, 0, 0], [.19, .23, .12], skin, handL);
  for (let i = 0; i < 4; i++) {
    const x = -.135 + i * .086, length = [.20, .25, .24, .18][i];
    tube(`Left finger ${i + 1}`, [[x, -.10, .015], [x, -.18, .04], [x + .012, -.10 - length, .085]], .049, skin, handL);
    ball('Left rounded fingertip', [x + .012, -.10 - length, .085], [.049, .052, .049], skin, handL);
  }
  tube('Left articulated thumb', [[.13, .07, .055], [.24, -.03, .095], [.235, -.13, .13]], .073, skin, handL);
  ball('Left thumb tip', [.235, -.13, .13], [.07, .07, .067], skin, handL);
  limb('Raised right forearm', [1.10, 2.72, .06], [1.40, 2.97, .51], .22, .155, skin);
  ball('Right wrist transition', [1.40, 2.97, .51], [.16, .16, .16], skin);
  const grip = new THREE.Group(); grip.name = 'Right hand and firmly grasped wooden spoon';
  grip.position.set(1.44, 3.01, .62); grip.rotation.z = -.17; root.add(grip);
  ball('Right cupped palm', [-.04, -.015, -.04], [.18, .22, .135], skin, grip);
  // The handle passes inside the finger arcs, behind their front knuckles.
  limb('Spoon tapered wooden handle', [0, -.42, .045], [0, 1.01, .045], .044, .068, wood, grip);
  ball('Rounded handle butt', [0, -.42, .045], [.044, .055, .044], wood, grip);
  for (let i = 0; i < 4; i++) {
    const y = .16 - i * .099;
    tube(`Right curled gripping finger ${i + 1}`, [[-.135, y, -.035], [-.12, y, .09], [.005, y - .012, .139], [.087, y - .028, .082], [.076, y - .035, .005]], .049, skin, grip);
  }
  tube('Right opposing thumb', [[-.14, .12, -.075], [-.17, .225, .02], [-.065, .24, .105], [.035, .17, .12]], .07, skinLight, grip);
  ball('Right thumb rounded tip', [.035, .17, .12], [.069, .072, .064], skinLight, grip);
  // Concave bowl: the center is recessed, with a separately curved solid back.
  surface('Wooden spoon concave bowl', (u, v) => {
    const a = u * Math.PI * 2, r = v;
    return [.205 * r * Math.cos(a), 1.18 + .31 * r * Math.sin(a), .065 + .115 * r * r];
  }, 48, 16, cloth(woodInside), grip);
  surface('Wooden spoon rounded bowl back', (u, v) => {
    const a = u * Math.PI * 2, r = v;
    return [.205 * r * Math.cos(a), 1.18 + .31 * r * Math.sin(a), .035 + .14 * r * r];
  }, 48, 16, cloth(wood), grip);
  tube('Spoon rolled wooden rim', Array.from({ length: 49 }, (_, i) => {
    const a = i / 48 * Math.PI * 2; return [.205 * Math.cos(a), 1.18 + .31 * Math.sin(a), .18];
  }), .016, wood, grip);
  for (const x of [-.022, .025]) tube('Handle subtle wood grain', [[x, -.36, .085], [x + .009, .45, .105], [x, .94, .11]], .003, woodInside, grip);

  // A single face surface carries warm cheek color in its vertex colors.
  const cy = 4.47, ry = .91, rx = .88, rz = .73;
  function faceWidth(y) { const t = (y - cy) / ry; return rx * (1 + .07 * Math.exp(-(((t + .25) / .37) ** 2)) - .10 * Math.max(0, -t)); }
  function faceZ(x, y) { return .035 + rz * Math.sqrt(Math.max(.001, 1 - (x / faceWidth(y)) ** 2 - ((y - cy) / ry) ** 2)); }
  const headGeo = new THREE.SphereGeometry(1, 72, 52), pos = headGeo.attributes.position;
  const colors = [], base = new THREE.Color('#ad704b'), warm = new THREE.Color('#bb7050');
  for (let i = 0; i < pos.count; i++) {
    const y = cy + pos.getY(i) * ry, x = pos.getX(i) * faceWidth(y), z = .035 + pos.getZ(i) * rz;
    pos.setXYZ(i, x, y, z);
    const cheek = Math.exp(-(((Math.abs(x) - .54) / .23) ** 2) - ((y - 4.23) / .22) ** 2) * Math.max(0, z / rz);
    const c = base.clone().lerp(warm, cheek * .65); colors.push(c.r, c.g, c.b);
  }
  headGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); headGeo.computeVertexNormals();
  mesh('Continuous sculpted warm brown face', headGeo, mat('#ffffff', .76, { vertexColors: true }));
  for (const s of [-1, 1]) {
    ball('Soft anatomical ear', [s * .87, 4.43, .015], [.17, .245, .15], skin);
    ball('Ear recessed concha', [s * .945, 4.44, .115], [.075, .145, .035], earInner);
    tube('Ear inner fold', [[s * .94, 4.53, .14], [s * .975, 4.47, .145], [s * .94, 4.38, .145]], .023, skinLight);
  }
  function facePatch(name, x, y, w, h, material, lift = .008, shape = null) {
    return surface(name, (u, v) => {
      const a = u * Math.PI * 2, r = v;
      const xx = x + w * Math.cos(a) * r;
      const yy = y + h * Math.sin(a) * r + (shape ? shape(xx - x) : 0);
      return [xx, yy, faceZ(xx, yy) + lift];
    }, 48, 12, cloth(material));
  }
  function faceLine(name, xy, radius, material, lift = .012) {
    return tube(name, xy.map(([x, y]) => [x, y, faceZ(x, y) + lift]), radius, material);
  }
  for (const s of [-1, 1]) {
    const x = s * .315;
    surface('Soft conforming almond eye white', (u, v) => {
      const a = u * Math.PI * 2, sine = Math.sin(a);
      const xx = x + .167 * Math.cos(a) * v;
      const yy = 4.58 + .142 * sine * Math.abs(sine) ** .3 * v;
      return [xx, yy, faceZ(xx, yy) + .006];
    }, 48, 12, cloth(eyeWhite));
    facePatch('Chestnut iris', x - .012, 4.577, .092, .113, iris, .009);
    facePatch('Soft dark pupil', x - .012, 4.580, .060, .087, dark, .012);
    facePatch('Eye highlight', x - .038, 4.622, .023, .027, eyeWhite, .015);
    facePatch('Small eye bounce light', x + .022, 4.541, .009, .011, eyeWhite, .015);
    faceLine('Fine warm upper eyelid', [[x - .166, 4.58], [x - .105, 4.684], [x, 4.722], [x + .105, 4.684], [x + .166, 4.58]], .008, eyelid, .007);
    faceLine('Expressive curved eyebrow', [[x - .17, 4.87 + s * .015], [x - .06, 4.925 + s * .015], [x + .06, 4.92], [x + .145, 4.875]], .031, hair);
  }
  ball('Nose smooth bridge', [0, 4.43, .728], [.11, .22, .095], skin);
  ball('Soft rounded nose tip', [0, 4.34, .794], [.155, .125, .134], skinLight);
  for (const s of [-1, 1]) ball('Subtle nostril', [s * .086, 4.29, .858], [.029, .018, .012], earInner);
  // Mouth is a shallow conforming smile, not a freestanding torus.
  facePatch('Warm smiling mouth', .015, 4.117, .235, .052, lip, .008, x => .9 * x * x);
  faceLine('Small ivory smile ribbon', [[-.13, 4.15], [.01, 4.13], [.15, 4.152]], .013, eyeWhite, .018);
  faceLine('Warm understated lower lip', [[-.12, 4.085], [.015, 4.067], [.15, 4.089]], .009, lowerLip, .009);
  for (const s of [-1, 1]) faceLine('Smile corner crease', [[s * .235, 4.16], [s * .255, 4.185], [s * .255, 4.21]], .008, earInner);

  // One continuous scalp has a high forehead, clean temples and a low nape.
  // Curl centers are embedded in that surface; none are placed on bare cheeks.
  function hairlineY(a) {
    const front = Math.max(0, Math.cos(a)), back = Math.max(0, -Math.cos(a));
    return 4.70 + .43 * front ** .6 - .59 * back ** .8;
  }
  function scalpPoint(a, y) {
    const ring = Math.sqrt(Math.max(.001, 1 - ((y - cy) / .94) ** 2));
    return [(faceWidth(y) + .025) * ring * Math.sin(a), y, .035 + .757 * ring * Math.cos(a)];
  }
  surface('Continuous curly scalp temples and nape', (u, v) => {
    const a = u * Math.PI * 2;
    const phiEnd = Math.acos((hairlineY(a) - cy) / .94);
    const phi = .035 + v * (phiEnd - .035);
    return scalpPoint(a, cy + .94 * Math.cos(phi));
  }, 72, 40, hair);
  function curl(name, x, y, z, size, seed) {
    const b = ball(name, [x, y, z], [size * 1.13, size * .91, size * .55], seed % 5 === 0 ? hairLight : hair);
    const normal = new THREE.Vector3(x / .88, (y - cy) / .94, (z - .035) / .757).normalize();
    b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    b.rotateZ(seed * 1.7);
    const p = b.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
      const wave = 1 + .085 * Math.sin(Math.atan2(py, px) * 3 + seed) * (1 - pz * pz);
      p.setXYZ(i, px * wave, py * wave, pz);
    }
    b.geometry.computeVertexNormals();
  }
  let seed = 0;
  for (let row = 0; row < 7; row++) {
    const y = 4.19 + row * .17;
    for (let i = 0; i < 19; i++) {
      const a = 1.40 + (i + .20 * (row % 2)) / 18.2 * (Math.PI * 2 - 2.80);
      const yy = y + .014 * Math.sin(i * 3 + row);
      if (yy < hairlineY(a) + .065) continue;
      const p = scalpPoint(a, yy);
      curl('Fused temple and nape curl', ...p, .132 + .010 * Math.sin(i * 5 + row), seed++);
    }
  }
  for (let i = 0; i < 11; i++) {
    const a = -1.36 + i * .272, y = 5.18 + .018 * Math.sin(i * .8);
    curl('Shallow forehead curl above eyebrows', ...scalpPoint(a, y), .117 + .008 * Math.sin(i), seed++);
  }

  // One continuous asymmetric cloth crown: soft fluting, no stack of cloud balls.
  const cap = new THREE.Group(); cap.name = 'Tilted soft chefs cap'; cap.position.set(-.035, 5.21, -.015); cap.rotation.z = .10; root.add(cap);
  const band = tailored('Chef cap folded band', [[0, .76, .63], [.05, .80, .66], [.22, .79, .65], [.25, .76, .63]], cream);
  root.remove(band); cap.add(band);
  const crown = tailored('Chef cap slouched pleated crown', [[.17, .74, .60], [.28, .86, .69], [.46, .91, .72], [.64, .77, .63], [.76, .47, .42], [.81, .015, .015]], cream, { pleat: .045, lean: -.13 });
  root.remove(crown); cap.add(crown);
  for (const y of [.035, .215]) tube('Cap band fine seam', Array.from({ length: 65 }, (_, i) => {
    const a = i / 64 * Math.PI * 2; return [.792 * Math.cos(a), y, .652 * Math.sin(a)];
  }), .008, seam, cap);
  // Small woven signature patch identifies the original cap design.
  rounded('Cap sage signature patch', [.48, .125, .526], [.17, .105, .018], .019, sage, cap).rotation.y = .52;

  root.userData = { character: 'Sage & Saffron', front: '+Z', groundY: 0, procedural: true };
  return root;
}
