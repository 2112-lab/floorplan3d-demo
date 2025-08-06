<template>
  <div class="left-panel-container">
    <router-link to="/" style="text-decoration: none; color: #222">
      <div class="pt-5 pb-5 rubik-mono-one-regular" style="margin-left:16px">FlOORPLAN 3D</div>
    </router-link>

    <div class="inner-navigation-drawer">

      <div class="mt-7 mb-2 mx-0">
        <ActionsPanel />
      </div>      

      <!-- Converted Editing panel to standalone div -->
      <div class="custom-editing-panel">
        <div class="custom-editing-header">
          <span>Editing</span>
          <v-spacer/>
          <v-icon>mdi-pencil-outline</v-icon>
        </div>
        <div class="custom-editing-content">
          <EditingPanel />
        </div>
      </div>

      <v-expansion-panels 
        style=""
        bg-color="#ddd"
        flat
      >
        <!-- 2D Layer Panel -->
        <v-expansion-panel :disabled="!(activeDocument?.docConfigs?.layer)">
          <v-expansion-panel-title collapse-icon="mdi-layers" expand-icon="mdi-layers">
            2D Layer
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <!-- Opacity slider -->
            <div v-if="activeDocument.docConfigs.layer.opacity" class="slider-container mb-2">
              <label class="text-caption d-block mb-1">Opacity</label>
              <div class="d-flex align-center slider-wrapper">
                <div class="slider-value-container mr-2">{{ (layerOpacity * 100).toFixed(0) }}%</div>
                <v-slider
                  v-model="layerOpacity"
                  @update:modelValue="handleLayerOpacityChange"
                  :min="activeDocument.docConfigs.layer.opacity.min"
                  :max="activeDocument.docConfigs.layer.opacity.max"
                  :step="activeDocument.docConfigs.layer.opacity.step"
                  hide-details
                  density="compact"
                  class="flex-grow-1"
                ></v-slider>
              </div>
            </div>

            <!-- Scale slider -->
            <div v-if="activeDocument.docConfigs.layer.scale" class="slider-container mb-2">
              <label class="text-caption d-block mb-1">Scale</label>
              <div class="d-flex align-center slider-wrapper">
             
                <v-row>
                  <v-col>
                    <v-number-input 
                      :step="activeDocument.docConfigs.layer.scale.step"
                      :min="activeDocument.docConfigs.layer.scale.min"
                      :max="activeDocument.docConfigs.layer.scale.max"
                      density="compact" 
                      control-variant="stacked"
                      @update:modelValue="handleLayerScaleChange"
                      v-model="layerScale"
                      precision="1"
                      class="flex-grow-1"
                    >
                      </v-number-input>
                  </v-col>
                </v-row>
              </div>
            </div>

            <!-- Layer Position control -->
            <div v-if="activeDocument.docConfigs.layer.pos" class="slider-container">
              <label class="text-caption d-block mb-1">Position</label>            
              <div class="mb-n3">
                <!-- <v-row>
                  <v-col>
                    <span class="text-caption">X Pos</span>
                    <v-number-input 
                      v-model="layerPositionX"
                      @update:modelValue="(value) => handleLayerPositionChange(value, 'x')"
                      density="compact"
                      control-variant="stacked"
                      :step="10"
                    ></v-number-input>
                  </v-col>
                  <v-col>
                    <span class="text-caption">Y Pos</span>
                    <v-number-input 
                      v-model="layerPositionY"
                      @update:modelValue="(value) => handleLayerPositionChange(value, 'y')"
                      density="compact"
                      control-variant="stacked"
                      :step="10"
                    ></v-number-input>
                  </v-col>
                </v-row> -->
                <LayerNavigationControls :document="activeDocument" />
              </div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- 3D Rendering Panel -->
        <v-expansion-panel :disabled="!(activeDocument?.docConfigs?.extrusion && activeDocument.metadata?.category === 'vector')">
          <v-expansion-panel-title collapse-icon="mdi-video-3d" expand-icon="mdi-video-3d">
            3D Rendering
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <!-- Opacity -->
            <div v-if="activeDocument.docConfigs.extrusion.opacity" class="slider-container mb-2">
              <label class="text-caption d-block mb-1">Opacity</label>
              <div class="d-flex align-center slider-wrapper">
                <div class="slider-value-container mr-2">{{ (extrusionOpacity * 100).toFixed(0) }}%</div>
                <v-slider
                  v-model="extrusionOpacity"
                  @update:modelValue="handleExtrusionOpacityChange"
                  :min="activeDocument.docConfigs.extrusion.opacity.min"
                  :max="activeDocument.docConfigs.extrusion.opacity.max"
                  :step="activeDocument.docConfigs.extrusion.opacity.step"
                  hide-details
                  density="compact"
                  class="flex-grow-1"
                ></v-slider>
              </div>
            </div>            
            <!-- Height -->
            <div v-if="activeDocument.docConfigs.extrusion.height" class="slider-container mb-2">
              <label class="text-caption d-block mb-1">Height</label>
              <div class="d-flex align-center">
                <v-number-input 
                      :min="activeDocument.docConfigs.extrusion.height.min"
                      :max="activeDocument.docConfigs.extrusion.height.max"
                      :step="activeDocument.docConfigs.extrusion.height.step"
                      density="compact"
                      control-variant="stacked"
                      @update:modelValue="handleExtrusionHeightChange"
                      v-model="extrusionHeight"
                    
                      class="flex-grow-1"
                    >
                      </v-number-input>
              </div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel>
          <v-expansion-panel-title collapse-icon="mdi-cloud-download-outline" expand-icon="mdi-cloud-download-outline">
            Advanced
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <AdvancedPanel />
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel>
          <v-expansion-panel-title collapse-icon="mdi-cog" expand-icon="mdi-cog">
            Settings
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

    </div>    

  </div>
