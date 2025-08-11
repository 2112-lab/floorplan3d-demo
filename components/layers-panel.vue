<template>
  <div class="layers-container">
    <div class="layers-panel">      
      <div 
        class="d-flex justify-space-between align-center pb-1 pt-1 panel-header" 
        @click="togglePanel"
        style="cursor: pointer;"
      >
        <span class="text-subtitle-2">Layers</span>
        <div class="d-flex align-center">
          
          <v-icon size="x-small" class="mr-1">mdi-layers</v-icon>
          <v-icon size="x-small">{{ isPanelCollapsed ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
        </div>
      </div>
      
      <div 
        class="layer-list" 
        :class="{ 'collapsed': isPanelCollapsed }"
        v-show="!isPanelCollapsed"
      >
        <div 
          v-for="layer in sortedLayers" 
          :key="layer.id"
          class="layer-item"
          :class="{ 'active': layer.active, 'disabled': layer.disabled }"
          @click="selectLayer(layer.id)"
        >
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">              
              <!-- Checkbox for "selected" state -->
              <v-checkbox
                v-model="layer.selected"
                density="compact"
                hide-details
                class="mr-0 mt-0 mb-0 ml-0 compact-checkbox"
                @click.stop="toggleLayerSelected(layer.id)"
              ></v-checkbox>
            
              <span 
                :class="{ 'text--disabled': layer.disabled }"
                class="small-text"
                @dblclick.stop="openRenameDialog(layer)"
                style="cursor: text;"
                title="Double-click to rename"
              >{{ layer.ui.displayName }}</span>
              <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                  <v-icon 
                    size="x-small" 
                    class="ml-1" 
                    :color="layer.metadata.category === 'vector' ? 'blue-grey' : 'blue-grey'"
                    v-bind="props"
                  >
                    {{ layer.metadata.category === 'vector' ? 'mdi-vector-square' : 'mdi-image' }}
                  </v-icon>
                </template>
                <span>{{ layer.metadata.category === 'vector' ? 'Vector' : 'Raster' }}</span>
              </v-tooltip>
            </div>
            <div class="layer-controls">
              <!-- Chevron button to expand controls -->
              <v-btn 
                v-if="layer.metadata.category === 'vector' || layer.metadata.category === 'raster'"
                variant="text" 
                size="x-small" 
                density="compact"
                class="layer-btn"
                :disabled="layer.disabled"
                @click.stop="toggleControlsExpanded(layer.id)"
              >
                <v-icon 
                  size="x-small"
                  :class="{ 'rotate-180': isControlsExpanded(layer.id) }"
                >
                  mdi-chevron-down
                </v-icon>
              </v-btn>
            </div>
          </div>
          
          <!-- Collapsible 3D Controls Section for Vector Layers -->
          <div 
            v-if="layer.metadata.category === 'vector' && isControlsExpanded(layer.id)" 
            class="controls-section" 
            @click.stop
          >
            <div 
              class="controls-content pa-2"
              style="background-color: #f8f9fa; border-top: 1px solid #e9ecef;"
            >

              <!-- Extrusion Start Position Slider -->
              <div v-if="layer.layerConfigs?.extrusion?.start" class="control-row mb-2">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption">Extrusion Start</span>
                  <span class="text-caption text--secondary">
                    {{ Math.round(layer.layerConfigs.extrusion.start.value * 10) / 10 }}
                  </span>
                </div>
                <v-slider
                  v-model="layer.layerConfigs.extrusion.start.value"
                  :min="Math.max(0, layer.layerConfigs.extrusion.start.min)"
                  :max="layer.layerConfigs.extrusion.start.max"
                  :step="layer.layerConfigs.extrusion.start.step"
                  :disabled="layer.disabled"
                  density="compact"
                  hide-details
                  class="control-slider"
                  @update:model-value="updateExtrusionStart(layer.id, $event)"
                  thumb-size="12"
                  track-size="2"
                ></v-slider>
              </div>

              <!-- Extrusion Height Position Slider -->
              <div v-if="layer.layerConfigs?.extrusion?.height" class="control-row mb-2">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption">Extrusion Height</span>
                  <span class="text-caption text--secondary">
                    {{ Math.round(layer.layerConfigs.extrusion.height.value * 10) / 10 }}
                  </span>
                </div>
                <v-slider
                  v-model="layer.layerConfigs.extrusion.height.value"
                  :min="Math.max(layer.layerConfigs.extrusion.height.min, 1)"
                  :max="layer.layerConfigs.extrusion.height.max"
                  :step="layer.layerConfigs.extrusion.height.step"
                  :disabled="layer.disabled"
                  density="compact"
                  hide-details
                  class="control-slider"
                  @update:model-value="updateExtrusionHeight(layer.id, $event)"
                  thumb-size="12"
                  track-size="2"
                ></v-slider>
              </div>

              <!-- Extrusion Opacity Slider -->
              <div v-if="layer.layerConfigs?.extrusion?.opacity" class="control-row mb-1">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption">3D Mesh Opacity</span>
                  <span class="text-caption text--secondary">
                    {{ Math.round(layer.layerConfigs.extrusion.opacity.value * 100) }}%
                  </span>
                </div>
                <v-slider
                  v-model="layer.layerConfigs.extrusion.opacity.value"
                  :min="0"
                  :max="1"
                  :step="0.01"
                  :disabled="layer.disabled"
                  density="compact"
                  hide-details
                  class="control-slider"
                  @update:model-value="updateExtrusionOpacity(layer.id)"
                  thumb-size="12"
                  track-size="2"
                ></v-slider>
              </div>
            </div>
          </div>

          <!-- Collapsible Controls Section for Raster Layers -->
          <div 
            v-if="layer.metadata.category === 'raster' && isControlsExpanded(layer.id)" 
            class="controls-section" 
            @click.stop
          >
            <div 
              class="controls-content pa-2"
              style="background-color: #f8f9fa; border-top: 1px solid #e9ecef;"
            >

              <!-- Image Opacity Slider -->
              <div v-if="layer.layerConfigs?.layer?.opacity" class="control-row mb-1">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption">Image Opacity</span>
                  <span class="text-caption text--secondary">
                    {{ Math.round(layer.layerConfigs.layer.opacity.value * 100) }}%
                  </span>
                </div>
                <v-slider
                  v-model="layer.layerConfigs.layer.opacity.value"
                  :min="0"
                  :max="1"
                  :step="0.01"
                  :disabled="layer.disabled"
                  density="compact"
                  hide-details
                  class="control-slider"
                  @update:model-value="updateImageOpacity(layer.id)"
                  thumb-size="12"
                  track-size="2"
                ></v-slider>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <!-- Rename Dialog -->
      <v-dialog
        v-model="renameDialogVisible"
        max-width="400"
      >
        <v-card>
          <v-card-title class="text-h6">
            Rename Layer
          </v-card-title>
          <v-card-text>
            <v-text-field
              v-model="newLayerName"
              label="Layer Name"
              variant="outlined"
              density="compact"
              autofocus
              @keydown.enter="confirmRename"
            ></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="red-darken-2"
              variant="outlined"
              @click="cancelRename"
            >
              Cancel
            </v-btn>
            <v-btn
              color="green-darken-2"
              variant="outlined"
              @click="confirmRename"
              :disabled="!newLayerName.trim()"
            >
              Rename
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </div>
</template>

<script>
import { reactive } from 'vue';

export default {
  props: {
    floorplan3d: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      layers: {},
      isPanelCollapsed: false,
      renameDialogVisible: false,
      newLayerName: '',
      layerToRename: null,
      expandedControls: reactive({}) // Track which layers have expanded controls
    };
  },
  computed: {
    areAllLayersInvisible() {
      // Consider a layer invisible if its opacity is 0
      return Object.values(this.layers).every(layer => 
        layer.layerConfigs.layer.opacity.value === 0
      );
    },
    
    // Get sorted layers for display
    sortedLayers() {
      // Create a copy of layers object as array with id included
      return Object.entries(this.layers)
        .filter(([id, layer]) => {
          // Filter out layers with names "grid" or "selection"
          return !["grid", "selection"].includes(layer.name?.toLowerCase() || '');
        })
        .map(([id, layer]) => ({
          ...layer,
          id // Include the layer id (object key) in each layer object
        }))
        .sort((a, b) => a.ui.order - b.ui.order);
    }
  },
  watch: {
    // Watch for changes in the floorplan3d prop and set up layer watcher
    floorplan3d: {
      handler(newVal, oldVal) {
        if (newVal && newVal !== oldVal) {
          // Clean up old subscription if it exists
          if (this.unsubscribeLayers) {
            this.unsubscribeLayers();
          }
          // Set up new layer watcher
          this.setupLayerWatcher();
        }
      },
      immediate: true
    }
  },
  mounted() {
    // Listen for clicks on the svg container to close menus
    document.addEventListener('click', this.handleOutsideClick);
    
    // Listen for the custom close-v-menus event from svg renderer
    document.addEventListener('close-v-menus', this.closeAllMenus);
    
    // Set up watcher for layer changes from floorplan3d
    this.setupLayerWatcher();
  },
  beforeUnmount() {
    // Remove event listeners when component is destroyed
    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('close-v-menus', this.closeAllMenus);
    
    // Cleanup layer subscription
    if (this.unsubscribeLayers) {
      this.unsubscribeLayers();
    }
  },
  methods: {
    setupLayerWatcher() {
      // Subscribe to layer changes from floorplan3d instance
      if (this.floorplan3d?.layerStore) {
        this.unsubscribeLayers = this.floorplan3d.layerStore.subscribe((state) => {
          this.layers = { ...state.layers };
        });
        
        // Initial sync
        this.layers = { ...this.floorplan3d.layerStore.layers };
      } else {
        // Retry after a short delay if floorplan3d is not ready
        setTimeout(() => {
          this.setupLayerWatcher();
        }, 100);
      }
    },
    
    handleOutsideClick(event) {
      // Check if the click was on svg container
      const svgContainer = document.getElementById('svg-container');
      if (svgContainer && svgContainer.contains(event.target)) {
        this.closeAllMenus();
      }
    },
    
    closeAllMenus() {
      // No longer needed since we removed the dropdown menus
    },
    
    togglePanel() {
      // Toggle the panel collapse state
      this.isPanelCollapsed = !this.isPanelCollapsed;
    },
    
    selectLayer(layerId) {
      const layer = this.layers[layerId];
      if (layer?.disabled) return;
      
      // Set the layer as active using floorplan3d instance
      if (this.floorplan3d) {
        this.floorplan3d.setLayerActive(layerId);
      }
    },

    toggleLayerSelected(layerId) {
      const layer = this.layers[layerId];
      if (layer?.disabled) return;
      
      // Toggle the layer selection using floorplan3d instance
      if (this.floorplan3d) {
        this.floorplan3d.toggleLayerSelected(layerId);
      }
    },
    
    openRenameDialog(layer) {
      if (layer?.disabled) return;
      
      this.layerToRename = layer;
      this.newLayerName = layer.ui.displayName;
      this.renameDialogVisible = true;
    },
    
    confirmRename() {
      if (this.layerToRename && this.newLayerName.trim()) {
        // Update the layer name using floorplan3d instance
        if (this.floorplan3d) {
          this.floorplan3d.updateLayerConfig(
            this.layerToRename.id, 
            'ui.displayName', 
            this.newLayerName.trim()
          );
        }
        
        // Close the dialog
        this.cancelRename();
      }
    },
    
    cancelRename() {
      this.renameDialogVisible = false;
      this.newLayerName = '';
      this.layerToRename = null;
    },

    // Methods for managing expanded controls state
    toggleControlsExpanded(layerId) {
      this.expandedControls[layerId] = !this.expandedControls[layerId];
    },

    isControlsExpanded(layerId) {
      return !!this.expandedControls[layerId];
    },

    // Methods for updating extrusion properties with validation
    updateExtrusionStart(layerId, newValue) {
      const layer = this.layers[layerId];
      if (layer && this.floorplan3d) {
        // Ensure start value is never below 0
        const clampedStart = Math.max(0, newValue);
        
        // Update the start value (height remains independent)
        this.floorplan3d.updateLayerConfig(
          layerId, 
          'layerConfigs.extrusion.start.value', 
          clampedStart
        );
        
        // Update derived properties
        this.updateExtrusionDimensions(layerId);
      }
    },

    updateExtrusionHeight(layerId, newValue) {
      const layer = this.layers[layerId];
      if (layer && this.floorplan3d) {
        // Ensure height value is never below 1
        const clampedHeight = Math.max(1, newValue);
        
        // Update the height value
        this.floorplan3d.updateLayerConfig(
          layerId, 
          'layerConfigs.extrusion.height.value', 
          clampedHeight
        );
        
        // Update derived properties
        this.updateExtrusionDimensions(layerId);
      }
    },

    // Methods for updating extrusion properties
    updateExtrusionDimensions(layerId) {
      const layer = this.layers[layerId];
      if (layer && this.floorplan3d) {
        // Get the current start and height (end position) values
        const start = layer.layerConfigs.extrusion.start.value;
        const height = layer.layerConfigs.extrusion.height.value;
        
        // Update the values (height represents the end position)
        this.floorplan3d.updateLayerConfig(
          layerId, 
          'layerConfigs.extrusion.start.value', 
          start
        );
        this.floorplan3d.updateLayerConfig(
          layerId, 
          'layerConfigs.extrusion.height.value', 
          height
        );
      }
    },

    // Keep the old method for backward compatibility
    updateExtrusionHeight(layerId) {
      this.updateExtrusionDimensions(layerId);
    },

    updateExtrusionOpacity(layerId) {
      const layer = this.layers[layerId];
      if (layer && this.floorplan3d) {
        // Use floorplan3d's updateLayerConfig method
        this.floorplan3d.updateLayerConfig(
          layerId, 
          'layerConfigs.extrusion.opacity.value', 
          layer.layerConfigs.extrusion.opacity.value
        );
      }
    }
  }
};
</script>

<style scoped>
.layers-container {
  position: absolute;
  top: 75px;
  left: 250px;
  width: 300px;
  overflow: hidden;
  border: 1px solid #aaa;
  border-radius: 4px;
  background-color: white;
  z-index: 1000;
  padding:2px;
  /* box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); */
}

.layers-panel {
  background-color: #eee0;
  border-top: 1px solid #0002;
}

.panel-header {
  padding: 6px;
  user-select: none;
  transition: background-color 0.2s ease;
}

.panel-header:hover {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.layer-list {
  padding-top: 2px;
  overflow-y: auto;
  transition: all 0.3s ease;
  height: auto; /* Allow height to be determined by content */
  max-height: none; /* Remove fixed max-height */
}

.layer-list.collapsed {
  max-height: 0;
  overflow: hidden;
}

.layer-item {
  padding: 3px 0px;
  border-radius: 3px;
  margin-bottom: 2px;
  margin-left: 4px;
  margin-right: 4px;
  cursor: pointer;
  background-color: #f9f9f9;
  border: 1px solid #aaa;
  transition: all 0.2s;
  font-size: 0.85rem;
}

.layer-item:hover:not(.disabled) {
  background-color: #ececec;
}

.layer-item.active {
  background-color: #e3f2fd;
  /* border-color: #bbdefb; */
}

.layer-item.active:hover {
  background-color: #ddecf9;
  /* border-color: #90caf9; */
}

.layer-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.layer-controls {
  display: flex;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.layer-item:hover .layer-controls {
  opacity: 1;
}

.layer-btn {
  margin: 0;
  height: 24px;
  min-width: 24px;
  width: 24px;
}

/* Add styles for the layer menu */
.v-list-item.text-error .v-list-item-title {
  color: rgb(var(--v-theme-error));
}

/* Add styles for the opacity slider */
.opacity-slider-container {
  display: flex;
  align-items: center;
}

.opacity-icon {
  margin-right: 6px;
}

.opacity-slider {
  flex-grow: 1;
}

/* Custom styles for compact elements */
.small-text {
  font-size: 0.85rem;
  line-height: 1.1;
  padding: 0 5px;
}

.compact-checkbox :deep(.v-selection-control) {
  min-height: 24px;
  padding: 0 5px;
  margin: 0;
}

.compact-checkbox :deep(.v-selection-control__wrapper) {
  margin: 0;
  height: 24px;
}

/* 3D Controls Section Styles */
.controls-section {
  margin-top: 2px;
  border-radius: 3px;
  overflow: hidden;
}

.controls-header {
  user-select: none;
  transition: background-color 0.2s ease;
}

.controls-header:hover {
  background-color: #e9ecef !important;
}

.controls-content {
  animation: slideDown 0.3s ease;
}

.control-row {
  margin-bottom: 8px;
}

.control-slider {
  margin-top: 4px;
}

.control-slider :deep(.v-slider-track__fill) {
  background-color: #1976d2;
}

.control-slider :deep(.v-slider-thumb) {
  color: #1976d2;
}

.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 200px;
  }
}
</style>

<style>
.v-slider.v-input--horizontal > .v-input__control {
  min-height: 0px;
}

/* Compact layer item styles */
.layer-item .v-btn {
  padding: 0 !important;
}

.layer-item .v-icon--size-x-small {
  font-size: 14px !important;
}

.layer-item .v-checkbox {
  margin-bottom: 0 !important;
  margin-top: 0 !important;
}

.layer-item .v-selection-control {
  margin-bottom: 0 !important;
  margin-top: 0 !important;
}
</style>
