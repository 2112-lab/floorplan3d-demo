import {
  defaultRasterConfigs,
  defaultVectorConfigs,
} from "~/store/konva-store";
import { useThreeStore } from "~/store/three-store";
import Floorplan3D from "./Floorplan3D";

class Floorplan3DImporter {
  constructor() {

  }

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
      // Parse the SVG to get dimensions
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgStr, "image/svg+xml");
      
      // Extract the SVG root element dimensions
      const svgRoot = svgDoc.querySelector('svg');
      const svgWidth = svgRoot ? svgRoot.getAttribute('width') : null;
      const svgHeight = svgRoot ? svgRoot.getAttribute('height') : null;
      const viewBox = svgRoot ? svgRoot.getAttribute('viewBox') : null;
      
      // Parse SVG dimensions
      const svgDimensions = {
        width: this.parseSvgDimension(svgWidth),
        height: this.parseSvgDimension(svgHeight),
        viewBox: viewBox ? viewBox.split(' ').map(Number) : null
      };

      // Process the SVG content
      const svgElement = parseSvgToPath(svgStr);
      const paths = svgElement.querySelectorAll("path");
      const objects = null;
      
      // Create a single document ID
      const docId = `doc_imported_${Date.now()}`;
      
      // Create the document structure matching importFloorPlanSVG format
      const document = {
        id: docId,
        name: "Imported SVG",
        type: 'vector',
        isRaster: false,
        metadata: {
          category: 'vector',
          source: 'imported',
          svgDimensions
        },
        svgPath: svgStr,
        svgPolyline: null,
        svgData: {
          element: svgElement,
          svgString: svgStr
        },
        konva: {
          objects: objects,
          layer: null, // Layer will be set by the caller
        },
        ui: {
          displayName: "Imported SVG",
          order: 2,
          menuOpen: false,
          isExtracting: false,
          isVisible: true
        },
        docConfigs: {
          ...defaultVectorConfigs,
          svg: {
            ...defaultVectorConfigs.svg
          }
        }
      };

      // Return in the same structure as importFloorPlanSVG
      return {
        documents: {
          [docId]: document
        },
        svgDimensions,
        rasterDocuments: [],
        vectorDocuments: [document],
        type: "svg",
      };

    } catch (error) {
      console.error("Error importing SVG:", error);
      throw error;
    }
  }

  async importFloorPlanSVG(svgStr) {
    try {
      // Parse the SVG to find specific g-tags
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgStr, "image/svg+xml");
      
      // Extract the SVG root element dimensions
      const svgRoot = svgDoc.querySelector('svg');
      const svgWidth = svgRoot ? svgRoot.getAttribute('width') : null;
      const svgHeight = svgRoot ? svgRoot.getAttribute('height') : null;
      const viewBox = svgRoot ? svgRoot.getAttribute('viewBox') : null;
      
      // Parse SVG dimensions
      const svgDimensions = {
        width: this.parseSvgDimension(svgWidth),
        height: this.parseSvgDimension(svgHeight),
        viewBox: viewBox ? viewBox.split(' ').map(Number) : null
      };
      
      // Create a serializer to convert elements back to string
      const serializer = new XMLSerializer();
      const inkscapeGTagPrefix = useRuntimeConfig().public.inkscapeGTagPrefix;
      
      // Find all elements with IDs starting with the inkscapeGTagPrefix
      const floorplan3dElements = Array.from(svgDoc.querySelectorAll(`g[id^="${inkscapeGTagPrefix}"]`));
      
      // Track raster and vector elements separately
      const vectorElements = [];
      const rasterPromises = [];
      const documents = {};
      
      // Process each element
      for (const element of floorplan3dElements) {
        const layerId = element.id;
        const layerName = layerId.replace(inkscapeGTagPrefix, '');
        const displayName = layerName.charAt(0).toUpperCase() + layerName.slice(1);
        const isRaster = !!element.querySelector('image');
        
        // Create SVG string for this layer
        const layerSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            ${serializer.serializeToString(element)}
          </svg>`;
        
        if (isRaster) {
          // Handle raster elements
          const rasterPromise = (async () => {
            const imageElement = element.querySelector('image');
            if (imageElement) {
              // Extract image dimensions and position
              const imgWidth = imageElement.getAttribute('width');
              const imgHeight = imageElement.getAttribute('height');
              const imgX = imageElement.getAttribute('x') || 0;
              const imgY = imageElement.getAttribute('y') || 0;
              const preserveAspectRatio = imageElement.getAttribute('preserveAspectRatio');
              
              const imageDimensions = {
                width: this.parseSvgDimension(imgWidth),
                height: this.parseSvgDimension(imgHeight),
                x: parseFloat(imgX),
                y: parseFloat(imgY),
                preserveAspectRatio
              };
              
              // Get the base64 data
              let base64Data = imageElement.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
              
              if (base64Data) {
                const imageFile = await this.fetchBase64AsFile(base64Data, `${layerName}-image.jpg`);
                if (imageFile) {
                  const metadata = {
                    dimensions: imageDimensions,
                    svgDimensions: svgDimensions,
                    source: 'inkscape',
                    originalId: layerId
                  };
                  
                  // Create document with flat structure including UI properties
                  const id = `doc_${layerName}_${Date.now()}`;
                  documents[id] = {
                    id,
                    name: displayName,
                    type: 'raster',
                    isRaster: true,
                    metadata: {
                      category: 'raster',
                      type: 'image',
                      filename: imageFile.name,
                      ...metadata
                    },
                    svgPath: layerSvg,
                    svgPolyline: layerSvg,
                    imageFile: imageFile,
                    imageUrl: URL.createObjectURL(imageFile),
                    ui: {
                      displayName: displayName,
                      order: 2,
                      menuOpen: false,
                      isExtracting: false,
                      isVisible: true
                    },
                    docConfigs: {
                      ...defaultRasterConfigs,
                      layer: {
                        opacity: {
                          min: 0,
                          max: 1,
                          step: 0.1,
                          value: 1,
                          default: 1
                        },
                        scale: {
                          min: 0.1,
                          max: 5,
                          step: 0.1,
                          value: 1,
                          default: 1
                        },
                        pos: {
                          x: {
                            min: -1000,
                            max: 1000,
                            value: imageDimensions.x,
                            default: 0
                          },
                          y: {
                            min: -1000,
                            max: 1000,
                            value: imageDimensions.y,
                            default: 0
                          }
                        }
                      }
                    }
                  };
                  
                  return documents[id];
                }
              }
            }
            return null;
          })();
          
          rasterPromises.push(rasterPromise);
        } else {
          // For vector elements, create flat document structure with UI properties
          const id = `doc_${layerName}_${Date.now()}`;
          const svgElement = parseSvgToPath(layerSvg);
          const paths = svgElement.querySelectorAll("path");
          const objects = null;
  
          const svgPolyline = null;

          documents[id] = {
            id,
            name: displayName,
            type: 'vector',
            isRaster: false,
            metadata: {
              category: 'vector',
              source: 'inkscape',
              originalId: layerId,
              svgDimensions
            },
            svgPath: layerSvg,
            svgPolyline: svgPolyline,
            svgData: {
              element: element,
              svgString: layerSvg
            },
            konva: {
              objects: objects,
              layer:null,
            },
            ui: {
              displayName: displayName,
              order: 2,
              menuOpen: false,
              isExtracting: false,
              isVisible: true
            },
            docConfigs: {
              ...defaultVectorConfigs,
              svg: {
                ...defaultVectorConfigs.svg
              }
            }
          };
          
          vectorElements.push(documents[id]);
        }
      }
      
      // Process all raster elements
      const rasterResults = await Promise.all(rasterPromises);
      
      // Return all processed documents in a flat structure
      return {
        documents,
        svgDimensions,
        rasterDocuments: rasterResults.filter(Boolean),
        vectorDocuments: vectorElements,
        type: "svg"
      };
      
    } catch (error) {
      console.error("Error importing Inkscape SVG:", error);
      throw error;
    }
  }

  parseSvgDimension(value) {
    if (!value) return null;
    
    // If it's already a number, return it
    if (!isNaN(parseFloat(value)) && value.trim().match(/^-?\d+(\.\d+)?$/)) {
      return parseFloat(value);
    }
    
    // Handle common SVG units
    const match = value.match(/^([\d.-]+)(\w+)?$/);
    if (!match) return null;
    
    const numValue = parseFloat(match[1]);
    const unit = match[2] || 'px';
    
    // Convert units to pixels
    switch (unit.toLowerCase()) {
      case 'mm':
        return numValue * 3.779528;
      case 'cm':
        return numValue * 37.79528;
      case 'in':
        return numValue * 96;
      case 'pt':
        return numValue * 1.333333;
      case 'pc':
        return numValue * 16;
      case 'em':
      case 'rem':
        return numValue * 16;
      case 'px':
      default:
        return numValue;
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
          } else if (file.type.includes("json")) {
            this.importJsonScene(file);
          } else if (file.type.includes("gltf") || file.name.includes("gltf")) {
            this.importGLTFScene(file);
          } else if (file.type.includes("obj") || file.name.includes("obj")) {
            this.importOBJScene(file);
          } else {
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

  async fetchBase64AsFile(base64Data, filename) {
    try {
      // Check if the base64Data has a valid format
      if (!base64Data || typeof base64Data !== "string") {
        console.error("Invalid base64 data provided");
        return null;
      }

      // Determine content type from base64 header
      let contentType = "image/jpeg"; // Default to JPEG
      if (base64Data.startsWith("data:")) {
        contentType = base64Data.split(";")[0].split(":")[1];
      }

      // If base64 has data:image format, remove the header
      let base64Content = base64Data;
      if (base64Data.includes("base64,")) {
        base64Content = base64Data.split("base64,")[1];
      }

      // Use a more efficient approach for larger files
      // This avoids creating intermediate arrays and reduces memory usage
      try {
        // Use fetch API with Blob directly - much faster for large files
        const response = await fetch(base64Data);
        if (response.ok) {
          const blob = await response.blob();
          return new File([blob], filename, { type: contentType });
        }
      } catch (e) {
        // Fallback to manual conversion if fetch approach fails
        console.log("Falling back to manual base64 conversion");
      }

      // Fallback to the original approach if needed
      const byteCharacters = atob(base64Content);

      // Process in larger chunks to improve performance
      const chunkSize = 8192; // Increased from 512 to 8192 bytes
      const byteArrays = [];

      for (
        let offset = 0;
        offset < byteCharacters.length;
        offset += chunkSize
      ) {
        const slice = byteCharacters.slice(
          offset,
          Math.min(offset + chunkSize, byteCharacters.length)
        );

        // Use a more efficient typed array approach
        const byteNumbers = new Uint8Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }

        byteArrays.push(byteNumbers);
      }

      // Create a Blob from the binary data
      const blob = new Blob(byteArrays, { type: contentType });

      // Create a File from the Blob
      return new File([blob], filename, { type: contentType });
    } catch (error) {
      console.error("Error converting base64 to file:", error);
      return null;
    }
  }

  async importJsonScene(jsonFile) {
    const jsonStr = await jsonFile.text();

    if (!this.isValidJSON(jsonStr)) {
      throw new Error("Invalid JSON file");
    }
    const json = JSON.parse(jsonStr);
    console.log(json);
    if (!this.isThreeJSSceneObject(json)) {
      throw new Error("Invalid ThreeJS Scene file");
    }

    console.log(json);
    const floorplan3D = new Floorplan3D();
    const result = await floorplan3D.renderImported(
      useThreeStore().scene,
      json,
      "json"
    );
    console.log(result);
  }

  async importGLTFScene(gltfFile) {
    try {
      // Convert File to ArrayBuffer
      const arrayBuffer = await gltfFile.arrayBuffer();
      
      // Create Floorplan3D instance and use it to render the imported scene
      const floorplan3D = new Floorplan3D();
      const result = await floorplan3D.renderImported(
        useThreeStore().scene,
        arrayBuffer,
        "gltf"
      );

      if (!result) {
        throw new Error("Failed to render GLTF scene");
      }

      return result;
    } catch (error) {
      console.error("Error importing GLTF:", error);
      throw error;
    }
  }

  async importOBJScene(objFile) {
    try {
      // Get OBJ content as text
      const objContent = await objFile.text();
      
      // Create Floorplan3D instance and use it to render the imported scene
      const floorplan3D = new Floorplan3D();
      const result = await floorplan3D.renderImported(
        useThreeStore().scene,
        objContent,
        "obj"
      );

      if (!result) {
        throw new Error("Failed to render OBJ scene");
      }

      return result;
    } catch (error) {
      console.error("Error importing OBJ:", error);
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

class ToDocument {
  constructor(config) {
    this.config = config;
  }

  toDocument(doc_id) {
    return this.config;
  }
}

export default Floorplan3DImporter;



// function addBase64ImageToLayer(imageFile, stage, konvaStore, metadata = null) {
//   if (!imageFile || !stage || !konvaStore) return null;
  
//   // Create a new document ID
//   const doc_id = `doc_${Object.keys(konvaStore.documents).length + 1}`;
  
//   // Create a new layer for the image
//   const imageLayer = new Konva.Layer({ name: "rasterImage" });
//   stage.add(imageLayer);
  
//   // Create a new image URL
//   const imageUrl = URL.createObjectURL(imageFile);
  
//   // Load the image
//   const image = new Image();
//   image.onload = () => {
//     // Create a Konva image object
//     const konvaImage = new Konva.Image({
//       x: 0,
//       y: 0,
//       image: image,
//       width: image.width,
//       height: image.height,
//     });
    
//     // Add the image to the layer
//     imageLayer.add(konvaImage);
    
//     // Scale and center the image in the viewport
//     const stageWidth = stage.width();
//     const stageHeight = stage.height();
    
//     let displayScale, x, y;
    
//     // If metadata with dimensions is provided, use those values for proper scaling
//     if (metadata && metadata.dimensions) {
//       const imgDimensions = metadata.dimensions;
//       const svgDimensions = metadata.svgDimensions;
      
//       // If we have both image and SVG dimensions, we can calculate the proper scale
//       if (imgDimensions.width && imgDimensions.height && svgDimensions && svgDimensions.width && svgDimensions.height) {
        
//         // Use the original image position from the SVG
//         x = imgDimensions.x || 0;
//         y = imgDimensions.y || 0;
        
//         // Use the dimensions specified in the SVG image tag
//         konvaImage.width(imgDimensions.width);
//         konvaImage.height(imgDimensions.height);
        
//         // Scale to match the image dimensions from SVG
//         displayScale = 1;
//       } else {
//         // If incomplete dimension info, fall back to default scaling
//         displayScale = 1;
        
//         // Calculate centered position
//         x = (stageWidth - image.width * displayScale) / 2;
//         y = (stageHeight - image.height * displayScale) / 2;
//       }
//     } else {
//       // Default scaling and positioning without metadata
//       displayScale = Math.min(
//         stageWidth / image.width, 
//         stageHeight / image.height
//       ) * 1;
      
//       // Calculate centered position
//       x = (stageWidth - image.width * displayScale);
//       y = (stageHeight - image.height * displayScale);
//     }
    
//     // Scale the image for display
//     konvaImage.scale({ x: displayScale, y: displayScale });
    
//     // Position the image
//     konvaImage.position({ 
//       x: (stageWidth / 2) - (metadata.dimensions.width / 2),
//       y: (stageHeight / 2) - (metadata.dimensions.height / 2)
//     });
    
//     // Add the document to konva store
//     konvaStore.addDocument(doc_id, "Raster Image", {
//       konva: {
//         layer: imageLayer,
//         image: konvaImage,
//       },
//       imageUrl: imageUrl,
//       metadata: {
//         category: 'raster',
//         type: 'image',
//         filename: imageFile.name,
//         ...(metadata || {})  // Include any metadata passed in
//       },
//       docConfigs: {
//         layer: {
//           opacity: {
//             min: 0,
//             max: 1,
//             step: 0.1,
//             value: 1,
//             default: 1
//           },
//           scale: {
//             min: 0.1,
//             max: 5,
//             step: 0.1,
//             value: displayScale, // Use the calculated display scale
//             default: displayScale
//           },
//           pos: {
//             x: {
//               min: -1000,
//               max: 1000,
//               value: x,
//               default: 0
//             },
//             y: {
//               min: -1000,
//               max: 1000,
//               value: y,
//               default: 0
//             }
//           }
//         }
//       }
//     });

//     let base64 = null;
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       base64 = e.target.result;
//       // Create SVG with the proper dimensions from metadata if available
//       const imgWidth = metadata?.dimensions?.width || image.width;
//       const imgHeight = metadata?.dimensions?.height || image.height;
      
//       const svg = `<svg height="${imgHeight}" width="${imgWidth}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <image xlink:href="${base64}" width="${imgWidth}" height="${imgHeight}" /></svg>`;
//       konvaStore.setSvgPolyline(doc_id, svg) 
//       konvaStore.setSvgPath(doc_id, svg) 
//     };
//     reader.readAsDataURL(imageFile);
    
//     // Activate the document
//     konvaStore.setDocumentActive(doc_id);
    
//     // Draw the layer
//     imageLayer.batchDraw();
//   };
  
//   image.src = imageUrl;
  
//   return doc_id;
// }