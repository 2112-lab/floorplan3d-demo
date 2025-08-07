import {
  defaultRasterConfigs,
  defaultVectorConfigs,
} from "~/store/konva-store";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { useKonvaStore } from "~/store/konva-store";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ObjectLoader } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import SvgDocumentParser from "./svg-document-parser";

export default class Floorplan3D {
  constructor(containerRef, width, height, doc = null) {
    // Initialize instance properties
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.animationFrameId = null;
    this.isAnimating = false;
    this.gridHelper = null;
    this._doc = doc; // Add document property for export functionality

    // Background
    this.currentBackground = 'gradient';
    this.environmentMap = null;
    this.gradientBackground = null;
    this.skybox = null;
    this.pmremGenerator = null;

    // Background loading state
    this.currentBackgroundType = 'gradient';
    this.currentBackgroundResolution = null;
    this.backgroundLoadingQueue = [];
    this.isLoadingBackground = false;
    this.backgroundLoadTimeout = null;
    this.currentLoadRequest = null; // Add this to track current loading request

    // Set up Three.js
    this.initializeThreeJS(containerRef, width, height);
  }

  // Add document setter method
  doc(document) {
    this._doc = document;
    return this;
  }

  initializeThreeJS(containerRef, width, height) {
    if (!containerRef || !containerRef instanceof HTMLElement) {
      // console.error("Invalid container reference provided!");
      return null;
    }

    console.log('Initializing Three.js scene');

    // Create Scene
    this.scene = new THREE.Scene();

    // Camera Setup
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
    this.camera.position.set(0, 10, 10);
    this.camera.lookAt(0, 0, 0);

    // Renderer Setup
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Initialize PMREMGenerator for environment maps
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    // Clear any existing content in the container
    while (containerRef.firstChild) {
      containerRef.removeChild(containerRef.firstChild);
    }
    containerRef.appendChild(this.renderer.domElement);

    // Add Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    ambientLight.name = 'ambientLight';
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);

    // Add Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 500;

    // Create content group if it doesn't exist
    let contentGroup = this.scene.getObjectByName("contentGroup");
    if (!contentGroup) {
      contentGroup = new THREE.Group();
      contentGroup.name = "contentGroup";
      this.scene.add(contentGroup);
    }

    // Set initial background
    this.currentBackground = 'gradient';
    this.gradientBackground = this.createGradientBackground();
    this.scene.add(this.gradientBackground);

    // Add grid helper
    this.addGridHelper(100, 100, { y: -0.1 });

    // Render once initially to ensure everything is visible
    this.renderScene();

