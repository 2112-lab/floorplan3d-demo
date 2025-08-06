<template>
      <v-row>
        <v-col>
        <span class="text-caption">X Position</span>
        <v-number-input
          v-model="positionX"
          density="compact"
          hide-details
          @change="updateXPosition"
          @update:modelValue="updateXPosition"
          
          control-variant="stacked"
           class="flex-grow-1"
        ></v-number-input>
      </v-col>
        <v-col>
          <span class="text-caption">Y Position</span>
          <v-number-input 
              v-model="positionY"
              density="compact"
              hide-details
              @change="updateYPosition"
              @update:modelValue="updateYPosition"
              control-variant="stacked"
           class="flex-grow-1"
           ></v-number-input>
        </v-col>
     
      </v-row>

</template>

<script>
import { convertSVG, translateSvg } from "~/lib/svg";
import { useEditStore } from "~/store/edit";

export default {
  props: {
    document: {
      type: Object,
      required: true,
    }
  },
  data() {
    return {
      editStore: useEditStore(),
      konvaStore: null,
      translateX: 0,
      translateY: 0,
      positionX: 0,
      positionY: 0,
    };
  },
  computed: {
    // Get the layer associated with the document
    layerObject() {
      if (!this.document || !this.document.konva || !this.document.konva.layer) {
        return null;
      }
      return this.document.konva.layer;
    }
  },
  created() {
    // Initialize the Konva store
    this.konvaStore = this.$konvaStore;
    
    // Initialize position values from document
    if (this.layerObject) {
      this.positionX = this.layerObject.x();
      this.positionY = this.layerObject.y();
    }
  },
  mounted() {
    // Initialize position from document config if available
    if (this.document && this.document.docConfigs && this.document.docConfigs.layer.pos) {
      this.positionX = this.document.docConfigs.layer.pos.x.value;
      this.positionY = this.document.docConfigs.layer.pos.y.value;
    }
  },
  methods: {
    updateXPosition() {
      if (!this.layerObject) return;
      
      const newX = Number(this.positionX);
      const currentX = this.layerObject.x();
      const diffX = newX - currentX;
      
      this.layerObject.x(newX);
      this.translateX += diffX;
      
      // Update the document position in store
      if (this.document && this.document.docConfigs && this.document.docConfigs.layer.pos) {
        this.document.docConfigs.layer.pos.x.value = newX;
      }
      
      this.updateSvgTranslation();
    },
    
    updateYPosition() {
      if (!this.layerObject) return;
      
      const newY = Number(this.positionY);
      const currentY = this.layerObject.y();
      const diffY = newY - currentY;
      
      this.layerObject.y(newY);
      this.translateY += diffY;
      
      // Update the document position in store
      if (this.document && this.document.docConfigs && this.document.docConfigs.layer.pos) {
        this.document.docConfigs.layer.pos.y.value = newY;
      }
      
      this.updateSvgTranslation();
    },
    
    updateSvgTranslation() {
      // this.layerObject.batchDraw();
    
      console.log("updateSvgTranslation", this.document);
      // Translate SVG position
      const originalSvgPath = this.document.originalSvgPath;
      const originalSvgPolyline = this.document.originalSvgPolyline || convertSVG(originalSvgPath, "pathToPolyline");
      
      // Update the SVGs
      const translatedSvgPath = translateSvg(originalSvgPath, this.translateX, this.translateY);
      const translatedSvgPolyline = translateSvg(originalSvgPolyline, this.translateX, this.translateY);
      
      this.$konvaStore.setSvgPath(this.document.id, translatedSvgPath);
      this.$konvaStore.setSvgPolyline(this.document.id, translatedSvgPolyline);
      
      const mode = this.document.docConfigs?.svg?.mode?.value;
      
      if (mode === "path") {
        this.$consoleStore.setConsoleOutput(translatedSvgPath, this.document.id);
      } else if (mode === "polyline") {
        this.$consoleStore.setConsoleOutput(translatedSvgPolyline, this.document.id);
      }
    },
    
   
    
    // centerSingleLayer(layer, stage) {
    //   const stageWidth = stage.width();
    //   const stageHeight = stage.height();
      
    //   // Get the layer's content bounds
    //   const layerContent = layer.getChildren();
    //   if (layerContent.length === 0) return;
      
    //   // Calculate the bounds of all content in the layer
    //   let minX = Infinity;
    //   let minY = Infinity;
    //   let maxX = -Infinity;
    //   let maxY = -Infinity;
      
    //   layerContent.forEach((node) => {
    //     const box = node.getClientRect();
    //     minX = Math.min(minX, box.x);
    //     minY = Math.min(minY, box.y);
    //     maxX = Math.max(maxX, box.x + box.width);
    //     maxY = Math.max(maxY, box.y + box.height);
    //   });
      
    //   // Calculate the center of the content
    //   const contentWidth = maxX - minX;
    //   const contentHeight = maxY - minY;
    //   const contentCenterX = minX + contentWidth / 2;
    //   const contentCenterY = minY + contentHeight / 2;
      
    //   // Calculate the position to center the content in the stage
    //   const newX = stageWidth / 2 - contentCenterX * layer.scaleX();
    //   const newY = stageHeight / 2 - contentCenterY * layer.scaleY();
      
    //   // Update layer position
    //   layer.position({
    //     x: newX,
    //     y: newY,
    //   });
      
    //   // Update document position if this is the active layer
    //   if (layer === this.layerObject && this.document && this.document.docConfigs && this.document.docConfigs.layer.pos) {
    //     this.document.docConfigs.layer.pos.x.value = newX;
    //     this.document.docConfigs.layer.pos.y.value = newY;
        
    //     // Update the stored translation values to match the new position
    //     this.translateX = newX - (this.translateX - this.layerObject.x());
    //     this.translateY = newY - (this.translateY - this.layerObject.y());
    //   }
      
    //   const baseLayer = layer.getParent();
    //   baseLayer.batchDraw();
    //   this.updateSvgTranslation();
    // }
  },
  watch: {
    // Watch for external changes to the layer position
    'document.docConfigs.layer.pos.x.value': function(newVal) {
      if (newVal !== this.positionX) {
        this.positionX = newVal;
      }
    },
    'document.docConfigs.layer.pos.y.value': function(newVal) {
      if (newVal !== this.positionY) {
        this.positionY = newVal;
      }
    }
  }
};
</script>

<style scoped>
.layer-navigation-controls {
  width: 160px;
  margin: 0 auto;
}

.position-input {
  width: 80px;
}

.text-caption {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}
</style>