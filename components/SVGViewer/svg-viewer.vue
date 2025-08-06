<template>
  <div class="svg-viewer" :style="{ height: height }">
    <div v-if="showControls" class="d-flex">
      <div class="d-flex align-center justify-space-between ga-2 w-100">
        <span class="text-caption">svg</span>
        <div class="d-flex align-center ga-2">
          <!-- View Mode Toggle -->
          <v-btn
            :icon="mode === 'preview' ? 'mdi-code-tags' : 'mdi-eye'"
            size="small"
            variant="text"
            density="compact"
            @click="toggleMode"
            :title="mode === 'preview' ? 'View Code' : 'View Preview'"
          ></v-btn>

          <!-- Copy Button -->
          <v-btn
            icon="mdi-content-copy"
            size="small"
            variant="text"
            density="compact"
            @click="copySvg"
            title="Copy SVG"
          ></v-btn>

          <!-- Load in App Button -->
          <v-tooltip text="Load in app">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                icon="mdi-monitor-arrow-down-variant"
                size="small"
                variant="text"
                density="compact"
                @click="loadInApp"
              ></v-btn>
            </template>
          </v-tooltip>

          <!-- Zoom Controls -->
          <v-btn
            v-if="mode === 'preview'"
            icon="mdi-magnify-plus"
            size="small"
            variant="text"
            density="compact"
            @click="zoomIn"
            title="Zoom In"
          ></v-btn>
          <v-btn
            v-if="mode === 'preview'"
            icon="mdi-magnify-minus"
            size="small"
            variant="text"
            density="compact"
            @click="zoomOut"
            title="Zoom Out"
          ></v-btn>
          <v-btn
            v-if="mode === 'preview'"
            icon="mdi-fit-to-screen"
            size="small"
            variant="text"
            density="compact"
            @click="resetZoom"
            title="Reset View"
          ></v-btn>
        </div>
      </div>
    </div>

    <!-- SVG Preview Mode -->
    <div v-if="mode === 'preview'" 
         class="svg-container" 
         ref="svgContainer"
         @wheel="handleZoom"
         @mousedown="startPan"
         @mousemove="pan"
         @mouseup="stopPan"
         @mouseleave="stopPan">
      <div class="svg-wrapper" 
           :style="{ transform: `scale(${zoom}) translate(${panX}px, ${panY}px)` }">
        <div v-html="sanitizedSvg"></div>
      </div>
    </div>

    <!-- SVG Code Mode -->
    <div v-else class="code-container">
      <SVGCodeHighlight :code="svgContent || svg" />
    </div>

    <!-- Error Display -->
    <div v-if="svgError" class="svg-error">
      <p>Error loading SVG: {{ svgError }}</p>
    </div>
  </div>
