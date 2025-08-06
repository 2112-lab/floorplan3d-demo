<template>
  <div
    class="sliding-viewport bg-primary"
    id="sliding-viewport"
    :class="[
      size === 30 ? 'size-30' : 'size-60',
      open ? 'right-0' : size === 30 ? 'right--30' : 'right--60',
      customClasses,
      editStore.viewPortSize.standard === 30 &&
        type === 'console' &&
        'console-30',
      editStore.viewPortSize.standard === 60 &&
        type === 'console' &&
        'console-60',
    ]"
    :style="{ top: top }"
  >
    <div class="title pa-1 pl-3 pt-2 font-weight-bold" style="color:#333">
      <slot name="title"></slot>
    </div>
    <div class="d-flex align-stretch">
      <div
        v-if="type === 'standard'"
        class="d-flex flex-column buttons-container"
      >
        <v-tooltip text="30% Viewport Size">
          <template v-slot:activator="{ props }">
            <v-btn
              class="slider-button"
              v-bind="props"
              tile
              icon
              size="x-small"
              @click="handleSizeChange(30)"
              variant="outlined"
              >30%</v-btn
            >
          </template>
        </v-tooltip>

        <v-tooltip text="60% Viewport Size">
          <template v-slot:activator="{ props }">
            <v-btn
              class="slider-button"
              v-bind="props"
              tile
              icon
              size="x-small"
              @click="handleSizeChange(60)"
              variant="outlined"
              >60%</v-btn
            >
          </template>
        </v-tooltip>

        <v-tooltip text="Swap with Main Viewport">
          <template v-slot:activator="{ props }">
            <v-btn
              class="slider-button"
              @click="handleSwapViewport"
              v-bind="props"
              tile
              icon
              size="x-small"
              variant="outlined"
            >
              <v-icon size="20"> mdi-swap-horizontal</v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </div>
      <div
        v-if="type === 'console'"
        class="d-flex flex-column buttons-container"
      >

        <v-tooltip text="AI Prompt">
          <template v-slot:activator="{ props }">
            <v-btn
              class="slider-button"
              v-bind="props"
              tile
              icon
              size="x-small"
              @click="$consoleStore.setMode('ai')"
              variant="outlined"
            >
              <v-icon size="20">mdi-brain</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip text="Svg Output">
          <template v-slot:activator="{ props }">
            <v-btn
              class="slider-button"
              v-bind="props"
              tile
              icon
              size="x-small"
              @click="$consoleStore.setMode('svg')"
              variant="outlined"
            >
              <v-icon size="20">mdi-svg</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip text="Copy SVG">
          <template v-slot:activator="{ props }">
            <v-btn
              class="slider-button"
              v-bind="props"
              tile
              icon
              size="x-small"
              @click="handleCopySvg"
              variant="outlined"
            >
              <v-icon size="20">mdi-content-copy</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip text="Export Svg">
          <template v-slot:activator="{ props }">
            <v-btn class="slider-button" v-bind="props" tile icon size="x-small" variant="outlined">
              <v-icon size="20">mdi-file-export-outline</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <!-- Expand Button -->
        <v-tooltip
          text="Expand to 60%"
          v-if="editStore.viewPortSize.console === 30"
        >
          <template v-slot:activator="{ props }">
            <v-btn
              class="slider-button"
              v-bind="props"
              tile
              icon
              size="x-small"
              @click="handleConsoleSizeChange(60)"
              variant="outlined"
            >
              <v-icon size="20">mdi-arrow-expand-left</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <!-- Collapse Button -->
        <v-tooltip
          text="Collapse to 30%"
          v-if="editStore.viewPortSize.console === 60"
        >
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
              tile
              icon
              size="x-small"
              @click="handleConsoleSizeChange(30)"
              variant="outlined"
            >
              <v-icon size="20">mdi-arrow-expand-right</v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </div>
      <div style="border:1px solid #ccc; margin-bottom:2px; width:100%; height:100%">
        <slot :size="size" />
      </div>
    </div>
    <v-btn
      @click="toggleOpen"
      density="compact"
      variant="outlined"
      class="position-absolute slide-btn bg-primary rounded-s"
      icon
      tile
    >
      <v-icon :icon="open ? 'mdi-chevron-right' : 'mdi-chevron-left'"></v-icon>
    </v-btn>
  </div>
