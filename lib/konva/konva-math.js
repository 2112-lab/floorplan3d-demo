// HELPER MATHEMATICAL FUNCTIONS
export function flatToXyPoints(points, scaleFactor = 1) {
  const xyPoints = [];
  for (let i = 0; i < points.length; i += 2) {
    xyPoints.push({
      x: points[i] * scaleFactor,
      y: points[i + 1] * scaleFactor,
    });
  }
  return xyPoints;
}
function getDistance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}
export function formsClosedPolygon(lines) {
  if (!lines || Object.keys(lines).length === 0) {
    return false;
  }

  const tolerance = 5; // Allow 5 units of gap between points
  const points = new Set();
  const connections = new Map();

  // Helper to stringify points for easy comparison
  const key = (x, y) => `${x},${y}`;

  // Helper to check if two points are close enough
  const arePointsClose = (x1, y1, x2, y2) => {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  };

  // First pass: collect all points and their connections
  for (const line of Object.values(lines)) {
    if (!line.points || line.points.length !== 4) continue;

    const [x1, y1, x2, y2] = line.points;
    const startKey = key(x1, y1);
    const endKey = key(x2, y2);

    points.add(startKey);
    points.add(endKey);

    if (!connections.has(startKey)) connections.set(startKey, new Set());
    if (!connections.has(endKey)) connections.set(endKey, new Set());
    connections.get(startKey).add(endKey);
    connections.get(endKey).add(startKey);
  }

  // Find endpoints (points with only one connection)
  const endpoints = Array.from(connections.entries())
    .filter(([_, connected]) => connected.size === 1)
    .map(([point]) => point);

  // If we have exactly 2 endpoints, check if they're close enough to form a closed shape
  if (endpoints.length === 2) {
    const [end1, end2] = endpoints;
    const [x1, y1] = end1.split(",").map(Number);
    const [x2, y2] = end2.split(",").map(Number);

    // If endpoints are close enough, consider it a closed polygon
    if (arePointsClose(x1, y1, x2, y2)) {
      return true;
    }
  }

  // If no endpoints, it's already a closed polygon
  if (endpoints.length === 0) {
    return true;
  }

  return false;
}
export function canBeClosed(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return false; // Not enough points to form a polygon
  }

  const first = points[0];
  const last = points[points.length - 1];

  const dx = first.x - last.x;
  const dy = first.y - last.y;
  const distanceSquared = dx * dx + dy * dy;

  return distanceSquared <= 4;
}
export function xyToFlatPoints(points, scaleFactor = 1) {
  const flatPoints = [];
  for (let i = 0; i < points.length; i++) {
    flatPoints.push(points[i].x * scaleFactor, points[i].y * scaleFactor);
  }
  return flatPoints;
}
export function findHorizontalMidLine(points) {
  points = flatToXyPoints(points);
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const point of points) {
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
  }
  const midY = (minY + maxY) / 2;

  return [minX, midY, maxX, midY];
}
export function getRandomHexColor() {
  let color;
  do {
    color =
      "#" +
      Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, "0");
  } while (color === "#000000" || color === "#FFFFFF" || color === "#FF0000");
  return color;
}
export function pointsEqual(p1, p2) {
  const epsilon = 0.0001; // Small value to account for floating point precision
  return Math.abs(p1.x - p2.x) < epsilon && Math.abs(p1.y - p2.y) < epsilon;
}
function areCollinear(p1, p2, p3) {
  // Calculate the area of the triangle formed by the three points
  // If the area is zero (or very close to zero), the points are collinear
  const area = Math.abs(
    (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2
  );

  // Use a small epsilon value to account for floating point precision
  return area < 0.0001;
}
export function getLinesFromPoints(
  polygonPoints,
  id,
  closed = false,
  gapSize = 0
) {
  const lines = {};
  let lineCounter = 0;
  const totalPoints = polygonPoints.length;

  // Helper function to create a point with a small gap in the direction toward another point
  const createGappedPoint = (x1, y1, x2, y2) => {
    // Calculate direction vector
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Calculate length of the vector
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length < gapSize * 2) {
      // If points are too close, return midpoint to avoid issues
      return [x1 + dx / 2, y1 + dy / 2];
    }

    // Normalize the vector and multiply by gap size
    const nx = dx / length;
    const ny = dy / length;

    // Return point with gap
    return [x1 + nx * gapSize, y1 + ny * gapSize];
  };

  for (let i = 0; i < totalPoints - 2; i += 2) {
    const x1 = polygonPoints[i];
    const y1 = polygonPoints[i + 1];
    const x2 = polygonPoints[i + 2];
    const y2 = polygonPoints[i + 3];

    // Create gapped points
    const [startX, startY] = createGappedPoint(x1, y1, x2, y2);
    const [endX, endY] = createGappedPoint(x2, y2, x1, y1);

    const lineId = `${id}-line-${lineCounter++}`;
    lines[lineId] = {
      id: lineId,
      points: [startX, startY, endX, endY],
      originalPoints: [x1, y1, x2, y2], // Keep original points for reference if needed
    };
  }

  // Only add closing line if closed is true and points are different
  if (closed) {
    const firstX = polygonPoints[0];
    const firstY = polygonPoints[1];
    const lastX = polygonPoints[totalPoints - 2];
    const lastY = polygonPoints[totalPoints - 1];

    if (totalPoints >= 4 && (firstX !== lastX || firstY !== lastY)) {
      // Create gapped points for the closing line
      const [startX, startY] = createGappedPoint(lastX, lastY, firstX, firstY);
      const [endX, endY] = createGappedPoint(firstX, firstY, lastX, lastY);

      const lineId = `${id}-line-${lineCounter++}`;
      lines[lineId] = {
        id: lineId,
        points: [startX, startY, endX, endY],
        originalPoints: [lastX, lastY, firstX, firstY],
      };
    }
  }

  return lines;
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
export function linesToPolylines(lines) {
  if (!lines || Object.keys(lines).length === 0) {
    return [];
  }

  // First, find the start and end points of the polyline
  const lineArray = Object.values(lines);
  const points = new Set();
  const connections = new Map();

  // Track all points and their connections
  lineArray.forEach((line) => {
    if (!line.points || line.points.length !== 4) return;

    const start = `${line.points[0]},${line.points[1]}`;
    const end = `${line.points[2]},${line.points[3]}`;

    points.add(start);
    points.add(end);

    if (!connections.has(start)) connections.set(start, new Set());
    if (!connections.has(end)) connections.set(end, new Set());
    connections.get(start).add(end);
    connections.get(end).add(start);
  });

  // Find endpoints (points with only one connection)
  const endpoints = Array.from(connections.entries())
    .filter(([_, connected]) => connected.size === 1)
    .map(([point]) => point);

  // If we have exactly 2 endpoints, it's an open polyline
  const isOpenPolyline = endpoints.length === 2;

  if (isOpenPolyline) {
    // For open polylines, build the path following the actual line connections
    const polygonPoints = [];
    const visited = new Set();
    let currentPoint = endpoints[0];

    while (currentPoint && !visited.has(currentPoint)) {
      visited.add(currentPoint);
      const [x, y] = currentPoint.split(",").map(Number);
      polygonPoints.push(x, y);

      const connectedPoints = Array.from(connections.get(currentPoint));
      // Find the next unvisited point
      currentPoint = connectedPoints.find((p) => !visited.has(p));
    }

    return polygonPoints;
  }

  // For closed polygons, use the original logic
  const polygonPoints = [];
  const lineIds = Object.keys(lines);

  // Add first line's start point
  const firstLine = lines[lineIds[0]];
  if (firstLine && firstLine.points && firstLine.points.length >= 2) {
    polygonPoints.push(firstLine.points[0], firstLine.points[1]);
  }

  // Add each line's end point in order
  lineIds.forEach((lineId) => {
    const line = lines[lineId];
    if (line && line.points && line.points.length >= 4) {
      polygonPoints.push(line.points[2], line.points[3]);
    }
  });

  // Validate all points are numbers
  for (let i = 0; i < polygonPoints.length; i++) {
    if (typeof polygonPoints[i] !== "number" || isNaN(polygonPoints[i])) {
      console.warn("Invalid point detected:", polygonPoints[i], "at index:", i);
      polygonPoints[i] = 0;
    }
  }

  return polygonPoints;
}
// END HELPER MATHEMATICAL FUNCTIONS

// SPLIT POLYGON HELPER FUNCTIONS
export function splitPolygonByLine(polygonPoints, splitLineCoords) {
  function getLineIntersection(A, B, P1, P2) {
    const a1 = B.y - A.y;
    const b1 = A.x - B.x;
    const c1 = a1 * A.x + b1 * A.y;
    const a2 = P2.y - P1.y;
    const b2 = P1.x - P2.x;
    const c2 = a2 * P1.x + b2 * P1.y;
    const determinant = a1 * b2 - a2 * b1;

    if (Math.abs(determinant) < 1e-10) return null;

    const x = (b2 * c1 - b1 * c2) / determinant;
    const y = (a1 * c2 - a2 * c1) / determinant;

    if (
      x >= Math.min(P1.x, P2.x) - 5 &&
      x <= Math.max(P1.x, P2.x) + 5 &&
      y >= Math.min(P1.y, P2.y) - 5 &&
      y <= Math.max(P1.y, P2.y) + 5
    ) {
      return { x, y };
    }
    return null;
  }

  function sortPointsClockwise(points) {
    const centroid = points.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );
    centroid.x /= points.length;
    centroid.y /= points.length;
    points.sort(
      (a, b) =>
        Math.atan2(a.y - centroid.y, a.x - centroid.x) -
        Math.atan2(b.y - centroid.y, b.x - centroid.x)
    );
  }

  const points = [];
  for (let i = 0; i < polygonPoints.length; i += 2) {
    points.push({ x: polygonPoints[i], y: polygonPoints[i + 1] });
  }

  const splitLine = [
    { x: splitLineCoords[0], y: splitLineCoords[1] },
    { x: splitLineCoords[2], y: splitLineCoords[3] },
  ];

  const [A, B] = splitLine;
  let intersections = [];
  for (let i = 0; i < points.length; i++) {
    const P1 = points[i];
    const P2 = points[(i + 1) % points.length];
    const intersection = getLineIntersection(A, B, P1, P2);
    if (intersection) {
      intersections.push(intersection);
    }
  }

  if (intersections.length < 2) {
    return null;
  }

  const polygon1 = [];
  const polygon2 = [];
  let currentPolygon = polygon1;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const side = (B.x - A.x) * (point.y - A.y) - (B.y - A.y) * (point.x - A.x);

    if (side >= 0) {
      polygon1.push(point);
    } else {
      polygon2.push(point);
    }

    for (const intersection of intersections) {
      const prevPoint = points[(i - 1 + points.length) % points.length];
      if (
        intersection.x >= Math.min(prevPoint.x, point.x) - 5 &&
        intersection.x <= Math.max(prevPoint.x, point.x) + 5 &&
        intersection.y >= Math.min(prevPoint.y, point.y) - 5 &&
        intersection.y <= Math.max(prevPoint.y, point.y) + 5
      ) {
        currentPolygon.push(intersection);
        currentPolygon = currentPolygon === polygon1 ? polygon2 : polygon1;
        currentPolygon.push(intersection);
      }
    }
  }

  sortPointsClockwise(polygon1);
  sortPointsClockwise(polygon2);

  return {
    polygon1,
    polygon2,
  };
}

