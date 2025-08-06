import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";


export function initializeThreeJS(containerRef, width, height) {
  if (!containerRef || !containerRef instanceof HTMLElement) {
    console.error("Invalid container reference provided!");
    return null;
  }

  // Create Scene
  const scene = new THREE.Scene();

  // Camera Setup
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 10, 10);
  camera.lookAt(0, 0, 0);

  // Renderer Setup
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Clear any existing content in the container
  containerRef.innerHTML = "";
  containerRef.appendChild(renderer.domElement);

  // Add Light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 20, 10);
  scene.add(directionalLight);

  // Add Orbit Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.screenSpacePanning = false;
  controls.maxPolarAngle = Math.PI / 2;

  // Debug: Add axes helper to verify scene orientation
  // const axesHelper = new THREE.AxesHelper(5);
  // scene.add(axesHelper);

  // Start Animation Loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  const gradientBackground = createGradientBackground();
  scene.add(gradientBackground);
  // const gridHelper = new THREE.GridHelper(100, 100);
  // scene.add(gridHelper);

  return { scene, camera, renderer, controls };
}

function createGradientBackground() {
  // Vertex Shader: Pass UV coordinates to the fragment shader
  const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
        }
    `;

  // Fragment Shader: Creates a vertical gradient from top to bottom
  const fragmentShader = `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec2 vUv;
        void main() {
            gl_FragColor = vec4(mix(bottomColor, topColor, vUv.y), 1.0);
        }
    `;

  // Define shader uniforms for colors (white at top, light blue at bottom)
  const uniforms = {
    bottomColor: { value: new THREE.Color("#ffffff") }, // White at the top
    topColor: { value: new THREE.Color("#bee9f7") }, // Light blue at the bottom
  };

  // Create ShaderMaterial
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    depthTest: false, // Disable depth testing
    depthWrite: false, // Disable depth writing
  });

  // Create a full-screen quad
  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -1; // Ensure it's always in the background

  return mesh;
}

export function removeAllGroups(scene) {
  // Iterate over scene children in reverse (to avoid index shifting issues)
  for (let i = scene.children.length - 1; i >= 0; i--) {
    const child = scene.children[i];
    if (child instanceof THREE.Group) {
      scene.remove(child); // Remove the group from the scene
    }
  }
}

export function renderWalls(wallData, scene, store) {
  if (!wallData || !scene) return;

  // Find the content group
  const contentGroup = scene.getObjectByName("contentGroup");
  if (!contentGroup) return;

  clearScene(contentGroup);

  // Parse the SVG
  const parser = new DOMParser();
  const wallSvgDoc = parser.parseFromString(wallData, "image/svg+xml");
  const wallPaths = wallSvgDoc.querySelectorAll("path");
  const wallPolylines = wallSvgDoc.querySelectorAll("polyline");
  const scale = 0.005;

  // Load SVG Paths into THREE.js
  const loader = new SVGLoader();
  const wallGroup = new THREE.Group();
  const wallHeight = store.settings.wallsSettings?.height || 100;

  // Create materials
  const meshMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: store.settings.wallsSettings?.opacity,
  });

  const lineMaterial = new LineMaterial({
    color: 0x888888,
    linewidth: 2,
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
  });

  wallPaths.forEach((pathElement) => {
    const pathData = pathElement.getAttribute("d");
    const svgPath = loader.parse(
      `<?xml version="1.0"?><svg><path d="${pathData}"/></svg>`
    );

    svgPath.paths.forEach((path) => {
      // Check if the path is closed by looking for 'Z' command
      const isClosed = pathData.includes("Z");

      if (isClosed) {
        // For closed paths, create a filled mesh
        let shapes = SVGLoader.createShapes(path);
        shapes.forEach((shape) => {
          const extrudeSettings = { depth: wallHeight, bevelEnabled: true };
          const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
          const mesh = new THREE.Mesh(geometry, meshMaterial);
          wallGroup.add(mesh);
        });
      } else {
        // For open paths, create a line
        const points = path.subPaths[0].getPoints();
        const geometry = new LineGeometry();
        geometry.setPositions(points.flatMap((p) => [p.x, p.y, 0]));
        const line = new Line2(geometry, lineMaterial);
        wallGroup.add(line);
      }
    });
  });

  // Handle polylines
  if (wallPolylines.length) {
    wallPolylines.forEach((polyline) => {
      let points = polyline.getAttribute("points");
      if (!points) return;

      // Split points into pairs and convert to numbers
      const pointPairs = points.trim().split(/\s+/);
      const positions = [];

      pointPairs.forEach((pair) => {
        const [x, y] = pair.split(",").map(Number);
        if (!isNaN(x) && !isNaN(y)) {
          positions.push(x, y, 0);
        }
      });

      if (positions.length === 0) return;

      const geometry = new LineGeometry();
      geometry.setPositions(positions);
      const line = new Line2(geometry, lineMaterial);
      wallGroup.add(line);
    });
  }

  wallGroup.scale.set(scale, scale, scale);
  wallGroup.rotation.x = -Math.PI / 2;
  wallGroup.position.y = 0;

  const wallBbox = new THREE.Box3().setFromObject(wallGroup);
  const wallCenter = wallBbox.getCenter(new THREE.Vector3());
  wallGroup.position.sub(wallCenter);
  wallGroup.position.y += (wallHeight * scale) / 2;

  contentGroup.add(wallGroup);
}

function clearScene(contentGroup) {
  while (contentGroup.children.length > 0) {
    const child = contentGroup.children[0];
    contentGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  }
}

export function renderUploadedSvg(svg, scene, store, clear = true) {
  if (!svg || !scene) return;

  // Find the content group
  const contentGroup = scene.getObjectByName("contentGroup");
  if (!contentGroup) return;

  // Clear existing content
  if (clear) clearScene(contentGroup);

  // Parse the SVG
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svg, "image/svg+xml");
  const paths = svgDoc.querySelectorAll("path");
  const polylines = svgDoc.querySelectorAll("polyline");
  const scale = store.settings.uploadedSVGSettings?.scale || 0.05;

  // Load SVG Paths into THREE.js
  const loader = new SVGLoader();
  const group = new THREE.Group();
  const height = store.settings.uploadedSVGSettings?.height || 100;

  // Get current settings from store
  const currentOpacity = store.settings.uploadedSVGSettings?.opacity || 1;
  if (paths.length) {
    paths.forEach((pathElement) => {
      let fill = pathElement.getAttribute("fill");
      fill = fill && fill !== "none" ? fill : "#888888";
      console.log(fill);
      const pathData = pathElement.getAttribute("d");
      const svgPath = loader.parse(
        `<?xml version="1.0"?><svg><path d="${pathData}"/></svg>`
      );

      svgPath.paths.forEach((path) => {
        // Check if the path is closed by looking for 'Z' command
        const isClosed = pathData.includes("Z");

        if (isClosed) {
          // For closed paths, create a filled mesh
          let shapes = SVGLoader.createShapes(path);
          shapes.forEach((shape) => {
            const extrudeSettings = { depth: height, bevelEnabled: true };
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const meshMaterial = new THREE.MeshStandardMaterial({
              color: new THREE.Color(fill),
              side: THREE.DoubleSide,
              transparent: true,
              opacity: currentOpacity,
            });
            const mesh = new THREE.Mesh(geometry, meshMaterial);
            group.add(mesh);
          });
        } else {
          // For open paths, create a line
          const points = path.subPaths[0].getPoints();
          const geometry = new LineGeometry();
          geometry.setPositions(points.flatMap((p) => [p.x, p.y, 0]));
          const lineMaterial = new LineMaterial({
            color: new THREE.Color(fill),
            linewidth: 2,
            resolution: new THREE.Vector2(
              window.innerWidth,
              window.innerHeight
            ),
            transparent: true,
            opacity: currentOpacity,
          });
          const line = new Line2(geometry, lineMaterial);
          group.add(line);
        }
      });
    });
  }

  if (polylines.length) {
    polylines.forEach((polyline) => {
      let points = polyline.getAttribute("points");
      if (!points) return;

      // Split points into pairs and convert to numbers
      const pointPairs = points.trim().split(/\s+/);
      const positions = [];

      pointPairs.forEach((pair) => {
        const [x, y] = pair.split(",").map(Number);
        if (!isNaN(x) && !isNaN(y)) {
          positions.push(x, y, 0);
        }
      });

      if (positions.length === 0) return;

      const geometry = new LineGeometry();
      geometry.setPositions(positions);
      const lineMaterial = new LineMaterial({
        color: new THREE.Color("#000000"),
        linewidth: 2,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
        transparent: true,
        opacity: currentOpacity,
      });
      const line = new Line2(geometry, lineMaterial);
      group.add(line);
    });
  }

  group.scale.set(scale, scale, scale);
  group.rotation.x = Math.PI / 2;

  const bbox = new THREE.Box3().setFromObject(group);
  const center = bbox.getCenter(new THREE.Vector3());
  group.position.sub(center);
  group.position.y += (height * scale) / 2;

  contentGroup.add(group);
}

export function renderSvg(svg, scene, store, clear = true) {
  if (!svg || !scene) return;

  // Find the content group
  const contentGroup = scene.getObjectByName("contentGroup");
  if (!contentGroup) return;

  // Clear existing content
  if (clear) clearScene(contentGroup);

  // Parse the SVG
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svg, "image/svg+xml");
  const paths = svgDoc.querySelectorAll("path");
  const polylines = svgDoc.querySelectorAll("polyline");
  const scale = store.settings.uploadedSVGSettings?.scale || 0.05;

  // Load SVG Paths into THREE.js
  const loader = new SVGLoader();
  const group = new THREE.Group();
  const height = store.settings.uploadedSVGSettings?.height || 100;

  // Get current settings from store
  const currentOpacity = store.settings.uploadedSVGSettings?.opacity || 1;
  if (paths.length) {
    paths.forEach((pathElement) => {
      let fill = pathElement.getAttribute("fill");
      fill = fill && fill !== "none" ? fill : "#888888";
      console.log(fill);
      const pathData = pathElement.getAttribute("d");
      const svgPath = loader.parse(
        `<?xml version="1.0"?><svg><path d="${pathData}"/></svg>`
      );

      svgPath.paths.forEach((path) => {
        // Check if the path is closed by looking for 'Z' command
        const isClosed = pathData.includes("Z");

        if (isClosed) {
          // For closed paths, create a filled mesh
          let shapes = SVGLoader.createShapes(path);
          shapes.forEach((shape) => {
            const extrudeSettings = { depth: height, bevelEnabled: true };
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const meshMaterial = new THREE.MeshStandardMaterial({
              color: new THREE.Color(fill),
              side: THREE.DoubleSide,
              transparent: true,
              opacity: currentOpacity,
            });
            const mesh = new THREE.Mesh(geometry, meshMaterial);
            group.add(mesh);
          });
        } else {
          // For open paths, create a line
          const points = path.subPaths[0].getPoints();
          const geometry = new LineGeometry();
          geometry.setPositions(points.flatMap((p) => [p.x, p.y, 0]));
          const lineMaterial = new LineMaterial({
            color: new THREE.Color(fill),
            linewidth: 2,
            resolution: new THREE.Vector2(
              window.innerWidth,
              window.innerHeight
            ),
            transparent: true,
            opacity: currentOpacity,
          });
          const line = new Line2(geometry, lineMaterial);
          group.add(line);
        }
      });
    });
  }

  if (polylines.length) {
    polylines.forEach((polyline) => {
      let points = polyline.getAttribute("points");
      if (!points) return;

      // Split points into pairs and convert to numbers
      const pointPairs = points.trim().split(/\s+/);
      const positions = [];

      pointPairs.forEach((pair) => {
        const [x, y] = pair.split(",").map(Number);
        if (!isNaN(x) && !isNaN(y)) {
          positions.push(x, y, 0);
        }
      });

      if (positions.length === 0) return;

      const geometry = new LineGeometry();
      geometry.setPositions(positions);
      const lineMaterial = new LineMaterial({
        color: new THREE.Color("#000000"),
        linewidth: 2,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
        transparent: true,
        opacity: currentOpacity,
      });
      const line = new Line2(geometry, lineMaterial);
      group.add(line);
    });
  }

  group.scale.set(scale, scale, scale);
  group.rotation.x = Math.PI / 2;

  const bbox = new THREE.Box3().setFromObject(group);
  const center = bbox.getCenter(new THREE.Vector3());
  group.position.sub(center);
  group.position.y += (height * scale) / 2;

  contentGroup.add(group);
}


