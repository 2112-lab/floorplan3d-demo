<template>
  <div
    ref="konva-container"
    id="konva-container"
    class="konva-container"
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

import { useKonvaStore } from "~/store/konva-store";

export default {
  data() {
    return {
      stage: null,
      layer: null,
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

  // konvaObjects watcher logic moved to index.vue for better centralization
  methods: {    

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
        const selectionLayer = new Konva.Layer({
          name: "selection",
        });

        this.$konvaStore.gridLayer = gridLayer;
        
        // Setup grid layer
        this.konvaStore.baseLayer.add(gridLayer)

        this.stage.add(baseLayer);

        this.$konvaStore.selectionLayer = selectionLayer;
        this.stage.add(selectionLayer)
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

