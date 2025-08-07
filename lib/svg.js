import SVGPathCommander from "svg-path-commander";

const transformArray = (str) => str.match(/\w+\s*\([^)]*\)/g);
const translateMatch = (str) =>
  str.match(
    /translate\s*\(\s*([+-]?\d*\.?\d+)(?:\s*,\s*([+-]?\d*\.?\d+))?\s*\)/
  );
const rotateMatch = (str) =>
  str.match(
    /rotate\s*\(\s*([+-]?\d*\.?\d+)(?:(?:\s*,\s*|\s+)([+-]?\d*\.?\d+)\s*(?:,\s*|\s+)([+-]?\d*\.?\d+))?\s*\)/
  );
const scaleMatch = (str) =>
  str.match(
    /scale\s*\(\s*([+-]?\d*\.?\d+)(?:\s*[,\s]\s*([+-]?\d*\.?\d+))?\s*\)/
  );
const skewXMatch = (str) => str.match(/skewX\s*\(\s*([+-]?\d*\.?\d+)\s*\)/);
const skewYMatch = (str) => str.match(/skewY\s*\(\s*([+-]?\d*\.?\d+)\s*\)/);
const matrixMatch = (str) => str.match(/matrix\s*\(\s*([^\)]+)\s*\)/);
const renderableSVGTags = new Set([
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
]);

export const parseSvgToPath = (svgStr) => {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgStr, "image/svg+xml");
  const svgElement = svgDoc.querySelector("svg");

  // Create a new SVG element instead of cloning
  const flattenedSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );

  // Copy attributes from original SVG to flattened SVG
  Array.from(svgElement.attributes).forEach((attr) => {
    flattenedSvg.setAttribute(attr.name, attr.value);
  });

  console.log("svgElement before flattening", svgElement.cloneNode(true));

  // Process and append only flattened <path> tags
  flattenAndConvertToPaths(svgElement, flattenedSvg);
  
  console.log("flattenedSvg", flattenedSvg);

  const trnasformedPaths = applyTransformToPaths(flattenedSvg);

  return trnasformedPaths;
};

export const applyTransformToPaths = (svgElement) => {
  // Get all paths that make up the shape
  const paths = svgElement.querySelectorAll("path");

  paths.forEach((path) => {
    const transform = path.getAttribute("transform");
    const d = path.getAttribute("d");
    if (!transform || !d) return;

    const pathCommander = new SVGPathCommander(d);
    const transformObject = getTransformObject(transform);

    // Add the common origin to the transform object
    const transformedD = pathCommander
      .transform({
        ...transformObject,
      })
      .toString();

    path.setAttribute("d", transformedD);
    path.removeAttribute("transform");
  });

  return svgElement;
};

const getTransformObject = (transformStr) => {
  const arr = transformArray(transformStr);
  const translate = translateMatch(transformStr);
  const rotate = rotateMatch(transformStr);
  const scale = scaleMatch(transformStr);
  const skewX = skewXMatch(transformStr);
  const skewY = skewYMatch(transformStr);
  const matrix = matrixMatch(transformStr);

  let transforms = {};

  arr.forEach((transform) => {
    console.log("transform", transform);
    if (transform.includes("translate")) {
      transforms.translate = [
        parseFloat(translate[1]),
        parseFloat(translate[2]) || 0,
      ];
    } else if (transform.includes("rotate")) {
      const angle = parseFloat(rotate[1]);
      transforms.rotate = angle;
    } else if (transform.includes("scale")) {
      const scaleX = parseFloat(scale[1]);
      const scaleY = parseFloat(scale[2]) || 1;
      if (scaleX === 1 && scaleY == 1) {
        transforms.scale = scaleX;
      } else {
        transforms.scale = [scaleX, scaleY];
      }
    } else if (transform.includes("skewX")) {
      const sX = parseFloat(skewX[1]);
      if (transforms.skew) {
        transforms.skew = [sX, transforms.skew[1] || 0];
      } else {
        transforms.skew = [sX, 0];
      }
    } else if (transform.includes("skewY")) {
      const sY = parseFloat(skewY[1]);
      if (transforms.skew) {
        transforms.skew = [transforms.skew[0] || 0, sY];
      } else {
        transforms.skew = [0, sY];
      }
    } else if (transform.includes("matrix")) {
      const [a, b, c, d, e, f] = matrix[1].split(/[\s,]+/).map(Number);
      const { translate, rotate, scale, skewX } = decomposeMatrix(
        a,
        b,
        c,
        d,
        e,
        f
      );
      transforms.translate = translate;
      transforms.rotate = rotate;
      transforms.scale = scale;
      transforms.skew = skewX;
    }
  });

  console.log("transforms", transforms);
  return transforms;
};

