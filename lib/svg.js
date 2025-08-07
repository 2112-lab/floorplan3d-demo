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