// MERGE POLYGON HELPER FUNCTIONS
export function findCommonBoundary(points1, points2, tolerance) {
  const matches = [];

  // Find all potential matching points within tolerance
  for (let i = 0; i < points1.length; i++) {
    const p1 = points1[i];

    for (let j = 0; j < points2.length; j++) {
      const p2 = points2[j];

      // Check if points are close enough
      if (getDistance(p1, p2) <= tolerance) {
        matches.push({
          index1: i,
          index2: j,
          midPoint: {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
          },
        });
      }
    }
  }

  // Filter matches to find consecutive points forming a boundary
  const boundary = [];

  for (const match of matches) {
    // For simplicity, we'll just collect all matching points for now
    boundary.push(match.midPoint);
  }

  return boundary;
}
export function findBoundaryIndices(points, boundary, tolerance) {
  let indices = [];

  // Find all points that are part of the boundary
  for (let i = 0; i < points.length; i++) {
    const point = points[i];

    for (const boundaryPoint of boundary) {
      if (getDistance(point, boundaryPoint) <= tolerance) {
        indices.push(i);
        break;
      }
    }
  }

  // Sort indices to find continuous segments
  indices.sort((a, b) => a - b);

  // Check if the boundary wraps around from end to start
  if (indices.length > 0) {
    if (indices[indices.length - 1] === points.length - 1 && indices[0] === 0) {
      // Shift array so the boundary segment doesn't wrap
      const newStartIndex = indices.findIndex((idx) => idx > 0) || 0;
      indices = [
        ...indices.slice(newStartIndex),
        ...indices.slice(0, newStartIndex),
      ];
    }
  }

  // Return start and end indices of the boundary
  if (indices.length >= 2) {
    return {
      start: indices[0],
      end: indices[indices.length - 1],
    };
  }

  return null;
}
export function reorderPointsForMerge(points, boundary) {
  // Find a point that's on the boundary
  let startIndex = -1;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];

    // Check if this point is near any boundary point
    for (const boundaryPoint of boundary) {
      if (getDistance(point, boundaryPoint) <= 4) {
        startIndex = i;
        break;
      }
    }

    if (startIndex !== -1) break;
  }

  if (startIndex === -1) return points; // No boundary point found

  // Reorder array so that the boundary point is first
  return [...points.slice(startIndex), ...points.slice(0, startIndex)];
}

