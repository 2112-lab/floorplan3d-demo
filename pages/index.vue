<template>
  <div>
    <LeftPanel />

    <StatusBar />

    <LayersPanel />

    <!-- Hidden konva renderer for dependencies -->
    <div style="display: none">
      <KonvaRenderer ref="konvaRenderer" />
      <div ref="hiddenContainer"></div>
    </div>

    <!-- Main ThreeJS Container -->
    <main class="main threejs-main">
      <ThreejsRenderer ref="threejsRenderer" class="threejs-primary" />
    </main>

    <!-- Console Viewport -->
    <SlidingViewPort
      :top="`calc(100vh - 200px)`"
      type="console"
      custom-classes="console"
      :size="editStore.viewPortSize.console"
      id="consoleViewport"
    >
      <template #title> Console </template>

      <Exports v-if="$consoleStore.mode === 'svg'" />
      <AiConsole v-if="$consoleStore.mode === 'ai'" />
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
    };
  },
  mounted() {
    // Store references to renderers
    this.konvaRenderer = this.$refs.konvaRenderer;
    this.threejsRenderer = this.$refs.threejsRenderer;

    // Initialize both renderers
    this.$nextTick(() => {
      // Initialize Konva renderer even though it's hidden (needed for dependencies)
      if (this.konvaRenderer) {
        this.konvaRenderer.initKonvaIfNeeded();
      }
      
      // Initialize threejs renderer
      if (this.threejsRenderer) {
        this.threejsRenderer.resizeThreeJs();
      }
    });

    const config = useRuntimeConfig();
    if (config.public.developmentMode === 'none') {
      console.log('Running in local development mode');
    }
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
  },
};
</script>

<style scoped>
main.main {
  height: calc(100vh - 40px);
  margin-left: 240px;
  padding-top: 64px;
}

main.threejs-main {
  width: calc(100vw - 240px);
  position: relative;
  overflow: hidden;
}

main.threejs-main > div {
  height: 100%;
  width: 100%;
}

.threejs-primary {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #f5f5f5;
}

.renderer-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  background-color: #fff
}
</style>
