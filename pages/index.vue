 
<template> 
  <!-- Main application container with light background -->
  <v-app id="appContainer" style="background-color:#f5f5f5;">
    <!-- Top Navigation Bar -->
    <!-- Top navigation bar -->
    <v-app-bar 
      color="#fff"
      style="
        font-family:'Amazon Ember', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif; 
        position:relative; 
        z-index:1; 
        height: 64px !important; 
        min-height: 64px !important; 
        max-height: 64px !important;
      "
    >
      <!-- App title with link to home -->
      <v-toolbar-title>
        <router-link to="/" style="text-decoration: none; color: inherit;">
          <span class="rubik-mono-one-regular">Floorplan3D Demo</span>
        </router-link>
      </v-toolbar-title>
    </v-app-bar>
    
    <!-- Hidden SVG renderer for dependencies (no longer uses Konva) -->
    <div style="display: none">
      <div ref="hiddenContainer"></div>
    </div>

    <!-- Main content area - flexible layout with primary viewport and right sidebar -->    
    <v-main>
      <div style="display: flex; width: 100%; overflow: hidden;">      
      <div 
        id="threejs-container" 
        ref="threejsContainer"
        style="position:absolute; top:84px; left:20px; right:420px; bottom:20px; box-shadow: 0 2px 4px -1px rgba(0,0,0,.2), 0 4px 5px 0 rgba(0,0,0,.14), 0 1px 10px 0 rgba(0,0,0,.12)"
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
            <LayersPanel 
              :floorplan3d="floorplan3d" 
              @layer-selection-changed="onLayerSelectionChanged"
            />
          </div>
        </div>
      </div>   
    </div>    
    
    <!-- API Examples Panel - Right Sidebar -->
    <div style="position: fixed; top: 84px; right: 20px; bottom: 20px; width: 380px; z-index: 100;">
      <v-card 
        elevation="4" 
        style="height: 100%; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); display: flex; flex-direction: column;"
      >
        <!-- Header -->
        <v-card-title class="py-3">
          <v-icon class="mr-2">mdi-api</v-icon>
          <span class="text-h6">API Examples</span>
          <!-- <br> -->
          <a 
            href="https://floorplan3d-api-docs.s3.us-east-1.amazonaws.com/v1.0.19/module-Floorplan3D-Floorplan3D.html" 
            target="_blank" 
            class="text-decoration-none ml-4 mr-2"
          >
            <v-btn 
              size="x-small"
              outlined 
              color="primary"
            >
              Docs
              <v-icon small class="ml-1">mdi-open-in-new</v-icon>
            </v-btn>
          </a>
          <a 
            href="https://drive.google.com/drive/u/0/folders/1zTYdIR7x45GfZXizlrEXLFuxftiL4BiS" 
            target="_blank" 
            class="text-decoration-none"
          >
            <v-btn 
              size="x-small"
              outlined 
              color="primary"
            >
              Samples
              <v-icon small class="ml-1">mdi-open-in-new</v-icon>
            </v-btn>
          </a>
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
                  Control and manipulate the 3D scene, including image textures and transparency rendering
                </div>
                <div class="card-description text-caption text--secondary mb-3">
                  <code class="code-dark">importFile(), resetScene()</code>
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
                  <code class="code-dark">toggleLayerSelected(layerId)</code>
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
                
              </v-card-text>
            </v-expand-transition>
          </v-card>

          <!--Image Opacity Section -->
          <v-card outlined class="mb-4">
            <v-card-subtitle 
              class="d-flex align-center cursor-pointer pa-2" 
              @click="expandedSections.imageOpacity = !expandedSections.imageOpacity"
            >
              <v-icon small class="mr-2" color="teal">mdi-image-outline</v-icon>
              <span class="font-weight-medium">Image Opacity</span>
              <v-spacer></v-spacer>
              <v-icon :class="{ 'rotate-180': expandedSections.imageOpacity }">
                mdi-chevron-down
              </v-icon>
            </v-card-subtitle>
            <v-expand-transition>
              <v-card-text v-show="expandedSections.imageOpacity" class="pt-2">
                <div class="card-description text-caption text--secondary mb-2">
                  Control opacity of image textures
                </div>
                <div class="card-description text-caption text--secondary mb-3">
                  <code class="code-dark">setImageOpacity(opacity, layerId)</code>
                </div>
                
                <v-select
                  v-model="selectedImageLayerId"
                  :items="availableImageLayerIds"
                  item-title="name"
                  item-value="id"
                  label="Image Layer (optional)"
                  prepend-icon="mdi-image"
                  dense
                  outlined
                  class="mt-4 mb-n3"
                  :disabled="!floorplan3d"
                  clearable
                  hint="Leave empty to affect all images"
                  persistent-hint
                />
                
                <v-slider
                  v-model="imageOpacityValue"
                  label="Opacity"
                  min="0"
                  max="1"
                  step="0.05"
                  thumb-label
                  dense
                  class="mt-7 mb-0"
                  :disabled="!floorplan3d"
                  prepend-icon="mdi-opacity"
                />
                
                <v-btn
                  color="teal"
                  @click="setImageOpacityExample"
                  :disabled="!floorplan3d"
                  elevation="2"
                  block
                  class="mb-2"
                >
                  <v-icon small class="mr-1">mdi-image-outline</v-icon>
                  Set Image Opacity
                </v-btn>
                
              </v-card-text>
            </v-expand-transition>
          </v-card>

          <!-- Export Selected Layers Section -->
          <v-card outlined class="mb-4">
            <v-card-subtitle 
              class="d-flex align-center cursor-pointer pa-2" 
              @click="expandedSections.exportLayers = !expandedSections.exportLayers"
            >
              <v-icon small class="mr-2" color="purple">mdi-download</v-icon>
              <span class="font-weight-medium">Export Selected Layers</span>
              <v-spacer></v-spacer>
              <v-icon :class="{ 'rotate-180': expandedSections.exportLayers }">
                mdi-chevron-down
              </v-icon>
            </v-card-subtitle>
            <v-expand-transition>
              <v-card-text v-show="expandedSections.exportLayers" class="pt-2">
                <div class="card-description text-caption text--secondary mb-2">
                  Export Three.js geometry from selected layers
                </div>
                <div class="card-description text-caption text--secondary mb-3">
                  <code class="code-dark">exportSelectedLayersAsGLTF()</code>
                </div>
                
                <!-- Selected layers display -->
                <v-chip-group class="mb-3">
                  <v-chip
                    v-for="layer in selectedLayersForExport"
                    :key="layer.id"
                    small
                    color="purple"
                    text-color="white"
                    class="ma-1"
                  >
                    <v-icon small class="mr-1">mdi-layers</v-icon>
                    {{ layer.ui?.displayName || layer.name || layer.id }}
                  </v-chip>
                  <v-chip
                    v-if="selectedLayersForExport.length === 0"
                    small
                    outlined
                    class="ma-1"
                  >
                    No layers selected
                  </v-chip>
                </v-chip-group>

                <v-btn
                  color="purple"
                  @click="exportSelectedLayersExample"
                  :disabled="!floorplan3d || selectedLayersForExport.length === 0"
                  elevation="2"
                  block
                  class="mb-2"
                  :loading="exportLoading"
                >
                  <v-icon small class="mr-1">mdi-download</v-icon>
                  Export Selected Layers
                </v-btn>
                
              </v-card-text>
            </v-expand-transition>
          </v-card>

        </div>
        
      </v-card>
    </div>
    </v-main>
      
  </v-app>
