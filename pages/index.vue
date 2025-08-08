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
import { SvgUtils } from "@2112-lab/floorplan3d";
import Floorplan3D, { SvgDocumentParser } from "@2112-lab/floorplan3d";
import { useSvgStore } from "~/store/svg-store";

export default {
  components: {
    ThreejsRenderer,
    LayersPanel
  },
    data() {
    return {
      svgStore: useSvgStore(),
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
      // Simple document storage replacing Konva store
      documents: {},
      // Default configs for vector documents
      defaultVectorConfigs: {
        layer: {
          opacity: { min: 0, max: 1, step: 0.2, value: 1, default: 1 },
          scale: { min: 0.1, max: 2, step: 0.1, value: 1, default: 1 },
          pos: {
            x: { min: -100, max: 100, value: 0, default: 0 },
            y: { min: -100, max: 100, value: 0, default: 0 },
          },
        },
        extrusion: {
          height: { min: 1, max: 100, step: 1, value: 30, default: 30 },
          opacity: { min: 0, max: 1, step: 0.05, value: 1, default: 1 },
          verticalPosition: { min: -50, max: 50, step: 0.5, value: 0, default: 0 },
        },
        svg: {
          mode: { options: ["path", "polyline"], value: "path", default: "path" },
        },
      },
      defaultMetadata: {
        category: "vector",
        type: "svg",
        subtype: "paths",
      },
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
    
    // Set up a watcher to sync documents from SVG renderer's store
    this.$watch(() => this.svgStore.documents || {}, (newDocs) => {
      this.documents = { ...newDocs };
    }, { deep: true, immediate: true });
  },
  methods: {
    // Simple document management methods that sync with SVG store
    addDocument(doc_id, name, configs) {
      // Check if document already exists to prevent duplication
      if (this.documents[doc_id]) {
        console.warn(`Document with ID ${doc_id} already exists. Skipping to prevent duplication.`);
        return;
      }
      
      // Add to SVG renderer's store if available
      if (this.svgStore) {
        this.svgStore.addDocument(doc_id, name, configs);
      }
      
      // Sync to local storage for easy access
      this.syncDocumentsFromSvgStore();
    },

    syncDocumentsFromSvgStore() {
      // Sync the SVG renderer store documents to local reactive data
      if (this.svgStore) {
        this.documents = { ...this.svgStore.documents };
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
      // Use SVG renderer's store to set document active
      if (this.svgStore) {
        this.svgStore.setDocumentActive(doc_id);
      }
      this.syncDocumentsFromSvgStore();
      
      // Directly generate and render SVG for vector documents
      const activeDoc = this.documents[doc_id];
      if (activeDoc && activeDoc.metadata.category === "vector") {
        // Use the new direct method to generate and render SVG
        this.generateAndRenderSvg(doc_id);
      }
    },

    toggleDocumentSelected(documentId) {
      if (this.svgStore) {
        this.svgStore.toggleDocumentSelected(documentId);
      }
      this.syncDocumentsFromSvgStore();
    },

    clearAllDocuments() {
      // Clear SVG renderer store documents
      if (this.svgStore) {
        this.svgStore.clearAllDocuments();
      }
      this.syncDocumentsFromSvgStore();
    },

    // Extract shared logic for processing vector documents
    async processVectorDocuments(sortedVectorDocs, successMessage) {
      console.log('processVectorDocuments called with', sortedVectorDocs.length, 'documents');
      
      // Process vector documents (rooms and walls) - no Konva layers needed
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
        
        // Add the document to the store preserving the SVG content from parser
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
      setTimeout(() => {
        // Sequentially set each vector document as active and generate SVG
        for(let docKey in this.documents) {
          let doc = this.documents[docKey];
          if(doc.metadata.category === "vector") {
            setTimeout(() => {
              this.setDocumentActive(docKey);
            }, 10);
          }
        }          
      }, 100);
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
        const response = await fetch('/inkscape-samples/FP3D-00-07.svg');
        if (!response.ok) {
          throw new Error(`Failed to fetch SVG file: ${response.status}`);
        }
        
        const svgContent = await response.text();
        console.log('SVG content fetched, length:', svgContent.length);
        
        // Create importer instance
        const importer = new Floorplan3D(null, null, null);
        
        // Import the SVG content
        console.log('Starting SVG import...');
        const importedData = await importer.importSvg(svgContent);
        console.log('SVG import completed:', importedData);
        
        // Check if we have valid vector documents
        if (!importedData.vectorDocuments || importedData.vectorDocuments.length === 0) {
          throw new Error('No valid documents found in SVG file');
        }
        
        console.log('Vector documents found:', importedData.vectorDocuments.length);
        
        // Sort and assign orders to vector documents using the parser utility
        const sortedVectorDocs = SvgDocumentParser.assignDocumentOrders(
          SvgDocumentParser.sortDocumentsByType(importedData.vectorDocuments)
        );

        // Check if we still have documents after processing
        if (sortedVectorDocs.length === 0) {
          throw new Error('No valid documents after processing');
        }

        console.log('Processing', sortedVectorDocs.length, 'sorted vector documents...');

        // Use the extracted method for processing
        await this.processVectorDocuments(sortedVectorDocs, 'FP3D-00-07.svg imported successfully');
        
      } catch (error) {
        console.error("Error auto-importing SVG file:", error);
        this.showSnackbar(`Failed to auto-import SVG: ${error.message}`, 'error');
      }
    },

    async importFile() {
      try {
        const importer = new Floorplan3D(null, null, null);
        const importedData = await importer.importFile();
        
        // handle svg upload
        if(importedData.type === "svg"){
          // Sort and assign orders to vector documents using the parser utility
          const sortedVectorDocs = SvgDocumentParser.assignDocumentOrders(
            SvgDocumentParser.sortDocumentsByType(importedData.vectorDocuments)
          );

          // Use the extracted method for processing
          await this.processVectorDocuments(sortedVectorDocs, 'SVG file imported successfully');
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

      // Use the new clearAllDocuments method instead of direct assignment
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
      console.log(`generateAndRenderSvg called for document ${documentId}`);
      const doc = this.getDocument(documentId);
      if (!doc) {
        console.warn(`Document ${documentId} not found`);
        return;
      }

      console.log(`Document ${documentId} structure:`, {
        hasSvgPath: !!doc.svgPath,
        hasSvgPolyline: !!doc.svgPolyline,
        hasSvgObjectPath: !!(doc.svg && doc.svg.path),
        hasSvgObjectPolyline: !!(doc.svg && doc.svg.polyline),
        hasSvgObjects: !!(doc.svg && doc.svg.objects),
        svgPathPreview: doc.svgPath ? doc.svgPath.substring(0, 100) : 'null',
        svgPolylinePreview: doc.svgPolyline ? doc.svgPolyline.substring(0, 100) : 'null',
        svgObjectPathPreview: (doc.svg && doc.svg.path) ? doc.svg.path.substring(0, 100) : 'null'
      });

      // Check if we have SVG content from the parsed document
      let svgContent = null;
      
      // First try to use the SVG content directly from the parsed document (top level)
      if (doc.svgPath) {
        svgContent = doc.svgPath;
        console.log(`Using svgPath content for document ${documentId}`);
      } else if (doc.svgPolyline) {
        svgContent = doc.svgPolyline;
        console.log(`Using svgPolyline content for document ${documentId}`);
      } 
      // Then try the svg object properties
      else if (doc.svg && doc.svg.path) {
        svgContent = doc.svg.path;
        console.log(`Using svg.path content for document ${documentId}`);
      } else if (doc.svg && doc.svg.polyline) {
        svgContent = doc.svg.polyline;
        console.log(`Using svg.polyline content for document ${documentId}`);
      } 
      // Fallback to generating SVG from objects if available
      else if (doc.svg && doc.svg.objects && Object.keys(doc.svg.objects).length > 0) {
        if (!doc.docConfigs || !doc.docConfigs.svg || !doc.docConfigs.svg.mode) {
          console.warn(`Document ${documentId} missing SVG configuration`);
          return;
        }
        const objects = doc.svg.objects;
        const svgMode = doc.docConfigs.svg.mode.value;
        svgContent = SvgUtils.toSvg(objects, svgMode);
        console.log(`Generated SVG from objects for document ${documentId}`);
      }
      
      if (!svgContent) {
        console.warn(`Document ${documentId} has no SVG content to render`);
        return;
      }
      
      console.log(`Rendering SVG content for ${documentId}:`, svgContent.substring(0, 200));
      
      // Render to 3D scene
      this.renderDocumentToScene(documentId, svgContent);
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
