<template>
  <div class="chat-window d-flex flex-column">
    <!-- Messages Area -->
    <div class="messages-container flex-grow-1">
      <div class="messages pa-4" ref="messagesContainer">
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="message mb-4"
          :class="message.sender === 'ai' ? 'ai-message' : 'user-message'"
        >
          <div class="message-wrapper">
            <div class="d-flex">
              <v-avatar size="30px" color="blue" class="mt-2">
                <span class="text-caption">{{
                  message.sender === "ai" ? "AI" : "You"
                }}</span>
              </v-avatar>                
              <div class="message-content pt-3 px-3">
                <div class="formatted-text" v-html="parseMarkdown(message.text)">
                </div>
                <!-- API Response Button for previous user message -->
                <div v-if="index > 0 && messages[index-1].apiResponse" class="d-flex align-center justify-space-between mb-2">
                  <v-btn 
                    size="x-small" 
                    variant="tonal" 
                    color="info" 
                    @click="showApiResponseDetails(messages[index-1].apiResponse)"
                  >
                    View API Details
                  </v-btn>
                </div>
                <!-- Display SVG or Image if available in AI message -->
                <div v-if="message.sender === 'ai' && message.responseData">                  <!-- Display SVG content -->
                  <div v-if="message.responseData.image && message.responseData.image.startsWith('<svg')" class="mt-0">
                    <div class="response-svg-container">
                      <svg-viewer :svg-content="message.responseData.image" height="300px"></svg-viewer>
                    </div>
                  </div>
                  
                  <!-- Display raster image content -->
                  <div v-else-if="message.responseData.image && (message.responseData.image.startsWith('data:image/png') || message.responseData.image.startsWith('data:image/jpeg'))" class="mt-0">
                    <div class="response-image-container">
                      <img :src="message.responseData.image" style="max-width: 100%; max-height: 300px;" />
                    </div>
                  </div>
                </div>
                
                <!-- Attachment indicators -->
                <div v-if="message.attachments && message.attachments.length > 0" class="message-attachments mt-2">
                  <div class="d-flex flex-wrap">
                    <v-chip
                      v-for="(attachment, attIdx) in message.attachments"
                      :key="attIdx"
                      size="x-small"
                      class="mr-1 mb-1 attachment-chip"
                      variant="outlined"
                    >
                      <v-icon start size="x-small">{{ attachment.category === 'vector' ? 'mdi-vector-square' : 'mdi-image' }}</v-icon>
                      {{ attachment.name }}
                    </v-chip>
                  </div>
                </div>
              </div>
            </div>
            <!-- <div v-if="message.sender === 'ai' && message.svg" class="code">
              <SvgViewer :svg="message.svg" class="svg-container" />
            </div> -->
          </div>
        </div>
      </div>
    </div>    
    <!-- API Response Dialog -->
    <v-dialog v-model="showResponseDialog" max-width="800px">
      <v-card>
        <v-card-title class="headline d-flex align-center position-relative">
          AI Response Details
          <v-spacer></v-spacer>
          <v-btn icon @click="showResponseDialog = false" class="close-btn" variant="text" size="small">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>        
        <v-card-text v-if="currentApiResponse">
          <v-tabs v-model="currentApiTab">
            <v-tab value="request">Request</v-tab>
            <v-tab value="response">Response</v-tab>
          </v-tabs>
          <v-window v-model="currentApiTab">
            <v-window-item value="request">
              <v-card flat>
                <v-card-text>
                  <pre class="response-code">{{ JSON.stringify(currentApiResponse.request, null, 2) }}</pre>
                </v-card-text>
              </v-card>
            </v-window-item>
            <v-window-item value="response">
              <v-card flat>
                <v-card-text>
                  <pre class="response-code">{{ JSON.stringify(currentApiResponse.response, null, 2) }}</pre>
                </v-card-text>
              </v-card>
            </v-window-item>
          </v-window>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Action Buttons -->
    <div class="action-buttons px-4 py-2">
      <!-- <v-btn
        color="primary"
        variant="outlined"
        size="small"
        :disabled="!canApplyToSvg"
        @click="handleApplyToSvg"
      >
        Apply to SVG
      </v-btn> -->
    </div>    
    <!-- Input Area -->
    <div class="input-area px-4 py-2 d-flex flex-column mb-2">
      <!-- Attached Documents Chips -->
      <div v-if="attachedDocuments.length > 0" class="attached-documents mb-2 d-flex flex-wrap">
        <v-chip
          v-for="(doc, index) in attachedDocuments"
          :key="index"
          size="small"
          class="mr-1 mb-1"
          closable
          @click:close="removeAttachedDocument(index)"
        >
          <v-icon start size="small">{{ doc.category === 'vector' ? 'mdi-vector-square' : 'mdi-image' }}</v-icon>
          {{ doc.name }}
        </v-chip>
      </div>
      <div class="d-flex align-center w-100">
        <div class="d-flex align-center flex-grow-1 input-with-attachment">
          <v-text-field
            v-model="newMessage"
            placeholder="Type your message..."
            variant="outlined"
            density="compact"
            hide-details
            @keyup.enter="sendMessage"
            class="mr-4"
            :disabled="loading"
          />

          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn
                icon="mdi-paperclip"
                size="small"
                variant="text"
                class="attach-btn"
                v-bind="props"
              >
              </v-btn>
            </template>
            <v-list>
              <v-list-item
                @click="triggerFileInput"
                prepend-icon="mdi-file-image"
                :disabled="true"
              >
                <v-list-item-title>Attach File</v-list-item-title>
              </v-list-item>
              <v-list-item
                @click="attachSelectedDocuments"
                prepend-icon="mdi-file-document-multiple"
                :disabled="!hasSelectedDocuments"
              >
                <v-list-item-title>Attach Selected</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>

          <input
            type="file"
            ref="fileInput"
            style="display: none"
            @change="handleFileAttachment"
            accept="image/*"
          />
        </div>        
        <v-btn
          color="primary"
          icon
          size="small"
          @click="sendMessage"
          :disabled="!newMessage.trim()"
        >
          <v-icon v-if="!loading">mdi-send</v-icon>
          <v-icon class="animate-spin" v-else>mdi-loading</v-icon>
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script>
import SVGCodeHighlight from "../SVGCodeHighlight.vue";
import SvgViewer from "../SVGViewer/svg-viewer.vue";
import { useConsoleStore } from "~/store/console-store";
import { useEventBusStore } from "~/store/event-bus";
import { useNotificationStore } from "~/store/notification";
import { buildOpenAIPayload, checkPayloadSize } from "./openai-payload-builder";
import MarkdownIt from "markdown-it";
import { aiPrompts } from "~/lib/ai-prompts";
import { addRasterImageToLayer, renderSvgInKonva, svgToKonvaObjects } from "~/lib/konva/konva";
import { convertSVG, formatSVG, toSvg } from "~/lib/svg";
import {centerLayer, centerLayersAsGroup} from "~/lib/konva/center-layer"
import Konva from "konva";
import { useKonvaStore } from "~/store/konva-store";