function decomposeMatrix(a, b, c, d, e, f) {
  const scaleX = Math.sqrt(a * a + b * b);
  let scaleY = Math.sqrt(c * c + d * d);
  let determinant = a * d - b * c;
  if (determinant < 0) {
    // Handle reflection
    scaleY = -scaleY;
  }

  const rotate = Math.atan2(b, a) * (180 / Math.PI);
  const skewX = Math.atan2(a * c + b * d, scaleX * scaleX) * (180 / Math.PI);

  return {
    translate: [e, f],
    rotate,
    scale: [scaleX, scaleY],
    skewX,
  };
}

function flattenAndConvertToPaths(
  element,
  svgRoot,
  parentGroupId = null,
  parentTransform = null
) {
  // Create a snapshot of children to avoid live collection issues
  const children = Array.from(element.children);

  // Get this element's transform if it's a group
  const elementTransform =
    element.tagName?.toLowerCase() === "g"
      ? element.getAttribute("transform")
      : null;

  // Combine parent transform with this element's transform
  let combinedTransform = parentTransform;
  if (elementTransform) {
    console.log(`Group transform found: "${elementTransform}"`);
    combinedTransform = combinedTransform
      ? `${elementTransform} ${combinedTransform}`
      : elementTransform;
    console.log(`Combined transform is now: "${combinedTransform}"`);
  }

  children.forEach((child) => {
    const tag = child.tagName?.toLowerCase();

    if (!tag) return;

    if (tag === "g") {
      // For group elements, process their children recursively
      const groupId = child.id || parentGroupId;
      console.log(
        `Processing group ${
          groupId || "without ID"
        } with combined transform: "${combinedTransform || "none"}"`
      );
      flattenAndConvertToPaths(child, svgRoot, groupId, combinedTransform);
    } else if (renderableSVGTags.has(tag)) {
      console.log(
        `Processing ${tag} element with combined transform: "${
          combinedTransform || "none"
        }"`
      );
      let pathElement;

      if (tag === "path") {
        // Create a new path element instead of cloning
        pathElement = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );

        // Copy all attributes
        Array.from(child.attributes).forEach((attr) => {
          pathElement.setAttribute(attr.name, attr.value);
        });

        // Optimize the path data
        const pathData = child.getAttribute("d");
        if (pathData) {
          const optimisedPath = new SVGPathCommander(pathData, { round: 2 })
            .optimize()
            .toString();
          pathElement.setAttribute("d", optimisedPath);
        }
      } else {
        // For other shapes, use SVGPathCommander to convert to path
        try {
          // We need to clone the element first to avoid modifying the original
          const tempElement = child.cloneNode(true);
          pathElement = SVGPathCommander.shapeToPath(tempElement, true);

          // Optimize the path data
          const pathData = pathElement.getAttribute("d");
          if (pathData) {
            const optimisedPath = new SVGPathCommander(pathData, { round: 2 })
              .optimize()
              .toString();
            pathElement.setAttribute("d", optimisedPath);
          }
        } catch (error) {
          console.error(`Error converting ${tag} to path:`, error);
          return;
        }
      }

      // Handle transforms - combine parent group transforms with element transforms
      const elementTransform = child.getAttribute("transform");
      console.log(`Element transform: "${elementTransform || "none"}"`);

      if (combinedTransform) {
        if (elementTransform) {
          // If the element already has a transform, prepend the group transform
          const finalTransform = `${combinedTransform} ${elementTransform}`;
          pathElement.setAttribute("transform", finalTransform);
        } else {
          // If the element has no transform, just use the group transform
          // console.log(`Setting group transform: "${combinedTransform}"`);
          pathElement.setAttribute("transform", combinedTransform);
        }
      } else if (elementTransform) {
        pathElement.setAttribute("transform", elementTransform);
      }

      // Add group ID marker if needed
      if (parentGroupId) {
        pathElement.setAttribute(`g-${parentGroupId}`, "true");
      }

      // Add the path to the root SVG
      svgRoot.appendChild(pathElement);

      // Verify the transform was set correctly
      console.log(
        `Final path transform: "${
          pathElement.getAttribute("transform") || "none"
        }"`
      );
    }
  });
}

