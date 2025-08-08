<template>  
  <!-- Main application container with light background -->
  <v-app id="appContainer" style="background-color:#f5f5f5;">     
    <!-- Hidden SVG renderer for dependencies (no longer uses Konva) -->
    <div style="display: none">
      <div ref="hiddenContainer"></div>
    </div>

    <!-- Main content area - flexible layout with primary viewport and right sidebar -->    
    <div style="display: flex; height: calc(100vh); width: 100%; overflow: hidden;">      
      <div 
        id="threejs-container" 
        ref="threejsContainer"
        style="position:absolute; top:20px; left:20px; right:420px; bottom:20px; box-shadow: 0 2px 4px -1px rgba(0,0,0,.2), 0 4px 5px 0 rgba(0,0,0,.14), 0 1px 10px 0 rgba(0,0,0,.12)"
      >
        <!-- ThreeJS Renderer -->
        <ThreejsRenderer ref="threejsRenderer" class="threejs-primary" />
        
        <!-- LayersPanel positioned in corner with padding -->
        <div style="position: absolute; top: 10px; left: 10px; z-index: 50; width: 280px;">
          <div style="position: relative; background-color: white; border: 1px solid #aaa; border-radius: 4px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
            <LayersPanel />
          </div>
        </div>
      </div>   
    </div>    

    <!-- Tools Panel - Right Sidebar -->
    <div style="position: fixed; top: 20px; right: 20px; bottom: 20px; width: 380px; z-index: 100;">
      <v-card 
        elevation="4" 
        style="height: 100%; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); display: flex; flex-direction: column;"
      >
        <!-- Header -->
        <v-card-title class="py-3">
          <v-icon class="mr-2">mdi-tools</v-icon>
          <span class="text-h6">Tools</span>
          <v-spacer></v-spacer>
        </v-card-title>
        
        <v-divider></v-divider>
        
        <!-- Content -->
        <div style="flex: 1; overflow-y: auto; padding: 16px;">
          
          <!-- Scene Controls Section -->
          <v-card outlined class="mb-4">
            <v-card-subtitle 
              class="d-flex align-center cursor-pointer pa-2" 
              @click="expandedSections.sceneControls = !expandedSections.sceneControls"
            >
              <v-icon small class="mr-2" color="primary">mdi-cube-outline</v-icon>
              <span class="font-weight-medium">Scene Controls</span>
              <v-spacer></v-spacer>
              <v-icon :class="{ 'rotate-180': expandedSections.sceneControls }">
                mdi-chevron-down
              </v-icon>
            </v-card-subtitle>
            <div 
              class="expandable-content"
              :class="{ 'expanded': expandedSections.sceneControls }"
            >
              <v-card-text class="pt-2">
                <div class="card-description text-caption text--secondary mb-2">
                  Control and manipulate the 3D scene
                </div>
                
                <v-btn
                  color="success"
                  @click="importFile"
                  block
                  class="mb-2"
                >
                  <v-icon small class="mr-1">mdi-import</v-icon>
                  Import
                </v-btn>
                
                <v-btn
                  color="red-lighten-1"
                  @click="resetScene"
                  block
                  class="mb-2"
                >
                  <v-icon small class="mr-1">mdi-refresh</v-icon>
                  Reset
                </v-btn>
                
              </v-card-text>
            </div>
          </v-card>

        </div>
        
      </v-card>
    </div>
    
    <!-- Notification Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      top
      right
    >
      {{ snackbar.text }}
      <template v-slot:action="{ attrs }">
        <v-btn
          text
          v-bind="attrs"
          @click="snackbar.show = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
      
  </v-app>
</template>

<script>
import ThreejsRenderer from "~/components/threejs-renderer.vue";
import LayersPanel  from "~/components/layers-panel.vue";
import { cloneDeep } from 'lodash';
import { SvgUtils, defaultVectorConfigs, defaultMetadata } from "@2112-lab/floorplan3d";
import Floorplan3D, { SvgDocumentParser } from "@2112-lab/floorplan3d";

