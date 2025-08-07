<template>
  <div
    ref="svg-container"
    id="svg-container"
    class="svg-container"
    style="display: none;"
  >
    <!-- Hidden container for SVG processing - no visual rendering needed -->
  </div>
</template>

<script>
import { useSvgStore } from "~/store/svg-store";

export default {
  data() {
    return {
      svgStore: useSvgStore(),
    };
  },
  
  computed: {
    // Provide backward compatibility by exposing svgStore as konvaStore
    konvaStore() {
      return this.svgStore;
    }
  },

  mounted() {
    // Initialize the store - no visual components needed
    this.initializeSvgStore();
  },

  methods: {    
    initializeSvgStore() {
      // Initialize the store without any visual components
      // The store will handle document management and SVG generation
      console.log('SVG Store initialized - Konva dependency removed');
    },
  },
};
</script>

<style>
.svg-container {
  display: none;
  height: 0;
  width: 0;
}
</style>