export default {
  components: {
    SVGCodeHighlight,
    SvgViewer,
  },  
  data() {    
    return {
      konvaStore: useKonvaStore(),
      $consoleStore: useConsoleStore(),
      $notification: useNotificationStore(),
      messages: [
        {
          text: "How can I help you today?",
          sender: "ai",
        },
      ],
      newMessage: "",
      canApplyToSvg: false,
      selectedFile: null,      loading: false,
      attachedDocuments: [],
      showResponseDialog: false,
      currentApiResponse: null,
      currentApiTab: "request",
      aiPayload: { attachedImages: {} },
    };
  },

  methods: {    
    parseMarkdown(text) {
      const md = new MarkdownIt({
        breaks: false,    // Convert '\n' in paragraphs into <br>
        linkify: true,   // Auto-convert URLs to links
        typographer: true // Enable smart quotes and other typographic features
      });
      return text ? md.render(text) : '';
    },
    
    checkPayloadSize(payload) {
      // Use the helper function from the payload builder
      const result = checkPayloadSize(payload);
      
      if (!result.valid) {
        this.$notification.notify({
          message: `Payload size (${result.size.toFixed(2)}MB) exceeds the 3MB limit`,
          type: "error",
        });
        return false;
      }
      
      return true;
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
      if (this.aiPayload) {
        this.aiPayload.attachedImages = {
          ...this.aiPayload.attachedImages,
          ...attachedImagesData
        };
      }
      
      return selectedDocs.length > 0; // Return true if documents were attached
    },
    async sendMessage() {      
        
      this.loading = true;

      // Call attachSelectedDocuments but don't reassign attachedDocuments with its return value
      this.attachSelectedDocuments();
        // Create a message object to store
      const userMessageObj = {
        text: this.newMessage, // Original message without attachment notation
        sender: "user",
        attachments: Array.isArray(this.attachedDocuments) && this.attachedDocuments.length > 0 ? this.attachedDocuments.map(doc => ({
          name: doc.name,
          category: doc.category
        })) : undefined
      };
      
      // Add message to the chat
      this.messages.push(userMessageObj);
      
      // Store the message index for later reference
      const userMessageIndex = this.messages.length - 1;

      try {
        // Prepare the attached documents in the expected format
        const attachedDocumentsMap = {};
        
        for (const doc of this.attachedDocuments) {
          let imageContent = null;

          console.log("sendMessage doc:", JSON.parse(JSON.stringify(doc)) );
          if (doc.category === 'raster') {
            console.log("Processing raster image:", doc.name, "URL:", doc.imageUrl ? "present" : "missing");
            const base64String = await this.urlToBase64(doc.imageUrl);
            imageContent = base64String;
            console.log("Base64 image generated:", base64String ? "success" : "failed");
          } 
          else if (doc.category === 'vector') {
            // For vector documents, use the SVG content
            console.log("Processing vector image:", doc.name);
            console.log("SVG path:", doc.svgPath ? "present" : "missing");
            console.log("SVG:", doc.svg ? "present" : "missing");
            console.log("Document ID for console store:", doc.id ? doc.id : "missing");
            
            imageContent = doc.svgPath || doc.svg || this.$consoleStore.getDocumentSvg(doc.id);
            console.log("Final SVG content:", imageContent ? "found" : "missing");
          }
          
          if (imageContent) {
            attachedDocumentsMap[doc.name] = {
              category: doc.category,
              image: imageContent
            };
          }

        }
        
        // Build the payload using our helper
        const payload = buildOpenAIPayload({
          prompt: this.newMessage,
          responseType: this.$eventBus.responseType,
          attachedDocuments: attachedDocumentsMap,
          model: "gpt-4o",
          use_base64: false
        });
        
        // Check payload size before sending
        if (!this.checkPayloadSize(payload)) {
          this.loading = false;
          return;
        }

        this.attachedDocuments = [];
        this.newMessage = "";
        
        // Store API request info - create a sanitized copy without the actual image content to save memory
        const sanitizedPayload = JSON.parse(JSON.stringify({ ...payload }));
        
        // Sanitize each document's image content in the payload
        if (sanitizedPayload.attachedDocuments) {
          Object.keys(sanitizedPayload.attachedDocuments).forEach(docName => {
            // if (sanitizedPayload.attachedDocuments[docName].image) {
            //   sanitizedPayload.attachedDocuments[docName].image = 
            //     `[${sanitizedPayload.attachedDocuments[docName].category} content omitted for brevity]`;
            // }
          });
        }

        console.log("sendMessage payload:", payload);

        // this.attachedDocuments = [];
        // this.newMessage = "";
        // return
        
        // Make the API call
        const res = await fetch(
          useRuntimeConfig().public.openaiAltEndpoint,
          {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
        
        if (!res.ok) {
          throw new Error("OPEN AI CALL FAILED");
        }
        
        // Parse the response
        const responseData = await res.json();
        console.log("sendMessage responseData:", responseData);
        const { message, image } = responseData;
        
        // Create a sanitized copy of the response
        const sanitizedResponse = JSON.parse(JSON.stringify( { ...responseData } ));
        
        // Store API response info in the user's message
        this.messages[userMessageIndex].apiResponse = {
          request: sanitizedPayload,
          response: sanitizedResponse,
          timestamp: new Date().toISOString()
        };        console.log("sendMessage image:", image );

        // Check if the image is an SVG by looking for the SVG tag
        if(image && typeof image === 'string' && image.trim().startsWith('<svg')) {
          this.$notification.notify({
            message: "Creating Vector Doc",
            type: "success",
          });
          const formattedSvg = image;

          console.log("formattedSvg:", formattedSvg);

          const docId = `doc_vector_${Date.now()}`

          const layer = new Konva.Layer({name: docId});
          this.$konvaStore.stage.add(layer);

          // Create a new document in the konva store
          this.$konvaStore.addDocument(docId, "SVG Results", {
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
          const svgPath = toSvg(objects, "path")
          const svgPolyline = toSvg(objects, "polyline")
          this.$konvaStore.setSvgPath(docId, svgPath);
          this.$konvaStore.setSvgPolyline(docId, svgPolyline);
          centerLayer(layer);
          this.$konvaStore.setDocumentActive(docId);
        }        
        // Check if the image is a PNG or JPG by looking for the data:image prefix
        else if(image && typeof image === 'string' && (image.startsWith('data:image/png') || image.startsWith('data:image/jpeg'))) {
          // Create a new document ID
          const docId = `doc_raster_${Date.now()}`;
          
          // Create a new layer for the image
          const imageLayer = new Konva.Layer({ name: docId });
          this.$konvaStore.stage.add(imageLayer);
          
          // Convert base64 image to a file object
          const imageData = image;
          const fileType = payload.responseType === "png" ? "image/png" : "image/jpeg";
          const fileName = `ai-generated-image.${payload.responseType}`;
          
          // Create a blob and file from the base64 image
          const byteString = atob(imageData.split(',')[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: fileType });
          const imageFile = new File([blob], fileName, { type: fileType });
            // Create a URL for the image
          const imageUrl = URL.createObjectURL(imageFile);
            // Load the image
          const img = new Image();
          img.src = imageUrl;
          img.onload = () => {
            // Create a Konva image object
            const konvaImage = new Konva.Image({
              x: 0,
              y: 0,
              image: img,
              width: img.width,
              height: img.height,
            });
            
            // Add the image to the layer
            imageLayer.add(konvaImage);
            
            // Scale and center the image in the viewport
            const stageWidth = this.$konvaStore.stage.width();
            const stageHeight = this.$konvaStore.stage.height();
            
            // Default scaling and positioning
            const displayScale = Math.min(
              stageWidth / img.width, 
              stageHeight / img.height
            ); // Use 80% of available space
            
            // Calculate centered position
            const x = (stageWidth - img.width * displayScale) / 2;
            const y = (stageHeight - img.height * displayScale) / 2;
            
            // Scale the image for display
            konvaImage.scale({ x: displayScale, y: displayScale });
            
            // Position the image
            konvaImage.position({ 
              x: x,
              y: y
            });
            
            // Add the document to konva store            
            this.$konvaStore.addDocument(docId, "AI Generated Image", {
              konva: {
                layer: imageLayer,
                image: konvaImage,
              },
              imageUrl: imageUrl,
              metadata: {
                category: 'raster',
                type: 'image',
                filename: fileName
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
                    value: displayScale,
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
          };
        }        
        // Determine the response type based on image content
        let detectedResponseType = null;
        if (image) {
          if (typeof image === 'string') {
            if (image.trim().startsWith('<svg')) {
              detectedResponseType = 'svg';
            } else if (image.startsWith('data:image/png')) {
              detectedResponseType = 'png';
            } else if (image.startsWith('data:image/jpeg')) {
              detectedResponseType = 'jpg';
            }
          }
        }
        
        // Add an AI response message to the chat
        const aiMessageObj = {
          text: message || "I've processed your request",
          sender: "ai",
          responseData: image ? {
            image: image,
            responseType: detectedResponseType
          } : null
        };

        console.log("sendMessage aiMessageObj:", aiMessageObj);
        
        // Add the AI message to the chat
        this.messages.push(aiMessageObj);
        
        // Clear attachments and message after sending
        this.attachedDocuments = [];
        this.newMessage = "";
      } catch (err) {
        this.$notification.notify({
          message: err.message,
          type: "error",
        });
      } finally {
        this.loading = false;
      }
    },
    scrollToBottom() {
      const container = this.$refs.messagesContainer;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },
    triggerFileInput() {
      this.$refs.fileInput.click();
    },    
    handleFileAttachment(event) {
      const file = event.target.files[0];
      if (file) {
        this.selectedFile = file;
        // Create an object URL for the image that can be used by urlToBase64
        const imageUrl = URL.createObjectURL(file);
        
        this.attachedDocuments.push({
          name: file.name,
          file: file,
          category: 'raster',
          imageUrl: imageUrl // Add the imageUrl for raster images
        });
        this.newMessage = `Please analyze the attached file`;
      }
    },
    async attachSelectedDocuments() {
      // Get selected documents from Konva store
      const selectedDocs = Object.entries(this.konvaStore.documents)
        .filter(([id, doc]) => doc.selected)
        .map(([id, doc]) => ({
          id,
          name: doc.ui.displayName,
          svg: this.$consoleStore.getDocumentSvg(id),
          category: doc.metadata?.category || 'vector',
          imageUrl: doc.metadata?.category === 'raster' ? doc.imageUrl : null
        }));
      
      if (selectedDocs.length === 0) {
        // If no documents are explicitly selected, try to use the active document
        const activeDoc = this.konvaStore.getActiveDocument();
        if (activeDoc) {
          selectedDocs.push({
            id: activeDoc.id,
            name: activeDoc.ui.displayName,
            svg: this.$consoleStore.getDocumentSvg(activeDoc.id) || this.$consoleStore.consoleOutput,
            category: activeDoc.metadata?.category || 'vector',
            imageUrl: activeDoc.metadata?.category === 'raster' ? activeDoc.imageUrl : null
          });
        } else {
          this.$notification.notify({
            message: "No documents selected",
            type: "warning",
          });
          return false;
        }
      }      
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
      // Format names for the message
      const docNames = selectedDocs.map(doc => doc.name).join(", ");
      // Add selected documents to the event bus for the advanced panel to use
      const attachedImagesData = {};
      
      // Use for...of with async/await since we need to process async operations
      for (const doc of selectedDocs) {
        console.log("attachSelectedDocuments doc:", doc);
        let image;

        if(doc.category === "raster" && doc.imageUrl) {
          // For raster images, convert URL to base64
          const base64String = await this.urlToBase64(doc.imageUrl);
          if (base64String) {
            image = base64String;
            console.log("Document base64String generated:", doc.name);
          }        } else {
          // For vector documents, use the SVG content
          const svgFromDoc = doc.svg;
          const svgFromStore = this.$consoleStore.getDocumentSvg(doc.id);
          const defaultSvg = this.$consoleStore.consoleOutput;
          
          console.log(`Vector document ${doc.name}:`, {
            hasSvgFromDoc: !!svgFromDoc,
            hasSvgFromStore: !!svgFromStore,
            hasDefaultSvg: !!defaultSvg
          });
          
          image = svgFromDoc || svgFromStore || defaultSvg;
        }

        attachedImagesData[doc.name] = {
          category: doc.category,
          image: image
        };
      }
      
      // Use the event bus to send the attached images to the advanced panel
      this.$eventBus.emit('documents-attached', attachedImagesData);
      
      return selectedDocs.length > 0; // Return true if documents were attached
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

    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        this.$notification.notify({
          message: "Text copied to clipboard",
        });
      } catch (err) {
        console.error("Failed to copy text: ", err);
      }
    },
    
    removeAttachedDocument(index) {
      // Remove the document at the specified index
      this.attachedDocuments.splice(index, 1);
      
      // If all documents are removed, reset the message text
      if (this.attachedDocuments.length === 0) {
        this.newMessage = "";
      }
    },
    
    showApiResponseDetails(apiResponse) {
      this.currentApiResponse = apiResponse;
      this.currentApiTab = "request"; // Default to request tab
      this.showResponseDialog = true;
    },
    closeApiResponseDialog() {
      this.showResponseDialog = false;
      this.currentApiResponse = null;
    }
  },  
  mounted() {
    this.scrollToBottom();
    // Listen for auto-send event from advanced panel
    this.$eventBus.on('ai-console-send-message', () => {
      // If there's no message, provide a default one
      if (!this.newMessage.trim() && this.attachedDocuments.length > 0) {
        this.newMessage = "Please analyze the attached document(s)";
      }
      
      // Send the message if we have a prompt text
      if (this.newMessage.trim()) {
        this.sendMessage();
      }
    });
      // Listen for attach-selected event from advanced panel
    this.$eventBus.on('documents-attach-selected', async () => {
      // Attach selected documents
      const attached = await this.attachSelectedDocuments();
      
      // If documents were attached and we have a prompt, we could auto-suggest
      // but we won't auto-send to give the user a chance to review
      if (attached && !this.newMessage.trim()) {
        this.newMessage = "Please analyze the attached document(s)";
      }
    });
    
    // Listen for set-message event from advanced panel
    this.$eventBus.on('ai-console-set-message', (message) => {
      this.newMessage = message;
    });
  },
  created() {
    // Listen for changes in attachedDocuments
    this.$watch('attachedDocuments', (newDocs, oldDocs) => {
      // If we have new documents and a message but haven't sent it yet,
      // this could be a good time to auto-send
      if (newDocs.length > 0 && this.newMessage.trim() && !this.loading) {
        console.log('Documents attached, message ready, considering auto-send');
      }
    }, { deep: true });
  },
  watch: {
    messages: {
      handler() {
        this.$nextTick(() => {
          this.scrollToBottom();
        });      },
      deep: true,
    },
    showResponseDialog(newVal) {
      // Reset the dialog when it's closed
      if (!newVal) {
        this.currentApiResponse = null;
      }
    }
  },  
  computed: {
    hasSelectedDocuments() {
      return Object.values(this.konvaStore.documents).some(doc => doc.selected);
    },
    $eventBus() {
      return useEventBusStore();
    }
  }
};
</script>

<style scoped>
.chat-window {
  height: 100%;
  background-color: var(--v-background);
}

.messages-container {
  overflow-y: auto;
  border-bottom: 1px solid var(--v-border-color);
}

.messages {
  display: flex;
  flex-direction: column;
}

.message {
  width: 100%;
  margin-bottom: 1rem;
}
.message-content {
  max-width: 99%;
}

.message-wrapper {
  position: relative;
  width: 100%;
}

.message-content {
  border-radius: 8px;
  word-wrap: break-word;
}

.copy-btn {
  position: absolute;
  bottom: -20px;
  left: 35px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message-wrapper:hover .copy-btn {
  opacity: 1;
}

.user-message {
  align-self: flex-end;
}

.ai-message {
  align-self: flex-start;
}

.ai-message .message-content {
  background-color: var(--v-surface-variant);
}

.input-area {
  border-top: 1px solid var(--v-border-color);
}

.action-buttons {
  border-top: 1px solid var(--v-border-color);
}

.input-with-attachment {
  position: relative;
}

.attach-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}

.v-text-field {
  padding-right: 40px;
}
.animate-spin {
  animation: spin 1s linear infinite;
}

.attached-documents {
  transition: all 0.3s ease;
}

.message-attachments {
  opacity: 0.8;
}

.attachment-chip {
  background-color: rgba(0, 0, 0, 0.05);
  font-size: 0.75rem;
}

.thumbnail {
  width: 50px;
  height: 50px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.thumbnail-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.response-code {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: monospace;
  white-space: pre;
  font-size: 0.85rem;
  max-width: 100%;
}

.position-relative {
  position: relative;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.response-thumbnail {
  width: 50px;
  height: 50px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.response-svg-container,
.response-image-container {
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background-color: white;
}

.formatted-text {
  white-space: pre-wrap; /* Preserve whitespace and line breaks */
}

/* Markdown styling */
.formatted-text :deep(h1),
.formatted-text :deep(h2),
.formatted-text :deep(h3),
.formatted-text :deep(h4),
.formatted-text :deep(h5),
.formatted-text :deep(h6) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  font-weight: bold;
}

.formatted-text :deep(h1) { font-size: 1.6em; }
.formatted-text :deep(h2) { font-size: 1.4em; }
.formatted-text :deep(h3) { font-size: 1.2em; }

.formatted-text :deep(ul),
.formatted-text :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.formatted-text :deep(p) {
  margin-bottom: 0.5em;
}

.formatted-text :deep(code) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-family: monospace;
}

.formatted-text :deep(pre code) {
  display: block;
  padding: 0.5em;
  overflow-x: auto;
  margin-bottom: 0.5em;
}

.formatted-text :deep(strong) {
  font-weight: bold;
}

.formatted-text :deep(em) {
  font-style: italic;
}

.formatted-text :deep(blockquote) {
  border-left: 3px solid rgba(0, 0, 0, 0.2);
  padding-left: 0.5em;
  margin-left: 0.5em;
  margin-bottom: 0.5em;
  color: rgba(0, 0, 0, 0.7);
}

.formatted-text :deep(a) {
  color: #1976d2;
  text-decoration: none;
}

.formatted-text :deep(a:hover) {
  text-decoration: underline;
}

.formatted-text :deep(img) {
  max-width: 100%;
  height: auto;
}

/* Remove bottom margin from the last child inside .formatted-text */
.formatted-text :deep(*:last-child) {
  margin-bottom: -20px !important;
}
</style>
