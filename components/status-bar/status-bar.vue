<template>
  <div class="statusbar">
    <div class="d-flex justify-space-between align-stretch">
      <div class="d-flex align-center text-secondary flex-1-1 pl-2">
        <span class="text-caption">Helpers :</span>
        <div v-for="checkbox in editStore.checkboxes" :key="checkbox.name">
          <v-checkbox
            @change="editStore.toggleCheckbox(checkbox.name)"
            :model-value="checkbox.value"
            density="compact"
            :name="checkbox.name"
            class="ma-0 pa-0 text-caption"
            :label="checkbox.label"
            :disabled="checkbox.disabled"
          ></v-checkbox>
        </div>
      </div>

      <div class="d-flex align-center px-4">
        <span class="text-caption mr-2">Background:</span>
        <v-select
          v-model="selectedBackground"
          :items="backgroundOptions"
          item-title="name"
          item-value="value"
          density="compact"
          hide-details
          class="status-select"
          @update:model-value="handleBackgroundChange"
        ></v-select>
        <transition name="fade">
          <div v-if="showResolutionStatus" 
               class="text-caption ml-2 resolution-status">
            {{ resolutionStatusText }}
          </div>
        </transition>
      </div>

      <div class="coords d-flex justify-center align-center text-caption">
        Coords:
        <code class="ml-2"
          >{x: {{ editStore.coords.x }}, y: {{ editStore.coords.y }}}</code
        >
      </div>
    </div>
  </div>
</template>
<script>
import { useEditStore } from "~/store/edit";
import { useThreeStore } from "~/store/three-store";

export default {
  data() {
    return {
      editStore: useEditStore(),
      threeStore: useThreeStore(),
      selectedBackground: 'gradient',
      backgroundOptions: [
        { name: 'Gradient', value: 'gradient' },
        { name: 'Limpopo Golf Course', value: 'limpopo_golf_course' },
        { name: 'Tief Etz', value: 'tief_etz' },
        { name: 'Wide Street', value: 'wide_street_01' },
        { name: 'Buikslotermeerplein', value: 'buikslotermeerplein' },
        { name: 'Docklands', value: 'docklands_01' },
        { name: 'Golden Bay', value: 'golden_bay' }
      ],
      currentBackgroundResolution: null,
      isResolutionLoading: false,
    };
  },
  computed: {
    showResolutionStatus() {
      return this.isResolutionLoading && 
             this.selectedBackground !== 'gradient' && 
             this.currentBackgroundResolution;
    },
    resolutionStatusText() {
      if (!this.currentBackgroundResolution) return '';
      
      if (this.currentBackgroundResolution === '8k') {
        return 'HDRI Loaded';
      }
      
      return `Loading: ${this.currentBackgroundResolution.toUpperCase()}`;
    }
  },
  methods: {
    handleBackgroundChange(value) {
      if (!this.threeStore.floorplan3d) return;
      
      // Reset resolution state
      this.currentBackgroundResolution = null;
      this.isResolutionLoading = true;
      
      // Start watching for resolution changes
      this.watchBackgroundResolution();
      
      this.threeStore.floorplan3d.setBackground(value);
    },
    watchBackgroundResolution() {
      // Clear any existing interval
      if (this._resolutionWatchInterval) {
        clearInterval(this._resolutionWatchInterval);
      }
      
      // Check resolution more frequently
      this._resolutionWatchInterval = setInterval(() => {
        if (this.threeStore.floorplan3d) {
          const resolution = this.threeStore.floorplan3d.getCurrentBackgroundResolution();
          this.currentBackgroundResolution = resolution;
          
          if (resolution === '8k') {
            this.isResolutionLoading = false;
            clearInterval(this._resolutionWatchInterval);
          }
        }
      }, 100);
    }
  }
};
</script>
<style>
.statusbar {
  position: absolute;
  left: 0;
  bottom: 0;
  width: calc(100% - 240px);
  margin-left: 240px;
  background: #ddd;
  border-top: 1px solid #ccc;
}
.statusbar .v-input__details {
  display: none;
}
.statusbar .v-label {
  font-size: 0.75rem;
}
.statusbar .coords {
  width: 200px;
  border-left: 1px solid #ccc;
}

.status-select {
  min-width: 150px;
  max-width: 150px;
}

.status-select :deep(.v-field__input) {
  min-height: 32px;
  font-size: 0.75rem;
}

.resolution-status {
  min-width: 80px;
}
</style>
