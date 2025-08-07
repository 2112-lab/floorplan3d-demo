<template>
  <div ref="threejsContainer" class="threejs-container">
    <div ref="threejsRenderer" class="threejs-renderer"></div>
  </div>
</template>

<script>
import * as THREE from "three";
import Floorplan3D from "~/lib/Floorplan3D";
// import Floorplan3D from "@2112-lab/floorplan3d";
import { useEditStore } from "~/store/edit";
import { useThreeStore } from "~/store/three-store";
import { useConsoleStore } from "~/store/console-store";
import { useSvgStore } from "~/store/svg-store";

export default {
  props: {
    size: {
      type: Number,
      default: 30,
    },
  },
  data() {
    return {
      threestore: useThreeStore(),
      editStore: useEditStore(),
      svgStore: useSvgStore(),
      consoleStore: useConsoleStore(),
      verticalPosition: 0,
    };
  },
  computed: {
    activeDocument() {
      if (!this.svgStore || !this.svgStore.documents) {
        return null;
      }
      
      const activeDoc = Object.values(this.svgStore.documents).find(doc => doc && doc.active === true);
      const activeDocId = Object.keys(this.svgStore.documents).find(id => this.svgStore.documents[id] === activeDoc);

      if (activeDoc) {
        return { ...activeDoc, id: activeDocId };
      } else if (Object.keys(this.svgStore.documents).length > 0) {
        const firstDocId = Object.keys(this.svgStore.documents)[0];
        return { ...this.svgStore.documents[firstDocId], id: firstDocId };
      }
      
      return null;
    },
    gridEnabled3d(){
          return this.editStore.checkboxes.find((checkbox) => checkbox.name === "3dgrid")?.value 
    }
  },
  mounted() {
    this.resizeObserver = new ResizeObserver(() => {
      const el = this.$refs.threejsContainer;
      if (!el) return;
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        if (!this.floorplan3d) {
          this.initThreeJs();
          this.initGridHelper();
        } else {
          this.resizeThreeJs();
        }
      }
    });
    this.resizeObserver.observe(this.$refs.threejsContainer);
    
    // Add listener for the custom 3D visibility toggle event
    document.addEventListener('toggle-3d-visibility', this.handle3DVisibilityToggle);
  },
  beforeDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    // Remove event listener when component is destroyed
    document.removeEventListener('toggle-3d-visibility', this.handle3DVisibilityToggle);
    
    this.cleanupThreeJs();
  },
  watch: {
    size: {
      async handler(val) {
        await this.$nextTick();
        this.resizeThreeJs();
      },
      immediate: true,
    },
    "gridEnabled3d": {
      async handler(enabled) {
        if(enabled){
          await this.$nextTick();
          this.initGridHelper();
        } else {
          const gridHelper = this.floorplan3d.scene.getObjectByName("GridHelper");
          if (gridHelper) {
            this.floorplan3d.scene.remove(gridHelper);
            gridHelper.geometry.dispose();
            gridHelper.material.dispose();
          }
        }
      },
      immediate: false,
    },
  },
  methods: {
    initThreeJs() {
      const containerRef = this.$refs.threejsContainer;
      const rendererRef = this.$refs.threejsRenderer;
      if (!containerRef || !rendererRef) return;

      const width = containerRef.offsetWidth;
      const height = containerRef.offsetHeight;

      // Clear any existing Three.js instance
      if (this.floorplan3d) {
        this.cleanupThreeJs();
      }

      // Initialize using Floorplan3D class
      this.floorplan3d = new Floorplan3D(rendererRef, width, height);
      
      // Store the floorplan3d instance in the threeStore
      this.threestore.setFloorplan3D(this.floorplan3d);

      // Create a group for rendered content
      this.contentGroup = new THREE.Group();
      this.contentGroup.name = "contentGroup";
      this.floorplan3d.scene.add(this.contentGroup);

      this.threestore.setScene(this.floorplan3d.scene);

      // Make sure the animation is running
      this.floorplan3d.startAnimation();

      // Sync with store state
      if (this.threestore.floorGroup) {
        const floorGroup = this.threestore.floorGroup.clone();
        floorGroup.matrixAutoUpdate = false;
        this.contentGroup.add(floorGroup);
      }
      if (this.threestore.lineGroup) {
        const lineGroup = this.threestore.lineGroup.clone();
        lineGroup.matrixAutoUpdate = false;
        this.contentGroup.add(lineGroup);
      }
    },
    cleanupThreeJs() {
      if (this.floorplan3d) {

        // Clear only the content group
        if (this.contentGroup) {
          while (this.contentGroup.children.length > 0) {
            const child = this.contentGroup.children[0];
            this.contentGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((material) => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        }

        // Dispose of renderer
        if (this.floorplan3d.renderer) {
          this.floorplan3d.renderer.dispose();
          this.floorplan3d.renderer.forceContextLoss();
          this.floorplan3d.renderer.domElement = null;
        }

        // Clear references
        this.floorplan3d = null;
        this.contentGroup = null;
      }
    },
    resizeThreeJs() {
      if (!this.floorplan3d) return;
      const containerRef = this.$refs.threejsContainer;
      if (!containerRef) return;

      const newWidth = containerRef.offsetWidth;
      const newHeight = containerRef.offsetHeight;

      if (newWidth > 0 && newHeight > 0) {
        // Update renderer size
        this.floorplan3d.renderer.setSize(newWidth, newHeight);
        this.floorplan3d.renderer.setPixelRatio(window.devicePixelRatio);

        // Update camera aspect ratio and projection matrix
        this.floorplan3d.camera.aspect = newWidth / newHeight;
        this.floorplan3d.camera.updateProjectionMatrix();

        // Force a render
        this.floorplan3d.renderer.render(this.floorplan3d.scene, this.floorplan3d.camera);
      }
    },
    initGridHelper() {
      if (!this.floorplan3d || !this.floorplan3d.scene) return;
      
      // Use the new addGridHelper method from Floorplan3D
      this.floorplan3d.addGridHelper(100, 100, { y: -0.1 });
      
      // Force a re-render to ensure the grid is visible
      this.floorplan3d.renderScene();
    },
    handle3DVisibilityToggle(event) {
      if (!this.floorplan3d || !this.floorplan3d.scene) return;
      
      const { documentId, visible } = event.detail;
      console.log(`Handling 3D visibility toggle event for document ${documentId}:`, visible);
      
      // Find the content group
      const contentGroup = this.floorplan3d.scene.getObjectByName("contentGroup");
      if (!contentGroup) return;
      
      // Find the specific room group for this document
      const groupName = `roomGroup-${documentId}`;
      const roomGroup = contentGroup.getObjectByName(groupName);
      
      if (roomGroup) {
        console.log(`Updating visibility of ${groupName} to:`, visible);
        roomGroup.visible = visible;
        
        // Force a render to update the view
        this.floorplan3d.renderScene();
        return true;
      } else {
        console.log(`Room group ${groupName} not found in scene`);
      }
      
      return false;
    },
    handleVerticalPositionChange(value) {
      if (!this.activeDocument) return;
      
      // Get the document ID
      const documentId = this.activeDocument.id;
      
      if (!documentId) {
        console.warn('Cannot update vertical position: Document ID not found');
        return;
      }
      
      // Update document config
      this.activeDocument.docConfigs.extrusion.verticalPosition.value = value;
        // Update the vertical position in the 3D scene
      if (this.floorplan3d) {
        // Create a document object with the same structure expected by update3dVerticalPosition
        const document = {
          id: documentId,
          docConfigs: {
            extrusion: {
              verticalPosition: {
                value: value
              },
              height: {
                value: this.activeDocument.docConfigs.extrusion.height?.value || 1
              }
            }
          }
        };
        this.floorplan3d.update3dVerticalPosition(document);
      }
    },
  },
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

.vertical-position-slider {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 40px;
  /* background: rgba(255, 255, 255, 0.8); */
  padding: 0px;
  border-radius: 8px;
  /* box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); */
  z-index: 1000;
}

.slider-value-container {
  /* height: 50px; */
}

.vertical-slider-height {
  /* height: 25%; */
}
</style>
