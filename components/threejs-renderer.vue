<template>
  <div ref="threejsContainer" class="threejs-container">
    <div ref="threejsRenderer" class="threejs-renderer"></div>
  </div>
</template>

<script>
export default {
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
  }
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
</style>
