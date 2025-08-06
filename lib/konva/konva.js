import Konva from "konva";

const getRandomId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};


export function handleNoSvgAvailable(layer, stage) {
  Konva.Image.fromURL("/StackOverflow.jpg", function (img) {
    // Get stage dimensions
    const stageWidth = stage.width();
    const stageHeight = stage.height();

    // Calculate scale to fit the image within the stage while maintaining aspect ratio
    const scale =
      Math.min(stageWidth / img.width(), stageHeight / img.height()) * 0.8; // 0.8 to leave some margin

    // Calculate centered position
    const x = (stageWidth - img.width() * scale) / 2;
    const y = (stageHeight - img.height() * scale) / 2;

    img.setAttrs({
      x: x,
      y: y,
      scaleX: scale,
      scaleY: scale,
      cornerRadius: 20,
    });

    layer.add(img);
    layer.draw();
  });
}

// Function to add a raster image to a layer and create a document for it
export function addRasterImageToLayer(imageFile, stage, konvaStore) {
  if (!imageFile || !stage || !konvaStore) return null;

  // Create a new document ID
  const doc_id = `doc_${Object.keys(konvaStore.documents).length + 1}`;

  // Create a new layer for the image
  const imageLayer = new Konva.Group({ name: "rasterImage" });
  konvaStore.baseLayer.add(imageLayer);

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

    // Calculate scale to fit the image within the stage while maintaining aspect ratio
    const displayScale =
      Math.min(stageWidth / image.width, stageHeight / image.height);

    // Scale the image for display
    konvaImage.scale({ x: displayScale, y: displayScale });

    // Calculate centered position
    const x = (stageWidth - image.width * displayScale) / 2;
    const y = (stageHeight - image.height * displayScale) / 2;

    // Position the image
    konvaImage.position({ x, y });

    // Add the document to konva store
    konvaStore.addDocument(doc_id, "rasterImage", {
      konva: {
        layer: imageLayer,
        image: konvaImage,
      },
      imageUrl: imageUrl,
      ui: {
        displayName: "Raster Image",
        order: Object.keys(konvaStore.documents).length + 1,
        menuOpen: false,
      },
      metadata: {
        category: "raster",
        type: "image",
        filename: imageFile.name,
      },
      docConfigs: {
        layer: {
          opacity: {
            min: 0,
            max: 1,
            step: 0.1,
            value: 1,
            default: 1,
          },
          scale: {
            min: 0.1,
            max: 5,
            step: 0.1,
            value: 1, // Set default scale to 1 instead of displayScale
            default: 1, // Set default scale to 1 instead of displayScale
          },
          pos: {
            x: {
              min: -1000,
              max: 1000,
              value: x,
              default: 0,
            },
            y: {
              min: -1000,
              max: 1000,
              value: y,
              default: 0,
            },
          },
        },
      },
    });

    let base64 = null;
    const reader = new FileReader();
    reader.onload = (e) => {
      base64 = e.target.result;
      // console.log("BASE64", base64)
      // Dont add escape characters to the base64 and render image tag
      const svg = `<svg height="${image.height}" width="${image.width}" xmlns="http://www.w3.org/2000/svg"> <image  xlink:href="${base64}" /></svg>`;
      konvaStore.setSvgPolyline(doc_id, svg);
      konvaStore.setSvgPath(doc_id, svg);
    };
    reader.readAsDataURL(imageFile);

    // Activate the document
    konvaStore.setDocumentActive(doc_id);

  };
  image.src = imageUrl;
  konvaStore.baseLayer.batchDraw();
  return doc_id;
}

function getDistance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function findIntersectionInLines(lines) {
  // Find all potential intersection points
  const intersectionPoints = {};
  const intersectionLines = {};

  // Initialize intersectionLines with empty arrays for each line
  Object.values(lines).forEach((line) => {
    intersectionLines[line.id] = [];
  });

  // First, check for endpoints that are in close proximity
  const pointProximityThreshold = 5; // Threshold in pixels to consider points as "connected"

  // Create a list of all endpoints
  const allEndpoints = [];
  Object.values(lines).forEach((line) => {
    allEndpoints.push({
      point: { x: line.points[0], y: line.points[1] },
      lineId: line.id,
      position: "start",
    });
    allEndpoints.push({
      point: { x: line.points[2], y: line.points[3] },
      lineId: line.id,
      position: "end",
    });
  });

  // Check each endpoint against all others for proximity
  for (let i = 0; i < allEndpoints.length; i++) {
    for (let j = i + 1; j < allEndpoints.length; j++) {
      const ep1 = allEndpoints[i];
      const ep2 = allEndpoints[j];

      // Skip if they're from the same line
      if (ep1.lineId === ep2.lineId) continue;

      // Check if endpoints are in close proximity
      const distance = getDistance(ep1.point, ep2.point);

      if (distance <= pointProximityThreshold) {
        // They're close enough to be considered an intersection
        const midPoint = {
          x: (ep1.point.x + ep2.point.x) / 2,
          y: (ep1.point.y + ep2.point.y) / 2,
        };

        const pointId = `p-${Object.keys(intersectionPoints).length + 1}`;

        // Add to intersectionPoints
        intersectionPoints[pointId] = {
          coordinates: midPoint,
          lines: [ep1.lineId, ep2.lineId],
        };

        // Add to intersectionLines
        intersectionLines[ep1.lineId].push(pointId);
        intersectionLines[ep2.lineId].push(pointId);
      }
    }
  }

  // Now check for actual line segment intersections
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const line1 = lines[i];
      const line2 = lines[j];

      // Skip adjacent lines as they naturally share an endpoint
      if (areEndpointsConnected(line1, line2, pointProximityThreshold))
        continue;

      const intersection = findIntersection(line1, line2);

      if (intersection) {
        const pointId = `p-${Object.keys(intersectionPoints).length + 1}`;

        // Add to intersectionPoints
        intersectionPoints[pointId] = {
          coordinates: intersection,
          lines: [line1.id, line2.id],
        };

        // Add to intersectionLines
        intersectionLines[line1.id].push(pointId);
        intersectionLines[line2.id].push(pointId);
      }
    }
  }
  return { intersectionPoints, intersectionLines };
}

// RENDER SVG IN KONVA
export function renderSvgInKonva(layer, objects) {
  if (!layer || !objects) {
    console.warn("Missing required parameters for rendering svg in konva");
    return;
  }

  layer.destroyChildren();
  Object.values(objects).forEach((object, idx) => {
    if (!object || object?.deprecated || object?.originalFill === "#000000")
      return;
    const polyLineGroup = new Konva.Group({
      name: `polyline-group-${idx}`,
      type: "polyline-group",
      id: object.id,
      selected: object.selected || false,
    });
    const polyLine = new Konva.Line({
      id: object.id,
      points: null,
      stroke: object.stroke,
      strokeWidth: object.strokeWidth,
      originalFill: object.fill,
      fill: object.selected ? "#ff0000" : object.fill,
      closed: object.closed,
      selected: object.selected || false,
    });

    polyLineGroup.add(polyLine);
    layer.add(polyLineGroup);

  });
  const baseLayer = layer.getParent();
  baseLayer.batchDraw();

  // Get the active document and update the SVG data
  // const konvaStore = useKonvaStore();
  // const consoleStore = useConsoleStore();
  // const activeDoc = konvaStore.getActiveDocument();

  // // If autoRender is on, auto render the svg in 3d
  // if (isAutoRender()) {
  //   autoRender();
  // }
}