</template>
<script>
import SVGCodeHighlight from "../SVGCodeHighlight.vue";
export default {
  components: {
    SVGCodeHighlight,
  },
  props: {
    svg: {
      default: "",
      type: String,
    },
    height: {
      type: String,
      default: "auto",
    },
    svgContent: {
      type: String,
      default: "",
    },
    showControls: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    sanitizedSvg() {
      const svgString = this.svgContent || this.svg;
      if (!svgString) return '';
      
      // Parse SVG to create a valid viewBox if not present
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        
        // Check for parsing errors
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
          this.svgError = 'Invalid SVG format';
          return '<svg width="100%" height="100%"><text x="50%" y="50%" text-anchor="middle" fill="red">Invalid SVG Format</text></svg>';
        }
        
        const svgElement = doc.querySelector('svg');
        if (!svgElement) {
          this.svgError = 'No SVG element found';
          return svgString;
        }
        
        // Set viewBox if not present but width and height are available
        if (!svgElement.getAttribute('viewBox') && 
           (svgElement.getAttribute('width') && svgElement.getAttribute('height'))) {
          const width = parseFloat(svgElement.getAttribute('width'));
          const height = parseFloat(svgElement.getAttribute('height'));
          svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
        
        // Handle case where neither viewBox nor width/height are specified
        if (!svgElement.getAttribute('viewBox') && 
            (!svgElement.getAttribute('width') || !svgElement.getAttribute('height'))) {
          svgElement.setAttribute('viewBox', '0 0 300 200');
        }
        
        // Set width and height to 100% for proper scaling in container
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        
        // Clear any previous error
        this.svgError = null;
        
        return new XMLSerializer().serializeToString(doc);
      } catch (e) {
        console.error('Error parsing SVG:', e);
        this.svgError = e.message || 'Error parsing SVG';
        return `<svg width="100%" height="100%"><text x="50%" y="50%" text-anchor="middle" fill="red">Error: ${this.svgError}</text></svg>`;
      }
    }
  },
  data() {
    return {
      mode: "preview",
      zoom: 1,
      panX: 0,
      panY: 0,
      isPanning: false,
      startX: 0,
      startY: 0,
      svgError: null,
      zoomStep: 0.1,
      maxZoom: 5,
      minZoom: 0.1
    };
  },
  methods: {
    toggleMode() {
      this.mode = this.mode === 'preview' ? 'code' : 'preview';
    },
    
    copySvg() {
      const contentToCopy = this.svgContent || this.svg;
      navigator.clipboard.writeText(contentToCopy);
      this.$notification.notify({
        message: "SVG copied to clipboard",
        type: "success",
      });
    },
    
    loadInApp() {
      const svg = this.svgContent || this.svg;
      if (!svg) {
        this.$notification.notify({
          message: "No SVG content to load",
          type: "error",
        });
        return;
      }
      
      try {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svg, "image/svg+xml");
        
        // Check for parsing errors
        const parserError = svgDoc.querySelector('parsererror');
        if (parserError) {
          this.$notification.notify({
            message: "Invalid SVG format",
            type: "error",
          });
          return;
        }
        
        // Extract paths and other elements as needed
        const paths = svgDoc.querySelectorAll("path");
        const circles = svgDoc.querySelectorAll("circle");
        const rects = svgDoc.querySelectorAll("rect");
        
        // Emit an event that parent components can listen to
        this.$emit('load-svg', { 
          svg, 
          elements: {
            paths: Array.from(paths),
            circles: Array.from(circles),
            rects: Array.from(rects)
          }
        });
        
        this.$notification.notify({
          message: "SVG loaded into application",
          type: "success",
        });
      } catch (e) {
        console.error('Error loading SVG into app:', e);
        this.$notification.notify({
          message: `Error loading SVG: ${e.message}`,
          type: "error",
        });
      }
    },
    
    // Zoom and pan functions
    zoomIn() {
      if (this.zoom < this.maxZoom) {
        this.zoom = Math.min(this.zoom + this.zoomStep, this.maxZoom);
      }
    },
    
    zoomOut() {
      if (this.zoom > this.minZoom) {
        this.zoom = Math.max(this.zoom - this.zoomStep, this.minZoom);
      }
    },
    
    resetZoom() {
      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
    },
    
    handleZoom(event) {
      event.preventDefault();
      
      // Determine zoom direction from wheel event
      const delta = event.deltaY > 0 ? -this.zoomStep : this.zoomStep;
      const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta));
      
      // Calculate zoom point (relative to the container)
      const container = this.$refs.svgContainer;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      // Adjust pan position to zoom around mouse position
      if (newZoom !== this.zoom) {
        const scaleChange = newZoom / this.zoom;
        this.panX = mouseX - scaleChange * (mouseX - this.panX);
        this.panY = mouseY - scaleChange * (mouseY - this.panY);
        this.zoom = newZoom;
      }
    },
    
    startPan(event) {
      if (event.button !== 0) return; // Only left mouse button
      
      this.isPanning = true;
      this.startX = event.clientX - this.panX;
      this.startY = event.clientY - this.panY;
      event.preventDefault();
      
      // Change cursor to indicate panning
      if (this.$refs.svgContainer) {
        this.$refs.svgContainer.style.cursor = 'grabbing';
      }
    },
    
    pan(event) {
      if (!this.isPanning) return;
      
      this.panX = event.clientX - this.startX;
      this.panY = event.clientY - this.startY;
      event.preventDefault();
    },
    
    stopPan() {
      this.isPanning = false;
      
      // Reset cursor
      if (this.$refs.svgContainer) {
        this.$refs.svgContainer.style.cursor = 'grab';
      }
    }
  },
  
  mounted() {
    // Set initial grab cursor for panning
    if (this.$refs.svgContainer) {
      this.$refs.svgContainer.style.cursor = 'grab';
    }
  }
};
</script>

<style scoped>
.svg-viewer {
  background-color: #2f2f2f;
  color: #fff;
  padding: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  position: relative;
}

.svg-container {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  user-select: none; /* Prevent text selection during pan/zoom */
}

.svg-wrapper {
  transition: transform 0.1s ease-out;
  transform-origin: center center;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.svg-container :deep(svg) {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.code-container {
  flex-grow: 1;
  overflow: auto;
  background-color: #1e1e1e; /* Darker background for code view */
  border-radius: 4px;
  padding: 8px;
}

.svg-error {
  background-color: rgba(255, 0, 0, 0.2);
  color: #ff5252;
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 8px;
  font-size: 0.9em;
}

/* Make sure the pre element doesn't spill out of the container */
:deep(pre) {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 100%;
}

/* Ensure code within pre elements doesn't spill out */
:deep(pre p) {
  max-width: 100%;
  overflow-wrap: break-word;
}

/* Mode transition animations */
.svg-container, .code-container {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}
</style>
