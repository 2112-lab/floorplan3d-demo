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

              <!-- 3D Toggle Icon -->
              <v-icon 
                color="black" 
                size="x-small"
                class="mr-1"
                @click.stop="toggle3DVisibility(layer.id)"
                :disabled="layer.disabled || layer.metadata.category !== 'vector'"
                style="cursor: pointer;"
              >
                {{ layer.show3D ? 'mdi-video-3d' : 'mdi-video-3d-off' }}
              </v-icon>              <span 
                :class="{ 'text--disabled': layer.disabled }"
                class="small-text"
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
            <div class="layer-controls" :class="{ 'visible': layer.ui.menuOpen }">
              <!-- Dots vertical menu -->
              <v-menu
                v-model="layer.ui.menuOpen"
                :close-on-content-click="true"
                location="end"
                offset="5"
                @close="handleMenuClose(layer.id)"
              >
                <template v-slot:activator="{ props }">                  
                  <v-btn 
                    icon="mdi-dots-vertical" 
                    variant="text" 
                    size="x-small" 
                    density="compact"
                    class="layer-btn"
                    :disabled="layer.disabled"
                    v-bind="props"
                    @click.stop
                  ></v-btn>
                </template>
                <v-list density="compact">
                  <v-list-item 
                    @click="moveLayerUp(layer.id)"
                    :disabled="isFirstLayer(layer) || layer.disabled"
                  >
                    <template v-slot:prepend>
                      <v-icon size="small">mdi-arrow-up</v-icon>
                    </template>
                    <v-list-item-title>Move Up</v-list-item-title>
                  </v-list-item>
                  
                  <v-list-item 
                    @click="moveLayerDown(layer.id)"
                    :disabled="isLastLayer(layer) || layer.disabled || sortedLayers.length == 1"
                  >
                    <template v-slot:prepend>
                      <v-icon size="small">mdi-arrow-down</v-icon>
                    </template>
                    <v-list-item-title>Move Down</v-list-item-title>
                  </v-list-item>
                  
                  <v-divider></v-divider>
                  
                  <v-list-item 
                    @click="openRenameDialog(layer)"
                    :disabled="layer.disabled"
                  >
                    <template v-slot:prepend>
                      <v-icon size="small">mdi-pencil</v-icon>
                    </template>
                    <v-list-item-title>Rename</v-list-item-title>
                  </v-list-item>
                  
                  <v-list-item 
                    @click="cloneLayer(layer.id)"
                    :disabled="layer.disabled"
                  >
                    <template v-slot:prepend>
                      <v-icon size="small">mdi-content-copy</v-icon>
                    </template>
                    <v-list-item-title>Clone</v-list-item-title>
                  </v-list-item>
                  
                  <v-list-item 
                    @click="deleteLayer(layer.id)"
                    :disabled="layer.disabled"
                    class="text-error"
                  >
                    <template v-slot:prepend>
                      <v-icon size="small" color="error">mdi-delete</v-icon>
                    </template>
                    <v-list-item-title>Delete</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </div>
          
          <!-- Opacity Slider (Commented out as in original) -->
          <!-- <div class="opacity-slider-container" @click.stop>
            <v-tooltip location="top">
              <template v-slot:activator="{}">
              <div style="width:24px; text-align:right; margin-right:2px">
                {{(layer.layerConfigs.layer.opacity.value * 100).toFixed(0)}}
              </div>
              
              </template>
              <span>Opacity: {{ Math.round(layer.layerConfigs.layer.opacity.value * 100) }}%</span>
            </v-tooltip>
            <v-slider
              v-model="layer.layerConfigs.layer.opacity.value"
              :min="0"
              :max="1"
              :step="0.01"
              :disabled="layer.disabled"
              density="compact"
              hide-details
              class="opacity-slider"
              @click.stop
              @input="updateLayerOpacity(layer.id)"
              thumb-size="1"
            ></v-slider>
          </div> -->

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
      layerToRename: null
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
      // Close all open menus
      for (const layerId in this.layers) {
        if (this.layers[layerId].ui?.menuOpen) {
          this.layers[layerId].ui.menuOpen = false;
        }
      }
    },
    
    togglePanel() {
      // First close all open menus to prevent visual artifacts
      this.closeAllMenus();
      // Then toggle the panel state
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
    
    moveLayerUp(layerId) {
      // Note: moveLayerUp method needs to be implemented in layerStore if needed
      console.log('moveLayerUp not implemented in layerStore');
    },
    
    moveLayerDown(layerId) {
      // Note: moveLayerDown method needs to be implemented in layerStore if needed
      console.log('moveLayerDown not implemented in layerStore');
    },
    
    cloneLayer(layerId) {
      // Note: cloneLayer method needs to be implemented in layerStore if needed
      console.log('cloneLayer not implemented in layerStore');
    },
    
    deleteLayer(layerId) {
      // Note: deleteLayer method needs to be implemented in layerStore if needed
      console.log('deleteLayer not implemented in layerStore');
    },
    
    isFirstLayer(layer) {
      // Check if this layer has the lowest order value
      return layer.ui.order === Math.min(...Object.values(this.layers).map(l => l.ui.order));
    },
    
    isLastLayer(layer) {
      // Check if this layer has the highest order value
      return layer.ui.order === Math.max(...Object.values(this.layers).map(l => l.ui.order));
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
    
    handleMenuClose(layerId) {
      // No additional actions needed
    },
    
    updateLayerOpacity(layerId) {
      const layer = this.layers[layerId];
      if (layer && this.floorplan3d) {
        // Use floorplan3d's updateLayerConfig method
        this.floorplan3d.updateLayerConfig(
          layerId, 
          'layerConfigs.layer.opacity.value', 
          layer.layerConfigs.layer.opacity.value
        );
      }
    },

    toggleLayerSelected(layerId) {
      const layer = this.layers[layerId];
      if (layer?.disabled) return;
      
      // Toggle selected state using floorplan3d instance
      if (this.floorplan3d) {
        this.floorplan3d.toggleLayerSelected(layerId);
      }
    },
    
    toggle3DVisibility(layerId) {
      console.log("toggle3DVisibility started for layer:", layerId);
      const layer = this.layers[layerId];
      if (layer?.disabled) return;
      
      // Toggle the show3D property using floorplan3d instance
      if (this.floorplan3d) {
        const newValue = !layer.show3D;
        this.floorplan3d.updateLayerConfig(layerId, 'show3D', newValue);

        console.log("toggle3DVisibility layer:", JSON.parse(JSON.stringify(layer)));

        if (layer.threejsContent && layer.threejsContent.objects) {
          for(let obj of layer.threejsContent.objects) {
            console.log("toggle3DVisibility obj:", JSON.parse(JSON.stringify(obj)));
            obj.visible = newValue;
          }   
        }
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

/* Display controls when menu is open */
.layer-controls.visible {
  opacity: 1;
}

/* Keep the controls visible when menu is open - alternative approach */
.layer-item .layer-controls:has(.v-btn:has(+ .v-overlay--active)) {
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
