import { defineStore } from "pinia";

export const useConsoleStore = defineStore("consoleStore", {  state: () => ({
    mode: "ai",
    consoleOutput: "",
    documentId: null, // Add a property to store the associated document ID
    documentSvgMap: {}, // Map document IDs to their SVG content
  }),

  actions: {
    setMode(mode) {
      this.mode = mode;
    },
    setConsoleOutput(svg, documentId = null) {
      this.consoleOutput = svg;
      this.documentId = documentId; // Store the document ID associated with this SVG
      
      // If documentId is provided, store the SVG in the map
      if (documentId) {
        this.documentSvgMap[documentId] = svg;
      }
    },
    getDocumentSvg(documentId) {
      // Get SVG content for a document by ID
      return this.documentSvgMap[documentId] || this.consoleOutput;
    },
  },
});
