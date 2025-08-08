<template>  
  <!-- Main application container with light background -->
  <v-app id="appContainer" style="background-color:#f5f5f5;">     
    <!-- Hidden SVG renderer for dependencies (no longer uses Konva) -->
    <div style="display: none">
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
        <ThreejsRenderer 
          ref="threejsRenderer" 
          class="threejs-primary" 
          :floorplan3d="floorplan3d"
          @container-ready="onContainerReady"
          @container-destroyed="onContainerDestroyed"
        />
        
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
              class="d-flex align-center cursor-pointer pa-2" 
              @click="expandedSections.sceneControls = !expandedSections.sceneControls"
            >
              <v-icon small class="mr-2" color="primary">mdi-cube-outline</v-icon>
              <span class="font-weight-medium">Scene Controls</span>
              <v-spacer></v-spacer>
              <v-icon :class="{ 'rotate-180': expandedSections.sceneControls }">
                mdi-chevron-down
              </v-icon>
            </v-card-subtitle>
            <div 
              class="expandable-content"
              :class="{ 'expanded': expandedSections.sceneControls }"
            >
              <v-card-text class="pt-2">
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
            </div>
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
import ThreejsRenderer from "~/components/threejs-renderer.vue";
import LayersPanel  from "~/components/layers-panel.vue";
import { cloneDeep } from 'lodash';
import { SvgUtils, defaultVectorConfigs, defaultMetadata } from "@2112-lab/floorplan3d";
import Floorplan3D, { SvgDocumentParser } from "@2112-lab/floorplan3d";
import { markRaw } from 'vue';

