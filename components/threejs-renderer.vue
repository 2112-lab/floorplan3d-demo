<template>
  <div ref="threejsContainer" class="threejs-container">
    <div ref="threejsRenderer" class="threejs-renderer"></div>
  </div>
</template>

<script>
export default {
  props: {
    // Expose the container element to parent
    floorplan3d: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      // Just a simple container component now
    };
  },
  mounted() {
    // Emit the renderer element reference to parent for initialization
    this.$emit('container-ready', {
      container: this.$refs.threejsContainer,
      renderer: this.$refs.threejsRenderer
    });
  },
  beforeDestroy() {    
    // Cleanup will be handled by parent component
    this.$emit('container-destroyed');
  },
  methods: {
    // Expose container dimensions to parent
    getContainerDimensions() {
      const containerRef = this.$refs.threejsContainer;
      if (!containerRef) return { width: 0, height: 0 };
      
      return {
        width: containerRef.offsetWidth,
        height: containerRef.offsetHeight
      };
    },
    
    // Expose renderer element to parent
    getRendererElement() {
      return this.$refs.threejsRenderer;
    }
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