    console.log('Three.js scene initialized');
  }

  renderScene() {
    // Perform a single render of the scene
    if (this.renderer && this.scene && this.camera) {
      try {
        // Update controls first
        this.controls.update();
        
        // Update matrices before rendering
        this.scene.updateMatrixWorld(true);
        
        // Force camera update
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld();
        
        // Now render
        this.renderer.render(this.scene, this.camera);
      } 
      catch (error) {
        // console.error('Error rendering scene:', error);
      }
    } else {
      console.warn('Cannot render scene: renderer, scene, or camera is missing', {
        renderer: !!this.renderer,
        scene: !!this.scene,
        camera: !!this.camera
      });
    }
  }

  startAnimation() {
    if (!this.isAnimating) {
      this.isAnimating = true;
      this.animate();
    }
  }

  animate() {
    if (!this.isAnimating) return;

    this.animationFrameId = requestAnimationFrame(() => this.animate());
    
    // Update skybox position if it exists
    if (this.skybox) {
      this.skybox.updateMatrix();
    }
    
    // Update controls first
    this.controls.update();
    
    // Force matrix updates throughout the scene
    this.scene.traverse((object) => {
      if (object.matrixAutoUpdate) {
        object.updateMatrix();
      }
    });
    this.scene.updateMatrixWorld(true);
    
    // Update camera
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    
    // Now render
    this.renderer.render(this.scene, this.camera);
  }

  createGradientBackground() {
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

  update3dHeight(document) {
    console.log(
      "update3dHeight document:",
      JSON.parse(JSON.stringify(document))
    );
    if (!document || !document.docConfigs || !document.docConfigs.extrusion) {
      console.warn(
        "Document or extrusion config missing, cannot update height"
      );
      return;
    }

    const newHeight = document.docConfigs.extrusion.height.value;
    const documentId = document.id;

    console.log(
      `Updating 3D height for document ${documentId} to ${newHeight}`
    );

    // Check if document has threejsContent
    if (!document.threejsContent) {
      console.error(`Document ${documentId} has no threejsContent`);
      return;
    }

    // Find the content group
    const contentGroup = this.scene.getObjectByName("contentGroup");
    if (!contentGroup) {
      console.error("Could not find main contentGroup in scene");
      return;
    }

    // Get the original height that was used to create the 3D objects
    const originalHeight = 30; // Default height used in renderSvgToScene
    const originalDocHeight =
      document.docConfigs.extrusion._originalHeight || originalHeight;

    // Store current height as original for future scale calculations
    if (!document.docConfigs.extrusion._originalHeight) {
      document.docConfigs.extrusion._originalHeight = originalHeight;
    }

    // Calculate the scale factor for the y-axis (height)
    const heightRatio = newHeight / originalDocHeight;

    // Keep track of whether we updated any objects
    let objectsUpdated = 0;

    // Update all objects for this document
    contentGroup.traverse((object) => {
      if (
        object.userData &&
        object.userData.documentId === documentId &&
        object.scale
      ) {
        // Update the height by adjusting the scale.y of the object        // Keep the x and y scales the same
        const currentScale = object.scale.clone();
        object.scale.set(
          currentScale.x,
          currentScale.y,
          heightRatio * currentScale.z
        );

        // Calculate vertical position based on:
        // 1. The base position from verticalPosition setting
        // 2. Half of the scaled height (to maintain center point)
        const scale = 0.05; // Same scale used in renderSvgToScene
        const verticalPosition = document.docConfigs.extrusion.verticalPosition.value;
        object.position.y = verticalPosition + (newHeight * scale) / 2;

        objectsUpdated++;
      }
    });

    if (objectsUpdated > 0) {
      // Update the original height for future calculations
      document.docConfigs.extrusion._originalHeight = newHeight;
    } else {
      console.warn(
        `No objects found to update height for document ${documentId}`
      );
    }
  }

  update3dOpacity(document) {
    if (!document || !document.docConfigs || !document.docConfigs.extrusion) {
      console.warn(
        "Document or extrusion config missing, cannot update opacity"
      );
      return;
    }

    const documentId = document.id;
    const newOpacity = document.docConfigs.extrusion.opacity.value;

    console.log(
      `Updating 3D opacity for document ${documentId} to ${newOpacity}`
    );

    // Find the main content group in the scene
    let contentGroup = this.scene.getObjectByName("contentGroup");
    if (!contentGroup) {
      console.error("Could not find main contentGroup in scene");
      return;
    }

    // Track modified objects
    let objectsUpdated = 0;

    // Update the opacity of all objects for this document
    contentGroup.traverse((object) => {
      // Skip non-mesh objects and objects from other documents
      if (
        !object.isMesh ||
        !object.userData ||
        object.userData.documentId !== documentId
      ) {
        return;
      }

      // Handle both single materials and material arrays
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => {
          if (material.transparent !== true) {
            material.transparent = true; // Enable transparency if not already enabled
          }
          material.opacity = newOpacity;
          material.needsUpdate = true;
        });
      } else {
        if (object.material.transparent !== true) {
          object.material.transparent = true; // Enable transparency if not already enabled
        }
        object.material.opacity = newOpacity;
        object.material.needsUpdate = true;
      }

      objectsUpdated++;
    });

    if (objectsUpdated > 0) {
      console.log(
        `Updated 3D opacity for ${objectsUpdated} objects in document ${documentId}`
      );
    } else {
      console.warn(
        `No objects found to update opacity for document ${documentId}`
      );
    }
  }
  update3dVerticalPosition(document) {
    if (!document || !document.docConfigs || !document.docConfigs.extrusion) {
      console.warn('Invalid document or missing extrusion config');
      return;
    }

    const documentId = document.id;
    const newPosition = document.docConfigs.extrusion.verticalPosition.value;
    const height = document.docConfigs.extrusion.height.value;
    const scale = 0.05; // Same scale used in renderSvgToScene

    console.log(
      `Updating 3D vertical position for document ${documentId} to ${newPosition}`
    );

    // Find the main content group in the scene
    let contentGroup = this.scene.getObjectByName("contentGroup");
    if (!contentGroup) {
      console.warn('No content group found in scene');
      return;
    }

    // Track modified objects
    let objectsUpdated = 0;    // Update the vertical position of all objects for this document
    contentGroup.traverse((object) => {
      if (object.userData && object.userData.documentId === documentId) {
        // Calculate the vertical position based on:
        // 1. The base position (verticalPosition setting)
        // 2. Half of the scaled height (to place bottom at verticalPosition)
        const newY = newPosition + (height * scale) / 2;
        
        if (object.position.y !== newY) {
          object.position.y = newY;
          object.updateMatrix();
          object.matrixWorldNeedsUpdate = true;
          objectsUpdated++;
        }
      }
    });

    if (objectsUpdated > 0) {
      console.log(`Updated vertical position of ${objectsUpdated} objects`);
      
      // Force matrix updates throughout the scene before rendering
      this.scene.traverse((object) => {
        if (object.matrixAutoUpdate) {
          object.updateMatrix();
        }
      });
      this.scene.updateMatrixWorld(true);
      
      // Now render
      this.renderScene();
    } else {
      console.warn('No objects found for document', documentId);
    }
  }

  async renderSvgToScene(svg, documentId = null) {
    console.log("Starting renderSvgToScene with:", {
      svgExists: !!svg,
      sceneExists: !!this.scene,
      documentId,
    });

    if (!svg || !this.scene) {
      let elementMissing = !svg ? "svg" : "scene";
      console.error(`Missing ${elementMissing}, aborting`);
      return;
    }

    // Find the content group in the scene
    const contentGroup = this.scene.getObjectByName("contentGroup");
    if (!contentGroup) {
      console.error("Could not find contentGroup in scene, aborting");
      return;
    }

    // If documentId is provided, check if content for this document already exists and remove it
    if (documentId) {
      // Find and remove objects tagged with this document ID
      const existingObjects = [];
      contentGroup.traverse((object) => {
        if (object.userData && object.userData.documentId === documentId) {
          existingObjects.push(object);
        }
      });

      // Remove any existing objects for this document
      if (existingObjects.length > 0) {
        console.log(
          `Found ${existingObjects.length} existing objects for document ID ${documentId}, removing them`
        );
        existingObjects.forEach((object) => {
          contentGroup.remove(object);
          this.disposeObject3D(object);
        });
      }
    }

    // Parse the SVG
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, "image/svg+xml");
    const paths = svgDoc.querySelectorAll("path");
    const polylines = svgDoc.querySelectorAll("polyline");
    const scale = 0.05;

    console.log("Parsed SVG:", {
      pathCount: paths.length,
      polylineCount: polylines.length,
    });

    // Load SVG Paths into THREE.js
    const loader = new SVGLoader();

    // Get document-specific extrusion height from docConfigs
    let height = 10; // Default fallback
    if (documentId && useKonvaStore().documents[documentId]) {
      height =
        useKonvaStore().documents[documentId].docConfigs.extrusion.height
          .value || 10;
      console.log(`Using document-specific height for ${documentId}:`, height);
    } else {
      console.log("Using default height:", height);
    }

    // Get current settings from the konva store
    const currentOpacity =
      documentId && useKonvaStore().documents[documentId]
        ? useKonvaStore().documents[documentId].docConfigs.extrusion.opacity
            .value || 0.8
        : 0.8;
    console.log("Room opacity setting:", currentOpacity);

    // Keep track of all objects created for this document
    const createdObjects = [];
    let renderedElements = 0;

    // Helper function to assign document ID to any object
    const assignDocumentId = (object) => {
      if (documentId) {
        object.userData = object.userData || {};
        object.userData.documentId = documentId;
        console.log(`Assigned document ID ${documentId} to object:`, object);
      }
    };

    // Function to process both paths and polylines consistently
    const processElement = (element, elementType, index) => {
      // Skip black filled elements
      const fill = element.getAttribute("fill");
      console.log(`${elementType} ${index} fill:`, fill);

      if (fill === "#000000") {
        console.log(
          `${elementType} ${index} skipped due to black fill (#000000)`
        );
        return;
      }

      // Get the actual fill from the element's fill attribute
      const actualFill = fill || "#888888";

      let points = [];
      let isClosed = false;

      // Extract points and determine if closed based on element type
      if (elementType === "path") {
        const pathData = element.getAttribute("d");
        isClosed = pathData.includes("Z");
        console.log(`Path ${index} is closed:`, isClosed);

        const svgPath = loader.parse(
          `<?xml version="1.0"?><svg><path d="${pathData}"/></svg>`
        );

        if (svgPath.paths.length > 0 && svgPath.paths[0].subPaths.length > 0) {
          points = svgPath.paths[0].subPaths[0].getPoints();
        }

        // For closed paths, use SVGLoader's shape creation
        if (isClosed) {
          svgPath.paths.forEach((path) => {
            let shapes = SVGLoader.createShapes(path);
            shapes.forEach((shape) => {
              const extrudeSettings = { depth: height, bevelEnabled: true };
              const geometry = new THREE.ExtrudeGeometry(
                shape,
                extrudeSettings
              );
              const meshMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(actualFill),
                side: THREE.DoubleSide,
                transparent: true,
                opacity: currentOpacity,
              });
              const mesh = new THREE.Mesh(geometry, meshMaterial);

              // Assign document ID to the mesh
              assignDocumentId(mesh);

              // Apply common transformations
              mesh.scale.set(scale, scale, scale);
              mesh.rotation.x = Math.PI / 2;

              // Add directly to the content group
              contentGroup.add(mesh);
              createdObjects.push(mesh);
              renderedElements++;
            });
          });
          return; // Skip the rest for closed paths
        }
      } else if (elementType === "polyline") {
        const pointsAttr = element.getAttribute("points");
        if (!pointsAttr) {
          console.log(`Polyline ${index} has no points attribute, skipping`);
          return;
        }

        // Parse points from the points attribute
        const pointPairs = pointsAttr.trim().split(/\s+/);
        const pointsArray = [];

        pointPairs.forEach((pair) => {
          const [x, y] = pair.split(",").map(Number);
          if (!isNaN(x) && !isNaN(y)) {
            pointsArray.push(new THREE.Vector2(x, y));
          }
        });

        points = pointsArray;

        // Check if polyline is closed (first and last points match)
        if (points.length >= 3) {
          const firstPoint = points[0];
          const lastPoint = points[points.length - 1];

          // Check if first and last points are the same or very close
          isClosed =
            Math.abs(firstPoint.x - lastPoint.x) < 0.001 &&
            Math.abs(firstPoint.y - lastPoint.y) < 0.001;

          console.log(`Polyline ${index} is closed: ${isClosed}`);

          // Only treat as closed if first and last points actually match
          if (isClosed) {
            const shape = new THREE.Shape(points);
            const extrudeSettings = { depth: height, bevelEnabled: true };
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const meshMaterial = new THREE.MeshStandardMaterial({
              color: new THREE.Color(actualFill),
              side: THREE.DoubleSide,
              transparent: true,
              opacity: currentOpacity,
            });
            const mesh = new THREE.Mesh(geometry, meshMaterial);

            // Assign document ID to the mesh
            assignDocumentId(mesh);

            // Apply common transformations
            mesh.scale.set(scale, scale, scale);
            mesh.rotation.x = Math.PI / 2;

            // Add directly to the content group
            contentGroup.add(mesh);
            createdObjects.push(mesh);
            renderedElements++;
            return; // Skip the rest for closed polylines
          }
        }
      }

      // For open paths/polylines, create extruded lines for each segment
      if (points.length > 1) {
        // Process each line segment separately
        for (let i = 0; i < points.length - 1; i++) {
          const startPoint = points[i];
          const endPoint = points[i + 1];

          // Create a small rectangle shape along this segment
          const lineWidth = 1; // Width of the extruded line
          const direction = new THREE.Vector2()
            .subVectors(
              new THREE.Vector2(endPoint.x, endPoint.y),
              new THREE.Vector2(startPoint.x, startPoint.y)
            )
            .normalize();
          const perpendicular = new THREE.Vector2(
            -direction.y,
            direction.x
          ).multiplyScalar(lineWidth / 2);

          // Create shape for this segment
          const segmentShape = new THREE.Shape();
          segmentShape.moveTo(
            startPoint.x + perpendicular.x,
            startPoint.y + perpendicular.y
          );
          segmentShape.lineTo(
            endPoint.x + perpendicular.x,
            endPoint.y + perpendicular.y
          );
          segmentShape.lineTo(
            endPoint.x - perpendicular.x,
            endPoint.y - perpendicular.y
          );
          segmentShape.lineTo(
            startPoint.x - perpendicular.x,
            startPoint.y - perpendicular.y
          );
          segmentShape.closePath();

          // Extrude the segment
          const extrudeSettings = {
            steps: 1,
            depth: height,
            bevelEnabled: false,
          };

          const geometry = new THREE.ExtrudeGeometry(
            segmentShape,
            extrudeSettings
          );
          const meshMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(actualFill),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: currentOpacity,
          });

          const mesh = new THREE.Mesh(geometry, meshMaterial);

          // Assign document ID to the mesh
          assignDocumentId(mesh);

          // Apply common transformations
          mesh.scale.set(scale, scale, scale);
          mesh.rotation.x = Math.PI / 2;

          // Add directly to the content group
          contentGroup.add(mesh);
          createdObjects.push(mesh);
          renderedElements++;
        }
      }
    };

    // Process all paths
    paths.forEach((pathElement, index) => {
      processElement(pathElement, "path", index);
    });

    // Process all polylines
    polylines.forEach((polyline, index) => {
      processElement(polyline, "polyline", index);
    });

    console.log(`Added ${renderedElements} elements directly to scene`);

    if (renderedElements === 0) {
      console.warn("No elements were rendered for svg!");
      return;
    }

    // Calculate center point for all created objects
    if (createdObjects.length > 0) {
      // Create a bounding box that encompasses all objects
      const groupBbox = new THREE.Box3();
      groupBbox.expandByObject(contentGroup);

      // Get center of the entire group
      const groupCenter = groupBbox.getCenter(new THREE.Vector3());

      // Apply height offset to all objects, preserving their relative positions
      createdObjects.forEach((obj) => {      
        // Apply the height position and vertical offset
        const verticalPosition = (
          documentId && 
          useKonvaStore().documents[documentId] && 
          useKonvaStore().documents[documentId].docConfigs.extrusion.verticalPosition?.value
        ) ? useKonvaStore().documents[documentId].docConfigs.extrusion.verticalPosition?.value : 0;
        
        // Position is based on:
        // 1. The base position (verticalPosition setting)
        // 2. Half of the scaled height (to place bottom at verticalPosition)
        obj.position.y = verticalPosition + (height * scale) / 2;
      });

      contentGroup.position.sub(groupCenter);
    }

    // Add a safety check to ensure the document exists before assigning threejsContent
    if (documentId && useKonvaStore().documents[documentId]) {
      // Store references to all created objects instead of a group
      useKonvaStore().documents[documentId].threejsContent = {
        objects: createdObjects,
        documentId: documentId,
      };
    } else if (documentId) {
      console.warn(`Document with ID ${documentId} not found in Konva store`);
    }

    // Explicitly render the scene
    // this.renderScene();
    console.log(
      "renderSvgToScene - Scene rendered:",
      JSON.parse(JSON.stringify(useKonvaStore().documents[documentId]))
    );

    return createdObjects;
  }

  // Add a method to update 3D visibility based on document properties
  update3DVisibility(documentId, visible) {
    if (!this.scene) return false;

    // Find the content group
    const contentGroup = this.scene.getObjectByName("contentGroup");
    if (!contentGroup) return false;

    // Find all objects for this document by their userData
    let objectsFound = false;
    contentGroup.traverse((object) => {
      if (object.userData && object.userData.documentId === documentId) {
        object.visible = visible;
        objectsFound = true;
      }
    });

    if (objectsFound) {
      console.log(
        `Updated visibility of objects for document ${documentId} to ${visible}`
      );
      this.renderScene();
      return true;
    }

    console.log(`No objects found for document ${documentId}`);
    return false;
  }

  clearScene(contentGroup) {
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

  // Add a public method for adding grid
  addGridHelper(size = 100, divisions = 100, position = { y: -0.1 }) {
    // Remove existing grid if any
    this.removeGridHelper();

    // Create new grid helper
    this.gridHelper = new THREE.GridHelper(size, divisions);
    this.gridHelper.name = "GridHelper";

    // Set position
    if (position) {
      this.gridHelper.position.x = position.x || 0;
      this.gridHelper.position.y = position.y || 0;
      this.gridHelper.position.z = position.z || 0;
    }

    // Add to scene
    if (this.scene) {
      this.scene.add(this.gridHelper);
      // Ensure a render happens after adding the grid
      this.renderScene();
    }

    return this.gridHelper;
  }

  // Add a method to remove grid
  removeGridHelper() {
    if (this.gridHelper && this.scene) {
      this.scene.remove(this.gridHelper);
      if (this.gridHelper.geometry) this.gridHelper.geometry.dispose();
      if (this.gridHelper.material) {
        if (Array.isArray(this.gridHelper.material)) {
          this.gridHelper.material.forEach((mat) => mat.dispose());
        } else {
          this.gridHelper.material.dispose();
        }
      }
      this.gridHelper = null;
      this.renderScene();
    }
  }

  // Helper method to properly dispose of Three.js objects
  disposeObject3D(obj) {
    if (!obj) return;

    // Recursively dispose of all children
    if (obj.children && obj.children.length > 0) {
      // Create a copy of the children array since it will be modified during the loop
      const children = [...obj.children];
      for (const child of children) {
        this.disposeObject3D(child);
        obj.remove(child);
      }
    }

    // Dispose of geometries and materials
    if (obj.geometry) {
      obj.geometry.dispose();
    }

    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((material) => material.dispose());
      } else {
        obj.material.dispose();
      }
    }
  }
  
  // Add export methods
  async exportAsGLTF() {
    if (this._doc?.threejsContent?.objects) {
      const gltfScene = await exportToGLTFBlob(this._doc.threejsContent);
      return new ExportedFile({
        filename: `${this._doc.name}-scene.gltf`,
        blob: gltfScene.blob,
        mime: "model/gltf+json",
      });
    }
  }

  async export(formats = []) {
    const results = [];
    const exportPromises = [];

    for (const format of formats) {
      try {
        if (format === "gltf") {
          exportPromises.push(this.exportAsGLTF());
        }
      } catch (err) {
        console.warn(`Export failed for format "${format}"`, err);
      }
    }

    const exportResults = await Promise.all(exportPromises);
    return exportResults.flat();
  }

  // IMPORT FUNCTIONS


  importSvg(svgStr) {
    // Check if SVG is valid or not
    if (!this.isValidSVGString(svgStr)) {
      throw new Error("Invalid SVG");
    }

    // Check for Inkscape tags - if found, use the specialized importer
    const inkscapeGTagPrefix = useRuntimeConfig().public.inkscapeGTagPrefix;
    const hasFloorplan3dTags = svgStr.includes(inkscapeGTagPrefix);
    if (hasFloorplan3dTags) {
      return this.importFloorPlanSVG(svgStr);
    }

    try {
      return SvgDocumentParser.parseSimpleSvg(svgStr, {
        source: 'imported'
      });
    } catch (error) {
      console.error("Error importing SVG:", error);
      throw error;
    }
  }

  async importFloorPlanSVG(svgStr) {
    try {
      return await SvgDocumentParser.parseLayeredSvg(svgStr, {
        source: 'inkscape'
      });
    } catch (error) {
      console.error("Error importing Inkscape SVG:", error);
      throw error;
    }
  }

  async importFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".jpg,.jpeg,.png,.svg,.json,.gltf,.obj";

      input.onchange = async (e) => {
        try {
          const file = e.target.files[0];
          if (!file) {
            reject(new Error("No file selected"));
            return;
          }

          if (file.type.includes("svg")) {
            const svgStr = await file.text();
            const result = await this.importSvg(svgStr);
            resolve({...result, file: file});
          } else if (
            file.type.includes("jpeg") ||
            file.type.includes("jpg") ||
            file.type.includes("png")
          ) {
            // Wrap FileReader in a Promise
            const result = await new Promise((resolveReader, rejectReader) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target.result;
                const svg = `<svg height="${file.height}" width="${file.width}" xmlns="http://www.w3.org/2000/svg"> <image xlink:href="${base64}" /></svg>`;
                resolveReader({
                  type: file.type, // 'jpeg', 'jpg', or 'png'
                  svg: svg,
                  file: file,
                  document: {
                    ...defaultRasterConfigs,
                    konva: {
                      objects: {},
                      layer: null, // layer will be set when added to store
                    },
                    svgPath: svg,
                    svgPolyline: svg,
                    id: null, // id will be set when added to store
                  }
                });
              };
              reader.onerror = (error) => rejectReader(error);
              reader.readAsDataURL(file);
            });
            resolve({...result, file: file});
          } 
          else {
            reject(new Error("Unsupported file type"));
          }
        } catch (error) {
          reject(error);
        }
      };

      input.onerror = (error) => reject(error);
      input.value = "";
      input.click();
    });
  }

  isValidSVGString(content) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "image/svg+xml");

      // Check for parser errors
      const parseError = doc.querySelector("parsererror");
      if (parseError) return false;

      // Check if root element is <svg>
      const svg = doc.documentElement;
      return svg.nodeName.toLowerCase() === "svg";
    } catch (e) {
      return false;
    }
  }

  async importJsonScene(jsonFile) {
    const jsonStr = await jsonFile.text();

    if (!this.isValidJSON(jsonStr)) {
      throw new Error("Invalid JSON file");
    }
    const json = JSON.parse(jsonStr);
    if (!this.isThreeJSSceneObject(json)) {
      throw new Error("Invalid ThreeJS Scene file");
    }
    return json;
  }

  async importGLTFScene(gltfFile) {
      // Convert File to ArrayBuffer
      const arrayBuffer = await gltfFile.arrayBuffer()
      return arrayBuffer
  }

  async importOBJScene(objFile) {
    try {
      const objContent = await objFile.text();
      console.log("OBJ content loaded:", objContent.substring(0, 100) + "..."); // Log first 100 chars
      return objContent;
    } catch (error) {
      console.error("Error loading OBJ file:", error);
      throw error;
    }
  }

  isValidJSON(str) {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  isThreeJSSceneObject(obj) {
    if (typeof obj !== "object" || obj === null) return false;
    if (obj.metadata?.type !== "Object") return false;
    // Check is material, goemerty and shape exists
    if (!obj.materials || !obj.geometries) return false;
    if (!Array.isArray(obj.object.children)) return false;
    return true;
  }

}

