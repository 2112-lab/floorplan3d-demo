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
            <LayersPanel :floorplan3d="floorplan3d" />
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
import Floorplan3D from "@2112-lab/floorplan3d";
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
      // Layer storage - synced from floorplan3d
      layers: {},
      documents: {}, // Legacy - kept for backward compatibility
    };
  },
  mounted() {
    // Store references to renderers
    this.threejsRenderer = this.$refs.threejsRenderer;
    
    // Floorplan3D will be initialized when container is ready via onContainerReady event
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

        // Set up event listeners for notifications
        this.floorplan3d.addEventListener('notification', this.handleFloorplan3DNotification);

        // Subscribe to layer store changes for reactive updates
        this.floorplan3d.subscribeToDocuments(() => {
          this.syncLayersFromFloorplan3D();
        });

        // Make sure the animation is running
        this.floorplan3d.startAnimation();

        // Auto-import the default SVG file after initialization
        setTimeout(() => {
          this.floorplan3d.autoImportSvg();
        }, 500);

        console.log('Floorplan3D initialized successfully');
      } catch (error) {
        console.error('Error initializing Floorplan3D:', error);
        this.showSnackbar(`Failed to initialize: ${error.message}`, 'error');
      }
    },

    // Handle notifications from Floorplan3D
    handleFloorplan3DNotification(notification) {
      this.showSnackbar(notification.text, notification.type);
    },

    // Cleanup Floorplan3D instance
    cleanupFloorplan3D() {
      if (this.floorplan3d) {
        // Remove event listeners
        this.floorplan3d.removeEventListener('notification', this.handleFloorplan3DNotification);

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

    // Sync layers from floorplan3d internal store
    syncLayersFromFloorplan3D() {
      if (this.floorplan3d?.layerStore) {
        this.layers = { ...this.floorplan3d.layerStore.layers };
        this.documents = { ...this.layers }; // Keep backward compatibility
      }
    },

    // Simplified layer management - delegate to floorplan3d
    setLayerActive(layerId) {
      if (this.floorplan3d) {
        this.floorplan3d.setLayerActive(layerId);
      }
    },

    toggleLayerSelected(layerId) {
      if (this.floorplan3d) {
        this.floorplan3d.toggleLayerSelected(layerId);
      }
    },

    // Legacy methods for backward compatibility
    setDocumentActive(doc_id) {
      return this.setLayerActive(doc_id);
    },

    toggleDocumentSelected(documentId) {
      return this.toggleLayerSelected(documentId);
    },

    // Simplified scene control methods - delegate to floorplan3d
    async importFile() {
      if (!this.floorplan3d) {
        this.showSnackbar('Floorplan3D not initialized', 'error');
        return;
      }
      
      try {
        await this.floorplan3d.importFileWithNotifications();
      } catch (error) {
        // Error notifications are handled by floorplan3d
        console.error("Error importing file:", error);
      }
    },

    resetScene() {
      if (!this.floorplan3d) {
        this.showSnackbar('Floorplan3D not initialized', 'error');
        return;
      }
      
      this.floorplan3d.resetScene();
    },

    showSnackbar(text, color = 'success') {
      this.snackbar.text = text;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },

    // Helper methods for layer management - delegate to floorplan3d
    getLayer(layerId) {
      return this.floorplan3d?.layerStore?.layers[layerId];
    },

    getActiveLayer() {
      if (!this.floorplan3d) return null;
      
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
