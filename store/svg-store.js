import { defineStore } from "pinia";

export const defaultRasterConfigs = {
  layer: {
    opacity: {
      min: 0,
      max: 1,
      step: 0.2,
      value: 1,
      default: 1,
    },
    scale: {
      min: 0.1,
      max: 2,
      step: 0.1,
      value: 1,
      default: 1,
    },
    pos: {
      x: {
        min: -100,
        max: 100,
        value: 0,
        default: 0,
      },
      y: {
        min: -100,
        max: 100,
        value: 0,
        default: 0,
      },
    },
  },
};

export const defaultVectorConfigs = {
  ...defaultRasterConfigs,
  extrusion: {
    height: {
      min: 1,
      max: 100,
      step: 1,
      value: 30,
      default: 30,
    },
    opacity: {
      min: 0,
      max: 1,
      step: 0.05,
      value: 1,
      default: 1,
    },
    verticalPosition: {
      min: -50,
      max: 50,
      step: 0.5,
      value: 0,
      default: 0,
    },
  },
  svg: {
    mode: {
      options: ["path", "polyline"],
      value: "path",
      default: "path",
    },
  },
};

export const defaultMetadata = {
  category: "vector",
  type: "svg",
  subtype: "paths",
};

export const useSvgStore = defineStore("svg", {
  state: () => ({
    documents: {}, // Store for document management
    activeDocumentId: null,
    selectedDocuments: new Set(),
    // Remove Konva-specific properties but keep interface compatibility
    stage: null, // Keep for backward compatibility (will be null)
    baseLayer: null, // Keep for backward compatibility (will be null)
    gridLayer: null, // Keep for backward compatibility (will be null)
    selectionLayer: null, // Keep for backward compatibility (will be null)
  }),

  getters: {
    getActiveDocument: (state) => {
      return state.activeDocumentId ? state.documents[state.activeDocumentId] : null;
    },
    
    getSelectedDocuments: (state) => {
      return Array.from(state.selectedDocuments).map(id => state.documents[id]).filter(Boolean);
    },

    getDocumentById: (state) => {
      return (id) => state.documents[id];
    },

    getAllDocuments: (state) => {
      return Object.values(state.documents);
    },
  },

  actions: {
    // Backward compatibility methods (no-op for Konva-specific functionality)
    setStage(stage) {
      // No-op: We don't use Konva stage anymore
      console.log('setStage called but ignored (Konva dependency removed)');
    },

    setBaseLayer(layer) {
      // No-op: We don't use Konva layers anymore
      console.log('setBaseLayer called but ignored (Konva dependency removed)');
    },

    // Document management methods
    addDocument(doc_id, name, configs) {
      if (this.documents[doc_id]) {
        console.warn(`Document with ID ${doc_id} already exists. Skipping to prevent duplication.`);
        return;
      }

      // Create a simplified document structure without Konva objects
      const document = {
        id: doc_id,
        active: false,
        selected: false,
        ui: {
          displayName: name,
          order: configs?.ui?.order || Object.keys(this.documents).length,
        },
        metadata: configs?.metadata || { ...defaultMetadata },
        docConfigs: configs?.docConfigs || { ...defaultVectorConfigs },
        // Store SVG data instead of Konva objects
        svg: {
          path: configs?.svg?.path || '',
          polyline: configs?.svg?.polyline || '',
          objects: configs?.svg?.objects || {}, // Raw object data for SVG generation
        },
        // Keep other properties that might be needed
        ...configs,
      };

      this.documents[doc_id] = document;
      
      console.log("Document added:", doc_id, document);
    },

    setDocumentActive(doc_id) {
      // Deactivate all documents
      Object.keys(this.documents).forEach(id => {
        this.documents[id].active = false;
      });
      
      // Activate the specified document
      if (this.documents[doc_id]) {
        this.documents[doc_id].active = true;
        this.activeDocumentId = doc_id;
        console.log(`Document ${doc_id} set as active`);
      }
    },

    toggleDocumentSelected(doc_id) {
      if (this.documents[doc_id]) {
        const isSelected = this.selectedDocuments.has(doc_id);
        if (isSelected) {
          this.selectedDocuments.delete(doc_id);
          this.documents[doc_id].selected = false;
        } else {
          this.selectedDocuments.add(doc_id);
          this.documents[doc_id].selected = true;
        }
      }
    },

    clearAllDocuments() {
      this.documents = {};
      this.activeDocumentId = null;
      this.selectedDocuments.clear();
      console.log('All documents cleared');
    },

    // SVG management methods (replacing Konva object methods)
    setSvgPath(documentId, svg) {
      if (this.documents[documentId]) {
        this.documents[documentId].svg.path = svg;
        console.log(`SVG path set for document ${documentId}`);
      }
    },

    setSvgPolyline(documentId, svg) {
      if (this.documents[documentId]) {
        this.documents[documentId].svg.polyline = svg;
        console.log(`SVG polyline set for document ${documentId}`);
      }
    },

    // Update document objects (for SVG generation)
    updateDocumentObjects(documentId, objects) {
      if (this.documents[documentId]) {
        this.documents[documentId].svg.objects = objects;
        console.log(`Objects updated for document ${documentId}`);
      }
    },

    // Update document configuration
    updateDocumentConfig(documentId, configPath, value) {
      if (this.documents[documentId]) {
        const pathArray = configPath.split('.');
        let current = this.documents[documentId].docConfigs;
        
        for (let i = 0; i < pathArray.length - 1; i++) {
          if (!current[pathArray[i]]) {
            current[pathArray[i]] = {};
          }
          current = current[pathArray[i]];
        }
        
        current[pathArray[pathArray.length - 1]] = value;
        console.log(`Config updated for document ${documentId}: ${configPath} = ${value}`);
      }
    },

    // Get document SVG based on mode
    getDocumentSvg(documentId) {
      const doc = this.documents[documentId];
      if (!doc) return null;
      
      const mode = doc.docConfigs?.svg?.mode?.value || 'path';
      return mode === 'path' ? doc.svg.path : doc.svg.polyline;
    },
  },
});