// Helper class for exported files
class ExportedFile {
  constructor({ filename, blob, mime }) {
    this.filename = filename;
    this.blob = blob;
    this.mime = mime || blob.type || "application/octet-stream";
  }

  download() {
    const url = URL.createObjectURL(this.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = this.filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// Helper functions for export
function exportToGLTFBlob(object, options = { binary: false }) {
  return new Promise((resolve, reject) => {
    try {
      const tempScene = new THREE.Scene();

      if (object.objects && Array.isArray(object.objects)) {
        object.objects.forEach((mesh) => {
          if (mesh instanceof THREE.Object3D) {
            const clonedMesh = mesh.clone();
            clonedMesh.position.copy(mesh.getWorldPosition(new THREE.Vector3()));
            const quaternion = new THREE.Quaternion();
            mesh.getWorldQuaternion(quaternion);
            clonedMesh.quaternion.copy(quaternion);
            clonedMesh.scale.copy(mesh.getWorldScale(new THREE.Vector3()));
            tempScene.add(clonedMesh);
          }
        });
      } else if (object instanceof THREE.Object3D) {
        tempScene.add(object.clone());
      } else {
        throw new Error("Invalid object format for GLTF export");
      }

      if (tempScene.children.length === 0) {
        throw new Error("No valid objects found for GLTF export");
      }

      const exporter = new GLTFExporter();
      exporter.parse(
        tempScene,
        (result) => {
          try {
            tempScene.traverse((child) => {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((material) => material.dispose());
                } else {
                  child.material.dispose();
                }
              }
            });

            if (options.binary) {
              const blob = new Blob([result], { type: "model/gltf-binary" });
              resolve({ blob, filename: "scene.glb" });
            } else {
              const gltf = JSON.stringify(result);
              const blob = new Blob([gltf], { type: "application/json" });
              resolve({ blob, filename: "scene.gltf" });
            }
          } catch (error) {
            reject(new Error(`Error processing GLTF result: ${error.message}`));
          }
        },
        (error) => {
          console.error("GLTF export error:", error);
          reject(new Error(`GLTF export failed: ${error.message}`));
        },
        options
      );
    } catch (error) {
      reject(new Error(`Error preparing GLTF export: ${error.message}`));
    }
  });
}
