<template>  
  <!-- Main application container with light background -->
  <v-app id="appContainer" style="background-color:#f5f5f5;">     
    <!-- Hidden konva renderer for dependencies -->
    <div style="display: none">
      <KonvaRenderer ref="konvaRenderer" />
      <div ref="hiddenContainer"></div>
    </div>

    <!-- Main content area - flexible layout with primary viewport and right sidebar -->    
    <div style="display: flex; height: calc(100vh); width: 100%; overflow: hidden;">      
      <div 
        id="threejs-container" 
        ref="threejsContainer"
        style="position:absolute; top:20px; left:20px; right:420px; bottom:20px; box-shadow: 0 2px 4px -1px rgba(0,0,0,.2), 0 4px 5px 0 rgba(0,0,0,.14), 0 1px 10px 0 rgba(0,0,0,.12)"
      >
        <!-- ThreeJS Renderer -->
        <ThreejsRenderer ref="threejsRenderer" class="threejs-primary" />
        
        <!-- LayersPanel positioned in corner with padding -->
        <div style="position: absolute; top: 10px; left: 10px; z-index: 50; width: 280px;">
          <div style="position: relative; background-color: white; border: 1px solid #aaa; border-radius: 4px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
            <LayersPanel />
          </div>
        </div>
      </div>   
    </div>    

    <!-- Tools Panel - Right Sidebar -->
    <div style="position: fixed; top: 20px; right: 20px; bottom: 20px; width: 380px; z-index: 100;">
      <v-card 
        elevation="4" 
        style="height: 100%; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); display: flex; flex-direction: column;"
      >
        <!-- Header -->
        <v-card-title class="py-3">
          <v-icon class="mr-2">mdi-tools</v-icon>
          <span class="text-h6">Tools</span>
          <v-spacer></v-spacer>
        </v-card-title>
        
        <v-divider></v-divider>
        
        <!-- Content -->
        <div style="flex: 1; overflow-y: auto; padding: 16px;">
          
          <!-- Scene Controls Section -->
          <v-card outlined class="mb-4">
            <v-card-subtitle 
              class="d-flex align-center cursor-pointer" 
              @click="expandedSections.sceneControls = !expandedSections.sceneControls"
            >
              <v-icon small class="mr-2" color="primary">mdi-cube-outline</v-icon>
              <span class="font-weight-medium">Scene Controls</span>
              <v-spacer></v-spacer>
              <v-icon :class="{ 'rotate-180': expandedSections.sceneControls }">
                mdi-chevron-down
              </v-icon>
            </v-card-subtitle>
            <v-expand-transition>
              <v-card-text v-show="expandedSections.sceneControls" class="pt-2">
                <div class="card-description text-caption text--secondary mb-2">
                  Control and manipulate the 3D scene
                </div>
                
                <v-btn
                  color="success"
                  @click="importFile"
                  block
                  class="mb-2"
                >
                  <v-icon small class="mr-1">mdi-import</v-icon>
                  Import
                </v-btn>
                
                <v-btn
                  color="red-lighten-1"
                  @click="resetScene"
                  block
                  class="mb-2"
                >
                  <v-icon small class="mr-1">mdi-refresh</v-icon>
                  Reset
                </v-btn>
                
              </v-card-text>
            </v-expand-transition>
          </v-card>

        </div>
        
      </v-card>
    </div>
    
    <!-- Notification Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      top
      right
    >
      {{ snackbar.text }}
      <template v-slot:action="{ attrs }">
        <v-btn
          text
          v-bind="attrs"
          @click="snackbar.show = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
      
  </v-app>
</template>

