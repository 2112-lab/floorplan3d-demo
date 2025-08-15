# Floorplan3D Demo Application

A comprehensive demo application showcasing the `@2112-lab/floorplan3d` npm module for creating interactive 3D floorplan visualizations.

## Quick Start

1. **Install the module:**
   ```bash
   npm install @2112-lab/floorplan3d
   ```

2. **Run the demo:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Features

- 🏗️ **3D Floorplan Rendering** - Convert SVG floorplans to interactive 3D scenes
- 🎨 **Layer Management** - Toggle, configure, and style individual layers
- 📁 **File Import** - Import SVG files via file dialog or programmatically
- 🎛️ **Real-time Configuration** - Adjust layer properties like height, opacity, and color
- 💾 **Export Functionality** - Export selected layers as GLTF/GLB files
- 🖼️ **Image Control** - Manage opacity of image textures

## API Documentation

For comprehensive API documentation and usage examples, see:
- **[Complete API Guide](./FLOORPLAN3D_API_GUIDE.md)** - Detailed documentation with examples
- **[Live Demo](http://localhost:3000)** - Interactive examples in the browser
- **[Official API Docs](https://floorplan3d-api-docs.s3.us-east-1.amazonaws.com/v1.0.19/module-Floorplan3D-Floorplan3D.html)** - Generated documentation

## Key API Methods

```javascript
import Floorplan3D from '@2112-lab/floorplan3d';

// Initialize
const floorplan3d = new Floorplan3D(container, width, height);

// Import files
await floorplan3d.importFile();                    // File dialog
await floorplan3d.importFileWithPath('/file.svg'); // Direct path

// Layer management
floorplan3d.toggleLayerSelected(layerId);
floorplan3d.updateLayerConfig(layerId, configPath, value);
floorplan3d.setImageOpacity(opacity, layerId);

// Export
const gltfData = await floorplan3d.exportSelectedLayersAsGLTF();

// Scene control
floorplan3d.resetScene();
```

## Project Structure

```
├── pages/index.vue              # Main demo application
├── components/
│   ├── threejs-renderer.vue     # Three.js container component
│   └── layers-panel.vue         # Layer management UI
├── floorplan3d/                 # Local development module (when LOCAL_DEV=true)
├── public/samples/              # Sample SVG files
└── FLOORPLAN3D_API_GUIDE.md    # Complete API documentation
```

## Development

This project uses a nested repository setup for local module development:

- **Main app**: Nuxt.js application in the root directory
- **Module source**: Located in `./floorplan3d/` directory
- **Local development**: Set `LOCAL_DEV=true` in `.env` to use local module source

### Environment Variables

Create a `.env` file:
```bash
LOCAL_DEV=true  # Use local module instead of npm package
```

## Sample Files

The application includes sample SVG files in the `public/samples/` directory:
- `FP3D-00-05.svg` - Default sample (auto-loaded in development)
- `FP3D-06-01.svg` - Alternative sample

Additional samples available in the [Google Drive folder](https://drive.google.com/drive/u/0/folders/1zTYdIR7x45GfZXizlrEXLFuxftiL4BiS).

## Browser Requirements

- Modern browser with WebGL support
- ES6 module support
- File API support (for file import)

## Version

Compatible with `@2112-lab/floorplan3d` v1.0.20+

## License

See individual module licenses for details.
