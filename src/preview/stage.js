import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const angles = { front: 0, 'three-quarter': Math.PI * .18, side: Math.PI / 2, back: Math.PI };

export function createStage(element) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', '3D 资产预览，可拖动旋转或滚轮缩放');
  Object.assign(canvas.style, { width: '100%', height: '100%', minWidth: '0', minHeight: '0' });
  element.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .01, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  scene.add(new THREE.HemisphereLight(0xfffaf2, 0xc1b8a3, 1.5));
  for (const [position, intensity] of [[[-3, 8, 5], 2.6], [[4, 4, 4], .9], [[2, 6, -4], 1.2]]) {
    const light = new THREE.DirectionalLight(0xffffff, intensity);
    light.position.set(...position);
    scene.add(light);
  }

  let root;
  let radius = 1;
  const originals = new Map();
  const clayBySide = new Map();

  function draw() {
    if (root && element.clientWidth && element.clientHeight) renderer.render(scene, camera);
  }
  controls.addEventListener('change', draw);

  function fitDistance(aspect) {
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const halfAngle = Math.atan(Math.tan(halfFov) * Math.min(1, aspect));
    return 1.05 * radius / Math.sin(halfAngle);
  }

  function resize() {
    const width = element.clientWidth, height = element.clientHeight;
    if (!width || !height) return;
    const previous = fitDistance(camera.aspect);
    camera.aspect = width / height;
    const distance = fitDistance(camera.aspect);
    const offset = camera.position.clone().sub(controls.target);
    camera.position.copy(controls.target).addScaledVector(offset, distance / previous);
    camera.far = Math.max(100, distance * 12);
    controls.maxDistance = distance * 8;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    controls.update();
    draw();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(element);

  function setView(view) {
    if (!root) return;
    const angle = angles[view];
    const direction = new THREE.Vector3(Math.sin(angle), view === 'side' || view === 'three-quarter' ? .10 : .035, Math.cos(angle));
    camera.position.copy(controls.target).addScaledVector(direction.normalize(), fitDistance(camera.aspect));
    controls.update();
    draw();
  }

  function gray(material) {
    if (!clayBySide.has(material.side)) {
      clayBySide.set(material.side, new THREE.MeshStandardMaterial({ color: 0xb9b8b4, roughness: .88, side: material.side }));
    }
    return clayBySide.get(material.side);
  }
  function setClay(enabled) {
    for (const [mesh, material] of originals) {
      mesh.material = enabled ? (Array.isArray(material) ? material.map(gray) : gray(material)) : material;
    }
    draw();
  }

  function clear() {
    if (!root) return;
    scene.remove(root);
    for (const [mesh, material] of originals) mesh.material = material;
    const resources = new Set();
    root.traverse(object => {
      if (object.geometry) resources.add(object.geometry);
      for (const material of [].concat(object.material || [])) {
        if (resources.has(material)) continue;
        resources.add(material);
        for (const value of Object.values(material)) {
          if (value?.isTexture) resources.add(value);
        }
      }
    });
    root = undefined;
    originals.clear();
    for (const resource of resources) resource.dispose();
    renderer.renderLists.dispose();
  }

  function mount(model, view, clay) {
    if (!model?.isObject3D) throw new TypeError('模型工厂需要返回 Three.js Object3D');
    root = model;
    const sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());
    if (!(sphere.radius > 0 && Number.isFinite(sphere.radius))) throw new Error('模型缺少有效的几何边界');
    radius = sphere.radius;
    controls.target.copy(sphere.center);
    controls.minDistance = radius * 1.05;
    camera.near = radius * .005;
    model.traverse(object => { if (object.isMesh) originals.set(object, object.material); });
    // Prepare framing and materials before the first render of the new asset.
    resize();
    setView(view);
    setClay(clay);
    scene.add(model);
    draw();
  }

  function dispose() {
    observer.disconnect();
    controls.removeEventListener('change', draw);
    controls.dispose();
    clear();
    for (const material of clayBySide.values()) material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  return { canvas, mount, clear, setView, setClay, dispose };
}
