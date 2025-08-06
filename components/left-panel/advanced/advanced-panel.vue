<template>
  <div style="padding-bottom:16px">

    <!-- Dialog for ML extraction type selection -->
    <!-- <v-dialog v-model="showExtractionDialog" max-width="400" style="height:300px">
      <v-card style="border:1px solid black">
        <v-card-title>Select Extraction Type</v-card-title>
        <v-card-text style="height:80px">
          <v-row no-gutters>
            <v-checkbox v-model="extractionOptions.walls" label="Walls" density="comfortable" hide-details class="mr-2"></v-checkbox>
            <v-checkbox v-model="extractionOptions.rooms" label="Rooms" density="comfortable" hide-details></v-checkbox>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showExtractionDialog = false" variant="text">Cancel</v-btn>
          <v-btn @click="confirmExtraction" :disabled="!hasSelectedExtractionOptions">Extract</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog> -->

    <div class="actions-group-title" style="margin-top:10px;">
      <h4 class="text-subtitle-2">ML Extraction</h4>
      <v-divider></v-divider>
    </div>

    <div class="mt-n2">
      <v-row no-gutters>
        <v-checkbox v-model="extractionOptions.walls" label="Walls" density="comfortable" hide-details class="mr-2"></v-checkbox>
        <v-checkbox v-model="extractionOptions.rooms" label="Rooms" density="comfortable" hide-details class=""></v-checkbox>
      </v-row>
    </div>

    <v-row no-gutters>
      <v-btn 
        variant="outlined" 
        size="small" 
        class="mt-1 ml-1 extract-btn"
        @click="handleExtraction"
        :disabled="!hasSelectedExtractionOptions || !canExtract"
      >
        Extract
      </v-btn>
      <div v-if="isLoading">
        <v-progress-circular 
          class="ml-2 mt-0"
          indeterminate
          size="16"
          width="2"
        ></v-progress-circular>
      </div>
    </v-row>

    <!-- AI Assistant Section -->
    <div class="actions-group-title">
      <h4 class="text-subtitle-2">AI Assistant</h4>
      <v-divider></v-divider>
    </div>

    <!-- AI Assistant Button -->
    <v-btn 
      variant="outlined" 
      block
      class="mt-5 mb-3 border border-secondary"
      @click="openAIConsole"
      prepend-icon="mdi-robot"
    >
      Open Assistant
    </v-btn>        
    <!-- Checkbox to Auto-attach selected drawings -->
    <v-checkbox
      v-model="autoAttachSelected"
      label="Attach Selected"
      density="comfortable"
      hide-details
      class="mt-n2 mb-0 ml-n1"
    ></v-checkbox>
    
    <!-- Checkbox to Auto-send messages -->
    <!-- <v-checkbox
      v-model="autoSendMessage"
      label="Auto-send Messages"
      density="comfortable"
      hide-details
      class="mt-n2 mb-0 ml-n1"
    ></v-checkbox> -->    <!-- AI Action Buttons -->
    <div v-for="(group, groupIndex) in actionButtonGroups" :key="groupIndex" 
      class="d-flex flex-wrap justify-space-between" 
      :class="groupIndex > 0 ? 'mt-2' : 'mt-1'"
      style="width:200px; margin-left: -5px"
    >
      <v-btn
        v-for="(action, actionKey) in group"
        :key="actionKey"
        icon
        variant="outlined"
        tile
        color="#222"
        class="border border-secondary ai-action-btn"
        @click="executeAIAction(actionKey)"
        :title="aiPrompts[actionKey].label"
        :size="aiButtonSize"
        :disabled="aiPrompts[actionKey].disabled"
      >
        <v-icon>{{ getIconForAction(actionKey) }}</v-icon>
      </v-btn>
    </div>

    <div v-if="componentsActive">
      <div class="actions-group-title">
        <h4 class="text-subtitle-2">Components</h4>
        <v-divider></v-divider>

        <v-select :items="componentItems" label="Selected Component" density="compact" variant="outlined" class="mt-5"></v-select>

        <v-slider
          :min="1"
          :max="10"
          :step="1"
          hide-details
          class="mt-1"
        ></v-slider>

      </div>
    </div>

    
    
  </div>
