# Floorplan3D API Guide

A comprehensive guide for using the `@2112-lab/floorplan3d` npm module to create 3D floorplan visualizations.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core API Reference](#core-api-reference)
- [Layer Management](#layer-management)
- [Configuration](#configuration)
- [Export Functions](#export-functions)
- [Examples](#examples)
- [Integration with Nuxt.js](#integration-with-nuxtjs)
- [Troubleshooting](#troubleshooting)

## Installation

Install the Floorplan3D module via npm:

```bash
npm install @2112-lab/floorplan3d
```

### Dependencies

The module includes Three.js as a dependency and requires a modern browser with WebGL support.

## Quick Start

### Basic Setup

```javascript
import Floorplan3D from '@2112-lab/floorplan3d';

// Get a DOM container element
const container = document.getElementById('threejs-container');
const width = container.offsetWidth;
const height = container.offsetHeight;

// Initialize Floorplan3D
const floorplan3d = new Floorplan3D(container, width, height);

// Import an SVG floorplan
await floorplan3d.importFile();
```

### Vue.js/Nuxt.js Setup

```vue
<template>
  <div ref="threejsContainer" class="threejs-container">
    <!-- ThreeJS content will be rendered here -->
  </div>
</template>

<script>
import Floorplan3D from '@2112-lab/floorplan3d';

export default {
  data() {
    return {
      floorplan3d: null
    };
  },
  mounted() {
    this.initFloorplan3D();
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    initFloorplan3D() {
      const container = this.$refs.threejsContainer;
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      
      this.floorplan3d = new Floorplan3D(container, width, height);
    },
    cleanup() {
      if (this.floorplan3d) {
        this.floorplan3d.renderer?.dispose();
        this.floorplan3d = null;
      }
    }
  }
};
</script>
```

## Core API Reference

### Constructor

```javascript
new Floorplan3D(containerRef, width, height)
```

**Parameters:**
- `containerRef` (HTMLElement) - DOM element to render the 3D scene
- `width` (number) - Initial width of the renderer
- `height` (number) - Initial height of the renderer

### File Import Methods

#### `importFile()`
Opens a file dialog for the user to select and import an SVG file.

```javascript
await floorplan3d.importFile();
```

#### `importFileWithPath(svgFilePath)`
Imports an SVG file from a specific path (useful for preloading default files).

```javascript
await floorplan3d.importFileWithPath('/samples/floorplan.svg');
```

#### `resetScene()`
Clears the current scene and removes all layers.

```javascript
floorplan3d.resetScene();
```

## Layer Management

### Layer Selection

#### `toggleLayerSelected(layerId)`
Toggles the selection state of a specific layer.

```javascript
floorplan3d.toggleLayerSelected('layer-id-123');
```

### Layer Configuration

#### `updateLayerConfig(layerId, configPath, value)`
Updates configuration properties for a specific layer.

```javascript
// Update layer opacity
floorplan3d.updateLayerConfig('rooms-layer', 'layerConfigs.extrusion.opacity.value', 0.7);

// Update extrusion height
floorplan3d.updateLayerConfig('walls-layer', 'layerConfigs.extrusion.height.value', 3.0);

// Update material color
floorplan3d.updateLayerConfig('floors-layer', 'layerConfigs.material.color.value', '#ff0000');

// Update extrusion start position
floorplan3d.updateLayerConfig('ceiling-layer', 'layerConfigs.extrusion.start.value', 2.5);
```

**Common Configuration Paths:**
- `layerConfigs.extrusion.opacity.value` - Layer opacity (0.0 to 1.0)
- `layerConfigs.extrusion.height.value` - Extrusion height
- `layerConfigs.extrusion.start.value` - Extrusion start position
- `layerConfigs.material.color.value` - Material color (hex format)

### Image Opacity Control

#### `setImageOpacity(opacity, layerId?)`
Controls the opacity of image textures in the scene.

```javascript
// Set opacity for all images
floorplan3d.setImageOpacity(0.5);

// Set opacity for a specific image layer
floorplan3d.setImageOpacity(0.8, 'background-image-layer');
```

#### `setImageOpacityByName(namePattern, opacity)`
Sets image opacity for layers matching a name pattern.

```javascript
floorplan3d.setImageOpacityByName('background', 0.3);
```

### Layer Store Access

Access the internal layer management system:

```javascript
// Get all layers
const allLayers = floorplan3d.layerStore.getAllLayers();

// Get selected layers
const selectedLayers = floorplan3d.layerStore.getSelectedLayers();

// Get specific layer
const layer = floorplan3d.layerStore.getLayer('layer-id');

// Get layers object
const layersObject = floorplan3d.layerStore.layers;
```

## Export Functions

### GLTF Export

#### `exportSelectedLayersAsGLTF()`
Exports selected layers as a GLTF/GLB file.

```javascript
try {
  const gltfData = await floorplan3d.exportSelectedLayersAsGLTF();
  
  // Create download
  const blob = new Blob([gltfData], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'exported_layers.glb';
  link.click();
  
  URL.revokeObjectURL(url);
} catch (error) {
  console.error('Export failed:', error);
}
```

## Examples

### Complete Application Example

```javascript
import Floorplan3D from '@2112-lab/floorplan3d';

class FloorplanApp {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.floorplan3d = null;
    this.init();
  }

  async init() {
    // Initialize 3D scene
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    this.floorplan3d = new Floorplan3D(this.container, width, height);
    
    // Load default floorplan
    await this.loadDefaultFloorplan();
    
    // Set up UI interactions
    this.setupUI();
  }

  async loadDefaultFloorplan() {
    try {
      await this.floorplan3d.importFileWithPath('/assets/default-floorplan.svg');
      console.log('Default floorplan loaded');
    } catch (error) {
      console.error('Failed to load default floorplan:', error);
    }
  }

  setupUI() {
    // Import button
    document.getElementById('import-btn').addEventListener('click', () => {
      this.floorplan3d.importFile();
    });

    // Reset button
    document.getElementById('reset-btn').addEventListener('click', () => {
      this.floorplan3d.resetScene();
    });

    // Layer opacity slider
    document.getElementById('opacity-slider').addEventListener('input', (e) => {
      const opacity = parseFloat(e.target.value);
      this.floorplan3d.setImageOpacity(opacity);
    });

    // Export button
    document.getElementById('export-btn').addEventListener('click', () => {
      this.exportSelectedLayers();
    });
  }

  async exportSelectedLayers() {
    try {
      const gltfData = await this.floorplan3d.exportSelectedLayersAsGLTF();
      this.downloadFile(gltfData, 'floorplan-export.glb');
    } catch (error) {
      console.error('Export failed:', error);
    }
  }

  downloadFile(data, filename) {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Layer management example
  configureLayers() {
    const layers = this.floorplan3d.layerStore.getAllLayers();
    
    layers.forEach(layer => {
      // Make walls taller
      if (layer.name?.toLowerCase().includes('wall')) {
        this.floorplan3d.updateLayerConfig(
          layer.id, 
          'layerConfigs.extrusion.height.value', 
          3.5
        );
      }
      
      // Make floors semi-transparent
      if (layer.name?.toLowerCase().includes('floor')) {
        this.floorplan3d.updateLayerConfig(
          layer.id, 
          'layerConfigs.extrusion.opacity.value', 
          0.8
        );
      }
    });
  }
}

// Initialize the application
const app = new FloorplanApp('threejs-container');
```

## Integration with Nuxt.js

### Plugin Setup

Create a Nuxt plugin to ensure proper Three.js initialization:

```javascript
// plugins/vue-reactivity-config.client.ts
import { markRaw } from 'vue';

export default defineNuxtPlugin(() => {
  // Prevent Vue from making Three.js objects reactive
  return {
    provide: {
      markRaw
    }
  }
});
```

### Component Integration

```vue
<template>
  <div class="floorplan-app">
    <div ref="threejsContainer" class="threejs-container"></div>
    
    <!-- Layer Controls -->
    <div class="controls-panel">
      <h3>Layer Controls</h3>
      
      <div v-for="layer in layers" :key="layer.id" class="layer-item">
        <label>
          <input 
            type="checkbox" 
            :checked="layer.selected"
            @change="toggleLayer(layer.id)"
          >
          {{ layer.ui?.displayName || layer.name }}
        </label>
      </div>
      
      <!-- Opacity Control -->
      <div class="opacity-control">
        <label>Image Opacity:</label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.1" 
          v-model="imageOpacity"
          @input="updateImageOpacity"
        >
      </div>
      
      <!-- Export Button -->
      <button @click="exportLayers" :disabled="!hasSelectedLayers">
        Export Selected Layers
      </button>
    </div>
  </div>
</template>

<script>
import Floorplan3D from '@2112-lab/floorplan3d';

export default {
  data() {
    return {
      floorplan3d: null,
      layers: {},
      imageOpacity: 1.0
    };
  },
  computed: {
    hasSelectedLayers() {
      return Object.values(this.layers).some(layer => layer.selected);
    }
  },
  mounted() {
    this.initFloorplan3D();
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    initFloorplan3D() {
      const container = this.$refs.threejsContainer;
      if (!container) return;
      
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      
      // Use markRaw to prevent Vue reactivity on Three.js objects
      this.floorplan3d = this.$markRaw(
        new Floorplan3D(container, width, height)
      );
      
      // Auto-load default file if needed
      this.loadDefaultFile();
    },
    
    async loadDefaultFile() {
      try {
        await this.floorplan3d.importFileWithPath('/samples/default.svg');
        this.syncLayers();
      } catch (error) {
        console.error('Failed to load default file:', error);
      }
    },
    
    syncLayers() {
      if (this.floorplan3d?.layerStore) {
        this.layers = { ...this.floorplan3d.layerStore.layers };
      }
    },
    
    toggleLayer(layerId) {
      this.floorplan3d.toggleLayerSelected(layerId);
      this.syncLayers();
    },
    
    updateImageOpacity() {
      this.floorplan3d.setImageOpacity(parseFloat(this.imageOpacity));
    },
    
    async exportLayers() {
      try {
        const gltfData = await this.floorplan3d.exportSelectedLayersAsGLTF();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `floorplan-export-${timestamp}.glb`;
        
        // Download the file
        const blob = new Blob([gltfData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        
      } catch (error) {
        console.error('Export failed:', error);
      }
    },
    
    cleanup() {
      if (this.floorplan3d) {
        this.floorplan3d.renderer?.dispose();
        this.floorplan3d.renderer?.forceContextLoss();
        this.floorplan3d = null;
      }
    }
  }
};
</script>

<style scoped>
.floorplan-app {
  display: flex;
  height: 100vh;
}

.threejs-container {
  flex: 1;
  background-color: #f5f5f5;
}

.controls-panel {
  width: 300px;
  padding: 20px;
  background-color: white;
  border-left: 1px solid #ddd;
  overflow-y: auto;
}

.layer-item {
  margin-bottom: 10px;
  padding: 5px;
  border: 1px solid #eee;
  border-radius: 4px;
}

.opacity-control {
  margin: 20px 0;
}

.opacity-control input[type="range"] {
  width: 100%;
  margin-top: 5px;
}
</style>
```

## Configuration

### Layer Configuration Properties

The module supports various configuration properties for layers:

#### Extrusion Settings
```javascript
// Height of the 3D extrusion
layerConfigs.extrusion.height.value: number

// Starting Z position of the extrusion
layerConfigs.extrusion.start.value: number

// Opacity of the layer
layerConfigs.extrusion.opacity.value: number (0.0 to 1.0)
```

#### Material Settings
```javascript
// Material color in hex format
layerConfigs.material.color.value: string (e.g., "#ff0000")
```

#### Layer Settings
```javascript
// Layer-level opacity
layerConfigs.layer.opacity.value: number (0.0 to 1.0)
```

### Default Configuration

Layers are automatically configured with sensible defaults based on their type (vector vs raster) and metadata.

## Troubleshooting

### Common Issues

**Issue**: Three.js objects become non-reactive in Vue
**Solution**: Use `markRaw()` or `shallowRef()` to prevent Vue from making Three.js objects reactive

```javascript
import { markRaw } from 'vue';
this.floorplan3d = markRaw(new Floorplan3D(container, width, height));
```

**Issue**: Memory leaks when destroying component
**Solution**: Always dispose of the renderer and clear references

```javascript
beforeDestroy() {
  if (this.floorplan3d) {
    this.floorplan3d.renderer?.dispose();
    this.floorplan3d.renderer?.forceContextLoss();
    this.floorplan3d = null;
  }
}
```

**Issue**: Layers not updating after import
**Solution**: Sync layers from the layer store after operations

```javascript
syncLayers() {
  if (this.floorplan3d?.layerStore) {
    this.layers = { ...this.floorplan3d.layerStore.layers };
  }
}
```

**Issue**: Export fails with no selected layers
**Solution**: Check that layers are selected before attempting export

```javascript
const selectedLayers = this.floorplan3d.layerStore.getSelectedLayers();
if (selectedLayers.length === 0) {
  console.warn('No layers selected for export');
  return;
}
```

### Performance Tips

1. **Limit reactivity**: Use `markRaw()` for Three.js objects
2. **Dispose properly**: Always clean up Three.js resources
3. **Batch updates**: When updating multiple layer configs, batch them together
4. **Monitor memory**: Use browser dev tools to check for memory leaks

### Browser Requirements

- Modern browser with WebGL support
- ES6 module support
- File API support (for file import functionality)

## Version Compatibility

This guide is compatible with `@2112-lab/floorplan3d` version 1.0.20 and above.

For the latest API documentation, visit: [Floorplan3D API Docs](https://floorplan3d-api-docs.s3.us-east-1.amazonaws.com/v1.0.19/module-Floorplan3D-Floorplan3D.html)

## Support

For additional samples and resources, check the [Google Drive folder](https://drive.google.com/drive/u/0/folders/1zTYdIR7x45GfZXizlrEXLFuxftiL4BiS) with SVG samples and examples.
