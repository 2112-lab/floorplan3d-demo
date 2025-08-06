# Floorplan3D App

A web application for creating and manipulating 2D floorplans with 3D visualization capabilities.

## File Structure

```
floorplan3d-app/
├── components/
│   ├── ai-console/                 # AI chatbot interface
│   ├── chat-window/               # Chat interface
│   ├── editing-panel/             # Editing tools panel
│   ├── global-snackbar/           # Global notifications
│   ├── konva-renderer/            # Konva canvas renderer
│   ├── left-panel/                # Left sidebar controls
│   ├── room-info/                 # Room information display
│   ├── sliding-viewport/          # Viewport controls
│   ├── status-bar/                # Bottom status bar
│   ├── SVGViewer/                 # SVG preview component
│   ├── threejs-renderer/          # Three.js 3D renderer
│   ├── SVGCodeHighlight.vue       # SVG code syntax highlighting
│   └── exports.vue                # Export functionality
├── lib/
│   ├── konva.js                   # Core Konva rendering functions
│   ├── konva-helpers.js           # Mathematical helper functions
│   ├── walls-helpers.js           # Wall-specific rendering functions
│   └── three.js                   # Three.js 3D rendering functions
├── store/
│   ├── console-store.js           # Console output state management
│   ├── edit.js                    # Edit mode state management
│   ├── konva-store.js             # Konva canvas state management
│   ├── notification.js            # Notification state management
│   └── three-store.js             # Three.js state management
├── layouts/                       # Page layouts
├── pages/                         # Application pages
├── plugins/                       # Vue plugins
├── public/                        # Static assets
├── server/                        # Server-side code
├── app.vue                        # Root component
├── app.css                        # Global styles
├── nuxt.config.ts                 # Nuxt configuration
└── tsconfig.json                  # TypeScript configuration
```

## Component Descriptions

### Core Components
- **konva-renderer**: Main 2D canvas renderer using Konva.js
- **threejs-renderer**: 3D visualization renderer using Three.js
- **left-panel**: Contains settings and controls for walls, rooms, and layers
- **editing-panel**: Contains editing tools and options
- **status-bar**: Shows current coordinates and layer selection

### Utility Components
- **ai-console**: AI-powered chatbot interface for assistance
- **chat-window**: Chat interface for user interaction
- **SVGViewer**: Displays and previews SVG content
- **room-info**: Shows detailed information about selected rooms
- **global-snackbar**: Displays system notifications
- **sliding-viewport**: Controls for viewport manipulation

### Library Files
- **konva.js**: Core Konva rendering functions and canvas management
- **konva-helpers.js**: Mathematical utilities for:
  - Point calculations
  - Line intersections
  - Polygon operations
- **walls-helpers.js**: Wall-specific rendering and manipulation functions
- **three.js**: Three.js 3D rendering and scene management

### Store Files
- **console-store.js**: Manages console output and SVG generation
- **edit.js**: Handles edit mode states and layer selection
- **konva-store.js**: Manages Konva canvas state and wall/room data
- **three-store.js**: Manages Three.js scene state and 3D settings
- **notification.js**: Manages system notifications

## Commands

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Generate static site
npm run generate
```
