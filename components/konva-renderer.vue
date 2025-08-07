<template>
  <div
    ref="konva-container"
    id="konva-container"
    class="konva-container"
    :class="{ 'position-relative': sizeProp }"
  >
    <div
      ref="konva-renderer"
      class="w-100 h-100 left-0 top-0"
      :class="{}"
      id="konva-renderer"
    ></div>
  </div>
</template>

<script>
import Konva from "konva";

import { useEditStore } from "~/store/edit";
import { useKonvaStore } from "~/store/konva-store";

export default {
  props: {
    sizeProp: {
      type: Number,
      default: null,
    },
    isVisible: {
      type: Boolean,
    },
  },
  data() {
    return {
      size: { width: 0, height: 0 },
      stage: null,
      layer: null,
      textLayer: null,
      editStore: useEditStore(),
      konvaStore: useKonvaStore(),
    };
  },
  mounted() {
    this.initKonvaIfNeeded();
  },
  beforeDestroy() {
    if (this.stage) {
      this.stage.destroy();
      this.stage = null;
    }
  },

  computed: {
    svgData() {
      return this.editStore.svgData;
    },
    svgMode(){
      const activeDocument = this.$konvaStore.getActiveDocument();
      if (!activeDocument) return "path";
      if (!activeDocument.docConfigs || !activeDocument.docConfigs.svg || !activeDocument.docConfigs.svg.mode) return "path";
      return activeDocument.docConfigs.svg.mode.value;
    },
  },
  // konvaObjects watcher logic moved to index.vue for better centralization
  methods: {    
    /**
     * Resets the Konva stage by removing all document layers and cleaning up objects
     * while preserving the stage instance and utility layers (grid/selection).
     * This provides a proper way to clear the scene.
     */
    resetKonva() {
      // Get all document layers (excluding utility layers like grid and selection)
      const docLayers = this.stage.getLayers().filter(layer => {
        return layer !== this.$konvaStore.gridLayer && layer !== this.$konvaStore.selectionLayer;
      });      
      
      // Properly destroy each document layer
      docLayers.forEach(layer => {
        layer.destroyChildren();
        layer.destroy();
      });
      
      // Use the new clearAllDocuments method for proper cleanup
      this.$konvaStore.clearAllDocuments();

      this.stage = null;

      this.initKonvaIfNeeded();

      // this.notificationStore.notify({
      //   message: "Konva reset successfully",
      //   type: "success",
      // });
    },

    initializeStage(containerRef, width, height) {
      const stage = new Konva.Stage({
        container: containerRef,
        width: width,
        height: height,
        draggable: false,
      });

      return stage;
    },
    
    initKonvaIfNeeded() {
      const container = this.$refs["konva-container"];
      if (!container) return;

      // Check if container is hidden, and if so, use minimum dimensions
      const isHidden = getComputedStyle(container.parentElement).display === 'none';
      const width = isHidden ? 100 : container.clientWidth;
      const height = isHidden ? 100 : container.clientHeight;

      if (
        !this.stage &&
        width > 0 &&
        height > 0
      ) {
        this.stage = this.initializeStage(
          container,
          width,
          height
        );
        this.konvaStore.setStage(this.stage);
        const baseLayer = new Konva.Layer({ name: "baseLayer" });
        this.konvaStore.setBaseLayer(baseLayer);
       

        // Initialize layers
        const gridLayer = new Konva.Group({ name: "grid" }); 
        // const textLayer = new Konva.Layer({ name: "text" });
        const selectionLayer = new Konva.Layer({
          name: "selection",
        });

        this.$konvaStore.gridLayer = gridLayer;
        
        // Setup grid layer
        this.konvaStore.baseLayer.add(gridLayer)

        this.stage.add(baseLayer);

        this.$konvaStore.selectionLayer = selectionLayer;
        this.stage.add(selectionLayer)

        // Initialize grid if needed - do this last after everything is set up
        const { value } = this.editStore.checkboxes.find(
          (x) => x.name === "2dgrid"
        );
      }
    },
    
    resizeKonva() {
      if (!this.stage) return;



      const container = this.$refs["konva-container"];
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width > 0 && height > 0) {
        this.stage.width(width);
        this.stage.height(height);

        // Update grid if visible - use debounced version
        const { value } = this.editStore.checkboxes.find(
          (x) => x.name === "2dgrid"
        );
        if (value) {
          const gridLayer = this.konvaStore.gridLayer
          if(!gridLayer) return;
          
        }

        this.stage.batchDraw();

      }
    },
  },
};
</script>

<style>
.konva-container {
  border: 1px solid #ccc;
  height: 100%;
  z-index: -10;
  overflow-y: none;
}
</style>

