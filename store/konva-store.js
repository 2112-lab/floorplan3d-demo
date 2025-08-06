import { defineStore } from "pinia";
import { useThreeStore } from "./three-store";

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

const defaultMetadata = {
  category: "vector",
  type: "svg",
  subtype: "paths",
};

export const useKonvaStore = defineStore("konvaStore", {
  state: () => ({
    stage: null,
    baseLayer: null,
    showInfo: false,
    uploadedSVG: null,
    undoHistory: [],
    currentStateIndex: -1,
    skipStageDocumentCreation: false, // Flag to prevent duplicate document creation

    gridLayer: null,
    selectionLayer: null,

    documents: {}, // Initialize with an empty object instead of hardcoded doc_01

    defaultVectorConfigs: defaultVectorConfigs,
  }),
  getters: {
    getSplitLine: (state) => (doc_id, obj_id) => {
      const doc = state.documents[doc_id];
      return doc.konva.objects[obj_id].splitLine;
    },
    getActiveDocument: (state) => () => {
      return {
        ...Object.values(state.documents).find((doc) => doc.active),
        id: Object.keys(state.documents).find(
          (key) => state.documents[key].active
        ),
      };
    },
    getSelectedKonvaObject: (state) => () => {
      const activeDocument = state.getActiveDocument();
      const selectedObject = Object.values(activeDocument.konva.objects).find(
        (object) => object.selected
      );
      return selectedObject;
    },
    getDocument: (state) => (name) => {
      return state.documents[name];
    },
    getSplitStage: (state) => (doc_id, object_id) => {
      const doc = state.documents[doc_id];
      return doc.konva.objects[object_id].splitStage || 1;
    },
    clickedObjectInActiveDocument: (state) => (clickedObjectid) => {
      const activeDocument = state.getActiveDocument();
      if(activeDocument.konva.objects[clickedObjectid]){
        return true;
      }else{
        return false;
      }
    },
  },

  actions: {
    // Helper method to generate a unique display name
    getUniqueDisplayName(baseName) {
      // First, gather all existing display names
      const existingNames = Object.values(this.documents).map(doc => doc.ui.displayName);
      
      // If the name doesn't exist yet, return it as is
      if (!existingNames.includes(baseName)) {
        return baseName;
      }
      
      // Find the highest number in parentheses for this base name
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
      
      // Return the base name with the next number
      return `${baseName} (${highestNumber})`;
    },

    addDocument(doc_id, name, configs) {
      // Check if document already exists to prevent duplication
      if (this.documents[doc_id]) {
        console.warn(`Document with ID ${doc_id} already exists. Skipping to prevent duplication.`);
        return;
      }
      
      // First, shift all existing documents' order values up by 1
      // Object.values(this.documents).forEach((doc) => {
      //   // doc.ui.order += 1;
      //   // doc.active = false;
      // });

      // Generate a unique display name
      const uniqueDisplayName = this.getUniqueDisplayName(name);

      this.documents[doc_id] = {
        active: false,
        name: name,
        konva: {},
        svgPath: {},
        svgPolyline: {},
        originalSvgPath: "", // Add storage for original SVGs
        originalSvgPolyline: "", // Add storage for original SVGs
        docConfigs: { ...defaultVectorConfigs },
        metadata: { ...defaultMetadata },
        ui: {
          displayName: uniqueDisplayName, // Use the unique display name
          order: 1, // New document gets order 1
          menuOpen: false,
        },
        selected: false, // Add selected property initialized to false
        show3D: true, // Add show3D property initialized to true
        threejsContent: null,
        ...configs,
      };

      // this.documents[doc_id].active = true;
      this.documents[doc_id].ui.order = 1;

      console.log(
        "addDocument this.documents:",
        JSON.parse(JSON.stringify(this.documents))
      );
    },
    deSelectAllObjects(doc_id) {
      const doc = this.documents[doc_id];
      if (!doc) return;
      Object.keys(this.documents[doc_id].konva.objects).map((key) => {
        this.documents[doc_id].konva.objects[key].selected = false;
        this.documents[doc_id].konva.objects[key].stroke = "#000000";
        this.documents[doc_id].konva.objects[key].fill =
          this.documents[doc_id].konva.objects[key].originalFill;
      });
    },
    setDocumentActive(doc_id) {
      // Reset all documents to inactive first
      Object.keys(this.documents).forEach((id) => {
        this.documents[id].active = false;
      });

      // Set the selected document as active
      if (this.documents[doc_id]) {
        this.documents[doc_id].active = true;

        // Bring the layer to the top of the rendering stack
        // This affects the visual z-index but not the document's ui.order
        if (
          this.documents[doc_id].konva &&
          this.documents[doc_id].konva.layer
        ) {
          // Save the layer reference for brevity
          const activeLayer = this.documents[doc_id].konva.layer;

          // Move the layer to the top of all layers in the stage
          activeLayer.moveToTop();

          // Make sure the selection layer stays on top if it exists
          if (this.selectionLayer) {
            this.selectionLayer.moveToTop();
          }

          // Redraw the stage to show the changes
          if (this.stage) {
            this.stage.batchDraw();
          }
        }
      }
    },
    updateDocumentLayer(doc_id, layer) {
      if (this.documents[doc_id]) {
        this.documents[doc_id].konva = {
          ...this.documents[doc_id].konva,
          layer: layer,
        };
      }
    },
    updateDocumentLayerOpacity(doc_id, opacity) {
      if (this.documents[doc_id]) {
        this.documents[doc_id].konva.layer.opacity(opacity);
        this.documents[doc_id].docConfigs.layer.opacity.value = opacity;
        this.documents[doc_id].konva.layer.batchDraw();
      }
    },
    setKonvaObjects(doc_id, objects) {
      this.documents[doc_id].konva.objects = objects;
    },
    setKonvaObject(doc_id, object_id, object) {
      this.documents[doc_id].konva.objects[object_id] = {
        ...this.documents[doc_id].konva.objects[object_id],
        ...object,
      };
    },
    setSvgPolyline(doc_id, svg) {
      // Store the original SVG if it hasn't been stored yet
      if (
        !this.documents[doc_id].originalSvgPolyline
      ) {
        this.documents[doc_id].originalSvgPolyline = svg;
      }
      this.documents[doc_id].svgPolyline = svg;
    },
    setSvgPath(doc_id, svg) {
      // Store the original SVG if it hasn't been stored yet
      if (
        !this.documents[doc_id].originalSvgPath
      ) {
        this.documents[doc_id].originalSvgPath = svg;
      }
      this.documents[doc_id].svgPath = svg;
    },

    setStage(stage) {
      this.stage = stage;
    },

    setBaseLayer(stage) {
      this.baseLayer = stage;
    },

    setShowInfo(info) {
      this.showInfo = info;
    },

    setAttrs(doc_id, object_id, attrs) {
      this.documents[doc_id].konva.objects[object_id].attrs = attrs;
    },

    updateSplitLine({ doc_id, obj_id, line }) {
      this.documents[doc_id].konva.objects[obj_id].splitLine = line;
    },

    updateSplitStage({ doc_id, obj_id, stage }) {
      this.documents[doc_id].konva.objects[obj_id].splitStage = stage;
    },
    
    /**
     * Updates specific properties of a document while preserving others
     * @param {string} docId - The ID of the document to update
     * @param {object} properties - Object containing properties to update
     */
    updateDocument(docId, properties) {
      if (this.documents[docId]) {
        // Use a deep merge approach to ensure nested properties are updated correctly
        Object.keys(properties).forEach(key => {
          if (typeof properties[key] === 'object' && 
              properties[key] !== null && 
              typeof this.documents[docId][key] === 'object') {
            // Merge nested objects rather than replacing them
            this.documents[docId][key] = {
              ...this.documents[docId][key],
              ...properties[key]
            };
          } else {
            // For non-objects or if the property doesn't exist, just set it
            this.documents[docId][key] = properties[key];
          }
        });
      }
    },

    // Undo and Redo related actions
    saveState() {
      const activeDoc = this.getActiveDocument();
      if (!activeDoc) return;

      // Get the current state of only the active document
      const currentState = {
        [activeDoc.id]: {
          konva: {
            objects: JSON.parse(JSON.stringify(activeDoc.konva.objects || {})),
          },
        },
      };

      // Get the last saved state
      const lastState = this.undoHistory[this.currentStateIndex];

      // Helper function to compare states
      const areStatesEqual = (state1, state2) => {
        if (!state1 || !state2) return false;

        // Compare only the active document's objects
        const docId = Object.keys(state1)[0];
        const doc1 = state1[docId];
        const doc2 = state2[docId];
        if (!doc2) return false;

        return (
          JSON.stringify(doc1.konva.objects) ===
          JSON.stringify(doc2.konva.objects)
        );
      };

      // Only save if the state has actually changed
      if (!lastState || !areStatesEqual(currentState, lastState)) {
        this.undoHistory = this.undoHistory.slice(
          0,
          this.currentStateIndex + 1
        );
        this.undoHistory.push(currentState);
        this.currentStateIndex = this.undoHistory.length - 1;
      } else {
        console.log("State unchanged, not saving");
      }
    },

    undo() {
      if (this.currentStateIndex > 0) {
        this.currentStateIndex--;
        const previousState = this.undoHistory[this.currentStateIndex];
        const activeDoc = this.getActiveDocument();
        if (!activeDoc) return false;

        // Only restore the active document's state
        const docState = previousState[activeDoc.id];
        if (docState) {
          this.documents[activeDoc.id].konva.objects = JSON.parse(
            JSON.stringify(docState.konva.objects)
          );
        }

        return true;
      }
      return false;
    },

    redo() {
      if (this.currentStateIndex < this.undoHistory.length - 1) {
        this.currentStateIndex++;
        const nextState = this.undoHistory[this.currentStateIndex];
        const activeDoc = this.getActiveDocument();
        if (!activeDoc) return false;

        // Only restore the active document's state
        const docState = nextState[activeDoc.id];
        if (docState) {
          this.documents[activeDoc.id].konva.objects = JSON.parse(
            JSON.stringify(docState.konva.objects)
          );
        }

        return true;
      }
      return false;
    },
    // ------- //

    // Document management methods
    toggleDocumentVisibility(documentId) {
      if (!this.documents[documentId]) return;

      const doc = this.documents[documentId];
      const newOpacity = doc.docConfigs.layer.opacity.value > 0 ? 0 : 1;

      if (doc.konva.layer) {
        doc.konva.layer.opacity(newOpacity);
        doc.docConfigs.layer.opacity.value = newOpacity;
        doc.konva.layer.getParent().batchDraw();
      }
    },

    toggleAllDocumentsVisibility(makeVisible) {
      const newOpacity = makeVisible ? 1 : 0;

      Object.keys(this.documents).forEach((docId) => {
        console.log("toggleAllDocumentsVisibility docId:", docId);
        const doc = this.documents[docId];
        if (doc.konva.layer) {
          doc.konva.layer.opacity(newOpacity);
          doc.docConfigs.layer.opacity.value = newOpacity;
          console.log(
            "toggleAllDocumentsVisibility doc.docConfigs.layer.opacity.value:",
            doc.docConfigs.layer.opacity.value
          );
          doc.konva.layer.batchDraw();
        }
      });
    },

    moveDocumentUp(documentId) {
      const docEntries = Object.entries(this.documents).sort(
        ([, a], [, b]) => a.ui.order - b.ui.order
      );

      const currentIndex = docEntries.findIndex(([id]) => id === documentId);

      if (currentIndex <= 0 || currentIndex >= docEntries.length) return;

      const prevDocId = docEntries[currentIndex - 1][0];
      const currentDoc = this.documents[documentId];
      const prevDoc = this.documents[prevDocId];

      // Swap order values
      const tempOrder = currentDoc.ui.order;
      currentDoc.ui.order = prevDoc.ui.order;
      prevDoc.ui.order = tempOrder;

      // Update the actual Konva layer z-index
      if (currentDoc.konva.layer && prevDoc.konva.layer) {
        // moveUp moves the layer one level up in drawing order
        currentDoc.konva.layer.moveUp();
      }
    },

    moveDocumentDown(documentId) {
      const docEntries = Object.entries(this.documents).sort(
        ([, a], [, b]) => a.ui.order - b.ui.order
      );

      const currentIndex = docEntries.findIndex(([id]) => id === documentId);

      if (currentIndex < 0 || currentIndex >= docEntries.length - 1) return;

      const nextDocId = docEntries[currentIndex + 1][0];
      const currentDoc = this.documents[documentId];
      const nextDoc = this.documents[nextDocId];

      // Swap order values
      const tempOrder = currentDoc.ui.order;
      currentDoc.ui.order = nextDoc.ui.order;
      nextDoc.ui.order = tempOrder;

      // Update the actual Konva layer z-index
      if (currentDoc.konva.layer && nextDoc.konva.layer) {
        // moveDown moves the layer one level down in drawing order
        currentDoc.konva.layer.moveDown();
      }
    },

    cloneDocument(documentId) {
      const docToClone = this.documents[documentId];
      if (!docToClone) return;

      // Create a deep copy
      const clonedDoc = JSON.parse(JSON.stringify(docToClone));

      // Generate new ID
      const newId = `doc_${Date.now()}`;

      // Update properties for the clone
      clonedDoc.active = false;
      clonedDoc.ui.displayName = `${docToClone.ui.displayName} (copy)`;
      clonedDoc.ui.order =
        Math.max(...Object.values(this.documents).map((d) => d.ui.order)) + 1;
      clonedDoc.ui.menuOpen = false;

      // Add the new document
      this.documents[newId] = clonedDoc;

      return newId;
    },

    deleteDocument(documentId) {
      // Store if this was the active document
      const wasActive = this.documents[documentId].active;

      // Clean up Konva resources
      if (this.documents[documentId].konva.layer) {
        // Destroy the Konva layer to free up resources
        this.documents[documentId].konva.layer.destroy();
      }

      // Delete the document from the store
      delete this.documents[documentId];

      // If we deleted the active document and there are still documents, select another one
      if (wasActive && Object.keys(this.documents).length > 0) {
        const newActiveDocId = Object.keys(this.documents)[0];
        this.documents[newActiveDocId].active = true;
      }

      // Update order properties
      this.updateDocumentOrders();
    },

    updateDocumentOrders() {
      Object.entries(this.documents)
        .sort(([, a], [, b]) => a.ui.order - b.ui.order)
        .forEach(([id, doc], index) => {
          doc.ui.order = index + 1;
        });
    },

    renameDocument(documentId, newName) {
      if (this.documents[documentId]) {
        // Generate a unique display name to avoid duplicates
        const uniqueDisplayName = this.getUniqueDisplayName(newName);
        this.documents[documentId].ui.displayName = uniqueDisplayName;
      }
    },

    toggleDocumentSelected(documentId) {
      if (this.documents[documentId]) {
        this.documents[documentId].selected =
          !this.documents[documentId].selected;
      }
    },

    getSelectedDocuments() {
      return Object.entries(this.documents)
        .filter(([id, doc]) => doc.selected)
        .map(([id, doc]) => ({ id, ...doc }));
    },

    toggle3DVisibility(documentId) {
      if (this.documents[documentId]) {
        // Toggle the show3D property
        const show3D = !this.documents[documentId].show3D;
        this.documents[documentId].show3D = show3D;

        this.documents[documentId].threeDContent.visible = show3D;

        console.log(
          `toggle3DVisibility this.documents[documentId]:`,
          this.documents[documentId]
        );

        return show3D;
      }
      return false;
    },

    // Select or deselect a document
    selectDocument(doc_id, selected = true) {
      if (this.documents[doc_id]) {
        this.documents[doc_id].selected = selected;
      }
    },

    // Clear all documents (useful for resets and preventing duplicates)
    clearAllDocuments() {
      // Clean up Konva resources for each document
      Object.values(this.documents).forEach(doc => {
        if (doc.konva && doc.konva.layer) {
          doc.konva.layer.destroy();
        }
      });
      
      // Clear the documents object
      this.documents = {};
      
      console.log('All documents cleared from store');
    },
  },
});
