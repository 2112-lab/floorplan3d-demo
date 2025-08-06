<template>
  <div>
    <LayersPanel />

    <!-- Import Button -->
    <div style="position: fixed; top: 10px; right: 10px; z-index: 1000;">
      <v-btn
        variant="outlined"
        @click="importFile"
        size="small"
        class="px-2"
      >
        Import
      </v-btn>
    </div>

    <!-- Hidden konva renderer for dependencies -->
    <div style="display: none">
      <KonvaRenderer ref="konvaRenderer" />
      <div ref="hiddenContainer"></div>
    </div>

    <!-- Main ThreeJS Container -->
    <main class="main threejs-main">
      <ThreejsRenderer ref="threejsRenderer" class="threejs-primary" />
    </main>

  </div>
</template>

<script>
import LeftPanel from "../components/left-panel/left-panel.vue";
import StatusBar from "../components/status-bar/status-bar.vue";
import SlidingViewPort from "../components/sliding-viewport/sliding-viewport.vue";
import KonvaRenderer from "~/components/konva-renderer/konva-renderer.vue";
import ThreejsRenderer from "~/components/threejs-renderer/threejs-renderer.vue";
import { useEditStore } from "~/store/edit";
import Exports from "~/components/exports.vue";
import AiConsole  from "~/components/ai-console/ai-console.vue";
import LayersPanel  from "~/components/documents-panel.vue";
import { addRasterImageToLayer, renderSvgInKonva, svgToKonvaObjects } from "~/lib/konva/konva";
import { useNotificationStore } from "~/store/notification";
import { useThreeStore } from "~/store/three-store";
import { useConsoleStore } from "~/store/console-store";
import { centerLayer, centerLayersAsGroup } from "~/lib/konva/center-layer";
import { useEventBusStore } from "~/store/event-bus";
import { cloneDeep } from 'lodash';
import { formatSVG } from "~/lib/svg";
import Konva from "konva";
import Floorplan3D from "~/lib/Floorplan3D";
import Floorplan3DImporter from "~/lib/Floorplan3DImporter";

// Utility function for safe deep cloning
const safeDeepClone = (obj) => {
  try {
    return cloneDeep(obj);
  } catch (error) {
    console.warn('Deep clone failed, falling back to shallow copy:', error);
    return { ...obj };
  }
};

