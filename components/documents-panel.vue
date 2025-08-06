<template>
  <div class="documents-container">
    <div class="documents-panel">      
      <div 
        class="d-flex justify-space-between align-center pb-1 pt-1 panel-header" 
        @click="togglePanel"
        style="cursor: pointer;"
      >
        <v-icon 
          size="x-small" 
          class="mr-1" 
          @click.stop="toggleAllDocumentsVisibility"
          style="cursor: pointer;"
        >
          {{ !areAllDocumentsInvisible ? 'mdi-eye' : 'mdi-eye-off' }}
        </v-icon>
        <span class="text-subtitle-2">Layers</span>
        <div class="d-flex align-center">
          
          <v-icon size="x-small" class="mr-1">mdi-layers</v-icon>
          <v-icon size="x-small">{{ isPanelCollapsed ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
        </div>
      </div>
      
      <div 
        class="layer-list" 
        :class="{ 'collapsed': isPanelCollapsed }"
        v-show="!isPanelCollapsed"
      >
        <div 
          v-for="doc in sortedDocuments" 
          :key="doc.id"
          class="layer-item"
          :class="{ 'active': doc.active, 'disabled': doc.disabled }"
          @click="selectDocument(doc.id)"
        >
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">              <!-- Checkbox for "selected" state -->
              <v-checkbox
                v-model="doc.selected"
                density="compact"
                hide-details
                class="mr-0 mt-0 mb-0 ml-0 compact-checkbox"
                @click.stop="toggleDocumentSelected(doc.id)"
              ></v-checkbox><v-icon 
                color="black" 
                size="x-small" 
                class="mr-2"
                @click.stop="toggleDocumentVisibility(doc.id)"
                :disabled="doc.disabled"
                style="cursor: pointer;"
              >
                {{ doc.docConfigs.layer.opacity.value > 0 ? 'mdi-eye' : 'mdi-eye-off' }}
              </v-icon>

              <!-- 3D Toggle Icon -->
              <v-icon 
                color="black" 
                size="x-small"
                class="mr-1"
                @click.stop="toggle3DVisibility(doc.id)"
                :disabled="doc.disabled || doc.metadata.category !== 'vector'"
                style="cursor: pointer;"
              >
                {{ doc.show3D ? 'mdi-video-3d' : 'mdi-video-3d-off' }}
              </v-icon>              <span 
                :class="{ 'text--disabled': doc.disabled }"
                class="small-text"
              >{{ doc.ui.displayName }}</span>
              <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                  <v-icon 
                    size="x-small" 
                    class="ml-1" 
                    :color="doc.metadata.category === 'vector' ? 'blue-grey' : 'blue-grey'"
                    v-bind="props"
                  >
                    {{ doc.metadata.category === 'vector' ? 'mdi-vector-square' : 'mdi-image' }}
                  </v-icon>
                </template>
                <span>{{ doc.metadata.category === 'vector' ? 'Vector' : 'Raster' }}</span>
              </v-tooltip>
              <!-- Secondary icon for SVG type (path/polyline) -->              <v-tooltip v-if="doc.metadata.category === 'vector' && doc.metadata.subtype" location="top">
                <template v-slot:activator="{ props }">
                  <v-icon 
                    size="x-small" 
                    class="ml-0" 
                    color="blue-grey-lighten-1"
                    v-bind="props"
                  >
                    {{ doc.metadata.subtype === 'paths' ? 'mdi-vector-curve' : doc.metadata.subtype === 'polylines' ? 'mdi-vector-polyline' : '' }}
                  </v-icon>
                </template>
                <span>{{ doc.metadata.subtype === 'paths' ? 'Paths' : doc.metadata.subtype === 'polylines' ? 'Polylines' : '' }}</span>
              </v-tooltip>
            </div>
            <div class="layer-controls" :class="{ 'visible': doc.ui.menuOpen }">
              <!-- Dots vertical menu -->
              <v-menu
                v-model="doc.ui.menuOpen"
                :close-on-content-click="true"
                location="end"
                offset="5"
                @close="handleMenuClose(doc.id)"
              >
                <template v-slot:activator="{ props }">                  <v-btn 
                    icon="mdi-dots-vertical" 
                    variant="text" 
                    size="x-small" 
                    density="compact"
                    class="layer-btn"
                    :disabled="doc.disabled"
                    v-bind="props"
                    @click.stop
                  ></v-btn>
                </template>
                <v-list density="compact">
                  <v-list-item 
                    @click="moveDocumentUp(doc.id)"
                    :disabled="isFirstDocument(doc) || doc.disabled"
                  >
                    <template v-slot:prepend>
                      <v-icon size="small">mdi-arrow-up</v-icon>
                    </template>
                    <v-list-item-title>Move Up</v-list-item-title>
                  </v-list-item>
                  
                  <v-list-item 
                    @click="moveDocumentDown(doc.id)"
                    :disabled="isLastDocument(doc) || doc.disabled || sortedDocuments.length == 1"
                  >
                    <template v-slot:prepend>
                      <v-icon size="small">mdi-arrow-down</v-icon>
                    </template>
                    <v-list-item-title>Move Down</v-list-item-title>
                  </v-list-item>
                  
                  <v-divider></v-divider>
                  
                  <v-list-item 
                    @click="openRenameDialog(doc)"
                    :disabled="doc.disabled"
                  >
                    <template v-slot:prepend>
                      <v-icon size="small">mdi-pencil</v-icon>
                    </template>
                    <v-list-item-title>Rename</v-list-item-title>
                  </v-list-item>
                  
                  <v-list-item 
                    @click="cloneDocument(doc.id)"
                    :disabled="doc.disabled"
                  >
                    <template v-slot:prepend>
                      <v-icon size="small">mdi-content-copy</v-icon>
                    </template>
                    <v-list-item-title>Clone</v-list-item-title>
                  </v-list-item>
                  
                  <v-list-item 
                    @click="deleteDocument(doc.id)"
                    :disabled="doc.disabled"
                    class="text-error"
                  >
                    <template v-slot:prepend>
                      <v-icon size="small" color="error">mdi-delete</v-icon>
                    </template>
                    <v-list-item-title>Delete</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </div>
          
          <!-- Opacity Slider (Commented out as in original) -->
          <!-- <div class="opacity-slider-container" @click.stop>
            <v-tooltip location="top">
              <template v-slot:activator="{}">
              <div style="width:24px; text-align:right; margin-right:2px">
                {{(doc.docConfigs.layer.opacity.value * 100).toFixed(0)}}
              </div>
              
              </template>
              <span>Opacity: {{ Math.round(doc.docConfigs.layer.opacity.value * 100) }}%</span>
            </v-tooltip>
            <v-slider
              v-model="doc.docConfigs.layer.opacity.value"
              :min="0"
              :max="1"
              :step="0.01"
              :disabled="doc.disabled"
              density="compact"
              hide-details
              class="opacity-slider"
              @click.stop
              @input="updateDocumentOpacity(doc.id)"
              thumb-size="1"
            ></v-slider>
          </div> -->

        </div>
      </div>
      
      <!-- Rename Dialog -->
      <v-dialog
        v-model="renameDialogVisible"
        max-width="400"
      >
        <v-card>
          <v-card-title class="text-h6">
            Rename Layer
          </v-card-title>
          <v-card-text>
            <v-text-field
              v-model="newLayerName"
              label="Layer Name"
              variant="outlined"
              density="compact"
              autofocus
              @keydown.enter="confirmRename"
            ></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="red-darken-2"
              variant="outlined"
              @click="cancelRename"
            >
              Cancel
            </v-btn>
            <v-btn
              color="green-darken-2"
              variant="outlined"
              @click="confirmRename"
              :disabled="!newLayerName.trim()"
            >
              Rename
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </div>
</template>

<script>
import { useKonvaStore } from "~/store/konva-store";

export default {
  data() {
    return {
      konvaStore: useKonvaStore(),
      isPanelCollapsed: false,
      renameDialogVisible: false,
      newLayerName: '',
      documentToRename: null
    };
  },
  computed: {
    areAllDocumentsInvisible() {
      // Consider a document invisible if its opacity is 0
      return Object.values(this.konvaStore.documents).every(doc => 
        !doc.konva.layer || doc.docConfigs.layer.opacity.value === 0
      );
    },
    
    // Get sorted documents for display
    sortedDocuments() {
      // Create a copy of documents object as array with id included
      return Object.entries(this.konvaStore.documents)
        .filter(([id, doc]) => {
          // Filter out documents with names "grid" or "selection"
          return !["grid", "selection"].includes(doc.name.toLowerCase());
        })
        .map(([id, doc]) => ({
          ...doc,
          id // Include the document id (object key) in each document object
        }))
        .sort((a, b) => a.ui.order - b.ui.order);
    }
  },
  mounted() {
    // Listen for clicks on the konva container to close menus
    document.addEventListener('click', this.handleOutsideClick);
    
    // Listen for the custom close-v-menus event from konva.js
    document.addEventListener('close-v-menus', this.closeAllMenus);
  },
  beforeUnmount() {
    // Remove event listeners when component is destroyed
    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('close-v-menus', this.closeAllMenus);
  },
  methods: {
    handleOutsideClick(event) {
      // Check if the click was on konva container
      const konvaContainer = document.getElementById('konva-container');
      if (konvaContainer && konvaContainer.contains(event.target)) {
        this.closeAllMenus();
      }
    },
    
    closeAllMenus() {
      // Close all open menus
      for (const docId in this.konvaStore.documents) {
        if (this.konvaStore.documents[docId].ui.menuOpen) {
          this.konvaStore.documents[docId].ui.menuOpen = false;
        }
      }
    },
    
    togglePanel() {
      // First close all open menus to prevent visual artifacts
      this.closeAllMenus();
      // Then toggle the panel state
      this.isPanelCollapsed = !this.isPanelCollapsed;
    },
    
    selectDocument(documentId) {
      const doc = this.konvaStore.documents[documentId];
      if (doc.disabled) return;
      
      // Set the document as active
      this.konvaStore.setDocumentActive(documentId);
      
      // If there's a Konva layer associated with this document, make sure it's visible
      if (doc.konva.layer && doc.docConfigs.layer.opacity.value === 0) {
        // Make it visible if it was hidden
        this.konvaStore.toggleDocumentVisibility(documentId);
      }
    },
    
    toggleDocumentVisibility(documentId) {
      console.log("toggleDocumentVisibility started");
      console.log("toggleDocumentVisibility documentId:", documentId);
      console.log("toggleDocumentVisibility this.konvaStore.documents:", JSON.parse(JSON.stringify(this.konvaStore.documents)) );
      const doc = this.konvaStore.documents[documentId];
      if (doc.disabled) return;
      
      // Toggle visibility using opacity
      this.konvaStore.toggleDocumentVisibility(documentId);
    },
    
    toggleAllDocumentsVisibility() {
      console.log("toggleAllDocumentsVisibility this.areAllDocumentsInvisible:", this.areAllDocumentsInvisible);
      // Toggle all documents' visibility
      this.konvaStore.toggleAllDocumentsVisibility(this.areAllDocumentsInvisible);
    },
    
    moveDocumentUp(documentId) {
      this.konvaStore.moveDocumentUp(documentId);
    },
    
    moveDocumentDown(documentId) {
      this.konvaStore.moveDocumentDown(documentId);
    },
    
    cloneDocument(documentId) {
      this.konvaStore.cloneDocument(documentId);
    },
    
    deleteDocument(documentId) {
      this.konvaStore.deleteDocument(documentId);
    },
    
    isFirstDocument(doc) {
      // Check if this document has the lowest order value
      return doc.ui.order === Math.min(...Object.values(this.konvaStore.documents).map(d => d.ui.order));
    },
    
    isLastDocument(doc) {
      // Check if this document has the highest order value
      return doc.ui.order === Math.max(...Object.values(this.konvaStore.documents).map(d => d.ui.order));
    },
    
    openRenameDialog(doc) {
      if (doc.disabled) return;
      
      this.documentToRename = doc;
      this.newLayerName = doc.ui.displayName;
      this.renameDialogVisible = true;
    },
    
    confirmRename() {
      if (this.documentToRename && this.newLayerName.trim()) {
        this.konvaStore.renameDocument(this.documentToRename.id, this.newLayerName.trim());
        
        // Close the dialog
        this.cancelRename();
      }
    },
    
    cancelRename() {
      this.renameDialogVisible = false;
      this.newLayerName = '';
      this.documentToRename = null;
    },
    
    handleMenuClose(documentId) {
      // No additional actions needed
    },
    
    updateDocumentOpacity(documentId) {
      const doc = this.konvaStore.documents[documentId];
      if (doc && doc.konva.layer) {
        this.konvaStore.updateDocumentLayerOpacity(documentId, doc.docConfigs.layer.opacity.value);
      }
    },

    toggleDocumentSelected(documentId) {
      const doc = this.konvaStore.documents[documentId];
      if (doc.disabled) return;
      
      // Toggle selected state
      doc.selected = !doc.selected;
    },
    
    toggle3DVisibility(documentId) {
      console.log("toggle3DVisibility started for document:", documentId);
      const doc = this.konvaStore.documents[documentId];
      if (doc.disabled) return;
      
      // Toggle the show3D property directly in the document
      doc.show3D = !doc.show3D;

      console.log("toggle3DVisibility doc:", JSON.parse(JSON.stringify(doc)) );

      for(let obj of doc.threejsContent.objects) {
        console.log("toggle3DVisibility obj:", JSON.parse(JSON.stringify(obj)) );
        obj.visible = doc.show3D;
      }   

    }
  }
};
</script>

<style scoped>
.documents-container {
  position: absolute;
  top: 75px;
  left: 250px;
  width: 300px;
  overflow: hidden;
  border: 1px solid #aaa;
  border-radius: 4px;
  background-color: white;
  z-index: 1000;
  /* box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); */
}

.documents-panel {
  background-color: #eee0;
  border-top: 1px solid #0002;
}

.panel-header {
  padding: 6px;
  user-select: none;
  transition: background-color 0.2s ease;
}

.panel-header:hover {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.layer-list {
  padding-top: 2px;
  overflow-y: auto;
  transition: all 0.3s ease;
  height: auto; /* Allow height to be determined by content */
  max-height: none; /* Remove fixed max-height */
}

.layer-list.collapsed {
  max-height: 0;
  overflow: hidden;
}

.layer-item {
  padding: 3px 0px;
  border-radius: 3px;
  margin-bottom: 2px;
  margin-left: 4px;
  margin-right: 4px;
  cursor: pointer;
  background-color: #f9f9f9;
  border: 1px solid #aaa;
  transition: all 0.2s;
  font-size: 0.85rem;
}

.layer-item:hover:not(.disabled) {
  background-color: #ececec;
}

.layer-item.active {
  background-color: #e3f2fd;
  /* border-color: #bbdefb; */
}

.layer-item.active:hover {
  background-color: #ddecf9;
  /* border-color: #90caf9; */
}

.layer-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.layer-controls {
  display: flex;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.layer-item:hover .layer-controls {
  opacity: 1;
}

/* Display controls when menu is open */
.layer-controls.visible {
  opacity: 1;
}

/* Keep the controls visible when menu is open - alternative approach */
.layer-item .layer-controls:has(.v-btn:has(+ .v-overlay--active)) {
  opacity: 1;
}

.layer-btn {
  margin: 0;
  height: 24px;
  min-width: 24px;
  width: 24px;
}

/* Add styles for the layer menu */
.v-list-item.text-error .v-list-item-title {
  color: rgb(var(--v-theme-error));
}

/* Add styles for the opacity slider */
.opacity-slider-container {
  display: flex;
  align-items: center;
}

.opacity-icon {
  margin-right: 6px;
}

.opacity-slider {
  flex-grow: 1;
}

/* Custom styles for compact elements */
.small-text {
  font-size: 0.85rem;
  line-height: 1.1;
  padding: 0 5px;
}

.compact-checkbox :deep(.v-selection-control) {
  min-height: 24px;
  padding: 0 5px;
  margin: 0;
}

.compact-checkbox :deep(.v-selection-control__wrapper) {
  margin: 0;
  height: 24px;
}
</style>

<style>
.v-slider.v-input--horizontal > .v-input__control {
  min-height: 0px;
}

/* Compact layer item styles */
.layer-item .v-btn {
  padding: 0 !important;
}

.layer-item .v-icon--size-x-small {
  font-size: 14px !important;
}

.layer-item .v-checkbox {
  margin-bottom: 0 !important;
  margin-top: 0 !important;
}

.layer-item .v-selection-control {
  margin-bottom: 0 !important;
  margin-top: 0 !important;
}
</style>
