import { defaultRasterConfigs, defaultVectorConfigs } from "~/store/konva-store";
import { parseSvgToPath } from "./svg";
import { getPointsFromPaths } from "./konva/konva";

/**
 * SVG Document Parser Service
 * 
 * This service handles the parsing of SVG content into document structures
 * that can be used by the application. It extracts the document creation
 * logic from the Konva store to create a clean separation of concerns.
 */
export class SvgDocumentParser {
  
  /**
   * Parse a simple SVG string into a single document
   * @param {string} svgStr - The SVG content as a string
   * @param {Object} options - Optional configuration
   * @returns {Object} Parsed document structure
   */
  static parseSimpleSvg(svgStr, options = {}) {
    try {
      // Parse SVG dimensions
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgStr, "image/svg+xml");
      const svgRoot = svgDoc.querySelector('svg');
      
      const svgWidth = svgRoot ? svgRoot.getAttribute('width') : null;
      const svgHeight = svgRoot ? svgRoot.getAttribute('height') : null;
      const viewBox = svgRoot ? svgRoot.getAttribute('viewBox') : null;
      
      const svgDimensions = {
        width: this.parseSvgDimension(svgWidth),
        height: this.parseSvgDimension(svgHeight),
        viewBox: viewBox ? viewBox.split(' ').map(Number) : null
      };

      // Process the SVG content
            
      // Create a single document ID
      const docId = options.docId || `doc_imported_${Date.now()}`;
      const displayName = options.name || "Imported SVG";
      
      // Create the document structure
      const document = {
        id: docId,
        name: displayName,
        type: 'vector',
        isRaster: false,
        metadata: {
          category: 'vector',
          source: options.source || 'imported',
          svgDimensions
        },
        svgPath: svgStr,
        svgPolyline: null,
        svgData: {
          element: null,
          svgString: svgStr
        },
        konva: {
          objects: null,
          layer: null, // Layer will be set by the caller
        },
        ui: {
          displayName: displayName,
          order: options.order || 2,
          menuOpen: false,
          isExtracting: false,
          isVisible: true
        },
        docConfigs: {
          ...defaultVectorConfigs,
          svg: {
            ...defaultVectorConfigs.svg
          }
        }
      };

      // Return in a consistent structure
      return {
        documents: {
          [docId]: document
        },
        svgDimensions,
        rasterDocuments: [],
        vectorDocuments: [document],
        type: "svg",
      };

    } catch (error) {
      console.error("Error parsing simple SVG:", error);
      throw error;
    }
  }

  /**
   * Parse a complex SVG (like Inkscape files) with multiple layers
   * @param {string} svgStr - The SVG content as a string
   * @param {Object} options - Optional configuration
   * @returns {Object} Parsed documents structure
   */
  static async parseLayeredSvg(svgStr, options = {}) {
    try {
      // Parse the SVG to find specific g-tags
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgStr, "image/svg+xml");
      
      // Extract the SVG root element dimensions
      const svgRoot = svgDoc.querySelector('svg');
      const svgWidth = svgRoot ? svgRoot.getAttribute('width') : null;
      const svgHeight = svgRoot ? svgRoot.getAttribute('height') : null;
      const viewBox = svgRoot ? svgRoot.getAttribute('viewBox') : null;
      
      // Parse SVG dimensions
      const svgDimensions = {
        width: this.parseSvgDimension(svgWidth),
        height: this.parseSvgDimension(svgHeight),
        viewBox: viewBox ? viewBox.split(' ').map(Number) : null
      };
      
      // Create a serializer to convert elements back to string
      const serializer = new XMLSerializer();
      const inkscapeGTagPrefix = options.gTagPrefix || useRuntimeConfig().public.inkscapeGTagPrefix;
      
      // Find all elements with IDs starting with the inkscapeGTagPrefix
      const allFloorplan3dElements = Array.from(svgDoc.querySelectorAll(`g[id^="${inkscapeGTagPrefix}"]`));

      // Filter elements that have exactly zero hyphens after the prefix
      // This prevents the creation of documents from nested svg content.
      const floorplan3dElements = allFloorplan3dElements.filter(element => {
        // Get the part after the prefix
        const suffix = element.id.substring(inkscapeGTagPrefix.length);
        // Count the number of hyphens in the suffix
        const hyphenCount = (suffix.match(/-/g) || []).length;
        // Return true if there's exactly one hyphen
        return hyphenCount === 0;
      });
      
      // Track raster and vector elements separately
      const vectorElements = [];
      const rasterPromises = [];
      const documents = {};
      
      // Process each element
      for (const element of floorplan3dElements) {
        const layerId = element.id;
        const layerName = layerId.replace(inkscapeGTagPrefix, '');
        const displayName = layerName.charAt(0).toUpperCase() + layerName.slice(1);
        const isRaster = !!element.querySelector('image');
        
        // Create SVG string for this layer
        const layerSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            ${serializer.serializeToString(element)}
          </svg>`;
        
        if (isRaster) {
          // Handle raster elements
          const rasterPromise = this.createRasterDocument(
            element, 
            layerId, 
            layerName, 
            displayName, 
            layerSvg, 
            svgDimensions
          );
          rasterPromises.push(rasterPromise);
        } else {
          // Handle vector elements
          const vectorDocument = this.createVectorDocument(
            element,
            layerId,
            layerName,
            displayName,
            layerSvg,
            svgDimensions,
            options
          );
          
          if (vectorDocument) {
            documents[vectorDocument.id] = vectorDocument;
            vectorElements.push(vectorDocument);
          }
        }
      }
      
      // Process all raster elements
      const rasterResults = await Promise.all(rasterPromises);
      const validRasterResults = rasterResults.filter(Boolean);
      
      // Add raster documents to the documents object
      validRasterResults.forEach(doc => {
        if (doc && doc.id) {
          documents[doc.id] = doc;
        }
      });
      
      // Return all processed documents in a flat structure
      return {
        documents,
        svgDimensions,
        rasterDocuments: validRasterResults,
        vectorDocuments: vectorElements,
        type: "svg"
      };
      
    } catch (error) {
      console.error("Error parsing layered SVG:", error);
      throw error;
    }
  }

  /**
   * Create a vector document from an SVG element
   * @private
   */
  static createVectorDocument(element, layerId, layerName, displayName, layerSvg, svgDimensions, options = {}) {
    try {
      const id = options.docId || `doc_${layerName}_${Date.now()}`;
      const svgElement = parseSvgToPath(layerSvg);
      const paths = svgElement.querySelectorAll("path");
      const objects = getPointsFromPaths(paths);

      return {
        id,
        name: displayName,
        type: 'vector',
        isRaster: false,
        metadata: {
          category: 'vector',
          source: options.source || 'inkscape',
          originalId: layerId,
          svgDimensions
        },
        svgPath: layerSvg,
        svgPolyline: null,
        svgData: {
          element: element,
          svgString: layerSvg
        },
        konva: {
          objects: objects,
          layer: null,
        },
        ui: {
          displayName: displayName,
          order: options.order || 2,
          menuOpen: false,
          isExtracting: false,
          isVisible: true
        },
        docConfigs: {
          ...defaultVectorConfigs,
          svg: {
            ...defaultVectorConfigs.svg
          }
        }
      };
    } catch (error) {
      console.error("Error creating vector document:", error);
      return null;
    }
  }

  /**
   * Create a raster document from an SVG element containing an image
   * @private
   */
  static async createRasterDocument(element, layerId, layerName, displayName, layerSvg, svgDimensions) {
    try {
      const imageElement = element.querySelector('image');
      if (!imageElement) {
        return null;
      }

      // Extract image dimensions and position
      const imgWidth = imageElement.getAttribute('width');
      const imgHeight = imageElement.getAttribute('height');
      const imgX = imageElement.getAttribute('x') || 0;
      const imgY = imageElement.getAttribute('y') || 0;
      const preserveAspectRatio = imageElement.getAttribute('preserveAspectRatio');
      
      const imageDimensions = {
        width: this.parseSvgDimension(imgWidth),
        height: this.parseSvgDimension(imgHeight),
        x: parseFloat(imgX),
        y: parseFloat(imgY),
        preserveAspectRatio
      };
      
      // Get the base64 data
      let base64Data = imageElement.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      
      if (base64Data) {
        const imageFile = await this.fetchBase64AsFile(base64Data, `${layerName}-image.jpg`);
        if (imageFile) {
          const metadata = {
            dimensions: imageDimensions,
            svgDimensions: svgDimensions,
            source: 'inkscape',
            originalId: layerId
          };
          
          // Create document with flat structure including UI properties
          const id = `doc_${layerName}_${Date.now()}`;
          return {
            id,
            name: displayName,
            type: 'raster',
            isRaster: true,
            metadata: {
              category: 'raster',
              type: 'image',
              filename: imageFile.name,
              ...metadata
            },
            svgPath: layerSvg,
            svgPolyline: layerSvg,
            imageFile: imageFile,
            imageUrl: URL.createObjectURL(imageFile),
            ui: {
              displayName: displayName,
              order: 2,
              menuOpen: false,
              isExtracting: false,
              isVisible: true
            },
            docConfigs: {
              ...defaultRasterConfigs,
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
                  value: 1,
                  default: 1
                },
                pos: {
                  x: {
                    min: -1000,
                    max: 1000,
                    value: imageDimensions.x,
                    default: 0
                  },
                  y: {
                    min: -1000,
                    max: 1000,
                    value: imageDimensions.y,
                    default: 0
                  }
                }
              }
            }
          };
        }
      }
      return null;
    } catch (error) {
      console.error("Error creating raster document:", error);
      return null;
    }
  }

  /**
   * Parse SVG dimension values
   * @private
   */
  static parseSvgDimension(value) {
    if (!value) return null;
    
    // If it's already a number, return it
    if (!isNaN(parseFloat(value)) && value.trim().match(/^-?\d+(\.\d+)?$/)) {
      return parseFloat(value);
    }
    
    // Handle common SVG units
    const match = value.match(/^([\d.-]+)(\w+)?$/);
    if (!match) return null;
    
    const numValue = parseFloat(match[1]);
    const unit = match[2];
    
    // Convert units to pixels (approximate conversions)
    switch (unit) {
      case 'px':
      case undefined:
        return numValue;
      case 'pt':
        return numValue * 1.33; // 1pt = 1.33px
      case 'pc':
        return numValue * 16; // 1pc = 16px
      case 'mm':
        return numValue * 3.78; // 1mm = 3.78px
      case 'cm':
        return numValue * 37.8; // 1cm = 37.8px
      case 'in':
        return numValue * 96; // 1in = 96px
      default:
        return numValue;
    }
  }

  /**
   * Convert base64 data to a File object
   * @private
   */
  static async fetchBase64AsFile(base64Data, filename) {
    try {
      // Handle data URLs
      if (base64Data.startsWith('data:')) {
        const response = await fetch(base64Data);
        const blob = await response.blob();
        return new File([blob], filename, { type: blob.type });
      }
      
      // Handle plain base64
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Try to determine the MIME type from the base64 header
      let mimeType = 'image/jpeg'; // default
      if (base64Data.startsWith('/9j/')) {
        mimeType = 'image/jpeg';
      } else if (base64Data.startsWith('iVBORw0KGgo')) {
        mimeType = 'image/png';
      } else if (base64Data.startsWith('R0lGODlh')) {
        mimeType = 'image/gif';
      }
      
      const blob = new Blob([bytes], { type: mimeType });
      return new File([blob], filename, { type: mimeType });
    } catch (error) {
      console.error("Error converting base64 to file:", error);
      return null;
    }
  }

  /**
   * Sort documents by type (rooms first, then walls, then others)
   * @param {Array} documents - Array of document objects
   * @returns {Array} Sorted array of documents
   */
  static sortDocumentsByType(documents) {
    return documents.sort((a, b) => {
      // Rooms should come first
      if (a.name.toLowerCase().includes('room') && !b.name.toLowerCase().includes('room')) return -1;
      if (!a.name.toLowerCase().includes('room') && b.name.toLowerCase().includes('room')) return 1;
      // Walls should come second
      if (a.name.toLowerCase().includes('wall') && !b.name.toLowerCase().includes('wall')) return -1;
      if (!a.name.toLowerCase().includes('wall') && b.name.toLowerCase().includes('wall')) return 1;
      return 0;
    });
  }

  /**
   * Assign orders to documents based on their type
   * @param {Array} documents - Array of document objects
   * @returns {Array} Documents with assigned orders
   */
  static assignDocumentOrders(documents) {
    return documents.map(doc => {
      let order = 2; // Default order
      if (doc.name.toLowerCase().includes('room')) {
        order = 1; // Rooms get lowest order (appear first)
      } else if (doc.name.toLowerCase().includes('wall')) {
        order = 2; // Walls get middle order
      }
      
      return {
        ...doc,
        ui: {
          ...doc.ui,
          order: order
        }
      };
    });
  }
}

export default SvgDocumentParser;