export default {
  components: {
    ThreejsRenderer,
    LayersPanel
  },
    data() {
    return {
      threejsRenderer: null,
      expandedSections: {
        sceneControls: true,
      },
      snackbar: {
        show: false,
        text: '',
        color: 'success',
        timeout: 3000,
      },
      // Simple document storage now handled by floorplan3d instance
      documents: {},
      // Default configs for vector documents
      defaultVectorConfigs: defaultVectorConfigs,
      defaultMetadata: defaultMetadata,
    };
  },
  mounted() {
    // Store references to renderers
    this.threejsRenderer = this.$refs.threejsRenderer;
    
    // Auto-import the FP3D-00-07.svg file on page load with a small delay
    // to ensure all components are properly initialized
    setTimeout(() => {
      this.autoImportSvg();
    }, 500);
    
    // Set up a watcher to sync documents from floorplan3d instance's internal store
    this.$watch(() => this.threejsRenderer?.floorplan3d?.documentStore?.getState() || {}, (newState) => {
      if (newState.documents) {
        this.documents = { ...newState.documents };
      }
    }, { deep: true, immediate: true });
  },
  methods: {
    // Simple document management methods that use floorplan3d's internal store
    addDocument(doc_id, name, configs) {
      // Check if document already exists to prevent duplication
      if (this.documents[doc_id]) {
        console.warn(`Document with ID ${doc_id} already exists. Skipping to prevent duplication.`);
        return;
      }
      
      // Add to floorplan3d's internal store if available
      if (this.threejsRenderer?.floorplan3d) {
        this.threejsRenderer.floorplan3d.addDocument(doc_id, name, configs);
      }
      
      // Sync to local storage for easy access
      this.syncDocumentsFromFloorplan3d();
    },

    syncDocumentsFromFloorplan3d() {
      // Sync the floorplan3d internal store documents to local reactive data
      if (this.threejsRenderer?.floorplan3d?.documentStore) {
        this.documents = { ...this.threejsRenderer.floorplan3d.documentStore.documents };
      }
    },

    getUniqueDisplayName(baseName) {
      const existingNames = Object.values(this.documents).map(doc => doc.ui.displayName);
      
      if (!existingNames.includes(baseName)) {
        return baseName;
      }
      
      let highestNumber = 1;
      const baseNameRegex = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\((\\d+)\\)$`);
      
      existingNames.forEach(name => {
        const match = name.match(baseNameRegex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= highestNumber) {
            highestNumber = num + 1;
          }
        }
      });
      
      return `${baseName} (${highestNumber})`;
    },

    setDocumentActive(doc_id) {
      // Use floorplan3d's internal store to set document active
      if (this.threejsRenderer?.floorplan3d) {
        this.threejsRenderer.floorplan3d.setDocumentActive(doc_id);
      }
      this.syncDocumentsFromFloorplan3d();
    },

    toggleDocumentSelected(documentId) {
      if (this.threejsRenderer?.floorplan3d) {
        this.threejsRenderer.floorplan3d.toggleDocumentSelected(documentId);
      }
      this.syncDocumentsFromFloorplan3d();
    },

    clearAllDocuments() {
      // Clear floorplan3d internal store documents
      if (this.threejsRenderer?.floorplan3d) {
        this.threejsRenderer.floorplan3d.clearAllDocuments();
      }
      this.syncDocumentsFromFloorplan3d();
    },

    // Extract shared logic for processing vector documents
    async processVectorDocuments(sortedVectorDocs, successMessage) {
      console.log('processVectorDocuments called with', sortedVectorDocs.length, 'documents');
      
      // Process vector documents (rooms and walls) - using floorplan3d internal store
      for (let doc of sortedVectorDocs) {
        // Check if document with this ID already exists (prevents duplication)
        if (this.documents[doc.id]) {
          console.log(`Document ${doc.id} already exists, skipping to prevent duplication`);
          continue;
        }
        
        console.log(`Processing document ${doc.id} (${doc.name}):`, {
          hasSvgPath: !!doc.svgPath,
          hasSvgPolyline: !!doc.svgPolyline,
          svgPathLength: doc.svgPath ? doc.svgPath.length : 0,
          svgPolylineLength: doc.svgPolyline ? doc.svgPolyline.length : 0
        });
        
        // Add the document to the internal store preserving the SVG content from parser
        this.addDocument(doc.id, doc.name, {
          ...doc,
          ui: {
            ...doc.ui,
            order: doc.ui.order // Use the order assigned by the parser
          },
          // Preserve the SVG content from the parser instead of creating empty svg object
          svg: {
            objects: doc.konva?.objects || {}, // Use existing objects data
            path: doc.svgPath || '',
            polyline: doc.svgPolyline || ''
          }
        });
        
        console.log(`Document ${doc.id} added to store`);
      }

      // Activate all vector documents after processing
      this.activateVectorDocuments();
      this.showSnackbar(successMessage, 'success');
    },

    // Extract shared logic for activating vector documents
    activateVectorDocuments() {
      if (this.threejsRenderer?.floorplan3d) {
        this.threejsRenderer.floorplan3d.activateVectorDocuments();
      }
    },

    async autoImportSvg() {
      try {
        // Check if documents already exist (prevents duplication during hot reload)
        if (Object.keys(this.documents).length > 0) {
          console.log('Documents already exist, skipping auto-import to prevent duplication');
          return;
        }
        
        console.log('Starting auto-import of SVG...');
        
        // Fetch the SVG file from the public directory
        const response = await fetch('/inkscape-samples/FP3D-00-08.svg');
        if (!response.ok) {
          throw new Error(`Failed to fetch SVG file: ${response.status}`);
        }
        
        const svgContent = await response.text();
        console.log('SVG content fetched, length:', svgContent.length);
        
        // Use floorplan3d's comprehensive import method
        if (this.threejsRenderer?.floorplan3d) {
          const result = await this.threejsRenderer.floorplan3d.importAndStoreDocuments(svgContent);
          console.log('SVG import completed:', result);
          
          this.syncDocumentsFromFloorplan3d();
          this.showSnackbar('FP3D-00-08.svg imported successfully', 'success');
        } else {
          throw new Error('Floorplan3D instance not available');
        }
        
      } catch (error) {
        console.error("Error auto-importing SVG file:", error);
        this.showSnackbar(`Failed to auto-import SVG: ${error.message}`, 'error');
      }
    },

    async importFile() {
      try {
        if (!this.threejsRenderer?.floorplan3d) {
          throw new Error('Floorplan3D instance not available');
        }
        
        const result = await this.threejsRenderer.floorplan3d.importFileWithStorage();
        
        // handle svg upload
        if(result.type === "svg"){
          this.syncDocumentsFromFloorplan3d();
          this.showSnackbar('SVG file imported successfully', 'success');
        } else {
          // For non-SVG files, handle as before
          this.showSnackbar('File imported successfully', 'success');
        }        

      } catch(error) {
        console.error("Error importing file:", error);
        this.showSnackbar(`Failed to import file: ${error.message}`, 'error');
      }
    },

    // Mock methods for the new Tools panel
    resetScene() {
      if(Object.keys(this.documents).length === 0) {
        return;
      }

      // Use the new clearAllDocuments method
      this.clearAllDocuments();
      
      this.showSnackbar('Scene reset successfully', 'success');
    },

    showSnackbar(text, color = 'success') {
      this.snackbar.text = text;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },

    // Method to render SVG to the 3D scene
    renderDocumentToScene(documentId, svgContent) {
      // Access the floorplan3d instance through the threejs renderer
      const floorplan3d = this.threejsRenderer?.floorplan3d;
      
      if (floorplan3d && svgContent) {
        console.log(`Rendering document ${documentId} to 3D scene`);
        floorplan3d.renderSvgToScene(svgContent, documentId);
      } else {
        console.warn('Cannot render to scene: floorplan3d instance or SVG content not available');
      }
    },

    // Method to generate SVG from objects and render to 3D scene
    generateAndRenderSvg(documentId) {
      if (this.threejsRenderer?.floorplan3d) {
        this.threejsRenderer.floorplan3d.generateAndRenderSvg(documentId);
      }
    },

    // Method to regenerate SVG for the currently active document
    updateActiveSvg() {
      const activeDoc = this.getActiveDocument();
      if (activeDoc && activeDoc.metadata.category === "vector") {
        this.generateAndRenderSvg(activeDoc.id);
      }
    },

    // Helper methods for document management
    getDocument(documentId) {
      return this.documents[documentId];
    },

    getActiveDocument() {
      const activeDoc = Object.values(this.documents).find(doc => doc.active);
      if (!activeDoc) return null;
      
      const docId = Object.keys(this.documents).find(key => this.documents[key].active);
      return {
        ...activeDoc,
        id: docId
      };
    },

  },
};
</script>

<style scoped>
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
  background-color: #fff;
}

.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}

.cursor-pointer {
  cursor: pointer;
}

.card-description {
  line-height: 1.4;
}

/* Override LayersPanel positioning when inside threejs container */
#threejs-container .layers-container {
  position: static !important;
  top: auto !important;
  left: auto !important;
  width: 100% !important;
  border: none !important;
  background-color: transparent !important;
  box-shadow: none !important;
}

/* Efficient expand/collapse animation */
.expandable-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
}

.expandable-content.expanded {
  max-height: 300px; /* Adjust this value based on your content height */
}
</style>
