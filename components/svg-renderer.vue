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

};
</script>