export function createMergedPolygonFromPoints(
  points1,
  points2,
  boundaryIndices1,
  boundaryIndices2
) {
  const tolerance = 0.001; // Tolerance for point comparison
  const mergedPoints = [];

  // Helper function to check if points are equal
  function arePointsEqual(p1, p2) {
    return (
      Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance
    );
  }

  // Helper function to add point if it's not a duplicate of the last point
  function addPointIfNotDuplicate(point) {
    if (
      mergedPoints.length === 0 ||
      !arePointsEqual(mergedPoints[mergedPoints.length - 1], point)
    ) {
      mergedPoints.push({ x: point.x, y: point.y });
    }
  }

  // Start at the beginning of polygon 1
  // Add points from polygon 1 before the boundary
  for (let i = 0; i < boundaryIndices1.start; i++) {
    addPointIfNotDuplicate(points1[i]);
  }

  // Add points from polygon 2 that are not part of the boundary
  // We need to traverse polygon 2 in the correct direction
  const startIdx2 = boundaryIndices2.end;
  const endIdx2 = boundaryIndices2.start;

  // Determine the direction to traverse polygon 2
  if (startIdx2 < endIdx2) {
    // Forward traversal
    for (let i = startIdx2 + 1; i < points2.length; i++) {
      addPointIfNotDuplicate(points2[i]);
    }
    for (let i = 0; i < endIdx2; i++) {
      addPointIfNotDuplicate(points2[i]);
    }
  } else {
    // Reverse traversal
    for (let i = startIdx2 - 1; i >= 0; i--) {
      addPointIfNotDuplicate(points2[i]);
    }
    for (let i = points2.length - 1; i > endIdx2; i--) {
      addPointIfNotDuplicate(points2[i]);
    }
  }

  // Add points from polygon 1 after the boundary
  for (let i = boundaryIndices1.end + 1; i < points1.length; i++) {
    addPointIfNotDuplicate(points1[i]);
  }

  // Ensure the polygon is closed
  if (
    mergedPoints.length > 0 &&
    !arePointsEqual(mergedPoints[0], mergedPoints[mergedPoints.length - 1])
  ) {
    mergedPoints.push({ x: mergedPoints[0].x, y: mergedPoints[0].y });
  }

  // Simplify the polygon by removing collinear points
  const simplifiedPoints = removeCollinearPoints(mergedPoints, tolerance);

  return simplifiedPoints;
}
function removeCollinearPoints(points, tolerance = 0.001) {
  if (points.length <= 3) return points;

  const result = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Calculate vectors
    const v1 = [curr.x - prev.x, curr.y - prev.y];
    const v2 = [next.x - curr.x, next.y - curr.y];

    // Normalize vectors
    const len1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
    const len2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);

    if (len1 < tolerance || len2 < tolerance) continue;

    const norm1 = [v1[0] / len1, v1[1] / len1];
    const norm2 = [v2[0] / len2, v2[1] / len2];

    // Calculate dot product
    const dotProduct = norm1[0] * norm2[0] + norm1[1] * norm2[1];

    // If vectors are not collinear (dot product not close to 1 or -1)
    if (Math.abs(Math.abs(dotProduct) - 1) > tolerance) {
      result.push({ x: curr.x, y: curr.y });
    }
  }

  // Add the last point
  result.push(points[points.length - 1]);

  return result;
}
// END MERGE POLYGON HELPER FUNCTIONS

