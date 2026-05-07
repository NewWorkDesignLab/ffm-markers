import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

const BASE = (import.meta.env?.BASE_URL ?? "/").replace(/\/$/, "");
const MODEL_URL = `${BASE}/FFM_Modell_Unity.fbx`;

const BLANK_PNG =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

let modelPromise = null;
function loadModel() {
	if (!modelPromise) {
		const manager = new THREE.LoadingManager();
		manager.setURLModifier((url) => {
			if (url === MODEL_URL) return url;
			if (/\.(png|jpe?g|tga|bmp|gif|tif?f|exr|hdr)(\?.*)?$/i.test(url)) {
				return BLANK_PNG;
			}
			return url;
		});
		manager.onError = (url) => {
			console.warn("[markerViewport] asset missing, ignored:", url);
		};
		const loader = new FBXLoader(manager);
		modelPromise = new Promise((resolve, reject) => {
			loader.load(MODEL_URL, (obj) => resolve(obj), undefined, (err) => reject(err));
		});
	}
	return modelPromise.then((obj) => obj.clone(true));
}

export function createMarkerViewport(container, cfg) {
	const width = () => container.clientWidth || 320;
	const height = () => container.clientHeight || 220;

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0xf5f6f8);

	const camera = new THREE.PerspectiveCamera(45, width() / height(), 0.01, 100000);
	camera.position.set(4, 4, 6);
	camera.lookAt(0, 0, 0);

	const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(width(), height());
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	container.appendChild(renderer.domElement);

	scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe3ea, 1.0));
	const dir = new THREE.DirectionalLight(0xffffff, 0.55);
	dir.position.set(5, 10, 7);
	scene.add(dir);

	const grid = new THREE.GridHelper(5, 10, 0x2563eb, 0xcbd1db);
	grid.material.transparent = true;
	grid.material.opacity = 0.9;
	scene.add(grid);

	const markerMat = new THREE.MeshBasicMaterial({
		color: 0x1a1d24,
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.85,
	});
	const markerMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25), markerMat);
	markerMesh.rotation.x = -Math.PI / 2;
	scene.add(markerMesh);

	const markerEdges = new THREE.LineSegments(
		new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.25, 0.25)),
		new THREE.LineBasicMaterial({ color: 0x2563eb }),
	);
	markerEdges.rotation.x = -Math.PI / 2;
	scene.add(markerEdges);

	const arrow = new THREE.ArrowHelper(
		new THREE.Vector3(0, 1, 0),
		new THREE.Vector3(0, 0, 0),
		0.25,
		0x16a34a,
		0.06,
		0.04,
	);
	scene.add(arrow);

	scene.add(new THREE.AxesHelper(0.4));

	const markerSpace = new THREE.Group();
	markerSpace.rotation.x = -Math.PI / 2;
	scene.add(markerSpace);

	const modelGroup = new THREE.Group();
	markerSpace.add(modelGroup);

	const placeholder = new THREE.Mesh(
		new THREE.BoxGeometry(0.3, 0.3, 0.3),
		new THREE.MeshStandardMaterial({ color: 0xf59e0b }),
	);
	modelGroup.add(placeholder);

	loadModel()
		.then((obj) => {
			modelGroup.remove(placeholder);

			obj.updateMatrixWorld(true);
			const meshes = [];
			obj.traverse((child) => {
				if (child.isMesh) meshes.push(child);
			});
			const flat = new THREE.Group();
			const sharedMat = new THREE.MeshBasicMaterial({
				color: 0x000000,
				transparent: true,
				opacity: 0.15,
				side: THREE.DoubleSide,
				depthWrite: false,
				polygonOffset: true,
				polygonOffsetFactor: 1,
				polygonOffsetUnits: 1,
			});
			for (const mesh of meshes) {
				const geo = mesh.geometry.clone();
				geo.applyMatrix4(mesh.matrixWorld);
				const m = new THREE.Mesh(geo, sharedMat);
				flat.add(m);
			}

			modelGroup.add(flat);

			flat.scale.setScalar(0.5 * 0.01);

			try {
				const box = new THREE.Box3().setFromObject(flat);
				if (box.isEmpty()) return;
				const size = new THREE.Vector3();
				const center = new THREE.Vector3();
				box.getSize(size);
				box.getCenter(center);

				const corners = [
					new THREE.Vector3(box.min.x, box.min.y, box.min.z),
					new THREE.Vector3(box.min.x, box.min.y, box.max.z),
					new THREE.Vector3(box.min.x, box.max.y, box.min.z),
					new THREE.Vector3(box.min.x, box.max.y, box.max.z),
					new THREE.Vector3(box.max.x, box.min.y, box.min.z),
					new THREE.Vector3(box.max.x, box.min.y, box.max.z),
					new THREE.Vector3(box.max.x, box.max.y, box.min.z),
					new THREE.Vector3(box.max.x, box.max.y, box.max.z),
				];
				const radius = Math.max(
					...corners.map((c) => c.length()),
					size.length() * 0.5,
					1.5,
				);

				const fov = (camera.fov * Math.PI) / 180;
				const dist = (radius / Math.sin(fov / 2)) * 0.45;
				const dirVec = new THREE.Vector3(1, 0.7, 1).normalize();
				camera.near = 0.05;
				camera.far = radius * 100;
				camera.position.copy(dirVec.multiplyScalar(dist));
				camera.updateProjectionMatrix();
				controls.target.set(0, 0, 0);
				controls.update();
			} catch (e) {
				console.warn("auto-frame failed:", e);
			}
		})
		.catch((err) => {
			console.warn("FBX load failed:", err);
		});

	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.target.set(0, 0, 0);

	const applyOffset = (c) => {
		const p = c.positionOffset || { x: 0, y: 0, z: 0 };
		const q = c.rotationOffset || { x: 0, y: 0, z: 0, w: 1 };
		const s = c.scaleMultiplier || { x: 1, y: 1, z: 1 };
		modelGroup.position.set(p.x || 0, p.y || 0, p.z || 0);
		modelGroup.quaternion.set(q.x || 0, q.y || 0, q.z || 0, q.w ?? 1).normalize();
		modelGroup.scale.set(s.x || 1, s.y || 1, s.z || 1);
	};
	applyOffset(cfg);

	let raf = 0;
	let running = true;
	const animate = () => {
		if (!running) return;
		controls.update();
		renderer.render(scene, camera);
		raf = requestAnimationFrame(animate);
	};
	animate();

	const ro = new ResizeObserver(() => {
		const w = width();
		const h = height();
		if (!w || !h) return;
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		renderer.setSize(w, h);
	});
	ro.observe(container);

	return {
		update(c) {
			applyOffset(c);
		},
		dispose() {
			running = false;
			cancelAnimationFrame(raf);
			ro.disconnect();
			controls.dispose();
			renderer.dispose();
			renderer.domElement.remove();
		},
	};
}

