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
import {
  handleNoSvgAvailable,
  initializeStage,
  svgToKonvaObjects,
  renderSvgInKonva,
} from "~/lib/konva/konva";
import {debounce,   getActiveLayer} from "~/lib/konva/utils"
import {setupZoom, setupPanning} from "~/lib/konva/pan-zoom"
import {createMarqueeSelector} from "~/lib/konva/marquee-selector"
import {renderGrid, hideGrid} from "~/lib/konva/grid"
import { toSvg } from "~/lib/svg";;

import { useEditStore } from "~/store/edit";
import { useKonvaStore } from "~/store/konva-store";
import { useEventBusStore } from "~/store/event-bus";
import { useNotificationStore } from "~/store/notification";

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
      notificationStore: useNotificationStore(),
    };
  },
  mounted() {
    this.$eventBus.on('resetKonva', () => {
      this.resetKonva();
    });
    console.log(this.$konvaStore.documents)
    this.resizeObserver = new ResizeObserver(() => {
      this.initKonvaIfNeeded();
      this.resizeKonva();
    });
    this.resizeObserver.observe(this.$refs["konva-container"]);

    // Add keydown event listener
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const layer = getActiveLayer();
        if (!layer) return;
        const doc = this.konvaStore.getActiveDocument();
        if (!doc) return;

        // First, find and remove any line groups created by double-click
        const lineGroups = layer.find("Group").filter(group => 
          group.attrs.type === "polyline-lines-group");
        lineGroups.forEach(lineGroup => {
          lineGroup.destroy();
        });

        // Then restore all polyline groups to their original state
        const polylineGroups = layer.find("Group").filter(group => 
          group.attrs.type === "polyline-group");
        polylineGroups.forEach(polylineGroup => {
          // Reset the group properties
          polylineGroup.attrs.selected = false;
          
          // Get the actual polyline (first child of the group)
          const polyline = polylineGroup.children.find(child => 
            child instanceof Konva.Line);
          
          if (polyline) {
            // Reset polyline properties
            polyline.setAttrs({
              opacity: 1,
              mode: null,
              selected: false
            });
            polyline.listening(true);
            
            // Reset fill/stroke
            if (polyline.attrs.closed) {
              polyline.fill(polyline.attrs.originalFill || "#000000");
            } else {
              polyline.stroke("#000000");
            }
          }
          
          // Hide all handles
          polylineGroup.find("Circle").forEach(handle => {
            handle.destroy();
          });
        });

        // Clean up any single line groups
        const singleLineGroups = layer.find("Group").filter(group => 
          group.attrs.type === "polyline-single-line-group");
        singleLineGroups.forEach(group => {
          group.destroy();
        });

        // Update the store
        this.konvaStore.deSelectAllObjects(doc.id);
        
        // Redraw the layer
        const baseLayer = layer.getParent();
        baseLayer.batchDraw();
      }
      
      // Rest of the keydown event handler (Ctrl+Z, etc.)
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        const layer = getActiveLayer();
        if (!layer) return;
        if (this.$konvaStore.undo()) {
          // Re-render based on output stage
          const objects = this.$konvaStore.getActiveDocument().konva.objects
          renderSvgInKonva(layer, objects)
        }
      }
    });
  },
  beforeDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.stage) {
      this.stage.destroy();
      this.stage = null;
    }

    // Remove keydown event listener
    document.removeEventListener("keydown", this.handleKeyDown);
    // Remove Shift key event listeners
    document.removeEventListener("keydown", this.handleShiftKeyDown);
    document.removeEventListener("keyup", this.handleShiftKeyUp);
  },

  computed: {
    $eventBus() {
      return useEventBusStore();
    },
    svgData() {
      return this.editStore.svgData;
    },
    konvaObjects(){
      const activeDocument = this.$konvaStore.getActiveDocument();
      if (!activeDocument) return {};
      if (!activeDocument.konva || !activeDocument.konva.objects) return {};
      return activeDocument.konva.objects;
    },
    svgMode(){
      const activeDocument = this.$konvaStore.getActiveDocument();
      if (!activeDocument) return "path";
      if (!activeDocument.docConfigs || !activeDocument.docConfigs.svg || !activeDocument.docConfigs.svg.mode) return "path";
      return activeDocument.docConfigs.svg.mode.value;
    },
    gridEnabled2d(){
      return this.editStore.checkboxes.find(x => x.name === "2dgrid").value;
    },
  },
  watch: {
    konvaObjects: {
      handler(objects) {
        const doc = this.$konvaStore.getActiveDocument()
        const doc_id = doc.id
        if(!doc_id || !doc.docConfigs || !doc.docConfigs.svg || !doc.docConfigs.svg.mode ) return;
        const svg = toSvg(objects, doc.docConfigs.svg.mode.value)

        if(doc.docConfigs.svg.mode.value === "path") {
          this.$konvaStore.setSvgPath(doc_id, svg)
        }
        else {
          console.log("svg polyline", svg)
          this.$konvaStore.setSvgPolyline(doc_id, svg)
        }
        
        // Get the current document ID
        const currentDocument = this.$konvaStore.getActiveDocument();
        const documentId = currentDocument ? currentDocument.id : null;

        this.$consoleStore.setConsoleOutput(svg, documentId);
        
      },
      deep: true,
    },
    // svgMode:{
    //   handler(mode){
    //     const doc = this.$konvaStore.getActiveDocument();
    //     const doc_id = doc.id;
    //     if(!doc_id) return;
    //     const svg = toSvg(doc.konva.objects, mode)
    //     if(mode === "path"){
    //       this.$konvaStore.setSvgPath(doc_id, svg);
    //       // Get the document ID
    //       this.$consoleStore.setConsoleOutput(svg, doc_id);
    //     }else if(mode === "polyline"){
    //       this.$konvaStore.setSvgPolyline(doc_id, svg);
    //       // Get the document ID
    //       this.$consoleStore.setConsoleOutput(svg, doc_id);
    //     }
    //   },
    //   immediate: true,
    // },    
    // sizeProp: {
    //   async handler(size) {
    //     await this.$nextTick();
    //     this.resizeKonva();
    //   },
    //   immediate: true,
    // },
    // "$editStore.outputStage": {
    //   async handler() {
    //     const outputStage = this.editStore.outputStage;

    //     // Skip document creation if the stage change is triggered by the extraction process
    //     // This prevents duplicate creation of walls and rooms
    //     if (this.$konvaStore.skipStageDocumentCreation) {
    //       console.log("Skipping document creation due to extraction process");
    //       return; // Skip document creation but do NOT reset the flag yet
    //     }
  
    //     if (outputStage === 1) {
    //      const doc_id = `doc_${Object.keys(this.$konvaStore.documents).length + 1}`;
    //      const svg = this.$konvaStore.wallsSVG;
    //      const wallsLayer = new Konva.Layer({ name: "walls" });
    //      this.stage.add(wallsLayer)
    //      this.$konvaStore.addDocument(doc_id, "walls", {
    //         konva: {
    //             layer: wallsLayer
    //         },
    //         ui:{
    //           displayName: "Walls",
    //           order: 2,
    //           menuOpen: false,
    //         }
    //      })
    //      const {objects, transformObject} = svgToKonvaObjects(svg, doc_id);
    //      this.$konvaStore.setDocumentActive(doc_id);
    //      const activeDoc = this.$konvaStore.getActiveDocument()
    //      const layer = activeDoc.konva.layer
    //      renderSvgInKonva(layer, objects, transformObject)
    //      centerLayer(activeDoc.konva.layer)

    //     } 
    //     else if (outputStage === 2) {
    //       const doc_id = `doc_${Object.keys(this.$konvaStore.documents).length + 1}`;
    //       const svg = this.$konvaStore.roomsSVG;
    //       const roomsLayer = new Konva.Layer({ name: "rooms" });
    //       this.stage.add(roomsLayer)
    //       this.$konvaStore.addDocument(doc_id, "rooms", {
    //           konva: {
    //               layer: roomsLayer
    //           },
    //           ui:{
    //             displayName: "Rooms",
    //             order: 2,
    //             menuOpen: false,
    //           }
    //       })
    //       const {objects, transformObject} = svgToKonvaObjects(svg, doc_id);
    //       this.$konvaStore.setDocumentActive(doc_id);
    //       const activeDoc = this.$konvaStore.getActiveDocument()
    //       const layer = activeDoc.konva.layer
    //       renderSvgInKonva(layer, objects, transformObject)
    //       centerLayer(activeDoc.konva.layer)
    //     }

    //     createMarqueeSelector(this.stage);

    //     // Render grid after stage change if grid is enabled
    //     const { value } = this.editStore.checkboxes.find(
    //       (x) => x.name === "2dgrid"
    //     );
    //     if (value) {
    //       if(!this.$konvaStore.gridLayer) return;
    //       const gridLayer = this.konvaStore.gridLayer
    //       if(!gridLayer) return;
    //       renderGrid(gridLayer);
    //     }
    //   },
    //   immediate: true,
    // },
    // "$editStore.viewport": {
    //   handler(viewport) {
    //     if (viewport.secondary === "konva") {
    //       this.resizeKonva();
    //     }
    //   },
    // },
    "gridEnabled2d": {
      handler(enabled) {
        if(enabled){
          console.log("gridEnabled2d", enabled)
          console.log(this.$konvaStore.gridLayer)
          if(!this.$konvaStore.gridLayer) return;
          renderGrid(this.$konvaStore.gridLayer);
        }else{
          if(!this.$konvaStore.gridLayer) return;
          hideGrid(this.$konvaStore.gridLayer);
        }
      },
      immediate: true,
    },
    "$konvaStore.stage": {
      handler(stage) {
        createMarqueeSelector(stage);
      },
    },
    isVisible: {
      handler(visible) {
        if (visible) {
          this.$nextTick(() => {
            // Re-initialize Konva if needed
            this.initKonvaIfNeeded();
            // Re-render grid if enabled
            const { value } = this.editStore.checkboxes.find(x => x.name === "2dgrid");
            if (value && this.konvaStore.gridLayer) {
              renderGrid(this.konvaStore.gridLayer);
            }
          });
        }
      },
      immediate: true
    },
  },
  methods: {
    // Added debounced grid rendering to prevent excessive redraws
    debouncedRenderGrid: debounce(function(gridLayer) {
      if (!gridLayer) return;
      renderGrid(gridLayer);
    }, 500),
    
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
      
      // Reset the konva store documents
      this.$konvaStore.documents = {};

      this.stage = null;

      this.initKonvaIfNeeded();

      // this.notificationStore.notify({
      //   message: "Konva reset successfully",
      //   type: "success",
      // });
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
        this.stage = initializeStage(
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
        setupZoom(this.stage);
        setupPanning(this.stage);
        createMarqueeSelector(this.stage);

        // Initialize grid if needed - do this last after everything is set up
        const { value } = this.editStore.checkboxes.find(
          (x) => x.name === "2dgrid"
        );
        if (value) {
          // Use nextTick to ensure all layers are properly initialized
          this.$nextTick(() => {
            this.debouncedRenderGrid(gridLayer);
          });
        }
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
          
          this.debouncedRenderGrid(gridLayer);
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