// DELETE POINT HELPER FUNCTIONS
export function deletePoint(polygonPoints, pointToDelete) {
  polygonPoints = flatToXyPoints(polygonPoints);
  // Step 1: Check conditions where point cannot be deleted

  // Condition 1: Minimum vertex requirement - cannot have fewer than 3 points
  if (polygonPoints.length <= 3) {
    return polygonPoints;
  }

  // Find the index of the point to delete
  const indexToDelete = polygonPoints.findIndex(
    (p) => p.x === pointToDelete.x && p.y === pointToDelete.y
  );

  // Check if point exists in the polygon
  if (indexToDelete === -1) {
    return polygonPoints;
  }

  // Condition 2: Check if removing this point would create collinearity between adjacent points
  const prevIndex =
    (indexToDelete - 1 + polygonPoints.length) % polygonPoints.length;
  const nextIndex = (indexToDelete + 1) % polygonPoints.length;

  const prevPoint = polygonPoints[prevIndex];
  const nextPoint = polygonPoints[nextIndex];

  if (areCollinear(prevPoint, pointToDelete, nextPoint)) {
    // We allow collinearity if the resulting polygon still maintains its shape
    // This is actually okay in most cases - we're just simplifying the polygon
  }

  // Step 2: Delete the point and return new polygon
  const newPolygonPoints = [...polygonPoints];
  newPolygonPoints.splice(indexToDelete, 1);

  return newPolygonPoints;
}
// END DELETE POINT HELPER FUNCTIONS