</template>

<script>
import ActionsPanel from "./actions-panel.vue";
import EditingPanel from "../editing-panel/editing-panel.vue";
import AdvancedPanel from "./advanced/advanced-panel.vue";
import LayerNavigationControls from "./layer-navigation-controls.vue";
import { useKonvaStore } from "~/store/konva-store";
import { useConsoleStore } from "~/store/console-store";
import { useThreeStore } from "~/store/three-store";
import { useEditStore } from "~/store/edit"; 
import { scaleSvg, translateSvg } from "~/lib/svg";
import { centerLayer } from "~/lib/konva/center-layer";

export default {
  components: {
    ActionsPanel,
    EditingPanel,
    AdvancedPanel,
    LayerNavigationControls,
  },
  data() {
    return {
      konvaStore: useKonvaStore(),
      consoleStore: useConsoleStore(),
      threeStore: useThreeStore(),
      editStore: useEditStore(),
      
      // Form values for layer settings
      layerOpacity: 1,
      layerScale: 1,
      extrusionHeight: 10, // Default height value
      extrusionOpacity: 1,
      layerPositionX: 0,
      layerPositionY: 0,
      svgMode: "path",
      
      // UI state
      isScaleInputActive: false,
      scaleInputValue: 0,

      // Store original SVGs
      originalSvgPath: null,
      originalSvgPolyline: null,
    };
  },
  computed: {
    // Get the active document from the store
    activeDocument() {
      // Check if konvaStore and documents exist
      if (!this.konvaStore || !this.konvaStore.documents) {
        return null;
      }
      
      // Find the active document in documents
      const activeDoc = Object.values(this.konvaStore.documents).find(doc => doc && doc.active === true);
      // get id of active doc
      const activeDocId = Object.keys(this.konvaStore.documents).find(id => this.konvaStore.documents[id] === activeDoc);

      // If no document is active, use the first one
      if (activeDoc) {
        return { ...activeDoc, id: activeDocId };
      } else if (Object.keys(this.konvaStore.documents).length > 0) {
        const firstDocId = Object.keys(this.konvaStore.documents)[0];
        return { ...this.konvaStore.documents[firstDocId], id: firstDocId };
      }
      
      return null;
    },
    // Get the active layer object
    activeLayerObj() {
      if (!this.activeDocument || !this.activeDocument.konva) return null;
      
      // Return the layer directly from the active document
      return this.activeDocument.konva.layer;
    }
  },
  methods: {
    handleLayerPositionChange(value, axis) {
      if (!this.activeDocument || !this.activeLayerObj) return;
      
      const moveAmount = 10; // pixels to move per step
      let newX = this.layerPositionX;
      let newY = this.layerPositionY;

      // Update the layer position
      if (axis === "x") {
        this.activeLayerObj.x(newX);
      } else if (axis === "y") {
        this.activeLayerObj.y(newY);
      }

      // Update the document position in store
      if (this.activeDocument.docConfigs.layer.pos) {
        this.activeDocument.docConfigs.layer.pos.x.value = this.activeLayerObj.x();
        this.activeDocument.docConfigs.layer.pos.y.value = this.activeLayerObj.y();
      }

      this.activeLayerObj.batchDraw();

      // Translate SVG paths and polylines
      const originalSvgPath = this.activeDocument.originalSvgPath;
      const originalSvgPolyline = this.activeDocument.originalSvgPolyline;

      // Calculate translation amounts
      const translateX = this.activeLayerObj.x();
      const translateY = this.activeLayerObj.y();

      // Translate the SVGs
      const translatedSvgPath = translateSvg(originalSvgPath, translateX, translateY);
      const translatedSvgPolyline = translateSvg(originalSvgPolyline, translateX, translateY);

      // Update the stores with translated SVGs
      this.$konvaStore.setSvgPath(this.activeDocument.id, translatedSvgPath);
      this.$konvaStore.setSvgPolyline(this.activeDocument.id, translatedSvgPolyline);

      // Update console output based on current mode
      const mode = this.activeDocument.docConfigs?.svg?.mode?.value;
      if (mode === "path") {
        this.$consoleStore.setConsoleOutput(translatedSvgPath, this.activeDocument.id);
      } else if (mode === "polyline") {
        this.$consoleStore.setConsoleOutput(translatedSvgPolyline, this.activeDocument.id);
      }
    },

    handleModelValueUpdate(e) {
      this.$editStore.setLeftPanelModel(e);
    },
    
    // Initialize form values based on active document
    initializeFormValues() {
      if (!this.activeDocument) return;
      
      const docConfig = this.activeDocument.docConfigs;
      
      // Set layer values
      if (docConfig.layer) {
        if (docConfig.layer.opacity) {
          this.layerOpacity = docConfig.layer.opacity.value;
        }
        if (docConfig.layer.scale) {
          this.layerScale = docConfig.layer.scale.value;
        }
        // Initialize position values from the layer if they exist
        if (docConfig.layer.pos && this.activeLayerObj) {
          // Set the initial position values from the actual layer position
          this.layerPositionX = this.activeLayerObj.x();
          this.layerPositionY = this.activeLayerObj.y();
          docConfig.layer.pos.x.value = this.layerPositionX;
          docConfig.layer.pos.y.value = this.layerPositionY;
        }
      }
      
      // Set extrusion values
      if (docConfig.extrusion) {
        if (docConfig.extrusion.height) {
          this.extrusionHeight = docConfig.extrusion.height.value;
        }
        if (docConfig.extrusion.opacity) {
          this.extrusionOpacity = docConfig.extrusion.opacity.value;
        }
      }
      
      // Set SVG mode
      if (docConfig.svg && docConfig.svg.mode) {
        this.svgMode = docConfig.svg.mode.value;
      }
    },
    
    // Event handlers for layer controls
    handleLayerOpacityChange(value) {
      if (!this.activeDocument || !this.activeLayerObj) return;
      
      // Update document config
      this.activeDocument.docConfigs.layer.opacity.value = value;
      
      // Directly update the layer opacity
      if (this.activeLayerObj) {
        this.activeLayerObj.opacity(value);
        this.activeLayerObj.batchDraw();
      }
    },
    
    handleLayerScaleChange(value) {
  
      if (!this.activeDocument || !this.activeLayerObj || !value) return;
      
      this.layerScale = value;
      // Save state before making changes
      this.konvaStore.saveState();
      
      // Update document config with the new scale value
      this.activeDocument.docConfigs.layer.scale.value = value;
      
      // Get the layer and stage
      const layer = this.activeLayerObj;
      const stage = layer.getStage();
      if (!stage) return;
      
      // Get the current center of the visible area
      const centerPoint = {
        x: stage.width() / 2,
        y: stage.height() / 2,
      };
      
      // Get the current scale value before changing it
      const currentScale = layer.scaleX();
      
      // If this is our first time scaling and we don't have an originalScale, create it
      if (!layer._originalScale) {
        // Store the original scale before any changes
        layer._originalScale = currentScale;
      }
      
      // Calculate the new scale based on the original scale
      const newScale = layer._originalScale * value;
      
      // Convert center point to layer coordinates (before scaling)
      const mousePointTo = {
        x: (centerPoint.x - layer.x()) / currentScale,
        y: (centerPoint.y - layer.y()) / currentScale,
      };
      
      // Apply the new scale directly to the layer
      layer.scale({ x: newScale, y: newScale });
      
      // Calculate new position to keep center point fixed
      const newX = centerPoint.x - mousePointTo.x * newScale;
      const newY = centerPoint.y - mousePointTo.y * newScale;
      
      // Update layer position
      layer.position({
        x: newX,
        y: newY
      });
      
      // Update document position values if they exist
      if (this.activeDocument.docConfigs.layer.pos) {
        this.activeDocument.docConfigs.layer.pos.x.value = newX;
        this.activeDocument.docConfigs.layer.pos.y.value = newY;
      }
      
      // Force a redraw of the layer
      // layer.batchDraw();

      // SCALE THE SVG PATHS AND POLYLINES
    
      const originalSvgPath = this.activeDocument.originalSvgPath;
      const originalSvgPolyline = this.activeDocument.originalSvgPolyline || convertSVG(originalSvgPath, "pathToPolyline");

      // Scale the original SVGs
      const scaledSvgPath = scaleSvg(originalSvgPath, this.layerScale);
      const scaledSvgPolyline = scaleSvg(originalSvgPolyline, this.layerScale);


      this.$konvaStore.setSvgPath(this.activeDocument.id, scaledSvgPath);
      this.$konvaStore.setSvgPolyline(this.activeDocument.id, scaledSvgPolyline);

      const mode = this.activeDocument.docConfigs?.svg?.mode?.value;

      if (mode === "path") {
        this.$consoleStore.setConsoleOutput(scaledSvgPath, this.activeDocument.id);
      } else if (mode === "polyline") {
        this.$consoleStore.setConsoleOutput(scaledSvgPolyline, this.activeDocument.id);
      }
    },
    
    // Event handlers for extrusion controls
    handleExtrusionHeightChange(value) {
      if (!this.activeDocument) {
        console.warn('Cannot update 3D height: No active document');
        return;
      }
    
      // Get the document ID
      const documentId = Object.keys(this.konvaStore.documents).find(
        id => id === this.activeDocument.id
      );
      
      if (!documentId) {
        console.warn('Cannot update 3D height: Document ID not found');
        return;
      }
      if(!value) return;
      
      // Update document config
      this.activeDocument.docConfigs.extrusion.height.value = value;
      
      // Pass both the document and its ID to update3dHeight
      console.log(`Updating 3D height for document ID: ${documentId}`);
      this.threeStore.floorplan3d.update3dHeight({
        ...this.activeDocument,
        id: documentId
      });
    },
    
    handleExtrusionOpacityChange(value) {
      if (!this.activeDocument) return;
      
      // Get the document ID
      const documentId = Object.keys(this.konvaStore.documents).find(
        id => id === this.activeDocument.id
      );
      
      if (!documentId) {
        console.warn('Cannot update 3D opacity: Document ID not found');
        return;
      }
      
      // Update document config
      this.activeDocument.docConfigs.extrusion.opacity.value = value;
      
      // Pass both the document and its ID to update3dOpacity
      console.log(`Updating 3D opacity for document ID: ${documentId}`);
      this.threeStore.floorplan3d.update3dOpacity({
        ...this.activeDocument,
        id: documentId
      });
    },    handleVerticalPositionChange(value) {
      if (!this.activeDocument) {
        console.warn('Cannot update vertical position: No active document');
        return;
      }
    
      // Get the document ID
      const documentId = Object.keys(this.konvaStore.documents).find(
        id => id === this.activeDocument.id
      );
      
      if (!documentId) {
        console.warn('Cannot update vertical position: Document ID not found');
        return;
      }
      
      // Update document config
      this.activeDocument.docConfigs.extrusion.verticalPosition.value = value;
      
      // Pass both the document and its ID to update3dVerticalPosition
      console.log(`Updating 3D vertical position for document ID: ${documentId}`);
      this.threeStore.floorplan3d.update3dVerticalPosition({
        ...this.activeDocument,
        id: documentId
      });
    },
    // Add center layer functionality
    centerLayer() {
      if (!this.activeLayerObj) return;
      
      const stage = this.activeLayerObj.getStage();

      if (this.editStore.isStageActive) {
        // Center all layers together
        stage.children.forEach((layer) => {
          this.centerSingleLayer(layer, stage);
        });
      } else {
        // Center only the current layer
        this.centerSingleLayer(this.activeLayerObj, stage);
      }
    },

    centerSingleLayer(layer, stage) {
      const stageWidth = stage.width();
      const stageHeight = stage.height();

      // Get the layer's content bounds
      const layerContent = layer.getChildren();
      if (layerContent.length === 0) return;

      // Calculate the bounds of all content in the layer
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      layerContent.forEach((node) => {
        const box = node.getClientRect();
        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width);
        maxY = Math.max(maxY, box.y + box.height);
      });

      // Calculate the center of the content
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      const contentCenterX = minX + contentWidth / 2;
      const contentCenterY = minY + contentHeight / 2;

      // Calculate the position to center the content in the stage
      const newX = stageWidth / 2 - contentCenterX * layer.scaleX();
      const newY = stageHeight / 2 - contentCenterY * layer.scaleY();

      // Update layer position
      layer.position({
        x: newX,
        y: newY,
      });

      // Update our local position values
      this.layerPositionX = newX;
      this.layerPositionY = newY;

      // Update document position if this is the active layer
      if (layer === this.activeLayerObj && this.activeDocument && this.activeDocument.docConfigs && this.activeDocument.docConfigs.layer.pos) {
        this.activeDocument.docConfigs.layer.pos.x.value = newX;
        this.activeDocument.docConfigs.layer.pos.y.value = newY;
      }

      layer.batchDraw();
    }
  },
  mounted() {
    this.initializeFormValues();
  },
  watch: {
    // Watch for changes in active document and update form values
    activeDocument: {
      handler(activeDoc) {
        this.initializeFormValues();
        if(activeDoc){
          // Store the original SVGs when document changes
          this.originalSvgPath = activeDoc.svgPath;
          this.originalSvgPolyline = activeDoc.svgPolyline;
        }
      },
      deep: true,
      immediate: true
    },
    "$editStore.viewport": {
      handler(viewport) {
        const modelValue = this.$editStore.leftPanelModel;
        if (viewport.secondary == "konva") {
          const updatedModelVal = modelValue.filter(
            (num) => ![1, 2].includes(num)
          );
          this.handleModelValueUpdate(updatedModelVal);
        }

        if (viewport.primary == "konva") {
          const mode = this.$konvaStore.mode;
          if (mode === "polygon") {
            this.handleModelValueUpdate([...modelValue, 1]);
          }
          if (mode === "line") {
            this.handleModelValueUpdate([...modelValue, 2]);
          }
        }
      },
    },
    "$konvaStore.mode": {
      handler(mode) {
        const modelValue = this.$editStore.leftPanelModel;
        if (mode === "polygon") {
          this.handleModelValueUpdate([...modelValue, 1]);
        }
        if (mode === "line") {
          this.handleModelValueUpdate([...modelValue, 2]);
        }
      },
    }
  }
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Rubik+Mono+One&display=swap");
.rubik-mono-one-regular {
  font-family: "Rubik Mono One", monospace;
  font-weight: 100;
  font-style: normal;
}

