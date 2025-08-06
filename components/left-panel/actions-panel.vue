<template>
  <div style="">

    <v-row no-gutters align="center" justify="center">
      <v-btn 
        variant="outlined" 
        @click="clearScene"
        size="small"
        class="mr-1 px-2"
      >
        New
      </v-btn>

      <v-btn
        variant="outlined"
        @click="importFile"
        size="small"
        class="mr-1 px-2"
        >Import</v-btn
      >

      <v-btn
        @click="exportOptions.showExportDialog = true"
        variant="outlined"
        size="small"
        class="px-2"
        >Export</v-btn
      >
    </v-row>

    <v-dialog v-model="exportOptions.showExportDialog" max-width="500" style="height:350px">
      <v-card style="border:1px solid black">
        <v-card-title>Export</v-card-title>
        <v-card-text>
          <v-row no-gutters>
            <v-col class="pa-0" no-gutters>
              <p>Document Type</p>
              <v-radio-group  class="d-flex" @change="exportOptions.documentType === 'selected-doc' ? exportOptions.combinedSvg = true : exportOptions.combinedSvg = false" v-model="exportOptions.documentType" inline>
                <v-radio label="Active" value="active-doc"></v-radio>
                <v-radio label="Selected" value="selected-doc"></v-radio>
              </v-radio-group>
            </v-col>
            <v-col class="pa-0" no-gutters>
              <p>Combine SVG</p>
               <v-switch
                v-model="exportOptions.combinedSvg"
                color="blue-darken-3"
                :label="exportOptions.combinedSvg ? 'true' : 'false'"
                hide-details
                :disabled="exportOptions.documentType !== 'selected-doc'"
                class="mt-n2"
                style="width:150px"
              ></v-switch>
              <!-- <v-checkbox v-model="exportOptions.combinedSvg" density="compact" label="GLTF"></v-checkbox> -->
            </v-col>
          </v-row>
          <v-row no-gutters class="pt-5">
            <p>Export Format</p>
            <div style="height:30px;"  class="d-flex ga-4" inline>
              <v-checkbox v-model="exportOptions.exportFormats" density="compact" label="GLTF" value="gltf"></v-checkbox>
              <v-checkbox v-model="exportOptions.exportFormats" density="compact" label="OBJ" value="obj"></v-checkbox>
              <div>
                <v-checkbox hide-details="true" v-model="exportOptions.exportFormats" density="compact" label="SVG" value="svg"></v-checkbox>
                <!-- <div class="text-caption text-center cursor-pointer" :style="{ textDecoration: exportOptions.combinedSvg ? 'none' : 'line-through' }" @click="exportOptions.combinedSvg = !exportOptions.combinedSvg">
                    Combined
                </div> -->
              </div>
              <v-checkbox v-model="exportOptions.exportFormats" density="compact" label="JSON" value="json"></v-checkbox>
              <v-checkbox v-model="exportOptions.exportFormats" density="compact" label="JSON Scene" value="json-scene"></v-checkbox>
            </div>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="exportOptions.showExportDialog = false" variant="text">Cancel</v-btn>
          <v-btn @click="handleExport" :loading="exportOptions.loading" :disabled="exportOptions.loading">Export</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>


    
  </div>
</template>

<script>
import { combineSvgs, formatSVG } from "~/lib/svg";
import { useEditStore } from "~/store/edit";
import { useNotificationStore } from "~/store/notification";
import { useThreeStore } from "~/store/three-store";
import { addRasterImageToLayer, renderSvgInKonva, svgToKonvaObjects } from "~/lib/konva/konva";
import {centerLayer, centerLayersAsGroup} from "~/lib/konva/center-layer"
import { useConsoleStore } from "~/store/console-store"; // Add missing console store import
import Konva from "konva";
import JSZip from 'jszip'; 
import Floorplan3D from "~/lib/Floorplan3D";
import Floorplan3DImporter from "~/lib/Floorplan3DImporter";
import { useEventBusStore } from "~/store/event-bus";
import { cloneDeep } from 'lodash';

// Utility function for safe deep cloning
const safeDeepClone = (obj) => {
  try {
    return cloneDeep(obj);
  } catch (error) {
    console.warn('Deep clone failed, falling back to shallow copy:', error);
    return { ...obj };
  }
};


