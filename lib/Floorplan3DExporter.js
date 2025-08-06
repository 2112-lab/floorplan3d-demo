import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";

export class Floorplan3DExporter {
  constructor(doc = null, exportOptions = {}) {
    this._doc = doc;
    this._exportOptions = exportOptions;
  }

  doc(document) {
    this._doc = document;
    return this;
  }

  async exportAsGLTF() {
    if (this._doc.threejsContent && this._doc.threejsContent.objects) {
      const gltfScene = await exportToGLTFBlob(this._doc.threejsContent);
      return new ExportedFile({
        filename: `${this._doc.name}-scene.gltf`,
        blob: gltfScene.blob,
        mime: "model/gltf+json",
      });
    }
  }

  exportAsOBJ() {
    if (this._doc.threejsContent && this._doc.threejsContent.objects) {
      const objBlob = exportToOBJBlob(this._doc.threejsContent);
      return new ExportedFile({
        filename: `${this._doc.name}-scene.obj`,
        blob: objBlob.blob,
        mime: "text/plain",
      });
    }
  }

  exportAsSVG() {
    if (!this._doc) throw new Error("No document set.");
    const results = [];

    if (this._doc.svgPath) {
      results.push(
        new ExportedFile({
          filename: `${this._doc.name}-path.svg`,
          blob: new Blob([this._doc.svgPath], { type: "image/svg+xml" }),
          mime: "image/svg+xml",
        })
      );
    }

    if (this._doc.svgPolyline) {
      results.push(
        new ExportedFile({
          filename: `${this._doc.name}-polyline.svg`,
          blob: new Blob([this._doc.svgPolyline], { type: "image/svg+xml" }),
          mime: "image/svg+xml",
        })
      );
    }

    return results;
  }

  exportAsDocument() {
    if (!this._doc) throw new Error("No document set.");
    return new ExportedFile({
      filename: `${this._doc.name}-doc.json`,
      blob: new Blob([JSON.stringify(this._doc)], { type: "application/json" }),
      mime: "application/json",
    });
  }

  exportAsJSONScene() {
    // This may fail sometimes, add a good condition to check if the scene is valid
    if (!this._doc.threejsContent) return;
    if (!this._doc.threejsContent.objects) return;
    if (!this._doc.threejsContent.objects[0]) return;
    if (!this._doc.threejsContent.objects[0].parent) return;
    if (!this._doc.threejsContent.objects[0].parent.parent) return;
    const scene = this._doc.threejsContent.objects[0].parent.parent;
    if (!scene) return;

    const contentGroup = scene.getObjectByName("contentGroup");
    const clone = contentGroup.clone(true);
    const keep = clone.children.filter(
      (c) => c.userData.documentId === this._doc.id
    );
    if (keep.length) {
      clone.clear();
      clone.add(...keep);
      const json = clone.toJSON();
      return new ExportedFile({
        filename: `${this._doc.name}-json-scene.json`,
        blob: new Blob([JSON.stringify(json)], { type: "application/json" }),
        mime: "application/json",
      });
    }
  }

  async export(formats = []) {
    // this.validateDoc();
    const results = [];
    const exportPromises = [];

    for (const format of formats) {
      try {
        if (format === "gltf") {
          // Push the promise to our array
          exportPromises.push(this.exportAsGLTF());
        } else if (format === "obj") {
          // For synchronous exports, wrap in a resolved promise
          exportPromises.push(Promise.resolve(this.exportAsOBJ()));
        } else if (format === "svg") {
          // For synchronous exports, wrap in a resolved promise
          exportPromises.push(Promise.resolve(this.exportAsSVG()));
        } else if (format === "json") {
          // For synchronous exports, wrap in a resolved promise
          exportPromises.push(Promise.resolve(this.exportAsDocument()));
        } else if (format === "json-scene") {
          // For synchronous exports, wrap in a resolved promise
          const jsonScene = this.exportAsJSONScene();
          if (jsonScene) {
            exportPromises.push(Promise.resolve(jsonScene));
          }
        }
      } catch (err) {
        console.warn(`Export failed for format "${format}"`, err);
      }
    }

    // Wait for all exports to complete
    const exportResults = await Promise.all(exportPromises);

    // Flatten the results (in case some exports return arrays like SVG)
    return exportResults.flat();
  }
}

export class ExportedFile {
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

export function exportToGLTFBlob(object, options = { binary: false }) {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary scene to hold our objects
      const tempScene = new THREE.Scene();

      // If the object is our threejsContent structure
      if (object.objects && Array.isArray(object.objects)) {
        // Add all meshes to the temporary scene
        object.objects.forEach((mesh) => {
          if (mesh instanceof THREE.Object3D) {
            // Clone the mesh to avoid modifying the original
            const clonedMesh = mesh.clone();
            // Preserve the mesh's world position and rotation
            clonedMesh.position.copy(
              mesh.getWorldPosition(new THREE.Vector3())
            );
            // Use getWorldQuaternion instead of getWorldRotation
            const quaternion = new THREE.Quaternion();
            mesh.getWorldQuaternion(quaternion);
            clonedMesh.quaternion.copy(quaternion);
            clonedMesh.scale.copy(mesh.getWorldScale(new THREE.Vector3()));
            tempScene.add(clonedMesh);
          }
        });
      } else if (object instanceof THREE.Object3D) {
        // If it's already a Three.js object, use it directly
        tempScene.add(object.clone());
      } else {
        throw new Error("Invalid object format for GLTF export");
      }

      // If we have no objects in the scene, throw an error
      if (tempScene.children.length === 0) {
        throw new Error("No valid objects found for GLTF export");
      }

      const exporter = new GLTFExporter();
      exporter.parse(
        tempScene,
        (result) => {
          try {
            // Clean up the temporary scene
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
              // Result is an ArrayBuffer
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

export function exportToOBJBlob(object) {
  // Create a temporary group to hold all the meshes
  const tempGroup = new THREE.Group();

  // If the object is our threejsContent structure
  if (object.objects && Array.isArray(object.objects)) {
    // Add all meshes to the temporary group
    object.objects.forEach((mesh) => {
      if (mesh instanceof THREE.Object3D) {
        tempGroup.add(mesh.clone()); // Clone to avoid modifying the original
      }
    });
  } else if (object instanceof THREE.Object3D) {
    // If it's already a Three.js object, use it directly
    tempGroup.add(object.clone());
  } else {
    throw new Error("Invalid object format for OBJ export");
  }

  const exporter = new OBJExporter();
  const objData = exporter.parse(tempGroup);
  const blob = new Blob([objData], { type: "text/plain" });

  // Clean up the temporary group
  tempGroup.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });

  return { blob, filename: "scene.obj" };
}
