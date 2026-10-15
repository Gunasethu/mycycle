import * as THREE from './node_modules/three/build/three.module.js';
import { FBXLoader } from './node_modules/three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';

const garage = document.querySelector('#garage');
const canvas = document.querySelector('#bike-canvas');
const loading = document.querySelector('#model-loading');
const loadingTitle = document.querySelector('#loading-title');
const loadingDetail = document.querySelector('#loading-detail');
const loadingBar = document.querySelector('#loading-bar');
const hotspots = [...document.querySelectorAll('.hotspot')];

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  loadingTitle.textContent = '3D view unavailable';
  loadingDetail.textContent = 'The garage preview is still available';
  console.error('WebGL could not start:', error);
}

if (renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(garage.clientWidth, garage.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  let contactShadows = [];
  const camera = new THREE.PerspectiveCamera(34, garage.clientWidth / garage.clientHeight, 0.01, 2000);
  const hemisphereLight = new THREE.HemisphereLight(0xe8f4ff, 0x18202a, 2.5);
  scene.add(hemisphereLight);
  const keyLight = new THREE.DirectionalLight(0xfff7ec, 2.6);
  keyLight.intensity = 3.4;
  keyLight.position.set(-3, 7, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 30;
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -7;
  keyLight.shadow.camera.updateProjectionMatrix();
  keyLight.shadow.bias = -0.00025;
  keyLight.shadow.normalBias = 0.025;
  keyLight.shadow.radius = 4;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x76dfff, 2.1);
  fillLight.position.set(4, 2, -5);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xffffff, 3.0);
  rimLight.position.set(2, 4, 6);
  scene.add(rimLight);

  window.setBikeEnvironment = outdoor => {
    const forest = Boolean(outdoor);
    hemisphereLight.color.set(forest ? 0xdcebd1 : 0xe8f4ff);
    hemisphereLight.groundColor.set(forest ? 0x35412b : 0x18202a);
    hemisphereLight.intensity = forest ? 2.25 : 2.5;
    keyLight.color.set(forest ? 0xffedcf : 0xfff7ec);
    keyLight.intensity = forest ? 3.0 : 3.4;
    keyLight.position.set(-3, 7, forest ? -5 : 5);
    fillLight.color.set(forest ? 0x9fc77d : 0x76dfff);
    fillLight.intensity = forest ? 1.35 : 2.1;
    rimLight.color.set(forest ? 0xe5efcf : 0xffffff);
    rimLight.intensity = forest ? 2.25 : 3.0;
    renderer.toneMappingExposure = forest ? 1.02 : 1.12;
    renderer.shadowMap.enabled = forest;
    if (groundPlane) groundPlane.visible = forest;
    contactShadows.forEach(shadow => { shadow.visible = forest; });
  };

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.enableRotate = true;
  controls.enableZoom = true;
  controls.minDistance = 3;
  controls.maxDistance = 15;
  controls.minPolarAngle = 0.48;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = true;
  controls.autoRotateSpeed = -1;

  window.setBikeAutoRotate = active => { controls.autoRotate = Boolean(active); };

  let bikeRoot = null;
  let groundPlane = null;
  let bikeAnchors = null;
  let bikeSize = null;
  let cameraTarget = null;
  let baseCameraDistance = 0;
  let overviewPosition = null;
  let overviewTarget = null;
  let focusedPart = null;
  let cameraMotionId = 0;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;

  const manager = new THREE.LoadingManager();
  let modelLoaded = false;
  manager.onProgress = (url, done, total) => {
    if (modelLoaded) return;
    const percent = Math.round((done / Math.max(total, 1)) * 100);
    loadingBar.style.width = `${percent}%`;
    loadingDetail.textContent = `Loading model & textures · ${percent}%`;
  };
  manager.onError = url => console.warn('A bike texture could not be loaded:', url);
  manager.onLoad = () => {};

  const loader = new FBXLoader(manager);
  loader.setPath('assets/model/');
  loader.setResourcePath('assets/model/');

  loader.load('GigantRoad.fbx', root => {
    bikeRoot = root;
    root.updateMatrixWorld(true);
    let bounds = new THREE.Box3().setFromObject(root);
    const rawSize = bounds.getSize(new THREE.Vector3());
    const rawCenter = bounds.getCenter(new THREE.Vector3());
    const width = Math.max(rawSize.x, rawSize.z);
    const uniformScale = 4.25 / Math.max(width, 0.001);
    root.scale.setScalar(uniformScale);
    // Turn the source's depth-wise long axis to the showroom side view, with the
    // front wheel on the right to match the reference photo.
    root.rotation.y = -Math.PI / 2 - 0.16;
    root.position.set(-rawCenter.x * uniformScale, -rawCenter.y * uniformScale, -rawCenter.z * uniformScale);
    root.updateMatrixWorld(true);
    bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3());
    bikeSize = size.clone();
    const center = bounds.getCenter(new THREE.Vector3());
    root.position.sub(center);
    root.updateMatrixWorld(true);

    // FBX textures can arrive with sRGB settings unset; mark color maps for correct display.
    root.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      let materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material?.map) material.map.colorSpace = THREE.SRGBColorSpace;
        if (material?.color) {
          const hsl = {};
          material.color.getHSL(hsl);
          if (hsl.h > 0.20 && hsl.h < 0.48 && hsl.s > 0.2) {
            material.color.setHSL(0.535, Math.max(0.42, hsl.s), Math.max(0.32, hsl.l));
          } else {
            material.color.multiplyScalar(1.18);
          }
        }
        if (material) material.needsUpdate = true;
      }

      // The FBX shares materials between the frame and darker components.
      // Clone only the frame/fork slots so their paint can match the reference
      // without recoloring the drivetrain, wheels, or cockpit.
      const isFrame = /^Frame[123]$/i.test(object.name);
      const isFork = /^Fork$/i.test(object.name);
      if (isFrame || isFork) {
        materials = materials.map(material => {
          if (!material?.color) return material;
          const isAccent = material.name.toLowerCase() === 'glossycolor';
          const isSilver = (isFrame && material.name === 'Flat_black.glossy') || (isFork && material.name === 'Flat_black');
          if (!isAccent && !isSilver) return material;
          const painted = material.clone();
          painted.color.set(isAccent ? 0x007ebf : 0xb5b9b9);
          if ('shininess' in painted) painted.shininess = 72;
          if (painted.specular) painted.specular.set(0x777777);
          painted.needsUpdate = true;
          return painted;
        });
        object.material = Array.isArray(object.material) ? materials : materials[0];
      }
    });
    scene.add(root);

    // Transparent receiver: the model casts a soft contact shadow onto the
    // pictured forest mud while the background image remains visible.
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.ShadowMaterial({ color: 0x10170d, opacity: 0.42 });
    groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.name = 'Forest shadow receiver';
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -size.y / 2 - 0.008;
    groundPlane.receiveShadow = true;
    groundPlane.visible = garage.classList.contains('outdoor-view');
    scene.add(groundPlane);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const shadowContext = shadowCanvas.getContext('2d');
    const shadowGradient = shadowContext.createRadialGradient(64, 64, 6, 64, 64, 64);
    shadowGradient.addColorStop(0, 'rgba(12, 16, 8, 0.8)');
    shadowGradient.addColorStop(0.42, 'rgba(12, 16, 8, 0.38)');
    shadowGradient.addColorStop(1, 'rgba(12, 16, 8, 0)');
    shadowContext.fillStyle = shadowGradient;
    shadowContext.fillRect(0, 0, 128, 128);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const contactMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      opacity: 0.55
    });
    const contactShadowGeometry = new THREE.PlaneGeometry(1.65, 0.95);
    contactShadows = [];
    for (const side of [-1, 1]) {
      const contactShadow = new THREE.Mesh(contactShadowGeometry, contactMaterial);
      contactShadow.name = 'Forest tire contact shadow';
      contactShadow.rotation.x = -Math.PI / 2;
      contactShadow.position.set(side * size.x * 0.34, -size.y / 2 - 0.004, 0);
      contactShadow.visible = garage.classList.contains('outdoor-view');
      scene.add(contactShadow);
      contactShadows.push(contactShadow);
    }

    cameraTarget = new THREE.Vector3(0, size.y * 0.07, 0);
    fitCamera();

    bikeAnchors = {
      frame: new THREE.Vector3(-size.x * 0.02, size.y * 0.12, 0),
      drivetrain: new THREE.Vector3(-size.x * 0.08, -size.y * 0.2, 0),
      cockpit: new THREE.Vector3(size.x * 0.32, size.y * 0.32, 0),
      wheels: new THREE.Vector3(size.x * 0.34, -size.y * 0.12, 0)
    };
    modelLoaded = true;
    loading.remove();
    loadingTitle.textContent = 'Bike model ready';
    loadingDetail.textContent = 'Drag to rotate · scroll to zoom';
    loadingBar.style.width = '100%';
    garage.classList.add('model-ready');
    window.setTimeout(() => { loading.classList.add('hidden'); loading.hidden = true; }, 500);
    console.info('Loaded FBX bicycle', { size: size.toArray(), meshes: countMeshes(root) });
  }, event => {
    if (event.total > 0) {
      const percent = Math.round((event.loaded / event.total) * 100);
      loadingBar.style.width = `${percent}%`;
      loadingDetail.textContent = `Loading bike model · ${percent}%`;
    }
  }, error => {
    loadingTitle.textContent = 'Could not load bike';
    loadingDetail.textContent = 'Check the model files in assets / model';
    console.error('FBX load failed:', error);
  });

  canvas.addEventListener('pointerdown', event => { downAt = [event.clientX, event.clientY]; });
  canvas.addEventListener('pointerup', event => {
    if (!bikeRoot || !downAt) return;
    const distance = Math.hypot(event.clientX - downAt[0], event.clientY - downAt[1]);
    downAt = null;
    if (distance > 5) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(bikeRoot, true)[0];
    if (!hit) return;
    const names = [];
    for (let node = hit.object; node && node !== bikeRoot; node = node.parent) names.push(node.name.toLowerCase());
    const label = names.join(' ');
    let key = 'frame';
    if (/chain|crank|pedal|derail|gear|cassette/.test(label)) key = 'drivetrain';
    else if (/handle|bar|stem|brake|lever|shifter/.test(label)) key = 'cockpit';
    else if (/wheel|tire|tyre|rim|spoke/.test(label)) key = 'wheels';
    window.selectBikePart?.(key);
  });

  function updateHotspots() {
    if (!bikeRoot || !bikeAnchors) return;
    const viewWidth = garage.clientWidth;
    const viewHeight = garage.clientHeight;
    const region = document.querySelector('.hotspots').getBoundingClientRect();
    for (const hotspot of hotspots) {
      const point = bikeAnchors[hotspot.dataset.part].clone();
      point.project(camera);
      const x = (point.x * 0.5 + 0.5) * viewWidth;
      const y = (-point.y * 0.5 + 0.5) * viewHeight;
      hotspot.style.setProperty('--x', `${((x - region.left) / region.width) * 100}%`);
      hotspot.style.setProperty('--y', `${((y - region.top) / region.height) * 100}%`);
      hotspot.style.opacity = point.z > 1 ? '0.25' : '1';
    }
  }

  function resize() {
    const width = garage.clientWidth;
    const height = garage.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    fitCamera();
  }
  function fitCamera() {
    if (!bikeSize || !cameraTarget) return;
    const fovRadians = THREE.MathUtils.degToRad(camera.fov);
    // Keep the whole bicycle in frame while giving it enough presence to read as
    // the centerpiece of the showroom, rather than a small product thumbnail.
    const distance = Math.max(bikeSize.y, bikeSize.x / camera.aspect, bikeSize.z / camera.aspect) / (2 * Math.tan(fovRadians / 2)) * 1.72;
    baseCameraDistance = distance;
    camera.position.set(cameraTarget.x + distance * 0.055, cameraTarget.y + distance * 0.11, cameraTarget.z + distance);
    camera.lookAt(cameraTarget);
    controls.target.copy(cameraTarget);
    controls.minDistance = distance * 0.3;
    controls.maxDistance = distance * 2.25;
    controls.update();
    overviewPosition = camera.position.clone();
    overviewTarget = cameraTarget.clone();
    focusedPart = null;
    document.querySelector('.garage')?.classList.remove('part-focused');
    cameraMotionId += 1;
  }
  window.focusBikePart = key => {
    if (!bikeRoot || !bikeAnchors?.[key] || !overviewPosition || !overviewTarget) return;
    const returnToOverview = focusedPart === key;
    if (!returnToOverview && !focusedPart) {
      // Preserve the current overview heading so zooming back out resumes from
      // the same place instead of snapping to the original load orientation.
      overviewPosition = camera.position.clone();
      overviewTarget = controls.target.clone();
    }
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const destinationTarget = returnToOverview ? overviewTarget.clone() : bikeAnchors[key].clone();
    let destinationPosition;
    if (returnToOverview) {
      destinationPosition = overviewPosition.clone();
    } else {
      const viewDirection = camera.position.clone().sub(controls.target).normalize();
      destinationPosition = destinationTarget.clone().addScaledVector(viewDirection, baseCameraDistance * 0.46);
    }

    focusedPart = returnToOverview ? null : key;
    document.querySelector('.garage')?.classList.toggle('part-focused', !returnToOverview);
    const motionId = ++cameraMotionId;
    const startedAt = performance.now();
    const duration = 760;
    const animateCamera = now => {
      if (motionId !== cameraMotionId) return;
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = progress * progress * (3 - 2 * progress);
      camera.position.lerpVectors(startPosition, destinationPosition, eased);
      controls.target.lerpVectors(startTarget, destinationTarget, eased);
      controls.update();
      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      } else {
        camera.position.copy(destinationPosition);
        controls.target.copy(destinationTarget);
        controls.update();
        if (returnToOverview) window.setOrbitUi?.(true);
      }
    };
    requestAnimationFrame(animateCamera);
  };
  window.zoomBikeOverview = () => {
    if (!focusedPart) return;
    const key = focusedPart;
    // Re-selecting the active part uses the same smooth return-to-overview move.
    window.focusBikePart(key);
  };
  window.addEventListener('resize', resize);

  function countMeshes(root) {
    let count = 0;
    root.traverse(object => { if (object.isMesh) count += 1; });
    return count;
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    updateHotspots();
    renderer.render(scene, camera);
  }
  animate();
}