export default {
  components: {
    LeftPanel,
    StatusBar,
    SlidingViewPort,
    KonvaRenderer,
    ThreejsRenderer,
    AiConsole,
    LayersPanel
  },
  data() {
    return {
      editStore: useEditStore(),
      notificationStore: useNotificationStore(),
      threestore: useThreeStore(),
      consoleStore: useConsoleStore(),
      konvaRenderer: null,
      threejsRenderer: null,
      currentFile: null, // Store the current file being processed
      showExtractionDialog: false,
      extractionOptions: {
        walls: true,
        rooms: false,
      },
    };
  },
  mounted() {
    // Store references to renderers
    this.konvaRenderer = this.$refs.konvaRenderer;
    this.threejsRenderer = this.$refs.threejsRenderer;

    // Initialize both renderers
    this.$nextTick(() => {
      // Initialize Konva renderer even though it's hidden (needed for dependencies)
      if (this.konvaRenderer) {
        this.konvaRenderer.initKonvaIfNeeded();
      }
      
      // Initialize threejs renderer
      if (this.threejsRenderer) {
        this.threejsRenderer.resizeThreeJs();
      }
    });

    const config = useRuntimeConfig();
    if (config.public.developmentMode === 'none') {
      console.log('Running in local development mode');
    }
  },
  methods: {
    async importFile() {
      try {
        const importer = new Floorplan3D(null, null, null);

        let importedData;
        
        importedData = await importer.importFile();
        
        // Create a proper copy of the file object to avoid shared references
        if (importedData.file) {
          importedData.file = new File([importedData.file], importedData.file.name, { 
            type: importedData.file.type,
            lastModified: importedData.file.lastModified
          });
        }
        
        // handle svg upload
        if(importedData.type === "svg"){
          const svgContent = await importedData.file.text();
         
          let layersToCenter = [];            
          // Create a deep copy of vector documents and sort them
          const vectorDocsCopy = safeDeepClone(importedData.vectorDocuments);
          const sortedVectorDocs = vectorDocsCopy.sort((a, b) => {
            // Rooms should come first
            if (a.name.toLowerCase().includes('room') && !b.name.toLowerCase().includes('room')) return -1;
            if (!a.name.toLowerCase().includes('room') && b.name.toLowerCase().includes('room')) return 1;
            // Walls should come second
            if (a.name.toLowerCase().includes('wall') && !b.name.toLowerCase().includes('wall')) return -1;
            if (!a.name.toLowerCase().includes('wall') && b.name.toLowerCase().includes('wall')) return 1;
            return 0;
          });

          // Process raster documents last with highest order
          // Create a deep copy of raster documents to avoid reference issues          
          const rasterDocsCopy = safeDeepClone(importedData.rasterDocuments);
          for (const doc of rasterDocsCopy) {
            if (doc && doc.imageFile) {
              console.log("Processing raster doc:", doc.name);
              
              // Create a fresh copy of the image file
              const imageFileCopy = new File([doc.imageFile], doc.imageFile.name, {
                type: doc.imageFile.type,
                lastModified: doc.imageFile.lastModified
              });
              
              this.editStore.setUploadedImage(imageFileCopy);
              // Create a deep copy of the metadata to prevent shared references              
              const metadataCopy = safeDeepClone(doc.metadata || {});
              
              const docId = this.addBase64ImageToLayer(
                imageFileCopy,
                this.$konvaStore.baseLayer,
                this.$konvaStore,
                {
                  ...metadataCopy,
                  order: 3 // Raster gets highest order (appears last)
                }
              );
              
              if (docId) {
                if (this.$konvaStore.documents[docId]) {
                  this.$konvaStore.renameDocument(docId, doc.name);
                  const doc = this.$konvaStore.documents[docId];                  
                  if (doc) {
                    // Create a new metadata object instead of modifying the existing one
                    const newMetadata = {
                      ...(doc.metadata || {}),
                      source: 'inkscape',
                      originalId: doc.metadata?.originalId,                      
                      dimensions: safeDeepClone(doc.metadata?.dimensions || {}),
                      svgDimensions: safeDeepClone(doc.metadata?.svgDimensions || {})
                    };
                    
                    // Update the document with the new metadata object
                    this.$konvaStore.updateDocument(docId, {
                      metadata: newMetadata,
                      ui: {
                        ...(doc.ui || {}),
                        order: 3 // Ensure raster documents have highest order
                      }
                    });
                    
                    if (doc.konva && doc.konva.layer) {
                      layersToCenter.push(doc.konva.layer);
                    }
                  }
                }
              }
            }
          }

          // Process vector documents first (rooms and walls)
          for (let doc of sortedVectorDocs) {
            // Ensure baseLayer exists before using it
            if (!this.$konvaStore.baseLayer) {
              console.error('Konva baseLayer not initialized. Cannot import vector documents.');
              this.notificationStore.notify({
                message: "Konva renderer not initialized. Please try again.",
                type: "error",
              });
              return;
            }

            const layerKonva = new Konva.Group({ name: doc.id, type: "vector-layer" });
            this.$konvaStore.baseLayer.add(layerKonva);
            layersToCenter.push(layerKonva);
            
            // Assign order based on document type
            let order = 2; // Default order
            if (doc.name.toLowerCase().includes('room')) {
              order = 1; // Rooms get lowest order (appear first)
            } else if (doc.name.toLowerCase().includes('wall')) {
              order = 2; // Walls get middle order
            }
            // Create a proper deep copy with independent properties            
            const docCopy = safeDeepClone(doc);
            
            // Add the new layer and order properties with clean references
            this.$konvaStore.addDocument(doc.id, doc.name, {
              ...docCopy,
              konva: {
                ...docCopy.konva,
                layer: layerKonva
              },
              ui: {
                ...docCopy.ui,
                order: order
              }
            });

            // Use svgPath directly without unnecessary deep cloning
            const {objects} = svgToKonvaObjects(doc.svgPath, doc.id);
            this.$konvaStore.setKonvaObjects(doc.id, objects);
            renderSvgInKonva(layerKonva, objects, this.$konvaStore.baseLayer);
          } 

          setTimeout(() => {
            // Sequentially set each vector document as active, to trigger renderSvgToScene
            for(let docKey in this.$konvaStore.documents) {
              let doc = this.$konvaStore.documents[docKey];
              if(doc.metadata.category === "vector") {
                setTimeout(() => {
                  this.$konvaStore.setDocumentActive(doc.id);
                }, 5)
              }
            }          
          }, 100);

          if (layersToCenter.length > 0) {
            const viewBox = this.extractViewBox(svgContent);
            centerLayersAsGroup(layersToCenter, viewBox);
            this.stageZoomToFit();
          }      

        }        
        // handle json scene upload
        if(importedData.type.includes("json")){
          // Create a proper deep copy of the JSON data          
          const jsonScene = safeDeepClone(importedData.json);
          await importer.renderImported(this.threestore.scene, jsonScene, "json");
        }
        // handle gltf scene upload
        if(importedData.type === "gltf"){          
          // Use safe deep clone for complex object structures
          const gltfScene = safeDeepClone(await importedData.gltf);
          await importer.renderImported(this.threestore.scene, gltfScene, "gltf");
        }

        // handle obj scene upload
        if(importedData.type === "obj"){          
          // Use safe deep clone for complex object structures
          const objScene = safeDeepClone(await importedData.obj);
          await importer.renderImported(this.threestore.scene, objScene, "obj");
        } 
        // handle raster image upload
        if(importedData.type.includes("jpeg") || importedData.type.includes("jpg") || importedData.type.includes("png")){
          // Create a proper copy of the file object to avoid shared references
          this.currentFile = new File([importedData.file], importedData.file.name, { 
            type: importedData.file.type,
            lastModified: importedData.file.lastModified
          });
          if (this.$konvaStore.stage) {
            // Pass a fresh copy of the file to avoid reference issues
            const fileCopy = new File([importedData.file], importedData.file.name, {
              type: importedData.file.type,
              lastModified: importedData.file.lastModified
            });
            const docId = addRasterImageToLayer(fileCopy, this.$konvaStore.stage, this.$konvaStore);
            
            if (docId) {
              this.notificationStore.notify({
                  message: "Raster image imported successfully",
                  type: "success",
              });
            }
          }
          this.showExtractionDialog = true;

          console.log("addRasterImageToLayer finished");
        } 

        }catch(error){
          console.error("Error importing file:", error);
          this.notificationStore.notify({
            message: `Failed to import file: ${error.message}`,
            type: "error",
          });
        }
        
    },

    extractViewBox(svgContent) {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

      const svgElement = svgDoc.querySelector('svg');
      let viewBox = svgElement.getAttribute('viewBox');

      viewBox = viewBox.split(' ');

      viewBox = {
        width: viewBox[2],
        height: viewBox[3]
      }

      return viewBox;
    },

    addBase64ImageToLayer(imageFile, stage, konvaStore, metadata = null) {
      if (!imageFile || !stage || !konvaStore) return null;
      
      // Create a new document ID
      const doc_id = `doc_${Object.keys(konvaStore.documents).length + 1}`;
      
      // Create a new layer for the image
      const imageLayer = new Konva.Group({ name: "rasterImage" });
      this.$konvaStore.baseLayer.add(imageLayer);
      
      // Create a new image URL
      const imageUrl = URL.createObjectURL(imageFile);
      
      // Load the image
      const image = new Image();
      image.onload = () => {
        // Create a Konva image object
        const konvaImage = new Konva.Image({
          x: 0,
          y: 0,
          image: image,
          width: image.width,
          height: image.height,
        });
        
        // Add the image to the layer
        imageLayer.add(konvaImage);
        
        // Scale and center the image in the viewport
        const stageWidth = stage.width();
        const stageHeight = stage.height();
        
        let displayScale, x, y;
        
        // If metadata with dimensions is provided, use those values for proper scaling
        if (metadata && metadata.dimensions) {
          const imgDimensions = metadata.dimensions;
          const svgDimensions = metadata.svgDimensions;
          
          // If we have both image and SVG dimensions, we can calculate the proper scale
          if (imgDimensions.width && imgDimensions.height && svgDimensions && svgDimensions.width && svgDimensions.height) {
            
            // Use the original image position from the SVG
            x = imgDimensions.x || 0;
            y = imgDimensions.y || 0;
            
            // Use the dimensions specified in the SVG image tag
            konvaImage.width(imgDimensions.width);
            konvaImage.height(imgDimensions.height);
            
            // Scale to match the image dimensions from SVG
            displayScale = 1;
          } else {
            // If incomplete dimension info, fall back to default scaling
            displayScale = 1;
            
            // Calculate centered position
            x = (stageWidth - image.width * displayScale) / 2;
            y = (stageHeight - image.height * displayScale) / 2;
          }
        } else {
          // Default scaling and positioning without metadata
          displayScale = Math.min(
            stageWidth / image.width, 
            stageHeight / image.height
          ) * 1;
          
          // Calculate centered position
          x = (stageWidth - image.width * displayScale);
          y = (stageHeight - image.height * displayScale);
        }
        
        // Scale the image for display
        konvaImage.scale({ x: displayScale, y: displayScale });
        
        // Position the image
        konvaImage.position({ 
          x: (stageWidth / 2) - (metadata.dimensions.width / 2),
          y: (stageHeight / 2) - (metadata.dimensions.height / 2)
        });
        
        // Add the document to konva store
        konvaStore.addDocument(doc_id, "Raster Image", {
          konva: {
            layer: imageLayer,
            image: konvaImage,
          },
          imageUrl: imageUrl,
          metadata: {
            category: 'raster',
            type: 'image',
            filename: imageFile.name,
            ...(metadata || {})  // Include any metadata passed in
          },
          docConfigs: {
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
                value: displayScale, // Use the calculated display scale
                default: displayScale
              },
              pos: {
                x: {
                  min: -1000,
                  max: 1000,
                  value: x,
                  default: 0
                },
                y: {
                  min: -1000,
                  max: 1000,
                  value: y,
                  default: 0
                }
              }
            }
          }
        });

        let base64 = null;
        const reader = new FileReader();
        reader.onload = (e) => {
          base64 = e.target.result;
          // Create SVG with the proper dimensions from metadata if available
          const imgWidth = metadata?.dimensions?.width || image.width;
          const imgHeight = metadata?.dimensions?.height || image.height;
          
          const svg = `<svg height="${imgHeight}" width="${imgWidth}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <image xlink:href="${base64}" width="${imgWidth}" height="${imgHeight}" /></svg>`;
          konvaStore.setSvgPolyline(doc_id, svg) 
          konvaStore.setSvgPath(doc_id, svg) 
        };
        reader.readAsDataURL(imageFile);
        
        // Draw the layer
        this.$konvaStore.baseLayer.batchDraw();

        console.log("addBase64ImageToLayer finished");
      };
      
      image.src = imageUrl;
  
      return doc_id;
    },

    async importFloorPlan() {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".jpg,.jpeg,.png";

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            // Store the file for later use
            this.editStore.setUploadedImage(file);

            // Create URL for preview
            const imageUrl = URL.createObjectURL(file);
            // Update the v-img src
            const imgElement = document.querySelector("#image-preview img");
            if (imgElement) {
              imgElement.src = imageUrl;
            }

            this.editStore.setOutputStage(0);
            this.notificationStore.notify({
              message: "Succesfully imported",
            });
          } catch (error) {
            console.error("Error importing floor plan:", error);
            this.notificationStore.notify({
              message: "Failed to import floor plan",
              type: "error",
            });
          }
        }
      };
      input.value = "";
      input.click();
    },
  },
};
</script>

<style scoped>
main.main {
  height: calc(100vh - 40px);
  margin-left: 240px;
  padding-top: 64px;
}

main.threejs-main {
  width: calc(100vw - 240px);
  position: relative;
  overflow: hidden;
}

main.threejs-main > div {
  height: 100%;
  width: 100%;
}

.threejs-primary {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #f5f5f5;
}

.renderer-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  background-color: #fff
}
</style>
