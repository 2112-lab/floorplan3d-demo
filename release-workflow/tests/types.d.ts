// Global type definitions for your application

declare global {
  interface Window {
    // Add your app-specific global objects here
    // Example: yourAppInstance?: any;
    // Replace with actual globals your app exposes
    THREE?: any;
    appInstance?: {
      mainObject?: any;
      sceneHelper?: any;
      components?: any;
      library?: any;
      scene?: any;
      renderer?: any;
      constructor?: {
        name: string;
      };
      exportFunction?: (layer: any, params: any) => Promise<any>;
      dispose?: () => void;
    };
  }
}

// Console message interface for Playwright tests
export interface ConsoleMessage {
  type: string;
  text: string;
}

// WebGL Canvas information interface
export interface WebGLCanvasInfo {
  width: number;
  height: number;
  parentId?: string;
  hasWebGL: boolean;
  contextTaken?: boolean;
}

// Application instance information interface
export interface AppInstanceInfo {
  exists: boolean;
  type: string;
  constructor?: string;
  hasMainObject: boolean;
  hasSceneHelper: boolean;
  hasComponents: boolean;
  hasLibrary: boolean;
  sceneHelperType?: string;
}

// Component library information interface
export interface LibraryInfo {
  loaded: boolean;
  componentCount?: number;
  availableComponents?: string[];
  hasExpectedComponents?: boolean;
}

// 3D scene state interface
export interface SceneState {
  hasAhuObject: boolean;
  hasSceneHelper: boolean;
  componentCount: number;
  timestamp: number;
}

export {};