export default {
  components: {
    ThreejsRenderer,
    LayersPanel
  },
    data() {
    return {
      floorplan3d: null, // Floorplan3D instance managed here now
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
      // Layer storage - new terminology (documents is kept for backward compatibility)
      layers: {},
      documents: {}, // Legacy - kept for backward compatibility
      // Default configs for vector layers
      defaultVectorConfigs: defaultVectorConfigs,
      defaultMetadata: defaultMetadata,
    };
  },
  mounted() {
    // Store references to renderers
    this.threejsRenderer = this.$refs.threejsRenderer;
    
    // Floorplan3D will be initialized when container is ready via onContainerReady event
    
    // Set up a watcher to sync layers/documents from floorplan3d instance's internal store
    this.$watch(() => this.floorplan3d?.layerStore?.getState() || {}, (newState) => {
      if (newState.layers) {
        this.layers = { ...newState.layers };
        this.documents = { ...newState.layers }; // Keep backward compatibility
      }
    }, { deep: true, immediate: true });
  },
  beforeDestroy() {
    // Cleanup Floorplan3D instance when component is destroyed
    this.cleanupFloorplan3D();
  },
  methods: {
    // Handle container ready event from threejs-renderer
    onContainerReady({ container, renderer }) {
      console.log('Container ready, initializing Floorplan3D...');
      // Add a small delay to ensure DOM is fully ready
      this.$nextTick(() => {
        this.initFloorplan3D(container, renderer);
      });
    },

    // Handle container destroyed event from threejs-renderer  
    onContainerDestroyed() {
      console.log('Container destroyed, cleaning up Floorplan3D...');
      this.cleanupFloorplan3D();
    },

    // Initialize Floorplan3D instance
    initFloorplan3D(containerRef, rendererRef) {
      // Ensure we're on the client side
      if (process.server) {
        console.warn('Attempting to initialize Floorplan3D on server side, skipping');
        return;
      }

      if (!containerRef || !rendererRef) {
        console.error('Container or renderer ref not available');
        return;
      }

      const width = containerRef.offsetWidth;
      const height = containerRef.offsetHeight;

      // Clear any existing Three.js instance
      if (this.floorplan3d) {
        this.cleanupFloorplan3D();
      }

      try {
        // Initialize using Floorplan3D class and mark as raw to prevent Vue reactivity
        this.floorplan3d = markRaw(new Floorplan3D(rendererRef, width, height));

        // The floorplan3d instance now has its own internal document store
        // No need to set up external callbacks for basic functionality

        // Make sure the animation is running
        this.floorplan3d.startAnimation();

        // Auto-import the FP3D-00-08.svg file after initialization
        setTimeout(() => {
          this.autoImportSvg();
        }, 500);

        console.log('Floorplan3D initialized successfully');
      } catch (error) {
        console.error('Error initializing Floorplan3D:', error);
      }
    },

    // Cleanup Floorplan3D instance
    cleanupFloorplan3D() {
      if (this.floorplan3d) {
        // Dispose of renderer
        if (this.floorplan3d.renderer) {
          this.floorplan3d.renderer.dispose();
          this.floorplan3d.renderer.forceContextLoss();
          this.floorplan3d.renderer.domElement = null;
        }

        // Clear references
        this.floorplan3d = null;
      }
    },

    // Layer management methods - New API
    addLayer(layerId, name, configs) {
      // Check if layer already exists to prevent duplication
      if (this.layers[layerId]) {
        console.warn(`Layer with ID ${layerId} already exists. Skipping to prevent duplication.`);
        return;
      }
      
      // Add to floorplan3d's internal store if available
      if (this.floorplan3d) {
        this.floorplan3d.addLayer(layerId, name, configs);
      }
      
      // Sync to local storage for easy access
      this.syncLayersFromFloorplan3d();
    },

    syncLayersFromFloorplan3d() {
      // Sync the floorplan3d internal store layers to local reactive data
      if (this.floorplan3d?.layerStore) {
        this.layers = { ...this.floorplan3d.layerStore.layers };
        this.documents = { ...this.layers }; // Keep backward compatibility
      }
    },

    setLayerActive(layerId) {
      // Use floorplan3d's internal store to set layer active
      if (this.floorplan3d) {
        this.floorplan3d.setLayerActive(layerId);
      }
      this.syncLayersFromFloorplan3d();
    },

    toggleLayerSelected(layerId) {
      if (this.floorplan3d) {
        this.floorplan3d.toggleLayerSelected(layerId);
      }
      this.syncLayersFromFloorplan3d();
    },

    clearAllLayers() {
      // Clear floorplan3d internal store layers
      if (this.floorplan3d) {
        this.floorplan3d.clearAllLayers();
      }
      this.syncLayersFromFloorplan3d();
    },

    activateVectorLayers() {
      if (this.floorplan3d) {
        this.floorplan3d.activateVectorLayers();
      }
    },

    // Document management methods - Legacy API for backward compatibility
    addDocument(doc_id, name, configs) {
      return this.addLayer(doc_id, name, configs);
    },

    syncDocumentsFromFloorplan3d() {
      return this.syncLayersFromFloorplan3d();
    },

    setDocumentActive(doc_id) {
      return this.setLayerActive(doc_id);
    },

    toggleDocumentSelected(documentId) {
      return this.toggleLayerSelected(documentId);
    },

    clearAllDocuments() {
      return this.clearAllLayers();
    },

    activateVectorDocuments() {
      return this.activateVectorLayers();
    },

    getUniqueDisplayName(baseName) {
      const existingNames = Object.values(this.layers).map(layer => layer.ui.displayName);
      
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

    // Extract shared logic for processing vector layers (renamed from documents)
    async processVectorLayers(sortedVectorLayers, successMessage) {
      console.log('processVectorLayers called with', sortedVectorLayers.length, 'layers');
      
      // Process vector layers (rooms and walls) - using floorplan3d internal store
      for (let layer of sortedVectorLayers) {
        // Check if layer with this ID already exists (prevents duplication)
        if (this.layers[layer.id]) {
          console.log(`Layer ${layer.id} already exists, skipping to prevent duplication`);
          continue;
        }
        
        console.log(`Processing layer ${layer.id} (${layer.name}):`, {
          hasSvgPath: !!layer.svgPath,
          hasSvgPolyline: !!layer.svgPolyline,
          svgPathLength: layer.svgPath ? layer.svgPath.length : 0,
          svgPolylineLength: layer.svgPolyline ? layer.svgPolyline.length : 0
        });
        
        // Add the layer to the internal store preserving the SVG content from parser
        this.addLayer(layer.id, layer.name, {
          ...layer,
          ui: {
            ...layer.ui,
            order: layer.ui.order // Use the order assigned by the parser
          },
          // Preserve the SVG content from the parser instead of creating empty svg object
          svg: {
            objects: doc.konva?.objects || {}, // Use existing objects data
            path: doc.svgPath || '',
            polyline: doc.svgPolyline || ''
          }
        });
        
        console.log(`Document ${doc.id} added to store`);
      }

      // Activate all vector layers after processing
      this.activateVectorLayers();
      this.showSnackbar(successMessage, 'success');
    },

    // Legacy method for backward compatibility
    async processVectorDocuments(sortedVectorDocs, successMessage) {
      return this.processVectorLayers(sortedVectorDocs, successMessage);
    },

    async autoImportSvg() {
      // Ensure we're on the client side
      if (process.server) {
        return;
      }

      try {
        // Check if layers already exist (prevents duplication during hot reload)
        if (Object.keys(this.layers).length > 0) {
          console.log('Layers already exist, skipping auto-import to prevent duplication');
          return;
        }
        
        console.log('Starting auto-import of SVG...');
        
        // Fetch the SVG file from the public directory
        const response = await fetch('/inkscape-samples/FP3D-00-08.svg');
        if (!response.ok) {
          throw new Error(`Failed to fetch SVG file: ${response.status}`);
        }
        
        const svgContent = await response.text();
        console.log('SVG content fetched, length:', svgContent.length);
        
        // Use floorplan3d's comprehensive import method
        if (this.floorplan3d) {
          const result = await this.floorplan3d.importAndStoreDocuments(svgContent);
          console.log('SVG import completed:', result);
          
          this.syncLayersFromFloorplan3d();
          this.showSnackbar('FP3D-00-08.svg imported successfully', 'success');
        } else {
          throw new Error('Floorplan3D instance not available');
        }
        
      } catch (error) {
        console.error("Error auto-importing SVG file:", error);
        this.showSnackbar(`Failed to auto-import SVG: ${error.message}`, 'error');
      }
    },

    async importFile() {
      try {
        if (!this.floorplan3d) {
          throw new Error('Floorplan3D instance not available');
        }
        
        const result = await this.floorplan3d.importFileWithStorage();
        
        // handle svg upload
        if(result.type === "svg"){
          this.syncLayersFromFloorplan3d();
          this.showSnackbar('SVG file imported successfully', 'success');
        } else {
          // For non-SVG files, handle as before
          this.showSnackbar('File imported successfully', 'success');
        }        

      } catch(error) {
        console.error("Error importing file:", error);
        this.showSnackbar(`Failed to import file: ${error.message}`, 'error');
      }
    },

    // Scene control methods
    resetScene() {
      if(Object.keys(this.layers).length === 0) {
        return;
      }

      // Use the new clearAllLayers method
      this.clearAllLayers();
      
      this.showSnackbar('Scene reset successfully', 'success');
    },

    showSnackbar(text, color = 'success') {
      this.snackbar.text = text;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },

    // Method to render SVG to the 3D scene (updated for layers)
    renderLayerToScene(layerId, svgContent) {
      // Access the floorplan3d instance directly
      if (this.floorplan3d && svgContent) {
        console.log(`Rendering layer ${layerId} to 3D scene`);
        this.floorplan3d.renderSvgToScene(svgContent, layerId);
      } else {
        console.warn('Cannot render to scene: floorplan3d instance or SVG content not available');
      }
    },

    // Legacy method for backward compatibility
    renderDocumentToScene(documentId, svgContent) {
      return this.renderLayerToScene(documentId, svgContent);
    },

    // Method to generate SVG from objects and render to 3D scene (updated for layers)
    generateAndRenderSvg(layerId) {
      if (this.floorplan3d) {
        this.floorplan3d.generateAndRenderSvg(layerId);
      }
    },

    // Method to regenerate SVG for the currently active layer
    updateActiveSvg() {
      const activeLayer = this.getActiveLayer();
      if (activeLayer && activeLayer.metadata.category === "vector") {
        this.generateAndRenderSvg(activeLayer.id);
      }
    },

    // Helper methods for layer management
    getLayer(layerId) {
      return this.layers[layerId];
    },

    getActiveLayer() {
      const activeLayer = Object.values(this.layers).find(layer => layer.active);
      if (!activeLayer) return null;
      
      const layerId = Object.keys(this.layers).find(key => this.layers[key].active);
      return {
        ...activeLayer,
        id: layerId
      };
    },

    // Legacy helper methods for backward compatibility
    getDocument(documentId) {
      return this.getLayer(documentId);
    },

    getActiveDocument() {
      return this.getActiveLayer();
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
#threejs-container .layers-container {
  position: static !important;
  top: auto !important;
  left: auto !important;
  width: 100% !important;
  border: none !important;
  background-color: transparent !important;
  box-shadow: none !important;
}

/* Efficient expand/collapse animation */
.expandable-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
}

.expandable-content.expanded {
  max-height: 300px; /* Adjust this value based on your content height */
}
</style>