// AUTO ADJUST LINE HELPER FUNCTIONS
export function straightenLineOnHandleClick(points, clickedHandleIndex) {
  // Get current line points

  // Extract coordinates
  const startX = points[0];
  const startY = points[1];
  const endX = points[2];
  const endY = points[3];

  // Determine if the line is more horizontal or vertical
  const deltaX = Math.abs(endX - startX);
  const deltaY = Math.abs(endY - startY);
  const isMoreHorizontal = deltaX >= deltaY;

  // Calculate the length of the line
  const lineLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  // Create result object for the new coordinates
  let result = {
    startX: startX,
    startY: startY,
    endX: endX,
    endY: endY,
  };

  // Handle clicked is the start point (index 0)
  if (clickedHandleIndex === 0) {
    // Start point stays fixed
    if (isMoreHorizontal) {
      // Make it horizontal
      result.endX = startX + (endX > startX ? lineLength : -lineLength);
      result.endY = startY;
    } else {
      // Make it vertical
      result.endX = startX;
      result.endY = startY + (endY > startY ? lineLength : -lineLength);
    }
  }
  // Handle clicked is the end point (index 1)
  else if (clickedHandleIndex === 1) {
    // End point stays fixed
    if (isMoreHorizontal) {
      // Make it horizontal
      result.startX = endX + (startX > endX ? lineLength : -lineLength);
      result.startY = endY;
    } else {
      // Make it vertical
      result.startX = endX;
      result.startY = endY + (startY > endY ? lineLength : -lineLength);
    }
  }

  return result;
}