.left-panel-container {
  width: 240px;
  height: 100vh;
  background: #ddd;
  position: fixed;
  top: 0;
  left: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 6;
}

.logo {
  background-color: #ddd;
  padding-top: 1.25rem;
  padding-bottom: 1.25rem;
  font-size: 1.25rem;
  line-height: 1.5;
  letter-spacing: 0.0125em;
  padding-left: 16px;
}

.inner-navigation-drawer {
  height: calc(100vh - 132px);
  overflow-y: auto;
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: rgba(0, 0, 0, 0.3) transparent; /* Firefox */
  border-top: 1px solid #ccc;
  border-right: 1px solid #ccc;
  background: #ddd;
  flex: 1;
}

/* WebKit browsers (Chrome, Safari) scrollbar styling */
.inner-navigation-drawer::-webkit-scrollbar {
  width: 6px;
}

.inner-navigation-drawer::-webkit-scrollbar-track {
  background: transparent;
}

.inner-navigation-drawer::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
}

/* Custom editing panel styles */
.custom-editing-panel {
  background-color: #ddd;
  /* border-bottom: 1px solid #aaa; */
}

.custom-editing-header {
  display: flex;
  align-items: center;
  height: 64px;
  font-weight: 400;
  letter-spacing: 0.03125em;
  position: relative;

  text-align: start;
  border-radius: inherit;
  font-size: 0.9375rem;
  line-height: 1;
  min-height: 48px;
  outline: none;
  padding: 16px 24px;
}

.custom-editing-content {
  padding-left: 16px;
  padding-right: 16px;
}

/* Slider styles for 2D Layer and 3D Rendering panels */
.slider-container {
  margin-bottom: 0px;
}

.slider-wrapper {
  margin-top: 4px;
}

.slider-value-container {
  min-width: 40px;
  text-align: right;
  font-size: 0.875rem;
}

.text-right {
  text-align: right;
  color: rgba(0, 0, 0, 0.6);
}

.resolution-status {
  color: rgba(0, 0, 0, 0.6);
  font-size: 0.75rem;
  min-height: 1.2em;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style>
.v-expansion-panel-title {
  height:64px;
}
.v-expansion-panel-title__overlay {
  height:64px;
}
.v-expansion-panel--active {
  margin-top: 0px;
}
</style>
