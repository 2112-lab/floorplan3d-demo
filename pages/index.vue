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
import { cloneDeep } from 'lodash';
import Konva from "konva";
import Floorplan3D from "~/lib/Floorplan3D";
import SvgDocumentParser from "~/lib/svg-document-parser";

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
      // Simple document storage replacing Konva store
      documents: {},
      // Default configs for vector documents
      defaultVectorConfigs: {
        layer: {
          opacity: { min: 0, max: 1, step: 0.2, value: 1, default: 1 },
          scale: { min: 0.1, max: 2, step: 0.1, value: 1, default: 1 },
          pos: {
            x: { min: -100, max: 100, value: 0, default: 0 },
            y: { min: -100, max: 100, value: 0, default: 0 },
          },
        },
        extrusion: {
          height: { min: 1, max: 100, step: 1, value: 30, default: 30 },
          opacity: { min: 0, max: 1, step: 0.05, value: 1, default: 1 },
          verticalPosition: { min: -50, max: 50, step: 0.5, value: 0, default: 0 },
        },
        svg: {
          mode: { options: ["path", "polyline"], value: "path", default: "path" },
        },
      },
      defaultMetadata: {
        category: "vector",
        type: "svg",
        subtype: "paths",
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
    
    // Set up a watcher to sync documents from Konva store
    this.$watch(() => this.$konvaStore.documents, (newDocs) => {
      this.documents = { ...newDocs };
    }, { deep: true, immediate: true });
  },
  computed: {
    $konvaStore() {
      return useKonvaStore();
    },
    $eventBus() {
      return useEventBusStore();
    }
  },
  methods: {
    // Simple document management methods that sync with Konva store
    addDocument(doc_id, name, configs) {
      // Check if document already exists to prevent duplication
      if (this.documents[doc_id]) {
        console.warn(`Document with ID ${doc_id} already exists. Skipping to prevent duplication.`);
        return;
      }
      
      // Add to both local storage and Konva store
      this.$konvaStore.addDocument(doc_id, name, configs);
      
      // Sync to local storage for easy access
      this.syncDocumentsFromStore();
    },

    syncDocumentsFromStore() {
      // Sync the Konva store documents to local reactive data
      this.documents = { ...this.$konvaStore.documents };
    },

    getUniqueDisplayName(baseName) {
      const existingNames = Object.values(this.documents).map(doc => doc.ui.displayName);
      
      if (!existingNames.includes(baseName)) {
        return baseName;
      }
      
      let highestNumber = 1;
      const baseNameRegex = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\((\\d+)\\)$`);
      
      existingNames.forEach(name => {
        const match = name.match(baseNameRegex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= highestNumber) {
            highestNumber = num + 1;
          }
        }
      });
      
      return `${baseName} (${highestNumber})`;
    },

    setDocumentActive(doc_id) {
      // Deactivate all documents first
      Object.values(this.documents).forEach(doc => {
        doc.active = false;
      });
      
      // Activate the specified document
      if (this.documents[doc_id]) {
        this.documents[doc_id].active = true;
        console.log(`Document ${doc_id} set as active`);
      }
    },

    setDocumentActive(doc_id) {
      // Use Konva store method and sync
      this.$konvaStore.setDocumentActive(doc_id);
      this.syncDocumentsFromStore();
    },

    toggleDocumentVisibility(documentId) {
      this.$konvaStore.toggleDocumentVisibility(documentId);
      this.syncDocumentsFromStore();
    },

    toggleDocumentSelected(documentId) {
      this.$konvaStore.toggleDocumentSelected(documentId);
      this.syncDocumentsFromStore();
    },

    getActiveDocument() {
      const activeDoc = Object.values(this.documents).find(doc => doc.active);
      if (!activeDoc) return null;
      
      const docId = Object.keys(this.documents).find(key => this.documents[key].active);
      return {
        ...activeDoc,
        id: docId
      };
    },

    getBaseLayer() {
      // Access baseLayer through the KonvaRenderer component
      return this.konvaRenderer?.konvaStore?.baseLayer || null;
    },

    clearAllDocuments() {
      // Use Konva store method and sync
      this.$konvaStore.clearAllDocuments();
      this.syncDocumentsFromStore();
    },

    async autoImportSvg() {
      try {
        // Check if documents already exist (prevents duplication during hot reload)
        if (Object.keys(this.documents).length > 0) {
          console.log('Documents already exist, skipping auto-import to prevent duplication');
          return;
        }
        
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
        
        // Process the imported data using the new document parser utility
        let layersToCenter = [];
        
        // Sort and assign orders to vector documents using the parser utility
        const sortedVectorDocs = SvgDocumentParser.assignDocumentOrders(
          SvgDocumentParser.sortDocumentsByType(importedData.vectorDocuments)
        );

        // Process vector documents (rooms and walls)
        for (let doc of sortedVectorDocs) {
          // Check if document with this ID already exists (prevents duplication during hot reload)
          if (this.documents[doc.id]) {
            console.log(`Document ${doc.id} already exists, skipping to prevent duplication`);
            continue;
          }
          
          // Ensure baseLayer exists before using it
          if (!this.$konvaStore.baseLayer) {
            console.error('Konva baseLayer not initialized. Cannot import vector documents.');
            this.showSnackbar('Konva renderer not initialized. Please try again.', 'error');
            return;
          }

          const layerKonva = new Konva.Group({ name: doc.id, type: "vector-layer" });
          this.$konvaStore.baseLayer.add(layerKonva);
          layersToCenter.push(layerKonva);
          
          // Create a proper deep copy with independent properties            
          const docCopy = safeDeepClone(doc);
          
          // Add the document to the store with the processed order
          this.addDocument(doc.id, doc.name, {
            ...docCopy,
            ui: {
              ...docCopy.ui,
              order: doc.ui.order // Use the order assigned by the parser
            }
          });
        } 

        setTimeout(() => {
          // Sequentially set each vector document as active, to trigger renderSvgToScene
          for(let docKey in this.documents) {
            let doc = this.documents[docKey];
            if(doc.metadata.category === "vector") {
              setTimeout(() => {
                this.setDocumentActive(doc.id);
              }, 5)
            }
          }          
        }, 100);
        
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
        
        // handle svg upload
        if(importedData.type === "svg"){
          const svgContent = await importedData.file.text();
         
          let layersToCenter = [];            
          // Sort and assign orders to vector documents using the parser utility
          const sortedVectorDocs = SvgDocumentParser.assignDocumentOrders(
            SvgDocumentParser.sortDocumentsByType(importedData.vectorDocuments)
          );

          // Process vector documents (rooms and walls)
          for (let doc of sortedVectorDocs) {
            // Check if document with this ID already exists (prevents duplication)
            if (this.documents[doc.id]) {
              console.log(`Document ${doc.id} already exists, skipping to prevent duplication`);
              continue;
            }
            
            // Ensure baseLayer exists before using it
            if (!this.$konvaStore.baseLayer) {
              console.error('Konva baseLayer not initialized. Cannot import vector documents.');
              this.showSnackbar('Konva renderer not initialized. Please try again.', 'error');
              return;
            }

            const layerKonva = new Konva.Group({ name: doc.id, type: "vector-layer" });
            this.$konvaStore.baseLayer.add(layerKonva);
            layersToCenter.push(layerKonva);
            
            // Create a proper deep copy with independent properties            
            const docCopy = safeDeepClone(doc);
            
            // Add the document to the store with the processed order
            this.addDocument(doc.id, doc.name, {
              ...docCopy,
              ui: {
                ...docCopy.ui,
                order: doc.ui.order // Use the order assigned by the parser
              }
            });
          }   

          setTimeout(() => {
            // Sequentially set each vector document as active, to trigger renderSvgToScene
            for(let docKey in this.documents) {
              let doc = this.documents[docKey];
              if(doc.metadata.category === "vector") {
                setTimeout(() => {
                  this.setDocumentActive(doc.id);
                }, 5)
              }
            }          
          }, 100);

          this.showSnackbar('SVG file imported successfully', 'success');
        }        

        }catch(error){
          console.error("Error importing file:", error);
          this.showSnackbar(`Failed to import file: ${error.message}`, 'error');
        }
        
    },

    // Mock methods for the new Tools panel
    resetScene() {
      if(Object.keys(this.documents).length === 0) {
        return;
      }

      // Clear Three.js content group
      if (this.threestore.scene) {
        const contentGroup = this.threestore.scene.getObjectByName("contentGroup");
        this.threestore.floorplan3d.clearScene(contentGroup);
      }

      // Use the new clearAllDocuments method instead of direct assignment
      this.clearAllDocuments();

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