export function toSvg(data, format = "path", group = false) {
  if (!data || Object.keys(data).length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"></svg>';
  }

  const dimensions = calculateSvgDimensions(data);
  const groups = {};
  const ungrouped = [];

  console.log("data", data);

  Object.keys(data).forEach((objectId) => {
    const object = data[objectId];
    if (object.deprecated) return;

    const points = object.points;
    const closed = object.closed;
    const attrs = object.attrs || {};

    const pathData =
      points
        .map((pt, idx) => {
          return `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`;
        })
        .join(" ") + (closed ? " Z" : "");

    const attrPairs = Object.entries(attrs);
    let groupKey = null;

    // Detect the group from g-* attributes
    attrPairs.forEach(([key, value]) => {
      const match = key.match(/^g-(.+)/);
      if (match && value === "true") {
        groupKey = match[1];
      }
    });

    // Construct attribute string (avoid duplicates)
    const uniqueAttrs = attrPairs.filter(
      (attr, index, self) => index === self.findIndex((t) => t[0] === attr[0])
    );
    const attrsString = uniqueAttrs
      .map(([k, v]) => `${k.trim().replace(" ", "-")}="${v}"`)
      .join(" ");

    const shape =
      format === "polyline"
        ? `<polyline points="${points
            .map((p) => `${p.x},${p.y}`)
            .join(" ")}" ${attrsString} />`
        : `<path d="${pathData}" ${attrsString} />`;

    if (groupKey) {
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(shape);
    } else {
      ungrouped.push(shape);
    }
  });

  let svgContent = "";

  if (group) {
    // Only export selected group
    if (groups[group]) {
      svgContent = `<g id="${group}">\n${groups[group].join("\n")}\n</g>`;
    }
  } else {
    // Export all groups + ungrouped
    Object.entries(groups).forEach(([groupName, elements]) => {
      svgContent += `<g id="${groupName}">\n${elements.join("\n")}\n</g>\n`;
    });
    svgContent += ungrouped.join("\n");
  }

  const svg =
    formatSVG(`<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="${dimensions.viewBox}">
      ${svgContent}
      </svg>`);

  return svg;
}

function calculateSvgDimensions(data) {
  console.log("data", data);
  if (!data) return;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  // Find min/max coordinates across all objects
  Object.values(data).forEach((object) => {
    if (!object && !object.points) return;
    object.points.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
  });

  // Add some padding (10px on each side)
  const padding = 10;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = maxX - minX;
  const height = maxY - minY;
  const viewBox = `${minX} ${minY} ${width} ${height}`;

  return {
    width,
    height,
    viewBox,
    minX,
    minY,
    maxX,
    maxY,
  };
}

export function formatSVG(svgString) {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  const svgElement = svgDoc.querySelector("svg");
  
  // Remove any existing transform attributes from the root SVG
  svgElement.removeAttribute("transform");
  
  // Get all paths and polylines
  const paths = svgElement.querySelectorAll("path");
  const polylines = svgElement.querySelectorAll("polyline");
  
  // Process paths
  paths.forEach(path => {
    const d = path.getAttribute("d");
    if (d) {
      // Remove any transform attributes from paths
      path.removeAttribute("transform");
      // Ensure the path data is properly formatted
      path.setAttribute("d", d.trim());
    }
  });
  
  // Process polylines
  polylines.forEach(polyline => {
    const points = polyline.getAttribute("points");
    if (points) {
      // Remove any transform attributes from polylines
      polyline.removeAttribute("transform");
      // Ensure the points data is properly formatted
      polyline.setAttribute("points", points.trim());
    }
  });
  
  return svgElement.outerHTML;
}

export function parseSvgDimension(value) {
  if (!value) return null;
  
  // If it's already a number, return it
  if (!isNaN(parseFloat(value)) && value.trim().match(/^-?\d+(\.\d+)?$/)) {
    return parseFloat(value);
  }
  
  // Handle common SVG units
  const match = value.match(/^([\d.-]+)(\w+)?$/);
  if (!match) return null;
  
  const numValue = parseFloat(match[1]);
  const unit = match[2] || 'px';
  
  // Convert units to pixels
  // These are rough approximations, as actual conversion depends on screen DPI
  switch (unit.toLowerCase()) {
    case 'mm':
      return numValue * 3.779528; // Approximate mm to px conversion
    case 'cm':
      return numValue * 37.79528; // Approximate cm to px conversion
    case 'in':
      return numValue * 96; // Standard 96dpi
    case 'pt':
      return numValue * 1.333333; // 1pt = 1.333333px at 96dpi
    case 'pc':
      return numValue * 16; // 1pc = 16px at 96dpi
    case 'em':
      return numValue * 16; // Assuming 1em = 16px
    case 'rem':
      return numValue * 16; // Assuming 1rem = 16px
    case 'px':
    default:
      return numValue;
  }
}

const getRandomId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

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