</template>

<script>
import { useEditStore } from "~/store/edit";
import { useConsoleStore } from "~/store/console-store";
import { useKonvaStore } from "~/store/konva-store";
import { useEventBusStore } from "~/store/event-bus";

export default {
  props: {
    customClasses: {
      type: String,
    },
    top: {
      type: String,
      default: "65px",
    },
    size: {
      type: Number,
      default: 30,
    },
    type: {
      type: String,
      default: "standard",
    },
  },
  data() {
    return {
      open: this.type === "standard" ? true : false,
      editStore: useEditStore(),
      consoleStore: useConsoleStore(),
      konvaStore: null,
      svgMode: "path", // Default SVG mode
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
    
    // Initialize eventBus
    this.eventBus = useEventBusStore();
    
    // Listen for open-console-viewport event using event bus
    this.unsubscribeHandler = this.eventBus.on('open-console-viewport', this.handleOpenConsoleViewport);
  },
  
  beforeDestroy() {
    // Clean up event listener
    if (this.unsubscribeHandler) {
      this.unsubscribeHandler();
    }
  },
  
  
  watch: {
       
  },
  methods: {
    handleSizeChange(size) {
      if (this.type === "standard") {
        this.editStore.setViewPortSize({
          console: this.editStore.viewPortSize.console,
          standard: size,
        });
      }
    },
    handleConsoleSizeChange(size) {
      this.editStore.setViewPortSize({
        console: size,
        standard: this.editStore.viewPortSize.standard,
      });
    },

    toggleOpen() {
      this.open = !this.open;
    },
    async handleCopySvg() {
      await navigator.clipboard.writeText(this.$consoleStore.consoleOutput);
      this.$notification.notify({
        message: "Copied to clipboard",
        type: "success",
      });
    },
    handleSwapViewport() {
      console.log(this.editStore.viewport);
      console.log(this.editStore.swapViewports());
      console.log(this.editStore.viewport);
    },
    
   
    // Handle the open-console-viewport event
    handleOpenConsoleViewport() {
      // Make sure the console viewport is open
      this.open = true;
    },
  },
};
</script>

<style>
.sliding-viewport {
  position: absolute;
  right: 0;
  border: 1px solid #ccc;
  border-radius:4px;
}
.sliding-viewport {
  transition: right 0.4s;
  z-index: 100;
}
.sliding-viewport.size-30 {
  width: 30%;
  height: 30%;
}
.sliding-viewport.size-60 {
  width: 60%;
  height: 60%;
}
.sliding-viewport.console-30 {
  height: calc(100vh - 65px - 30% - 65px);
}
.sliding-viewport.console-60 {
  height: calc(100vh - 65px - 60% - 65px);
}

.sliding-viewport.right-0 {
  right: 0;
}
.sliding-viewport.right--30 {
  right: -30%;
}
.sliding-viewport.right--60 {
  right: -60%;
}

.sliding-viewport > :nth-child(2) {
  height: calc(100% - 33px);
}
.slide-btn {
  left: -30px;
  top: 20%;
  width: 30px !important;
  height: 50px !important;
  border-left:1px solid #ccc;
  border-top:1px solid #ccc;
  border-bottom:1px solid #ccc;
  border-right: none;
}
.sliding-viewport .buttons-container {
  /* border: 1px solid;
  border-top: 0; */
  padding-left:6px;
  padding-right:6px;
}
.sliding-viewport .title {
  /* border: 1px solid; */
}
.slider-button {
  margin-top:2px;
  margin-bottom:4px;
  border-radius:4px;
  border:1px solid #555;
}
</style>
