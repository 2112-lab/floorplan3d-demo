 
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

    <!-- API Examples Panel - Right Sidebar -->
    <div style="position: fixed; top: 20px; right: 20px; bottom: 20px; width: 380px; z-index: 100;">
      <v-card 
        elevation="4" 
        style="height: 100%; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); display: flex; flex-direction: column;"
      >
        <!-- Header -->
        <v-card-title class="py-3">
          <v-icon class="mr-2">mdi-api</v-icon>
          <span class="text-h6">API Examples</span>
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
            <v-expand-transition>
              <v-card-text v-show="expandedSections.sceneControls" class="pt-2">
                <div class="card-description text-caption text--secondary mb-2">
                  Control and manipulate the 3D scene
                </div>
                <div class="card-description text-caption text--secondary mb-3">
                  <code class="code-dark">importFileWithNotifications(), resetScene()</code>
                </div>
                
                <v-btn
                  color="success"
                  @click="importFile"
                  block
                  class="mb-2"
                >
                  <v-icon small class="mr-1">mdi-import</v-icon>
                  Import File
                </v-btn>
                
                <v-btn
                  color="red-lighten-1"
                  @click="resetScene"
                  block
                  class="mb-2"
                >
                  <v-icon small class="mr-1">mdi-refresh</v-icon>
                  Reset Scene
                </v-btn>
                
              </v-card-text>
            </v-expand-transition>
          </v-card>

          <!-- Layer Management Section -->
          <v-card outlined class="mb-4">
            <v-card-subtitle 
              class="d-flex align-center cursor-pointer pa-2" 
              @click="expandedSections.layerManagement = !expandedSections.layerManagement"
            >
              <v-icon small class="mr-2" color="success">mdi-layers</v-icon>
              <span class="font-weight-medium">Layer Management</span>
              <v-spacer></v-spacer>
              <v-icon :class="{ 'rotate-180': expandedSections.layerManagement }">
                mdi-chevron-down
              </v-icon>
            </v-card-subtitle>
            <v-expand-transition>
              <v-card-text v-show="expandedSections.layerManagement" class="pt-2">
                <div class="card-description text-caption text--secondary mb-2">
                  Manage layers in the scene
                </div>
                <div class="card-description text-caption text--secondary mb-3">
                  <code class="code-dark">setLayerActive(layerId), toggleLayerSelected(layerId)</code>
                </div>
                
                <v-select
                  v-model="selectedLayerId"
                  :items="availableLayerIds"
                  item-title="name"
                  item-value="id"
                  label="Select Layer"
                  prepend-icon="mdi-layers"
                  dense
                  outlined
                  class="mt-4 mb-n3"
                  :disabled="!floorplan3d || availableLayerIds.length === 0"
                />
                
                <v-btn
                  color="success"
                  @click="setLayerActiveExample"
                  :disabled="!floorplan3d || !selectedLayerId"
                  elevation="2"
                  block
                  class="mb-2"
                >
                  <v-icon small class="mr-1">mdi-eye</v-icon>
                  Set Layer Active
                </v-btn>

                <v-btn
                  color="info"
                  @click="toggleLayerSelectedExample"
                  :disabled="!floorplan3d || !selectedLayerId"
                  elevation="2"
                  block
                >
                  <v-icon small class="mr-1">mdi-checkbox-marked-circle</v-icon>
                  Toggle Layer Selection
                </v-btn>
              </v-card-text>
            </v-expand-transition>
          </v-card>

          <!-- Layer Config Section -->
          <v-card outlined class="mb-4">
            <v-card-subtitle 
              class="d-flex align-center cursor-pointer pa-2" 
              @click="expandedSections.layerConfig = !expandedSections.layerConfig"
            >
              <v-icon small class="mr-2" color="warning">mdi-cog</v-icon>
              <span class="font-weight-medium">Layer Configuration</span>
              <v-spacer></v-spacer>
              <v-icon :class="{ 'rotate-180': expandedSections.layerConfig }">
                mdi-chevron-down
              </v-icon>
            </v-card-subtitle>
            <v-expand-transition>
              <v-card-text v-show="expandedSections.layerConfig" class="pt-2">
                <div class="card-description text-caption text--secondary mb-2">
                  Update layer configuration properties
                </div>
                <div class="card-description text-caption text--secondary mb-3">
                  <code class="code-dark">updateLayerConfig(layerId, configPath, value)</code>
                </div>
                
                <v-select
                  v-model="selectedConfigLayerId"
                  :items="availableLayerIds"
                  item-title="name"
                  item-value="id"
                  label="Layer to Configure"
                  prepend-icon="mdi-layers"
                  dense
                  outlined
                  class="mt-4 mb-n3"
                  :disabled="!floorplan3d || availableLayerIds.length === 0"
                />
                
                <v-select
                  v-model="selectedConfigPath"
                  :items="configPaths"
                  item-title="name"
                  item-value="path"
                  label="Configuration Path"
                  prepend-icon="mdi-file-tree"
                  dense
                  outlined
                  class="mb-n3"
                  :disabled="!floorplan3d"
                />
                
                <v-text-field
                  v-model="configValue"
                  label="Value"
                  prepend-icon="mdi-numeric"
                  dense
                  outlined
                  class="mb-2"
                  :disabled="!floorplan3d"
                  :hint="getConfigValueHint()"
                  persistent-hint
                />
                
                <v-btn
                  color="warning"
                  @click="updateLayerConfigExample"
                  :disabled="!floorplan3d || !selectedConfigLayerId || !selectedConfigPath || !configValue"
                  elevation="2"
                  block
                  class="mb-2"
                >
                  <v-icon small class="mr-1">mdi-cog</v-icon>
                  Update Config
                </v-btn>
                
                <v-btn
                  color="info"
                  @click="inspectLayerConfigExample"
                  :disabled="!floorplan3d || !selectedConfigLayerId"
                  elevation="2"
                  block
                  outlined
                >
                  <v-icon small class="mr-1">mdi-information</v-icon>
                  Inspect Layer Config
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
        layerManagement: false,
        autoImport: false,
        layerConfig: false,
        dataAccess: false,
      },
      snackbar: {
        show: false,
        text: '',
        color: 'success',
        timeout: 3000,
      },
      // Layer storage - synced from floorplan3d
      layers: {},
      
      // API Examples data
      selectedLayerId: null,
      selectedSvgFile: 'FP3D-00-08.svg',
      selectedConfigLayerId: null,
      selectedConfigPath: null,
      configValue: '',
      configPaths: [
        { name: 'Extrusion Start', path: 'layerConfigs.extrusion.start.value' },
        { name: 'Extrusion End', path: 'layerConfigs.extrusion.end.value' }
      ],
    };
  },
  computed: {
    availableLayerIds() {
      if (!this.layers || Object.keys(this.layers).length === 0) {
        return [];
      }
      
      return Object.entries(this.layers).map(([id, layer]) => ({
        id: id,
        name: layer.ui?.displayName || layer.name || id
      }));
    },
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
    // Helper method for dynamic hint text
    getConfigValueHint() {
      if (!this.selectedConfigPath) return 'Select a configuration path first';
      
      if (this.selectedConfigPath.includes('opacity')) {
        return 'Opacity value (0.0 to 1.0)';
      } else if (this.selectedConfigPath.includes('start') || this.selectedConfigPath.includes('end') || this.selectedConfigPath.includes('height')) {
        return 'Height/position value (number, can be negative)';
      } else if (this.selectedConfigPath.includes('verticalPosition')) {
        return 'Vertical offset value (number, can be negative)';
      }
      
      return 'Numeric value';
    },

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

    // API Example methods
    setLayerActiveExample() {
      if (!this.floorplan3d || !this.selectedLayerId) {
        this.showSnackbar('No layer selected or Floorplan3D not available', 'error');
        return;
      }
      
      try {
        this.floorplan3d.setLayerActive(this.selectedLayerId);
        this.showSnackbar(`Layer '${this.selectedLayerId}' set as active`, 'success');
      } catch (error) {
        this.showSnackbar(`Error setting layer active: ${error.message}`, 'error');
      }
    },

    toggleLayerSelectedExample() {
      if (!this.floorplan3d || !this.selectedLayerId) {
        this.showSnackbar('No layer selected or Floorplan3D not available', 'error');
        return;
      }
      
      try {
        this.floorplan3d.toggleLayerSelected(this.selectedLayerId);
        this.showSnackbar(`Layer '${this.selectedLayerId}' selection toggled`, 'success');
      } catch (error) {
        this.showSnackbar(`Error toggling layer selection: ${error.message}`, 'error');
      }
    },

    async autoImportSvgExample() {
      if (!this.floorplan3d || !this.selectedSvgFile) {
        this.showSnackbar('No SVG file selected or Floorplan3D not available', 'error');
        return;
      }
      
      try {
        await this.floorplan3d.autoImportSvg(this.selectedSvgFile);
        this.showSnackbar(`SVG '${this.selectedSvgFile}' imported successfully`, 'success');
      } catch (error) {
        this.showSnackbar(`Error importing SVG: ${error.message}`, 'error');
      }
    },

    updateLayerConfigExample() {
      if (!this.floorplan3d || !this.selectedConfigLayerId || !this.selectedConfigPath || !this.configValue) {
        this.showSnackbar('Missing required fields for layer config update', 'error');
        return;
      }
      
      try {
        const numericValue = parseFloat(this.configValue);
        if (isNaN(numericValue)) {
          this.showSnackbar('Config value must be a valid number', 'error');
          return;
        }
        
        console.log('Updating layer config:', {
          layerId: this.selectedConfigLayerId,
          configPath: this.selectedConfigPath,
          value: numericValue
        });
        
        const result = this.floorplan3d.updateLayerConfig(this.selectedConfigLayerId, this.selectedConfigPath, numericValue);
        
        if (result) {
          this.showSnackbar(`Layer config updated successfully: ${this.selectedConfigPath} = ${numericValue}`, 'success');
          console.log('Layer after update:', result);
        } else {
          this.showSnackbar(`Layer ${this.selectedConfigLayerId} not found`, 'warning');
        }
      } catch (error) {
        console.error('Error updating layer config:', error);
        this.showSnackbar(`Error updating layer config: ${error.message}`, 'error');
      }
    },

    inspectLayerConfigExample() {
      if (!this.floorplan3d || !this.selectedConfigLayerId) {
        this.showSnackbar('No layer selected or Floorplan3D not available', 'error');
        return;
      }
      
      try {
        const layer = this.floorplan3d.layerStore.layers[this.selectedConfigLayerId];
        if (layer) {
          console.log('Layer configuration:', layer);
          console.log('Layer configs:', layer.layerConfigs);
          if (layer.layerConfigs?.extrusion) {
            console.log('Extrusion config:', layer.layerConfigs.extrusion);
          }
          this.showSnackbar(`Layer config logged to console`, 'info');
        } else {
          this.showSnackbar(`Layer ${this.selectedConfigLayerId} not found`, 'warning');
        }
      } catch (error) {
        console.error('Error inspecting layer config:', error);
        this.showSnackbar(`Error inspecting layer: ${error.message}`, 'error');
      }
    },

    getAllDocumentsExample() {
      if (!this.floorplan3d) {
        this.showSnackbar('Floorplan3D not available', 'error');
        return;
      }
      
      try {
        const documents = this.floorplan3d.getAllDocuments();
        console.log('All Documents:', documents);
        this.showSnackbar(`Retrieved ${Object.keys(documents).length} documents (check console)`, 'info');
      } catch (error) {
        this.showSnackbar(`Error getting documents: ${error.message}`, 'error');
      }
    },

    getActiveDocumentExample() {
      if (!this.floorplan3d) {
        this.showSnackbar('Floorplan3D not available', 'error');
        return;
      }
      
      try {
        const activeDoc = this.floorplan3d.getActiveDocument();
        console.log('Active Document:', activeDoc);
        if (activeDoc) {
          this.showSnackbar(`Active document: ${activeDoc.name || activeDoc.id} (check console)`, 'info');
        } else {
          this.showSnackbar('No active document found', 'warning');
        }
      } catch (error) {
        this.showSnackbar(`Error getting active document: ${error.message}`, 'error');
      }
    },

    getSelectedDocumentsExample() {
      if (!this.floorplan3d) {
        this.showSnackbar('Floorplan3D not available', 'error');
        return;
      }
      
      try {
        const selectedDocs = this.floorplan3d.getSelectedDocuments();
        console.log('Selected Documents:', selectedDocs);
        this.showSnackbar(`Retrieved ${selectedDocs.length} selected documents (check console)`, 'info');
      } catch (error) {
        this.showSnackbar(`Error getting selected documents: ${error.message}`, 'error');
      }
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

/* Custom styling for code elements */
.code-dark {
  color: #2c3e50 !important; /* Dark blue-gray color */
  background-color: #f8f9fa; /* Light background */
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-weight: 600;
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
</style>
