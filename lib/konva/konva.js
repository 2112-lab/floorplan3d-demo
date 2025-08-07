import Konva from "konva";

const getRandomId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

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

export function getPointsFromPaths(paths) {
  const pathObjects = {}; // Object to store points and lines for each path

  paths.forEach((path, pathIndex) => {
    const d = path.getAttribute("d");
    const hasZ = d.includes("Z") || d.includes("z");
    if (!d) return;
    console.log("PATH", path);
    let fill = path.getAttribute("fill")  || path.getAttribute("style")?.match(/fill:([^;]+);/)?.[1];
    let stroke = path.getAttribute("stroke") || "#000000";

    let strokeWidth = path.getAttribute("stroke-width");

    if(!strokeWidth) {
      const styleAttribute = path.getAttribute("style") || "stroke-width:1";
      strokeWidth = parseFloat(styleAttribute.match(/stroke-width:([^;]+)/)[1]);
    }    

    const id = getRandomId();

    const commandRegex = /([MLCZVHmlczvh])([^MLCZVHmlczvh]*)/g;

    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;
    let lines = {};
    let points = []; // Points array for this specific path
    let lineCount = 0;

    // CREATE POINTS FROM COMMANDS
    let match;
    while ((match = commandRegex.exec(d)) !== null) {
      const command = match[1];
      const isRelative = command === command.toLowerCase();
      const params = match[2]
        .trim()
        .split(/[\s,]+/)
        .filter((p) => p !== "")
        .map(parseFloat);

      switch (command.toUpperCase()) {
        case "M": // Move to
          if (params.length >= 2) {
            for (let i = 0; i < params.length; i += 2) {
              const x = isRelative ? currentX + params[i] : params[i];
              const y = isRelative ? currentY + params[i + 1] : params[i + 1];

              currentX = x;
              currentY = y;

              // First coordinate of M is move-to, subsequent ones are line-to
              if (i === 0) {
                startX = x;
                startY = y;
                points.push({ x, y }); // Add point for move command
              } else {
                points.push({ x, y }); // Add point for subsequent coordinates
                const lineId = `${id}-line-${++lineCount}`;
                lines[lineId] = {
                  id: lineId,
                  points: [
                    currentX - params[i],
                    currentY - params[i + 1],
                    x,
                    y,
                  ],
                };
              }
            }
          }
          break;

        case "L": // Line to
          for (let i = 0; i < params.length; i += 2) {
            const x = isRelative ? currentX + params[i] : params[i];
            const y = isRelative ? currentY + params[i + 1] : params[i + 1];

            points.push({ x, y }); // Add point for line command
            const lineId = `${id}-line-${++lineCount}`;
            lines[lineId] = {
              id: lineId,
              points: [currentX, currentY, x, y],
            };

            currentX = x;
            currentY = y;
          }
          break;

        case "C": // Cubic Bezier curve - SIMPLIFIED to straight line
          for (let i = 0; i < params.length; i += 6) {
            if (i + 5 >= params.length) break; // Ensure we have all 6 parameters

            // We'll just create a straight line from current point to end point
            const endX = isRelative ? currentX + params[i + 4] : params[i + 4];
            const endY = isRelative ? currentY + params[i + 5] : params[i + 5];

            points.push({ x: endX, y: endY }); // Add point for bezier end point
            const lineId = `${id}-line-${++lineCount}`;
            lines[lineId] = {
              id: lineId,
              points: [currentX, currentY, endX, endY],
            };

            currentX = endX;
            currentY = endY;
          }
          break;

        case "Z": // Close path
          points.push({ x: startX, y: startY }); // Add point for close path
          const lineId = `${id}-line-${++lineCount}`;
          lines[lineId] = {
            id: lineId,
            points: [currentX, currentY, startX, startY],
          };
          currentX = startX;
          currentY = startY;
          break;

        case "H": // Horizontal line
          for (let i = 0; i < params.length; i++) {
            const x = isRelative ? currentX + params[i] : params[i];
            const y = currentY; // Y coordinate stays the same

            points.push({ x, y }); // Add point for horizontal line
            const lineId = `${id}-line-${++lineCount}`;
            lines[lineId] = {
              id: lineId,
              points: [currentX, currentY, x, y],
            };

            currentX = x;
          }
          break;

        case "V": // Vertical line
          for (let i = 0; i < params.length; i++) {
            const x = currentX; // X coordinate stays the same
            const y = isRelative ? currentY + params[i] : params[i];

            points.push({ x, y }); // Add point for vertical line
            const lineId = `${id}-line-${++lineCount}`;
            lines[lineId] = {
              id: lineId,
              points: [currentX, currentY, x, y],
            };

            currentY = y;
          }
          break;
      }
    }
    const { intersectionLines, intersectionPoints } =
      findIntersectionInLines(lines);

    const attrs = {};
    for (const attr of path.attributes) {
      if (attr.name === "d") continue;
      if (attr.name === "id") {
        attrs["figma-id"] = attr.value;
      } else {
        attrs[attr.name] = attr.value;
      }
    }
    // Store points and lines for this path
    pathObjects[id] = {
      id,
      points,
      lines,
      fill,
      stroke,
      strokeWidth,
      originalFill: fill,
      intersectionLines,
      intersectionPoints,
      closed: hasZ,
      attrs: {
        fill: fill,
        id: id,
        ...attrs,
      },
    };
  });
  return pathObjects;
}



