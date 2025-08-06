<template>
  <div class="exports">
    <!-- Add SVG mode radio group as a row -->
    <div 
      v-if="activeDocument && activeDocument.docConfigs && activeDocument.docConfigs.svg && activeDocument.docConfigs.svg.mode" 
      class="svg-mode-controls px-1 pt-1"
    >
      <v-row no-gutters justify="end">
        <div>
          <v-radio-group
            v-model="svgMode"
            @update:modelValue="handleSvgModeChange"
            density="compact"
            hide-details
            inline
          >
            <v-radio 
              v-for="option in activeDocument.docConfigs.svg.mode.options" 
              :key="option"
              :label="option === 'path' ? 'Path' : 'Polyline'" 
              :value="option"
              class="mr-2"
            ></v-radio>
          </v-radio-group>
        </div>
      </v-row>
    </div>
    
    <pre>{{ svg }}</pre>
  </div>
</template>
<script>
import { useKonvaStore } from "~/store/konva-store";

export default {
  data() {
    return {
      konvaStore: null,
      svgMode: "path", // Default SVG mode
      svg: null,
    };
  },
  computed: {
    // Get the active document from the store
    activeDocument() {
      // Use store from the component instance to ensure reactivity
      if (!this.konvaStore || !this.konvaStore.documents) {
        return null;
      }
      
      // Find the active document
      const activeDoc = Object.values(this.konvaStore.documents).find(doc => doc && doc.active === true);
      
      // Return active doc or first doc if none is active
      if (activeDoc) {
        return activeDoc;
      } else if (Object.keys(this.konvaStore.documents).length > 0) {
        return this.konvaStore.documents[Object.keys(this.konvaStore.documents)[0]];
      }
      
      return null;
    },
  },
  created() {
    // Initialize the konvaStore
    this.konvaStore = useKonvaStore();
  },
  mounted() {
    // Initialize svgMode based on the active document when component is mounted
    this.initializeSvgMode();
  },
  watch: {
    // Watch for changes in the active document to update SVG mode
    'activeDocument.docConfigs.svg.mode.value': {
      handler(newValue) {
        if (newValue) {
          this.svgMode = newValue;
        }
      },
      immediate: true
    },
    "$consoleStore.consoleOutput": function(newSvg) {
      console.log(newSvg);
      this.svg = newSvg
    },
  },
  methods: {
    // SVG mode change handler
    handleSvgModeChange(value) {
      this.activeDocument.docConfigs.svg.mode.value = value;
      const svg = value === "path" ? this.activeDocument.svgPath : this.activeDocument.svgPolyline;      
      this.svg = svg;

    },
    
    // Initialize SVG mode from the active document
    initializeSvgMode() {
      if (this.activeDocument && this.activeDocument.docConfigs && 
          this.activeDocument.docConfigs.svg && this.activeDocument.docConfigs.svg.mode) {
        this.svgMode = this.activeDocument.docConfigs.svg.mode.value;
        const svg = this.svgMode === "path" ? this.activeDocument.svgPath : this.activeDocument.svgPolyline;
        this.svg = svg;
        // this.$consoleStore.setConsoleOutput(svg);
      }
    }
  }
};
</script>

<style scoped>
.header {
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.exports {
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.exports pre {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
  margin: 10px;
  flex: 1;
}

.svg-mode-controls {
  /* background-color: #f5f5f5; */
  border-bottom: 1px solid #e0e0e0;
}
</style>
