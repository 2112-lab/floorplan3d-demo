<template>
  <div>
    <LeftPanel />

    <StatusBar />

    <LayersPanel />

    <ThreejsRenderer ref="threejsRenderer" />

    <!-- Secondary Viewport -->
    <SlidingViewPort :size="editStore.viewPortSize.standard" class="mt-2">
      <template #title> Renderer </template>
      <template #default="{ size }">
        <div ref="secondaryContainer" class="renderer-container"></div>
      </template>
    </SlidingViewPort>

  </div>
</template>

<script>
import LeftPanel from "../components/left-panel/left-panel.vue";
import StatusBar from "../components/status-bar/status-bar.vue";
import SlidingViewPort from "../components/sliding-viewport/sliding-viewport.vue";
import KonvaRenderer from "~/components/konva-renderer/konva-renderer.vue";
import ThreejsRenderer from "~/components/threejs-renderer/threejs-renderer.vue";
import { useEditStore } from "~/store/edit";
import Exports from "~/components/exports.vue";
import AiConsole  from "~/components/ai-console/ai-console.vue";
import LayersPanel  from "~/components/documents-panel.vue";
import { addRasterImageToLayer } from "~/lib/konva/konva";

export default {
  components: {
    LeftPanel,
    StatusBar,
    SlidingViewPort,
    KonvaRenderer,
    ThreejsRenderer,
    AiConsole,
    LayersPanel
  },
  data() {
    return {
      editStore: useEditStore(),
      konvaRenderer: null,
      threejsRenderer: null,
      primaryContainer: null,
      secondaryContainer: null,
    };
  },
  mounted() {
    // Store references to renderers and containers
    this.konvaRenderer = this.$refs.konvaRenderer;
    this.threejsRenderer = this.$refs.threejsRenderer;
    this.primaryContainer = this.$refs.primaryContainer;
    this.secondaryContainer = this.$refs.secondaryContainer;

    // Initial renderer placement
    this.$nextTick(() => {
      this.moveRenderer(this.editStore.viewport.primary, this.primaryContainer);
      this.moveRenderer(
        this.editStore.viewport.secondary,
        this.secondaryContainer
      );
    });

    const config = useRuntimeConfig();
    if (config.public.developmentMode === 'none') {
      console.log('Running in local development mode');
    }
    
  },
  computed: {
    getPrimaryComponent() {
      return this.editStore.viewport.primary === "konva"
        ? "KonvaRenderer"
        : "ThreejsRenderer";
    },
    getSecondaryComponent() {
      return this.editStore.viewport.secondary === "konva"
        ? "KonvaRenderer"
        : "ThreejsRenderer";
    },
  },
  methods: {
    async importFloorPlan() {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".jpg,.jpeg,.png";

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            // Store the file for later use
            this.editStore.setUploadedImage(file);

            // Create URL for preview
            const imageUrl = URL.createObjectURL(file);
            // Update the v-img src
            const imgElement = document.querySelector("#image-preview img");
            if (imgElement) {
              imgElement.src = imageUrl;
            }

            this.editStore.setOutputStage(0);
            this.notificationStore.notify({
              message: "Succesfully imported",
            });
          } catch (error) {
            console.error("Error importing floor plan:", error);
            this.notificationStore.notify({
              message: "Failed to import floor plan",
              type: "error",
            });
          }
        }
      };
      input.value = "";
      input.click();
    },
    moveRenderer(type, targetContainer) {
      if (!targetContainer) return;

      let sourceEl = null;
      let otherEl = null;

      if (type === "konva") {
        sourceEl = this.konvaRenderer?.$el;
        otherEl = this.threejsRenderer?.$el;
      } else if (type === "three") {
        sourceEl = this.threejsRenderer?.$el;
        otherEl = this.konvaRenderer?.$el;
      }

      if (!sourceEl) return;

      // Store the current content of target container if any
      const currentContent = targetContainer.firstChild;
      if (currentContent) {
        // Move current content back to hidden container
        const hiddenContainer = this.$refs.hiddenContainer;
        if (hiddenContainer && currentContent.parentNode === targetContainer) {
          hiddenContainer.appendChild(currentContent);
        }
      }

      // Move the new renderer to target container
      if (sourceEl.parentNode !== targetContainer) {
        targetContainer.appendChild(sourceEl);
      }

      // Trigger resize events after DOM update
      this.$nextTick(() => {
        if (this.konvaRenderer) {
          this.konvaRenderer.resizeKonva();
        }
        if (this.threejsRenderer) {
          this.threejsRenderer.resizeThreeJs();
        }
      });
    },
  },
  watch: {
    "editStore.viewport.primary": {
      handler(newType) {
        this.$nextTick(() => {
          this.moveRenderer(newType, this.primaryContainer);
        });
      },
    },
    "editStore.viewport.secondary": {
      handler(newType) {
        this.$nextTick(() => {
          this.moveRenderer(newType, this.secondaryContainer);
        });
      },
    },
  },
};
</script>

<style scoped>
main.main {
  height: calc(100vh - 40px);
  margin-left: 240px;
  padding-top: 64px;
}
main.main > div {
  height: 100%;
}

.renderer-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  background-color: #fff
}
</style>
