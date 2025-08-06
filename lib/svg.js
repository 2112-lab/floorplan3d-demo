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

export function scaleSvg(svgString, scale) {
  if(!svgString) return;
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  const svgElement = svgDoc.querySelector("svg");
  if(!svgElement) return;
  const paths = svgElement.querySelectorAll("path");
  const polylines = svgElement.querySelectorAll("polyline");
  paths.forEach((path) => {
    const pathCommander = new SVGPathCommander(path.getAttribute("d"));
    const newSvgPath = pathCommander.transform({ scale: scale }).toString();
    path.setAttribute("d", newSvgPath);
  });
  polylines.forEach((polyline) => {
    const points = polyline
      .getAttribute("points")
      .split(" ")
      .map((point) => {
        const [x, y] = point.split(",").map(Number);
        return `${x * scale},${y * scale}`;
      })
      .join(" ");
    polyline.setAttribute("points", points);
  });

  return svgElement.outerHTML;
}

export function translateSvg(svgString, x, y) {
  console.log("translateSvg",svgString, x, y);
  if(!svgString) return;
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  console.log("svgDoc", svgDoc);
  const svgElement = svgDoc.querySelector("svg");
  if(!svgElement) return;
  const paths = svgElement.querySelectorAll("path");
  const polylines = svgElement.querySelectorAll("polyline");
  paths.forEach((path) => {
    const pathCommander = new SVGPathCommander(path.getAttribute("d"));
    const newSvgPath = pathCommander
      .transform({ translate: [x, y] })
      .toString();
    path.setAttribute("d", newSvgPath);
  });
  polylines.forEach((polyline) => {
    const points = polyline
      .getAttribute("points")
      .split(" ")
      .map((point) => {
        const [px, py] = point.split(",").map(Number);
        return `${px + x},${py + y}`;
      })
      .join(" ");
    polyline.setAttribute("points", points);
  });
  return svgElement.outerHTML;
}

export function convertSVG(svgString, mode = "pathToPolyline") {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgString, "image/svg+xml");
  const svg = xmlDoc.querySelector("svg");

  if (!svg) throw new Error("Invalid SVG input");

  if (mode === "pathToPolyline") {
    const paths = svg.querySelectorAll("path");
    paths.forEach((path) => {
      const d = path.getAttribute("d");
      const points = parsePathToPoints(d);
      if (!points.length) return;

      const polyline = xmlDoc.createElementNS(
        "http://www.w3.org/2000/svg",
        "polyline"
      );
      polyline.setAttribute(
        "points",
        points.map((p) => `${p.x},${p.y}`).join(" ")
      );

      // Force styling for polyline output
      polyline.setAttribute("stroke", "black");
      polyline.setAttribute("stroke-width", "2");
      polyline.setAttribute("fill", "none");

      path.replaceWith(polyline);
    });
  } else if (mode === "polylineToPath") {
    const polylines = svg.querySelectorAll("polyline");
    polylines.forEach((polyline) => {
      const pointsAttr = polyline.getAttribute("points");
      if (!pointsAttr) return;

      const points = pointsAttr
        .trim()
        .split(/\s+/)
        .map((p) => {
          const [x, y] = p.split(",").map(Number);
          return { x, y };
        });

      const d = points
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`)
        .join(" ");
      const path = xmlDoc.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);

      copyStyleAttributes(polyline, path);
      polyline.replaceWith(path);
    });
  } else {
    throw new Error("Invalid conversion mode");
  }

  const serializer = new XMLSerializer();
  return serializer.serializeToString(xmlDoc);
}

function parsePathToPoints(d) {
  const commands = d.match(/[a-df-z][^a-df-z]*/gi);
  if (!commands) return [];

  const points = [];
  let current = { x: 0, y: 0 };

  for (const cmd of commands) {
    const type = cmd[0];
    const nums = cmd
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (type.toUpperCase() === "M" || type.toUpperCase() === "L") {
      for (let i = 0; i < nums.length; i += 2) {
        const x = nums[i];
        const y = nums[i + 1];
        points.push({ x, y });
        current = { x, y };
      }
    }
    // Other types (C, Q, Z, etc.) are ignored here
  }

  return points;
}

function copyStyleAttributes(from, to) {
  const attrs = ["stroke", "stroke-width", "fill", "opacity"];
  for (const attr of attrs) {
    if (from.hasAttribute(attr)) {
      to.setAttribute(attr, from.getAttribute(attr));
    }
  }
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


export function combineSvgs(svgs, mode = "path") {
  if (!["path", "polyline"].includes(mode)) {
    throw new Error("Invalid mode. Must be 'path' or 'polyline'.");
  }

  const parser = new DOMParser();
  const shapeTag = mode === "path" ? "path" : "polyline";
  const shapes = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const svgStr of svgs) {
    const doc = parser.parseFromString(svgStr, "image/svg+xml");
    const elements = Array.from(doc.querySelectorAll(shapeTag));
    const otherShapes = doc.querySelectorAll(mode === "path" ? "polyline" : "path");
    if (otherShapes.length > 0) {
      throw new Error(`All SVGs must use only <${shapeTag}> elements.`);
    }

    if (elements.length === 0) {
      continue;
    }

    elements.forEach(el => {
      shapes.push(el.outerHTML);
      const bbox = getBoundingBox(el);
      if (!bbox) return;
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    });
  }

  if (shapes.length === 0) {
    throw new Error("No valid shape elements found.");
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const viewBox = `${minX} ${minY} ${width} ${height}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">${shapes.join("")}</svg>`;
}


function getBoundingBox(el) {
  if (el.tagName === "path") {
    const d = el.getAttribute("d");
    if (!d) return null;
    try {
      const path = new Path2D(d);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const metrics = ctx.measurePath ? ctx.measurePath(path) : null; // Experimental
      if (metrics) {
        return {
          x: metrics.left,
          y: metrics.top,
          width: metrics.width,
          height: metrics.height
        };
      } else {
        // Fallback: use getBBox via SVG
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        const clone = el.cloneNode();
        svg.appendChild(clone);
        document.body.appendChild(svg);
        const bbox = clone.getBBox();
        document.body.removeChild(svg);
        return bbox;
      }
    } catch (e) {
      return null;
    }
  } else if (el.tagName === "polyline") {
    const points = el.getAttribute("points")
      ?.trim()
      .split(/\s+/)
      .map(p => p.split(',').map(Number));
    if (!points || points.length === 0) return null;
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys)
    };
  }
  return null;
}