</template>

<script>
import { xyToFlatPoints } from "~/lib/konva/konva-math";
import { convertSVG, formatSVG, toSvg } from "~/lib/svg";
import { useEditStore } from "~/store/edit";
import { useNotificationStore } from "~/store/notification";
import { useThreeStore } from "~/store/three-store";
import { renderWalls } from "~/lib/three";
import { addRasterImageToLayer, renderSvgInKonva, svgToKonvaObjects } from "~/lib/konva/konva";
import {centerLayer, centerLayersAsGroup} from "~/lib/konva/center-layer"
import { useKonvaStore } from "~/store/konva-store";
import { useConsoleStore } from "~/store/console-store";
import { useEventBusStore } from "~/store/event-bus";
import { aiPrompts, processPromptTemplate } from "~/lib/ai-prompts";
import Konva from "konva";

export default {  
  data() {
    return {
      aiButtonSize: 45,
      threestore: useThreeStore(),
      editStore: useEditStore(),
      notificationStore: useNotificationStore(),
      $konvaStore: useKonvaStore(),
      $consoleStore: useConsoleStore(),
      eventBus: useEventBusStore(),
      extractionOptions: {
        walls: true,
        rooms: false,
      },      
      aiPrompts,
      isLoading: false,
      showExtractionDialog: false,      
      currentFile: null,      
      aiPayload: {
        selectedPrompts: [],
        attachedImages: {},
        responseType: "vector" // Default response type
      },
      autoAttachSelected: true,
      autoSendMessage: true, // Auto-send messages when AI actions are triggered
      attachedDocuments: [], // Array to store attached documents
      componentItems: [],
      selectedComponent: "",
    };
  },
  methods: {
    // Helper method to get the appropriate icon for each action
    getIconForAction(actionKey) {
      const iconMap = {
        rasterToVector: 'mdi-vector-combine',
        removeNoise: 'mdi-broom',
        extractWalls: 'mdi-wall',
        detectRooms: 'mdi-set-square',
        furnishRooms: 'mdi-sofa',
        mergeSVGs: 'mdi-merge',
        generateImage: 'mdi-image',
        generateVideo: 'mdi-video'
      };
      return iconMap[actionKey] || 'mdi-help-circle';
    },
    // Helper method to determine document type (raster or vector)
    getDocumentType(doc) {
      if (doc.metadata?.category === 'raster') {
        return 'raster';
      }
      return 'vector'; // Default to vector if not raster
    },
    // Process template strings in prompts
    processPromptTemplate(template) {
      // Get information about selected documents/attachments
      const selectedDocs = Object.values(this.$konvaStore.documents).filter(doc => doc.selected);
      const firstDoc = selectedDocs[0];
      
      // Create a context object with variables that can be used in templates
      const context = {
        attachment: {
          count: selectedDocs.length,
          imageType: firstDoc ? (this.getDocumentType(firstDoc) === 'raster' ? 'raster image' : 'vector drawing') : 'drawing'
        }
      };
      
      // Use the imported processPromptTemplate function
      return processPromptTemplate(template, context);
    },

    removeAttachedDocument(index) {
      // Remove the document at the specified index
      this.attachedDocuments.splice(index, 1);
    },

    // confirmExtraction() {
    //   this.showExtractionDialog = false;
      
    //   if (!this.currentFile) {
    //     this.notificationStore.notify({
    //       message: "No image file selected",
    //       type: "error",
    //     });
    //     return;
    //   }
      
    //   this.handleExtraction();
    // },
    
    async handleExtraction() {
      if(this.isLoading !== true) {
        this.isLoading = true;
        try {


          const rasterDoc = this.$konvaStore.getActiveDocument();

          const extractionsToPerform = [];

          this.$konvaStore.skipStageDocumentCreation = true;
          if(this.extractionOptions.walls){
            console.log(this.$konvaStore.documents);
            extractionsToPerform.push('walls');
            await this.handleWallExtraction(rasterDoc)
          }

          if(this.extractionOptions.rooms){
            extractionsToPerform.push('rooms');
            await this.handleRoomDetection(rasterDoc)
          }

          if (extractionsToPerform.length === 0) {
            throw new Error("Please select at least one extraction option");
          }
          this.$konvaStore.skipStageDocumentCreation = false;

          if (extractionsToPerform.includes('walls') && extractionsToPerform.includes('rooms')) {
            this.notificationStore.notify({
              message: "Both walls and rooms extracted. Use the combined render option for a complete view.",
              type: "info",
            });
          }

          
          // // Set flag to prevent konva-renderer from creating duplicate documents
          // // Setting this once before any extractions begin
          //
          
          // // Create template documents for each extraction type
          // const documentIds = {};
          // for (const extractionType of extractionsToPerform) {
          //   documentIds[extractionType] = this.createTemplateDocumentForType(extractionType);
          // }
          
          // // Process wall extraction first if selected
          // if (this.extractionOptions.walls) {
          //   await this.handleWallExtraction(activeDoc);
          //   this.notificationStore.notify({
          //     message: "Wall extraction completed",
          //     type: "success",
          //   });
          // }
          
          // // Then process room extraction if selected
          // if (this.extractionOptions.rooms) {
          //   await this.handleRoomDetection(activeDoc);
          //   this.notificationStore.notify({
          //     message: "Room extraction completed",
          //     type: "success",
          //   });
          // }
          
          // // Reset the flag after all extractions are complete
          // 
          
          // // If both walls and rooms were extracted, offer to combine them
          // if (extractionsToPerform.includes('walls') && extractionsToPerform.includes('rooms')) {
          //   this.notificationStore.notify({
          //     message: "Both walls and rooms extracted. Use the combined render option for a complete view.",
          //     type: "info",
          //   });
          // }
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

    executeAIAction(actionType) {
      // Get the associated prompt config for this action
      const promptConfig = this.aiPrompts[actionType];
      const currentPrompt = this.aiPrompts[actionType];

      console.log("executeAIAction actionType:", actionType);
      console.log("executeAIAction promptConfig:", promptConfig);
      
      // Check if we have the required attachments
      if (promptConfig.requireAttach) {
        // Clear previous attachments first
        this.attachedDocuments = [];
        
        // Ensure we have selected documents
        const hasSelectedDocs = this.$konvaStore.documents && 
                           Object.values(this.$konvaStore.documents).some(doc => doc.selected);

        console.log("executeAIAction hasSelectedDocs:", hasSelectedDocs);
        
        if (!hasSelectedDocs) {
          // If no selection, try to use active document
          const activeDoc = this.$konvaStore.getActiveDocument();
          if (activeDoc) {
            this.$konvaStore.selectDocument(activeDoc.id, true);
          } else {
            this.notificationStore.notify({
              message: `Please select ${currentPrompt.attachType.join(' or ')} document(s)`,
              type: "error",
            });
            return;
          }
        }

        // Attempt to attach selected documents
        const attached = this.attachSelectedDocuments();

        let attachTypesFound = false;

        for(let doc of attached) {
          console.log("executeAIAction attached doc:", doc);

          if(promptConfig.attachType.includes(doc.category)) {
            attachTypesFound = true;
          }
        }

        console.log("executeAIAction attachTypesFound:", attachTypesFound);       
        
        if (!attachTypesFound) {
          this.notificationStore.notify({
            message: `This action requires ${currentPrompt.attachType.join(' or ')} attachment(s)`,
            type: "error",
          });
          return;
        }

      }      
      
      // Process the prompt template and replace variables
      let processedPrompt = this.processPromptTemplate(promptConfig.prompt);
      
      // Store the preferred response type
      const responseType = promptConfig.responseType;
      
      // Set the responseType in the eventBus first, before opening console
      this.eventBus.setResponseType(responseType);
      
      // Log what's being sent for debugging
      console.log(`AI Action: ${actionType} (${promptConfig.label})`);
      console.log(`Prompt: ${processedPrompt}`);
      console.log(`Response type: ${responseType}`);
      
      // Open the AI console with this action's prompt
      this.openAIConsole();
      
      // Set the prompt text in the AI console input
      this.eventBus.emit('ai-console-set-message', processedPrompt);
      
      if (this.autoSendMessage) {
        // If auto-send is enabled, send after a short delay
        setTimeout(() => {
          this.eventBus.emit('ai-console-send-message');
        }, 300);
      }
    },

    openAIConsole() {
      // Set console mode to AI
      this.$consoleStore.setMode('ai');
      
      // Use the event bus to emit the event
      this.eventBus.emit('open-console-viewport');
    }, 
    
    createTemplateDocumentForType(extractionType) {
      // Check if a document with this display name already exists
      const documentName = extractionType.charAt(0).toUpperCase() + extractionType.slice(1);
      
      // If no existing document, create a new one
      const docType = extractionType;
      const displayName = `${documentName} (Extracting...)`;
      
      const doc_id = `doc_${Object.keys(this.$konvaStore.documents).length + 1}`;
      
      // Add document to konva store
      this.$konvaStore.addDocument(doc_id, docType, {
        konva: {},
        ui: {
          displayName: displayName,
          order: 2,
          menuOpen: false,
        },
        docConfigs: {...JSON.parse(JSON.stringify(this.$konvaStore.defaultVectorConfigs))},
      });
      
      // Return the document ID so we can reference it later
      return doc_id;
    },

    async urlToBase64(url) {
      try {
        // Fetch the image
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch image');

        // Get the image as a blob
        const blob = await response.blob();

        // Convert blob to base64
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result); // Returns base64 string 
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error converting URL to base64:', error);
        return null;
      }
    },

    attachSelectedDocuments() {
      // Get selected documents from Konva store
      const selectedDocs = Object.entries(this.$konvaStore.documents)
        .filter(([id, doc]) => doc.selected)
        .map(([id, doc]) => ({
          id,
          name: doc.ui.displayName,
          svg: this.$consoleStore.getDocumentSvg(id),
          category: doc.metadata?.category || 'vector',
          imageUrl: doc.metadata?.category === 'raster' ? doc.imageUrl : null
        }));

      // Add to attachedDocuments array
      selectedDocs.forEach(doc => {
        // Check if document is already attached (avoid duplicates)
        if (!this.attachedDocuments.some(attached => attached.name === doc.name)) {
          this.attachedDocuments.push({
            name: doc.name,
            id: doc.id,
            category: doc.category,
            svgPath: doc.svg, // Add SVG content for vector documents
            imageUrl: doc.imageUrl // Add imageUrl for raster documents
          });
        }
      });

      // Process images for aiPayload
      const attachedImagesData = {};
      
      for (const doc of selectedDocs) {
        let image = null;
        attachedImagesData[doc.name] = {
          category: doc.category,
          image: image
        };
      }
      
      // Update aiPayload with attached images
      this.aiPayload.attachedImages = {
        ...this.aiPayload.attachedImages,
        ...attachedImagesData
      };
      
      return selectedDocs; // Return true if documents were attached
    },

    async handleWallExtraction(rasterDoc) {

      try {   
        // Find image objects in the layer
        const imageBlob = await fetch(rasterDoc.imageUrl).then(res => res.blob());
        const imageFile = new File([imageBlob], "image.png", { type: "image/png" });

        // Use environment variable for API endpoint
        const wallsEndpoint = useRuntimeConfig().public.apiWallsEndpoint;
        const response = await fetch(
          `${wallsEndpoint}?threshold=10`,
          {
            method: "POST",
            headers: {
              "Content-Type": "image/jpeg",
            },
            body: imageFile,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const formattedSvg = await response.text();

        console.log("formattedSvg:", formattedSvg);

        const docId = `doc_walls_${Date.now()}`

        const layer = new Konva.Layer({name: docId});
        this.$konvaStore.stage.add(layer);

        // Create a new document in the konva store
        this.$konvaStore.addDocument(docId, "Walls", {
          konva: {
            layer: layer,
          },
          metadata:{
            category: "vector",
            type: "svg",
            subtype: "path"
          },
          docConfigs: {...JSON.parse(JSON.stringify(this.$konvaStore.defaultVectorConfigs))}
        });
        const {objects} = svgToKonvaObjects(formattedSvg, docId);
        renderSvgInKonva(layer, objects);
        const svgPath = toSvg(objects, "path");
        const svgPolyline = toSvg(objects, "polyline");
        this.$konvaStore.setSvgPath(docId, svgPath);
        // this.$konvaStore.se
        this.$konvaStore.setSvgPolyline(docId, svgPolyline);
        centerLayer(layer);
        this.$konvaStore.setDocumentActive(docId);
        this.notificationStore.notify({
          message: "Walls extracted successfully",
          type: "success",
        });
      } catch (error) {
        console.error("Error extracting walls:", error);

        this.notificationStore.notify({
          message: "Failed to extract walls: " + error.message,
          type: "error",
        });
      }
    },

    async handleRoomDetection(rasterDoc) {
      try {
        // Only use uploaded file if available, don't load default image
        if (!rasterDoc && !rasterDoc.imageUrl) {
          throw new Error("Please upload an image first");
        }

        const imageBlob = await fetch(rasterDoc.imageUrl).then(res => res.blob());
        const imageFile = new File([imageBlob], "image.png", { type: "image/png" });

        // Use environment variable for API endpoint
        const roomsEndpoint = useRuntimeConfig().public.apiRoomsEndpoint;
        const response = await fetch(
          roomsEndpoint,
          {
            method: "POST",
            headers: {
              "Content-Type": "image/jpeg",
            },
            body: imageFile,
          }
        );

        if (!response.ok) {
          this.svgData = tempSvgData;
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const formattedSvg = await response.text();

        const docId = `doc_rooms_${Date.now()}`

        const layer = new Konva.Layer({name: docId});
        this.$konvaStore.stage.add(layer);

        this.$konvaStore.addDocument(docId, "Rooms", {
          konva: {
            layer: layer,
          },
          metadata:{
            category: "vector",
            type: "svg",
            subtype: "path"
          },
          docConfigs: {...JSON.parse(JSON.stringify(this.$konvaStore.defaultVectorConfigs))}
        });
        this.$konvaStore.moveDocumentUp(docId)

        const {objects} = svgToKonvaObjects(formattedSvg, docId);
        renderSvgInKonva(layer, objects);
        this.$konvaStore.setSvgPath(docId, formattedSvg);
        this.$konvaStore.setSvgPolyline(docId, convertSVG(formattedSvg, "pathToPolyline"));
        centerLayer(layer);
        this.$konvaStore.setDocumentActive(docId)

        this.notificationStore.notify({
          message: "Rooms detected successfully",
          type: "success",
        });

        this.editStore.setLeftPanelModel([1]);

        this.notificationStore.notify({
          message: "Rooms detected successfully",
          type: "success",
        });

      
      } catch (error) {
        console.error("Error detecting rooms:", error);
        
        this.notificationStore.notify({
          message: "Failed to detect rooms:" + error.message,
          type: "error",
        });
      }
    },    
    extractComponents(activeDoc) {
      const svgString = activeDoc.svgData.svgString;

      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');

      // Find all g tags with ids containing "floorplan3d"
      const floorplanComponents = Array.from(svgDoc.querySelectorAll('g[id*="floorplan3d"]'));
      
      console.log("Found floorplan3d components:", floorplanComponents.length);
      
      // Extract components by category
      const components = {
        categories: {},
        items: []
      };
      
      floorplanComponents.forEach(component => {
        const id = component.getAttribute('id');
        console.log(`Processing component: ${id}`);
        
        // If this is a category group
        if (id.startsWith('floorplan3d-components-')) {
          let categoryName = id.replace('floorplan3d-components-', '');
          categoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1)
          components.categories[categoryName] = {
            id: id,
            items: []
          };
          
          // Find all child elements with IDs
          const childElements = Array.from(component.querySelectorAll('[id]'));
          childElements.forEach(child => {
            const childId = child.getAttribute('id');
            const tagName = child.tagName;
            
            components.categories[categoryName].items.push({
              id: childId,
              type: tagName,
              element: child
            });
            
            // Add to the flat list of all items
            components.items.push({
              id: childId,
              category: categoryName,
              type: tagName,
              element: child
            });
          });
        }
      });
      
      console.log("extractComponents components:", components);

      // Update component items for display in UI
      this.componentItems = Object.keys(components.categories);

      this.selectedComponent = this.componentItems[0];
      
      // Return in case we want to use the result elsewhere
      return components;
    },
  },
  watch: {
    "activeDocument.name": {
      handler(newValue) {
        console.log("activeDocument changed:", newValue);
      },
    }
  },
  computed: {
    activeDocument() {
      // Use store from the component instance to ensure reactivity
      if (!this.$konvaStore || !this.$konvaStore.documents) {
        return null;
      }
      
      // Find the active document
      const activeDoc = Object.values(this.$konvaStore.documents).find(doc => doc && doc.active === true);
      
      // Return active doc or first doc if none is active
      if (activeDoc) {
        return activeDoc;
      } else if (Object.keys(this.$konvaStore.documents).length > 0) {
        return this.$konvaStore.documents[Object.keys(this.$konvaStore.documents)[0]];
      }
      
      return null;
    },
    hasSelectedExtractionOptions() {
      return this.extractionOptions.walls || this.extractionOptions.rooms;
    },
    canExtract() {
      const activeDoc = this.$konvaStore.getActiveDocument();
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
    componentsActive() {
      const activeDoc = this.$konvaStore.getActiveDocument();
      if (!activeDoc) return false;
      
      // If active document is a raster image (check metadata or name)
      if (activeDoc.name?.includes("Components")) {
        this.extractComponents(activeDoc);
        return true;
      }

      return false;
    },
    actionButtonGroups() {
      // Group 1: Document Analysis Actions
      const group1 = {
        rasterToVector: this.aiPrompts.rasterToVector,
        removeNoise: this.aiPrompts.removeNoise,
        extractWalls: this.aiPrompts.extractWalls,
        detectRooms: this.aiPrompts.detectRooms
      };

      // Group 2: Generation and Merging Actions
      const group2 = {
        furnishRooms: this.aiPrompts.furnishRooms,
        mergeSVGs: this.aiPrompts.mergeSVGs,
        generateImage: this.aiPrompts.generateImage,
        generateVideo: this.aiPrompts.generateVideo
      };

      return [group1, group2];
    }
  },  
  created() {
    // Listen for attached documents from the AI Console    
    this.eventBus.on('documents-attached', (attachedImagesData) => {
      // Update aiPayload with the attached images
      this.aiPayload.attachedImages = {
        ...this.aiPayload.attachedImages,
        ...attachedImagesData
      };
      
      console.log("Updated aiPayload with attached documents:", 
      JSON.stringify(Object.keys(this.aiPayload.attachedImages).map(key => ({
        name: key,
        category: this.aiPayload.attachedImages[key].category
      })), null, 2));
    });
  }
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