export function updateHandlesPosition(handles, newCords) {
  handles[0].x(newCords.startX);
  handles[0].y(newCords.startY);
  handles[1].x(newCords.endX);
  handles[1].y(newCords.endY);
}

export function getOldAndNewPoints(originalPoints, newPoints) {
  if (newPoints[0] === originalPoints[0]) {
    return {
      oldPoint: { x: originalPoints[2], y: originalPoints[3] },
      newPoint: { x: newPoints[2], y: newPoints[3] },
    };
  }
  if (newPoints[2] === originalPoints[2]) {
    return {
      oldPoint: { x: originalPoints[0], y: originalPoints[1] },
      newPoint: { x: newPoints[0], y: newPoints[1] },
    };
  }
  return {};
}

export function updateConnectedLines(obj, lineId, originalPoint, newPoint) {
  const pointsOnClickedLine = obj.intersectionLines[lineId] || [];
  // Find all connected lines that share points with the clicked line
  const connectedLines = new Set();
  pointsOnClickedLine.forEach((pointId) => {
    if (obj.intersectionPoints[pointId]) {
      obj.intersectionPoints[pointId].lines.forEach((line) => {
        if (line !== lineId) {
          connectedLines.add(line);
        }
      });
    }
  });

  // Calculate the movement vector
  const dx = newPoint.x - originalPoint.x;
  const dy = newPoint.y - originalPoint.y;

  // Find points that match or are very close to our original point
  const affectedPointIds = [];
  pointsOnClickedLine.forEach((pointId) => {
    const point = obj.intersectionPoints[pointId];
    if (!point || !point.coordinates) return;

    const isAtOriginal =
      Math.abs(point.coordinates.x - originalPoint.x) < 2 &&
      Math.abs(point.coordinates.y - originalPoint.y) < 2;

    if (isAtOriginal) {
      affectedPointIds.push(pointId);
    }
  });

  const updatedLines = {};

  connectedLines.forEach((lineId) => {
    // Get points on this connected line
    const linePoints = obj.intersectionLines[lineId] || [];

    // Initialize arrays for previous and new points
    const prevPoints = [];
    const newPoints = [];

    // Process each point on the line
    linePoints.forEach((pointId) => {
      const point = obj.intersectionPoints[pointId];
      if (!point || !point.coordinates) return;

      // Store the previous point coordinates
      prevPoints.push(point.coordinates.x, point.coordinates.y);

      // Check if this is an affected point (at the original position)
      const isAffectedPoint = affectedPointIds.includes(pointId);

      // Create new points (with adjustment if affected)
      if (isAffectedPoint) {
        newPoints.push(point.coordinates.x + dx, point.coordinates.y + dy);
      } else {
        newPoints.push(point.coordinates.x, point.coordinates.y);
      }
    });

    // Only include this line if it shares the specific endpoint that moved
    const hasAffectedPoint = linePoints.some((pointId) =>
      affectedPointIds.includes(pointId)
    );

    if (hasAffectedPoint) {
      updatedLines[lineId] = {
        id: lineId,
        points: newPoints,
        prevPoints: prevPoints,
      };
    }
  });

  return updatedLines;
}
// end