export default {
  data() {
    return {
      threestore: useThreeStore(),
      editStore: useEditStore(),
      notificationStore: useNotificationStore(),
      // Add console store reference
      consoleStore: useConsoleStore(),
      extractionOptions: {
        walls: true,
        rooms: false,
      },
      postProcessOptions: {
        simplifyWalls: false,
        mergeRooms: false,
        removeArtifacts: false,
      },
      isLoading: false, // Add loading state
      exportOptions: {
        showExportDialog: false,
        documentType: "active-doc",
        exportFormats: [],
        combinedSvg: false,
      },
      showExtractionDialog: false,
      currentFile: null, // Store the current file being processed
    };
  },  
  // created() {
  //   // Only auto-import file on initial page load, not during HMR
  //   if ((!import.meta.hot || !import.meta.hot.data.hasAutoImported) && useRuntimeConfig().public.developmentMode === 'none') {
  //     setTimeout(() => {
  //       this.autoImportFilePath = '/inkscape-samples/FP3D-00-05-caleb.svg';
  //       // this.autoImportFilePath = '/inkscape-samples/FP3D-06-01-caleb.svg';
  //       this.importFile();
  //       // Mark that we've auto-imported to avoid reimporting during HMR
  //       if (import.meta.hot) {
  //         import.meta.hot.data.hasAutoImported = true;
  //       }
  //     }, 1000);
  //   }
  // },
  methods: {
    async importFile() {
      try {
        const importer = new Floorplan3D(null, null, null);

        let importedData;
        
        // // Handle predefined file path
        // if (this.autoImportFilePath) {
        //   const predefinedFilePath = this.autoImportFilePath;
        //   // Fetch the SVG file from the public path
        //   const response = await fetch(predefinedFilePath);
        //   if (!response.ok) {
        //     throw new Error(`Failed to load file from ${predefinedFilePath}`);
        //   }
        //   const svgContent = await response.text();
        //   // Import the SVG directly
        //   importedData = await importer.importSvg(svgContent);
        //   // Add a File object representation for compatibility with existing code
        //   importedData.file = new File([svgContent], predefinedFilePath.split('/').pop(), { type: "image/svg+xml" });
        //   importedData.type = "svg";
        // } 
        // else {
        //   // Use the normal file picker if no path is provided
          importedData = await importer.importFile();        // }    
        
        // Create a proper copy of the file object to avoid shared references
        if (importedData.file) {
          importedData.file = new File([importedData.file], importedData.file.name, { 
            type: importedData.file.type,
            lastModified: importedData.file.lastModified
          });
        }
        
        // handle svg upload
        if(importedData.type === "svg"){
          const svgContent = await importedData.file.text();
         
          let layersToCenter = [];            
          // Create a deep copy of vector documents and sort them
          const vectorDocsCopy = safeDeepClone(importedData.vectorDocuments);
          const sortedVectorDocs = vectorDocsCopy.sort((a, b) => {
            // Rooms should come first
            if (a.name.toLowerCase().includes('room') && !b.name.toLowerCase().includes('room')) return -1;
            if (!a.name.toLowerCase().includes('room') && b.name.toLowerCase().includes('room')) return 1;
            // Walls should come second
            if (a.name.toLowerCase().includes('wall') && !b.name.toLowerCase().includes('wall')) return -1;
            if (!a.name.toLowerCase().includes('wall') && b.name.toLowerCase().includes('wall')) return 1;
            return 0;
          });

          // Process raster documents last with highest order
          // Create a deep copy of raster documents to avoid reference issues          
          const rasterDocsCopy = safeDeepClone(importedData.rasterDocuments);
          for (const doc of rasterDocsCopy) {
            if (doc && doc.imageFile) {
              console.log("Processing raster doc:", doc.name);
              
              // Create a fresh copy of the image file
              const imageFileCopy = new File([doc.imageFile], doc.imageFile.name, {
                type: doc.imageFile.type,
                lastModified: doc.imageFile.lastModified
              });
              
              this.editStore.setUploadedImage(imageFileCopy);
              // Create a deep copy of the metadata to prevent shared references              
              const metadataCopy = safeDeepClone(doc.metadata || {});
              
              const docId = this.addBase64ImageToLayer(
                imageFileCopy,
                this.$konvaStore.baseLayer,
                this.$konvaStore,
                {
                  ...metadataCopy,
                  order: 3 // Raster gets highest order (appears last)
                }
              );
              
              if (docId) {
                if (this.$konvaStore.documents[docId]) {
                  this.$konvaStore.renameDocument(docId, doc.name);
                  const doc = this.$konvaStore.documents[docId];                  
                  if (doc) {
                    // Create a new metadata object instead of modifying the existing one
                    const newMetadata = {
                      ...(doc.metadata || {}),
                      source: 'inkscape',
                      originalId: doc.metadata?.originalId,                      
                      dimensions: safeDeepClone(doc.metadata?.dimensions || {}),
                      svgDimensions: safeDeepClone(doc.metadata?.svgDimensions || {})
                    };
                    
                    // Update the document with the new metadata object
                    this.$konvaStore.updateDocument(docId, {
                      metadata: newMetadata,
                      ui: {
                        ...(doc.ui || {}),
                        order: 3 // Ensure raster documents have highest order
                      }
                    });
                    
                    if (doc.konva && doc.konva.layer) {
                      layersToCenter.push(doc.konva.layer);
                    }
                  }
                }
              }
            }
          }

          // Process vector documents first (rooms and walls)
          for (let doc of sortedVectorDocs) {
            const layerKonva = new Konva.Group({ name: doc.id, type: "vector-layer" });
            this.$konvaStore.baseLayer.add(layerKonva);
            layersToCenter.push(layerKonva);
            
            // Assign order based on document type
            let order = 2; // Default order
            if (doc.name.toLowerCase().includes('room')) {
              order = 1; // Rooms get lowest order (appear first)
            } else if (doc.name.toLowerCase().includes('wall')) {
              order = 2; // Walls get middle order
            }
            // Create a proper deep copy with independent properties            
            const docCopy = safeDeepClone(doc);
            
            // Add the new layer and order properties with clean references
            this.$konvaStore.addDocument(doc.id, doc.name, {
              ...docCopy,
              konva: {
                ...docCopy.konva,
                layer: layerKonva
              },
              ui: {
                ...docCopy.ui,
                order: order
              }
            });

            // Use svgPath directly without unnecessary deep cloning
            const {objects} = svgToKonvaObjects(doc.svgPath, doc.id);
            this.$konvaStore.setKonvaObjects(doc.id, objects);
            renderSvgInKonva(layerKonva, objects, this.$konvaStore.baseLayer);
          } 

          setTimeout(() => {
            // Sequentially set each vector document as active, to trigger renderSvgToScene
            for(let docKey in this.$konvaStore.documents) {
              let doc = this.$konvaStore.documents[docKey];
              if(doc.metadata.category === "vector") {
                setTimeout(() => {
                  this.$konvaStore.setDocumentActive(doc.id);
                }, 5)
              }
            }          
          }, 100);

          if (layersToCenter.length > 0) {
            const viewBox = this.extractViewBox(svgContent);
            centerLayersAsGroup(layersToCenter, viewBox);
            this.stageZoomToFit();
          }      

        }        
        // // handle json scene upload
        if(importedData.type.includes("json")){
          // Create a proper deep copy of the JSON data          
          const jsonScene = safeDeepClone(importedData.json);
          await importer.renderImported(this.threestore.scene, jsonScene, "json");
        }
        // handle gltf scene upload
        if(importedData.type === "gltf"){          
          // Use safe deep clone for complex object structures
          const gltfScene = safeDeepClone(await importedData.gltf);
          await importer.renderImported(this.threestore.scene, gltfScene, "gltf");
        }


        // handle obj scene upload
        if(importedData.type === "obj"){          
          // Use safe deep clone for complex object structures
          const objScene = safeDeepClone(await importedData.obj);
          await importer.renderImported(this.threestore.scene, objScene, "obj");
        } 
        // handle raster image upload
        if(importedData.type.includes("jpeg") || importedData.type.includes("jpg") || importedData.type.includes("png")){
          // Create a proper copy of the file object to avoid shared references
          this.currentFile = new File([importedData.file], importedData.file.name, { 
            type: importedData.file.type,
            lastModified: importedData.file.lastModified
          });
          if (this.$konvaStore.stage) {
            // Pass a fresh copy of the file to avoid reference issues
            const fileCopy = new File([importedData.file], importedData.file.name, {
              type: importedData.file.type,
              lastModified: importedData.file.lastModified
            });
            const docId = addRasterImageToLayer(fileCopy, this.$konvaStore.stage, this.$konvaStore);
            
            if (docId) {
              this.notificationStore.notify({
                  message: "Raster image imported successfully",
                  type: "success",
              });
            }
          }
          this.showExtractionDialog = true;

          console.log("addRasterImageToLayer finished");
        } 

        }catch(error){
          console.error("Error importing file:", error);
          this.notificationStore.notify({
            message: `Failed to import file: ${error.message}`,
            type: "error",
          });
        }
        
    },

    extractViewBox(svgContent) {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

      const svgElement = svgDoc.querySelector('svg');
      let viewBox = svgElement.getAttribute('viewBox');

      viewBox = viewBox.split(' ');

      viewBox = {
        width: viewBox[2],
        height: viewBox[3]
      }

      return viewBox;
    },
    
    async confirmExtraction() {
      this.showExtractionDialog = false;
      
      if (!this.currentFile) {
        this.notificationStore.notify({
          message: "No image file selected",
          type: "error",
        });
        return;
      }
      
      this.handleExtraction();
    },
    
    async handleExtraction() {
      if(this.isLoading !== true) {
        this.isLoading = true;
        try {
          const extractionsToPerform = [];
          
          // Collect which extractions to perform
          if (this.extractionOptions.walls) {
            extractionsToPerform.push('walls');
          }
          
          if (this.extractionOptions.rooms) {
            extractionsToPerform.push('rooms');
          }
          
          if (extractionsToPerform.length === 0) {
            throw new Error("Please select at least one extraction option");
          }
          
          // Set flag to prevent konva-renderer from creating duplicate documents
          // Setting this once before any extractions begin
          this.$konvaStore.skipStageDocumentCreation = true;
          
          // Create template documents for each extraction type
          const documentIds = {};
          for (const extractionType of extractionsToPerform) {
            documentIds[extractionType] = this.createTemplateDocumentForType(extractionType);
          }
          
          // Process wall extraction first if selected
          if (this.extractionOptions.walls) {
            await this.handleWallExtraction(documentIds.walls);
            this.notificationStore.notify({
              message: "Wall extraction completed",
              type: "success",
            });
          }
          
          // Then process room extraction if selected
          if (this.extractionOptions.rooms) {
            await this.handleRoomDetection(documentIds.rooms);
            this.notificationStore.notify({
              message: "Room extraction completed",
              type: "success",
            });
          }
          
          // Reset the flag after all extractions are complete
          this.$konvaStore.skipStageDocumentCreation = false;
          
          // If both walls and rooms were extracted, offer to combine them
          if (extractionsToPerform.includes('walls') && extractionsToPerform.includes('rooms')) {
            this.notificationStore.notify({
              message: "Both walls and rooms extracted. Use the combined render option for a complete view.",
              type: "info",
            });
          }
        } catch (error) {
          console.error("Error during extraction:", error);
          this.notificationStore.notify({
            message: error.message,
            type: "error",
          });
        } finally {
          // Make sure to reset the flag even if there was an error
          this.$konvaStore.skipStageDocumentCreation = false;
          this.isLoading = false;
        }
      }
    },
    
    createTemplateDocumentForType(extractionType) {
      // Check if a document with this display name already exists
      const documentName = extractionType.charAt(0).toUpperCase() + extractionType.slice(1);
      const existingDoc = Object.values(this.$konvaStore.documents).find(
        doc => doc.ui.displayName === documentName || 
               doc.ui.displayName === `${documentName} (Extracting...)` ||
               doc.name === extractionType
      );
      
      // If a document already exists, either return its ID or update it
      if (existingDoc) {
        console.log(`Document for ${extractionType} already exists, using existing document`);
        
        // Get the document ID
        const doc_id = Object.keys(this.$konvaStore.documents).find(
          id => this.$konvaStore.documents[id] === existingDoc
        );
        
        // Update the document name to show it's extracting
        if (!existingDoc.ui.displayName.includes("Extracting")) {
          this.$konvaStore.renameDocument(doc_id, `${documentName} (Extracting...)`);
        }
        
        // Clear any existing content in the layer
        if (existingDoc.konva && existingDoc.konva.layer) {
          existingDoc.konva.layer.destroyChildren();
          
          // Add a loading text to the layer
          const loadingText = new Konva.Text({
            x: 50,
            y: 50,
            text: `Extracting ${extractionType}...`,
            fontSize: 16,
            fill: '#999999',
          });
          existingDoc.konva.layer.add(loadingText);
          const baseLayer = existingDoc.konva.layer.getParent();
          baseLayer.batchDraw();
        }
        
        // Set this document as active
        this.$konvaStore.setDocumentActive(doc_id);
        
        return doc_id;
      }
      
      // If no existing document, create a new one
      const docType = extractionType;
      const displayName = `${documentName} (Extracting...)`;
      
      const doc_id = `doc_${Object.keys(this.$konvaStore.documents).length + 1}`;
      const templateLayer = new Konva.Layer({ name: docType });
      
      // Add a loading text to the layer
      const loadingText = new Konva.Text({
        x: 50,
        y: 50,
        text: `Extracting ${docType}...`,
        fontSize: 16,
        fill: '#999999',
      });
      templateLayer.add(loadingText);
      
      // Add the layer to the stage
      this.$konvaStore.stage.add(templateLayer);
      
      // Add document to konva store
      this.$konvaStore.addDocument(doc_id, docType, {
        konva: {
          layer: templateLayer
        },
        ui: {
          displayName: displayName,
          order: 2,
          menuOpen: false,
        },
        docConfigs: {...JSON.parse(JSON.stringify(this.$konvaStore.defaultVectorConfigs))}
      });
      
      // Set this document as active
      this.$konvaStore.setDocumentActive(doc_id);
      
      // Return the document ID so we can reference it later
      return doc_id;
    },
    

    async handleWallExtraction(docId) {
      try {
        // Only use uploaded file if available, don't load default image
        if (!this.editStore.uploadedImage && !this.currentFile) {
          throw new Error("Please upload an image first");
        }
        
        const fileToUse = this.currentFile || this.editStore.uploadedImage;

        // Use environment variable for API endpoint
        const wallsEndpoint = useRuntimeConfig().public.apiWallsEndpoint;
        const response = await fetch(
          `${wallsEndpoint}?threshold=10`,
          {
            method: "POST",
            headers: {
              "Content-Type": "image/jpeg",
            },
            body: fileToUse,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const svgContent = await response.text();
        const formattedSvg = formatSVG(svgContent);
        // this.$konvaStore.setWallsSVG(formattedSvg);
        this.$consoleStore.setConsoleOutput(formattedSvg, docId);
        
        // Update the template document with actual data if docId was provided
        if (docId && this.$konvaStore.documents[docId]) {
          // Clear the template layer
          const doc = this.$konvaStore.documents[docId];
          doc.konva.layer.destroyChildren();
          
          // Update the document name
          this.$konvaStore.renameDocument(docId, "Walls");
          
          // Convert SVG to Konva objects and render
          const {objects, transformObject} = svgToKonvaObjects(formattedSvg, docId);
          this.$konvaStore.setKonvaObjects(docId, objects);
          renderSvgInKonva(doc.konva.layer, objects, this.$konvaStore.baseLayer);
          centerLayer(doc.konva.layer);
        }
        
        this.editStore.setOutputStage(1);
        this.notificationStore.notify({
          message: "Walls extracted successfully",
          type: "success",
        });
      } catch (error) {
        console.error("Error extracting walls:", error);
        
        // Update the template document to show error
        if (docId && this.$konvaStore.documents[docId]) {
          const doc = this.$konvaStore.documents[docId];
          doc.konva.layer.destroyChildren();
          
          const errorText = new Konva.Text({
            x: 50,
            y: 50,
            text: `Error: ${error.message}`,
            fontSize: 16,
            fill: '#ff0000',
          });
          doc.konva.layer.add(errorText);
          doc.konva.layer.batchDraw();
          
          this.$konvaStore.renameDocument(docId, "Walls (Error)");
        }
        
        this.notificationStore.notify({
          message: "Failed to extract walls: " + error.message,
          type: "error",
        });
      }
    },
    
    async handleRoomDetection(docId) {
      try {
        // Only use uploaded file if available, don't load default image
        if (!this.editStore.uploadedImage && !this.currentFile) {
          throw new Error("Please upload an image first");
        }

        const fileToUse = this.currentFile || this.editStore.uploadedImage;
        const tempSvgData = this.svgData;

        // Use environment variable for API endpoint
        const roomsEndpoint = useRuntimeConfig().public.apiRoomsEndpoint;
        const response = await fetch(
          roomsEndpoint,
          {
            method: "POST",
            headers: {
              "Content-Type": "image/jpeg",
            },
            body: fileToUse,
          }
        );

        if (!response.ok) {
          this.svgData = tempSvgData;
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get and format the SVG content
        const content = await response.text();
        const formattedSvg = formatSVG(content);
        // this.$konvaStore.setRoomsSVG(formattedSvg);
        this.$consoleStore.setConsoleOutput(formattedSvg, docId);
        
        // Update the template document with actual data if docId was provided
        if (docId && this.$konvaStore.documents[docId]) {
          // Clear the template layer
          const doc = this.$konvaStore.documents[docId];
          doc.konva.layer.destroyChildren();
          
          // Update the document name
          this.$konvaStore.renameDocument(docId, "Rooms");
          
          // Convert SVG to Konva objects and render
          const {objects} = svgToKonvaObjects(formattedSvg, docId);
          this.$konvaStore.setKonvaObjects(docId, objects);
          renderSvgInKonva(doc.konva.layer, objects, this.$konvaStore.baseLayer);
          centerLayer(doc.konva.layer);
        }
        
        this.editStore.setOutputStage(2);
        this.editStore.setLeftPanelModel([1]);
        this.notificationStore.notify({
          message: "Rooms detected successfully",
          type: "success",
        });
      } catch (error) {
        console.error("Error detecting rooms:", error);
        
        // Update the template document to show error
        if (docId && this.$konvaStore.documents[docId]) {
          const doc = this.$konvaStore.documents[docId];
          doc.konva.layer.destroyChildren();
          
          const errorText = new Konva.Text({
            x: 50,
            y: 50,
            text: `Error: ${error.message}`,
            fontSize: 16,
            fill: '#ff0000',
          });
          doc.konva.layer.add(errorText);
          doc.konva.layer.batchDraw();
          
          this.$konvaStore.renameDocument(docId, "Rooms (Error)");
        }
        
        this.notificationStore.notify({
          message: "Failed to detect rooms:" + error.message,
          type: "error",
        });
      }
    },
    
    downloadSvg(svg, fileName) {
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    executePostProcess() {
      // Implement the logic for executing post-process options here
    },    
    clearScene() {
      if(Object.keys(this.$konvaStore.documents).length === 0) {
        return;
      }

      // Clear Three.js content group
      if (this.threestore.scene) {
        const contentGroup = this.threestore.scene.getObjectByName("contentGroup");
        this.threestore.floorplan3d.clearScene(contentGroup);
      }

      // Reset output stage to 1 (walls view)
      // this.editStore.setOutputStage(1);

      // Clear console output
      this.$consoleStore.setConsoleOutput("");

      this.$konvaStore.documents = [];

      // Use the konva-renderer's resetKonva method.
      this.$eventBus.emit('resetKonva');
      
    },

    addBase64ImageToLayer(imageFile, stage, konvaStore, metadata = null) {
      if (!imageFile || !stage || !konvaStore) return null;
      
      // Create a new document ID
      const doc_id = `doc_${Object.keys(konvaStore.documents).length + 1}`;
      
      // Create a new layer for the image
      const imageLayer = new Konva.Group({ name: "rasterImage" });
      this.$konvaStore.baseLayer.add(imageLayer);
      
      // Create a new image URL
      const imageUrl = URL.createObjectURL(imageFile);
      
      // Load the image
      const image = new Image();
      image.onload = () => {
        // Create a Konva image object
        const konvaImage = new Konva.Image({
          x: 0,
          y: 0,
          image: image,
          width: image.width,
          height: image.height,
        });
        
        // Add the image to the layer
        imageLayer.add(konvaImage);
        
        // Scale and center the image in the viewport
        const stageWidth = stage.width();
        const stageHeight = stage.height();
        
        let displayScale, x, y;
        
        // If metadata with dimensions is provided, use those values for proper scaling
        if (metadata && metadata.dimensions) {
          const imgDimensions = metadata.dimensions;
          const svgDimensions = metadata.svgDimensions;
          
          // If we have both image and SVG dimensions, we can calculate the proper scale
          if (imgDimensions.width && imgDimensions.height && svgDimensions && svgDimensions.width && svgDimensions.height) {
            
            // Use the original image position from the SVG
            x = imgDimensions.x || 0;
            y = imgDimensions.y || 0;
            
            // Use the dimensions specified in the SVG image tag
            konvaImage.width(imgDimensions.width);
            konvaImage.height(imgDimensions.height);
            
            // Scale to match the image dimensions from SVG
            displayScale = 1;
          } else {
            // If incomplete dimension info, fall back to default scaling
            displayScale = 1;
            
            // Calculate centered position
            x = (stageWidth - image.width * displayScale) / 2;
            y = (stageHeight - image.height * displayScale) / 2;
          }
        } else {
          // Default scaling and positioning without metadata
          displayScale = Math.min(
            stageWidth / image.width, 
            stageHeight / image.height
          ) * 1;
          
          // Calculate centered position
          x = (stageWidth - image.width * displayScale);
          y = (stageHeight - image.height * displayScale);
        }
        
        // Scale the image for display
        konvaImage.scale({ x: displayScale, y: displayScale });
        
        // Position the image
        konvaImage.position({ 
          x: (stageWidth / 2) - (metadata.dimensions.width / 2),
          y: (stageHeight / 2) - (metadata.dimensions.height / 2)
        });
        
        // Add the document to konva store
        konvaStore.addDocument(doc_id, "Raster Image", {
          konva: {
            layer: imageLayer,
            image: konvaImage,
          },
          imageUrl: imageUrl,
          metadata: {
            category: 'raster',
            type: 'image',
            filename: imageFile.name,
            ...(metadata || {})  // Include any metadata passed in
          },
          docConfigs: {
            layer: {
              opacity: {
                min: 0,
                max: 1,
                step: 0.1,
                value: 1,
                default: 1
              },
              scale: {
                min: 0.1,
                max: 5,
                step: 0.1,
                value: displayScale, // Use the calculated display scale
                default: displayScale
              },
              pos: {
                x: {
                  min: -1000,
                  max: 1000,
                  value: x,
                  default: 0
                },
                y: {
                  min: -1000,
                  max: 1000,
                  value: y,
                  default: 0
                }
              }
            }
          }
        });

        let base64 = null;
        const reader = new FileReader();
        reader.onload = (e) => {
          base64 = e.target.result;
          // Create SVG with the proper dimensions from metadata if available
          const imgWidth = metadata?.dimensions?.width || image.width;
          const imgHeight = metadata?.dimensions?.height || image.height;
          
          const svg = `<svg height="${imgHeight}" width="${imgWidth}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <image xlink:href="${base64}" width="${imgWidth}" height="${imgHeight}" /></svg>`;
          konvaStore.setSvgPolyline(doc_id, svg) 
          konvaStore.setSvgPath(doc_id, svg) 
        };
        reader.readAsDataURL(imageFile);
        
        // Draw the layer
        this.$konvaStore.baseLayer.batchDraw();

        console.log("addBase64ImageToLayer finished");
      };
      
      image.src = imageUrl;
  

      return doc_id;

  
    },

  
    
    /**
     * Converts base64 data to a File object
     * @param {string} base64Data - Base64 encoded data
     * @param {string} filename - Filename to use for the File
     * @returns {Promise<File>} - A File object created from the base64 data
     */
    async fetchBase64AsFile(base64Data, filename) {
      try {
        // Check if the base64Data has a valid format
        if (!base64Data || typeof base64Data !== 'string') {
          console.error('Invalid base64 data provided');
          return null;
        }
        
        // Determine content type from base64 header
        let contentType = 'image/jpeg'; // Default to JPEG
        if (base64Data.startsWith('data:')) {
          contentType = base64Data.split(';')[0].split(':')[1];
        }
        
        // If base64 has data:image format, remove the header
        let base64Content = base64Data;
        if (base64Data.includes('base64,')) {
          base64Content = base64Data.split('base64,')[1];
        }
        
        // Use a more efficient approach for larger files
        // This avoids creating intermediate arrays and reduces memory usage
        try {
          // Use fetch API with Blob directly - much faster for large files
          const response = await fetch(base64Data);
          if (response.ok) {
            const blob = await response.blob();
            return new File([blob], filename, { type: contentType });
          }
        } catch (e) {
          // Fallback to manual conversion if fetch approach fails
          console.log('Falling back to manual base64 conversion');
        }
        
        // Fallback to the original approach if needed
        const byteCharacters = atob(base64Content);
        
        // Process in larger chunks to improve performance
        const chunkSize = 8192; // Increased from 512 to 8192 bytes
        const byteArrays = [];
        
        for (let offset = 0; offset < byteCharacters.length; offset += chunkSize) {
          const slice = byteCharacters.slice(offset, Math.min(offset + chunkSize, byteCharacters.length));
          
          // Use a more efficient typed array approach
          const byteNumbers = new Uint8Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          
          byteArrays.push(byteNumbers);
        }
        
        // Create a Blob from the binary data
        const blob = new Blob(byteArrays, { type: contentType });
        
        // Create a File from the Blob
        return new File([blob], filename, { type: contentType });
      } catch (error) {
        console.error('Error converting base64 to file:', error);
        return null;
      }
    },

    async handleExport() {
      const activeDoc = this.$konvaStore?.getActiveDocument()
      if(!Object.keys(this.$konvaStore.documents).length ||  !activeDoc) return this.$notification.notify({
        message: "No document found",
        type: "error",
      })
  
      this.exportOptions.showExportDialog = true;

      let documentsToExport = [];
      if(this.exportOptions.documentType === "active-doc"){
        documentsToExport.push(activeDoc);
      }
      if(this.exportOptions.documentType === "selected-doc"){
        documentsToExport = this.$konvaStore?.getSelectedDocuments();
      }

      const exportFormats = this.exportOptions.exportFormats;

      if(!exportFormats.length) return this.$notification.notify({
        message: "No export formats selected",
        type: "info",
      })

      this.exportOptions.loading = true;
      const zip = new JSZip();
      const fileSet = [];

      try {
        // Process each document
        for (const doc of documentsToExport) {
          try {
            const exporter = new Floorplan3D(null, null, null, doc);
            const exportedFiles = await exporter.export(exportFormats);
            if (exportedFiles && exportedFiles.length > 0) {
              fileSet.push({
                files: exportedFiles,
                doc: doc.name || doc.ui?.displayName || 'unnamed-document'
              });
            } else {
              console.warn(`No files exported for document: ${doc.name || doc.ui?.displayName}`);
            }
            
          } catch (docError) {
            console.error(`Error exporting document ${doc.name || doc.ui?.displayName}:`, docError);
            this.$notification.notify({
              message: `Failed to export ${doc.name || doc.ui?.displayName}: ${docError.message}`,
              type: "error",
            });
          }
        }

        if(this.exportOptions.combinedSvg){
          let pathSvgs = [];
          let polyLineSvgs= [];
          for(const doc of documentsToExport){
            pathSvgs.push(doc.svgPath)
            polyLineSvgs.push(doc.svgPolyline);
          } 
          
          const combinedPathSvg =  combineSvgs(pathSvgs, 'path');
          const combinePolylineSvg =  combineSvgs(polyLineSvgs, 'polyline');
          // make this two svgs blob
          const combinedPathSvgBlob = new Blob([combinedPathSvg], { type: 'image/svg+xml' });
          const combinePolylineSvgBlob = new Blob([combinePolylineSvg], { type: 'image/svg+xml' });
          fileSet.push({
            files: [{filename: 'combined-path.svg', blob: combinedPathSvgBlob}, {filename: 'combined-polyline.svg', blob: combinePolylineSvgBlob}],
            doc: 'combined'
          });
        }

        // Only proceed with zip creation if we have files
        if (fileSet.length > 0) {
          // Add all files to zip
          for (const fileObject of fileSet) {
            const folder = zip.folder(fileObject.doc);
            for (const file of fileObject.files) {
              if (file && file.blob) {
                folder.file(file.filename, file.blob);
              } else {
                console.warn('Invalid file object:', file);
              }
            }
          }

          // Generate and download zip
          const zipBlob = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(zipBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'floorplan3d-export.zip';
          link.click();
          URL.revokeObjectURL(url);

          this.$notification.notify({
            message: "Export completed successfully",
            type: "success",
          });
        } else {
          this.$notification.notify({
            message: "No files were exported",
            type: "warning",
          });
        }
      } catch (error) {
        console.error('Error during export:', error);
        this.$notification.notify({
          message: `Export failed: ${error.message}`,
          type: "error",
        });
      } finally {
        this.exportOptions.loading = false;
        this.exportOptions.showExportDialog = false;
      }
    },

    /**
     * Zooms the stage to fit all visible content
     * This method should be called after centerLayersAsGroup for best results
     */
    stageZoomToFit() {
      if (!this.$konvaStore.stage) return;
      
      const stage = this.$konvaStore.stage;
      
      // Get stage dimensions
      const stageWidth = stage.width();
      const stageHeight = stage.height();
      
      // Calculate the bounding box that encompasses all visible layers
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;
      
      // Only consider visible layers
      const visibleLayers = stage.getLayers().filter(layer => 
        layer.visible() && 
        layer !== this.$konvaStore.selectionLayer && 
        layer !== this.$konvaStore.gridLayer
      );
      
      visibleLayers.forEach(layer => {
        const box = layer.getClientRect();
        if (box && box.width > 0 && box.height > 0) {
          minX = Math.min(minX, box.x);
          minY = Math.min(minY, box.y);
          maxX = Math.max(maxX, box.x + box.width);
          maxY = Math.max(maxY, box.y + box.height);
        }
      });
      
      // If we couldn't find valid bounds, exit
      if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
        return;
      }
      
      // Calculate dimensions of the combined content
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      
      // Calculate the scale needed to fit all content with padding
      const paddingFactor = 1; // 10% padding
      const scaleX = (stageWidth / contentWidth) * paddingFactor;
      const scaleY = (stageHeight / contentHeight) * paddingFactor;
      const scale = Math.min(scaleX, scaleY);
      
      // Don't zoom in too much for small content
      const maxScale = 4;
      const finalScale = Math.min(scale, maxScale);
      
      // Calculate content center
      const contentCenterX = minX + contentWidth / 2;
      const contentCenterY = minY + contentHeight / 2;
      
      // Stage center
      const stageCenterX = stageWidth / 2;
      const stageCenterY = stageHeight / 2;
      
      // Apply zoom transformation to the stage
      stage.scale({ x: finalScale, y: finalScale });
      
      // Calculate the position to center the content
      const newX = stageCenterX - contentCenterX * finalScale;
      const newY = stageCenterY - contentCenterY * finalScale;
      
      // Apply the position
      stage.position({ x: newX, y: newY });
      
      // Redraw the stage
      stage.batchDraw();
    },
  },
  computed: {
    $eventBus() {
      return useEventBusStore();
    },
    // canBeCombined() {
    //   if (this.$konvaStore.wallsSVG && this.$konvaStore.roomsSVG) {
    //     return true;
    //   } else return false;
    // },
    hasSelectedExtractionOptions() {
      return this.extractionOptions.walls || this.extractionOptions.rooms;
    },
    hasSelectedPostProcessOptions() {
      return (
        this.postProcessOptions.simplifyWalls ||
        this.postProcessOptions.mergeRooms ||
        this.postProcessOptions.removeArtifacts
      );
    },
    canExtract() {
      // Check if there's an active document that's a raster image
      const activeDoc = this.$konvaStore?.getActiveDocument();
      
      // If no active document exists, don't allow extraction
      if (!activeDoc) return false;
      
      // If active document is a raster image (check metadata or name)
      if (activeDoc.metadata?.category === 'raster' || 
          activeDoc.name === 'rasterImage' ||
          (activeDoc.ui?.displayName && activeDoc.ui.displayName.includes('Raster'))) {
        return true;
      }
      
      // For backward compatibility, allow extraction if current file is set
      return !!this.currentFile;
    },
  },
};
</script>

<style scoped>
.actions-group-title {
  margin-top:24px;
  margin-bottom:14px;
}

.extract-btn {
  min-width: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

<style>
.expansion-panel-wrapper .v-expansion-panel-text__wrapper {
  padding: 0 !important;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
</style>