</template>

<script>
import ThreejsRenderer from "~/components/threejs-renderer.vue";
import LayersPanel  from "~/components/layers-panel.vue";
import Floorplan3D from "@2112-lab/floorplan3d";

export default {
  components: {
    ThreejsRenderer,
    LayersPanel
  },
  data() {
    return {
      config: useRuntimeConfig(),
      floorplan3d: null,
      expandedSections: {
        sceneControls: true,
        layerManagement: false,
        layerConfig: false,
        exportLayers: false,
        imageOpacity: false,
      },
      // Layer storage - synced from floorplan3d
      layers: {},
      
      // API Examples data
      selectedLayerId: null,
      selectedConfigLayerId: null,
      selectedConfigPath: null,
      configValue: '',
      configPaths: [
        { name: 'Extrusion Start', path: 'layerConfigs.extrusion.start.value' },
        { name: 'Extrusion Height', path: 'layerConfigs.extrusion.height.value' },
        { name: 'Opacity', path: 'layerConfigs.extrusion.opacity.value' },
        { name: 'Material Color', path: 'layerConfigs.material.color.value' },
      ],

      // Export functionality data
      exportLoading: false,

      // Image opacity data
      selectedImageLayerId: null,
      imageOpacityValue: 1.0,
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

    availableImageLayerIds() {
      if (!this.layers || Object.keys(this.layers).length === 0) {
        return [];
      }
      
      return Object.entries(this.layers)
        .filter(([id, layer]) => layer.metadata?.category === 'raster')
        .map(([id, layer]) => ({
          id: id,
          name: layer.ui?.displayName || layer.name || id
        }));
    },

    selectedLayersForExport() {
      if (!this.layers || Object.keys(this.layers).length === 0) {
        return [];
      }
      
      return Object.entries(this.layers)
        .filter(([id, layer]) => layer && layer.selected === true)
        .map(([id, layer]) => ({
          ...layer,
          id: id
        }));
    },
  },
  mounted() {
    // Floorplan3D will be initialized when container is ready via onContainerReady event
  },
  beforeDestroy() {
    // Cleanup Floorplan3D instance when component is destroyed
    this.cleanupFloorplan3D();
  },
  methods: {
    // Component Lifecycle & Setup
    getConfigValueHint() {
      if (!this.selectedConfigPath) return 'Select a configuration path first';
      
      if (this.selectedConfigPath.includes('opacity')) {
        return 'Opacity value (0.0 to 1.0)';
      } else if (this.selectedConfigPath.includes('start') || this.selectedConfigPath.includes('end') || this.selectedConfigPath.includes('height')) {
        return 'Height/position value (number, can be negative)';
      } else if (this.selectedConfigPath.includes('color')) {
        return 'Hex color value (e.g., #ff0000, #00ff00, #0000ff)';
      }
      
      return 'Numeric value';
    },

    onContainerReady({ container, renderer }) {
      console.log('Container ready, initializing Floorplan3D...');
      this.$nextTick(() => {
        this.initFloorplan3D(container, renderer);
      });
    },

    onContainerDestroyed() {
      console.log('Container destroyed, cleaning up Floorplan3D...');
      this.cleanupFloorplan3D();
    },

    // Floorplan3D Initialization & Cleanup
    initFloorplan3D(containerRef, rendererRef) {

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
        // Initialize using Floorplan3D class and use shallowRef to prevent deep reactivity
        this.floorplan3d = new Floorplan3D(rendererRef, width, height);

        // Testing imports when using LOCAL_DEV 
        if(this.config.public.LOCAL_DEV ) {
          setTimeout(() => {
            console.log('Auto-importing default SVG file...');
            this.floorplan3d.importFileWithPath('/samples/FP3D-00-05.svg').then(() => {
              // Sync layers after auto-import completes
              this.syncLayersFromFloorplan3D();
              
              setTimeout(() => {
                const roomsLayer = this.findLayerByName('rooms');
        
                if (roomsLayer) {
                  this.floorplan3d.updateLayerConfig(roomsLayer.id, "layerConfigs.extrusion.opacity.value", 0.5);
                }
                
                console.log('Auto-import complete');
              }, 100);
            });
          }, 500);
        }        

        console.log('Floorplan3D initialized successfully');
      } catch (error) {
        console.error('Error initializing Floorplan3D:', error);
      }
    },

    // Cleanup
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

    // Sync layers from floorplan3d internal store
    syncLayersFromFloorplan3D() {
      if (this.floorplan3d?.layerStore) {
        this.layers = { ...this.floorplan3d.layerStore.layers };
        console.log('Layers synced:', Object.keys(this.layers).length, 'layers');
      } else {
        console.warn('Cannot sync layers: floorplan3d or layerStore not available');
      }
    },

    // Handle layer selection change event from LayersPanel
    onLayerSelectionChanged(event) {
      console.log('Layer selection changed:', event);
      // Sync layers after selection change
      this.syncLayersFromFloorplan3D();
    },

    toggleLayerSelected(layerId) {
      if (this.floorplan3d) {
        this.floorplan3d.toggleLayerSelected(layerId);
        // Sync the layers data to update the reactive state
        this.syncLayersFromFloorplan3D();
      }
    },

    // Scene Control Methods
    async importFile() {
      if (!this.floorplan3d) {
        console.error('Floorplan3D not initialized');
        return;
      }
      
      try {
        await this.floorplan3d.importFile();
        // Sync layers after successful import
        this.syncLayersFromFloorplan3D();
      } catch (error) {
        // Error notifications are handled by floorplan3d
        console.error("Error importing file:", error);
      }
    },

    resetScene() {
      if (!this.floorplan3d) {
        console.error('Floorplan3D not initialized');
        return;
      }
      
      this.floorplan3d.resetScene();
      // Sync layers after reset (should clear the layers)
      this.syncLayersFromFloorplan3D();
    },

    // Helper Methods
    findLayerByName(namePattern) {
      if (!this.floorplan3d) {
        console.warn('Floorplan3D not initialized');
        return null;
      }
      
      const allLayers = this.floorplan3d.layerStore.getAllLayers();
      return allLayers.find(layer => {
        const displayName = layer.ui?.displayName?.toLowerCase() || '';
        const layerName = layer.name?.toLowerCase() || '';
        const layerGroup = layer.metadata?.layerGroup?.toLowerCase() || '';
        const pattern = namePattern.toLowerCase();
        
        return displayName.includes(pattern) || 
               layerName.includes(pattern) || 
               layerGroup.includes(pattern);
      });
    },

    // API Example Methods
    toggleLayerSelectedExample() {
      if (!this.floorplan3d || !this.selectedLayerId) {
        console.warn('No layer selected or Floorplan3D not available');
        return;
      }
      
      try {
        this.floorplan3d.toggleLayerSelected(this.selectedLayerId);
        // Sync the layers data to update the reactive state
        this.syncLayersFromFloorplan3D();
        console.log(`Layer '${this.selectedLayerId}' selection toggled`);
      } catch (error) {
        console.error(`Error toggling layer selection: ${error.message}`);
      }
    },
    
    updateLayerConfigExample() {
      if (!this.floorplan3d || !this.selectedConfigLayerId || !this.selectedConfigPath || !this.configValue) {
        console.warn('Missing required fields for layer config update');
        return;
      }
      
      try {
        let processedValue = this.configValue;
        
        // Handle different value types based on the config path
        if (this.selectedConfigPath.includes('color')) {
          // Validate hex color format
          if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(this.configValue)) {
            console.error('Color value must be a valid hex color (e.g., #ff0000)');
            return;
          }
          // Color values are kept as strings
          processedValue = this.configValue;
        } else {
          // For numeric values, convert to number
          processedValue = parseFloat(this.configValue);
          if (isNaN(processedValue)) {
            console.error('Config value must be a valid number');
            return;
          }
        }
        
        console.log('Updating layer config:', this.selectedConfigLayerId, this.selectedConfigPath, processedValue);
        
        const result = this.floorplan3d.updateLayerConfig(this.selectedConfigLayerId, this.selectedConfigPath, processedValue);
        
        if (result) {
          console.log(`Layer config updated: ${this.selectedConfigPath} = ${processedValue}`);
        } else {
          console.warn(`Layer ${this.selectedConfigLayerId} not found`);
        }
      } catch (error) {
        console.error('Error updating layer config:', error);
      }
    },

    async exportSelectedLayersExample() {
      if (!this.floorplan3d) {
        console.error('Floorplan3D not available');
        return;
      }

      const selectedLayers = this.floorplan3d.layerStore.getSelectedLayers();
      if (selectedLayers.length === 0) {
        console.warn('No layers selected for export');
        return;
      }

      this.exportLoading = true;
      
      try {
        let exportResult;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        exportResult = await this.exportSelectedLayersAsGLTF(selectedLayers, timestamp);

        if (exportResult) {
          console.log(`Export completed: ${exportResult.filename}`);
        }
      } catch (error) {
        console.error('Export error:', error);
      } finally {
        this.exportLoading = false;
      }
    },

    async exportSelectedLayersAsGLTF(selectedLayers, timestamp) {
      try {
        // Use the Floorplan3D method to export selected layers
        const gltfData = await this.floorplan3d.exportSelectedLayersAsGLTF();
        
        const layerNames = selectedLayers.map(l => l.ui?.displayName || l.name || l.id).join('_');
        const filename = `selected_layers_${layerNames}_${timestamp}.glb`;
        
        // Convert to blob and download
        const blob = new Blob([gltfData], { type: 'application/octet-stream' });
        this.downloadBlob(blob, filename);
        
        return { filename, blob };
      } catch (error) {
        throw new Error(`GLTF export failed: ${error.message}`);
      }
    },

    downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    // Image opacity methods
    setImageOpacityExample() {
      if (!this.floorplan3d) {
        console.error('Floorplan3D not available');
        return;
      }
      
      try {
        const result = this.floorplan3d.setImageOpacity(
          this.imageOpacityValue, 
          this.selectedImageLayerId || null
        );
        
        if (result) {
          const targetDescription = this.selectedImageLayerId 
            ? `layer ${this.selectedImageLayerId}` 
            : 'all images';
          console.log(`Image opacity set to ${this.imageOpacityValue} for ${targetDescription}`);
        }
      } catch (error) {
        console.error('Error setting image opacity:', error);
      }
    }
  }
}

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