<script>
import KonvaRenderer from "~/components/konva-renderer/konva-renderer.vue";
import ThreejsRenderer from "~/components/threejs-renderer/threejs-renderer.vue";
import LayersPanel  from "~/components/documents-panel.vue";
import { useThreeStore } from "~/store/three-store";
import { useKonvaStore } from "~/store/konva-store";
import { useEventBusStore } from "~/store/event-bus";
import { useNotificationStore } from "~/store/notification";
import { centerLayersAsGroup } from "~/lib/konva/center-layer";
import { cloneDeep } from 'lodash';
import Konva from "konva";
import Floorplan3D from "~/lib/Floorplan3D";

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
    KonvaRenderer,
    ThreejsRenderer,
    LayersPanel
  },
  data() {
    return {
      threestore: useThreeStore(),
      konvaRenderer: null,
      threejsRenderer: null,
      expandedSections: {
        sceneControls: true,
      },
      snackbar: {
        show: false,
        text: '',
        color: 'success',
        timeout: 3000,
      },
    };
  },
  mounted() {
    // Store references to renderers
    this.konvaRenderer = this.$refs.konvaRenderer;
    this.threejsRenderer = this.$refs.threejsRenderer;
    
    // Auto-import the FP3D-00-07.svg file on page load with a small delay
    // to ensure all components are properly initialized
    setTimeout(() => {
      this.autoImportSvg();
    }, 500);
  },
  computed: {
    $konvaStore() {
      return useKonvaStore();
    },
    $eventBus() {
      return useEventBusStore();
    },
    notificationStore() {
      return useNotificationStore();
    }
  },
  methods: {
    stageZoomToFit() {
      // Simple zoom to fit implementation
      if (this.konvaRenderer && this.konvaRenderer.stage) {
        const stage = this.konvaRenderer.stage;
        const baseLayer = this.$konvaStore.baseLayer;
        
        if (baseLayer && baseLayer.children.length > 0) {
          // Get the bounding box of all content
          const box = baseLayer.getClientRect();
          
          if (box.width > 0 && box.height > 0) {
            // Calculate the scale to fit content within stage
            const stageWidth = stage.width();
            const stageHeight = stage.height();
            
            const scaleX = stageWidth / box.width;
            const scaleY = stageHeight / box.height;
            const scale = Math.min(scaleX, scaleY) * 0.8; // 0.8 to leave some margin
            
            // Set the scale
            stage.scale({ x: scale, y: scale });
            
            // Center the content
            const centerX = (stageWidth - box.width * scale) / 2;
            const centerY = (stageHeight - box.height * scale) / 2;
            
            stage.position({
              x: centerX - box.x * scale,
              y: centerY - box.y * scale,
            });
            
            stage.batchDraw();
          }
        }
      }
    },

    async autoImportSvg() {
      try {
        // Fetch the SVG file from the public directory
        const response = await fetch('/floorplan-import-samples/FP3D-00-07.svg');
        if (!response.ok) {
          throw new Error(`Failed to fetch SVG file: ${response.status}`);
        }
        
        const svgContent = await response.text();
        
        // Create importer instance
        const importer = new Floorplan3D(null, null, null);
        
        // Import the SVG content
        const importedData = await importer.importSvg(svgContent);
        
        // Process the imported data similar to the existing importFile method
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

        // Process vector documents first (rooms and walls)
        for (let doc of sortedVectorDocs) {
          // Ensure baseLayer exists before using it
          if (!this.$konvaStore.baseLayer) {
            console.error('Konva baseLayer not initialized. Cannot import vector documents.');
            this.showSnackbar('Konva renderer not initialized. Please try again.', 'error');
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
        
        this.showSnackbar('FP3D-00-07.svg imported successfully', 'success');
        
      } catch (error) {
        console.error("Error auto-importing SVG file:", error);
        this.showSnackbar(`Failed to auto-import SVG: ${error.message}`, 'error');
      }
    },

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

    // Mock methods for the new Tools panel
    resetScene() {
      if(Object.keys(this.$konvaStore.documents).length === 0) {
        return;
      }

      // Clear Three.js content group
      if (this.threestore.scene) {
        const contentGroup = this.threestore.scene.getObjectByName("contentGroup");
        this.threestore.floorplan3d.clearScene(contentGroup);
      }

      this.$konvaStore.documents = [];

      // Use the konva-renderer's resetKonva method.
      this.$eventBus.emit('resetKonva');
      
      this.showSnackbar('Scene reset successfully', 'success');
    },

    showSnackbar(text, color = 'success') {
      this.snackbar.text = text;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },
  },
};
</script>

<style scoped>
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
  background-color: #fff;
}

.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}

.cursor-pointer {
  cursor: pointer;
}

.card-description {
  line-height: 1.4;
}

/* Override LayersPanel positioning when inside threejs container */
#threejs-container .documents-container {
  position: static !important;
  top: auto !important;
  left: auto !important;
  width: 100% !important;
  border: none !important;
  background-color: transparent !important;
  box-shadow: none !important;
}
</style>
