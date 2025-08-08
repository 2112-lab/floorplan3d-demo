<template>
  <div ref="threejsContainer" class="threejs-container">
    <div ref="threejsRenderer" class="threejs-renderer"></div>
  </div>
</template>

<script>
import Floorplan3D from "@2112-lab/floorplan3d";

export default {
  data() {
    return {
      // No longer need external store - floorplan3d manages documents internally
    };
  },
  mounted() {
    this.initThreeJs();
  },
  beforeDestroy() {    
    this.cleanupThreeJs();
  },
  methods: {
    initThreeJs() {
      const containerRef = this.$refs.threejsContainer;
      const rendererRef = this.$refs.threejsRenderer;
      if (!containerRef || !rendererRef) return;

      const width = containerRef.offsetWidth;
      const height = containerRef.offsetHeight;

      // Clear any existing Three.js instance
      if (this.floorplan3d) {
        this.cleanupThreeJs();
      }

      // Initialize using Floorplan3D class
      this.floorplan3d = new Floorplan3D(rendererRef, width, height);

      // The floorplan3d instance now has its own internal document store
      // No need to set up external callbacks for basic functionality

      // Make sure the animation is running
      this.floorplan3d.startAnimation();
    },
    cleanupThreeJs() {
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
  },
};
</script>

<style scoped>
.threejs-container {
  width: 100% !important;
  height: 100% !important;
  position: relative;
  overflow: hidden;
}

.threejs-renderer {
  width: 100% !important;
  height: 100% !important;
  position: relative;
}

.threejs-renderer canvas {
  width: 100% !important;
  height: 100% !important;
}

.vertical-position-slider {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 40px;
  /* background: rgba(255, 255, 255, 0.8); */
  padding: 0px;
  border-radius: 8px;
  /* box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); */
  z-index: 1000;
}

.slider-value-container {
  height: 50px;
}

.vertical-slider-height {
  height: 25%;
}
</style>
