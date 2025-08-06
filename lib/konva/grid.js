import { useKonvaStore } from "~/store/konva-store";
import { getActiveLayer } from "./utils";
import { gridSize } from './pan-zoom';  // Import the grid size constant

// Grid rendering constants
const maxGridMultiplier = 2;
const drawnGridLines = new Set();

export function renderGrid(gridLayer) {

  const konvaStore = useKonvaStore();

  
  if (!gridLayer || !konvaStore.stage) {
    console.log('missing gridLayer or stage');
    return;
  }

  const stage = konvaStore.stage;
  const gridSize = 20; // Base size of each grid cell

  // Get stage dimensions and position
  const stageWidth = stage.width();
  const stageHeight = stage.height();
  const stageX = stage.x();
  const stageY = stage.y();
  const stageScale = stage.scaleX();

 

  // Calculate visible area in stage coordinates, making it 2x the stage size
  const visibleArea = {
    // Center the grid on the stage and extend it 2x in each direction
    x1: (-stageX / stageScale) - (stageWidth / stageScale),
    y1: (-stageY / stageScale) - (stageHeight / stageScale),
    x2: (-stageX / stageScale) + (stageWidth * 2 / stageScale),
    y2: (-stageY / stageScale) + (stageHeight * 2 / stageScale)
  };

 

  // Calculate grid boundaries based on visible area
  const padding = gridSize * 2;
  const startX = Math.floor((visibleArea.x1 - padding) / gridSize) * gridSize;
  const startY = Math.floor((visibleArea.y1 - padding) / gridSize) * gridSize;
  const endX = Math.ceil((visibleArea.x2 + padding) / gridSize) * gridSize;
  const endY = Math.ceil((visibleArea.y2 + padding) / gridSize) * gridSize;

  // Get existing lines
  const existingLines = gridLayer.children.filter(
    (child) => child instanceof Konva.Line
  );


  // Calculate total lines needed
  const totalLinesNeeded =
    Math.ceil((endX - startX) / gridSize) +
    Math.ceil((endY - startY) / gridSize);

  // Only recreate grid if the difference in line count is significant
  const lineCountDifference = Math.abs(existingLines.length - totalLinesNeeded);
  const shouldRecreateGrid = lineCountDifference > 4;



  if (shouldRecreateGrid) {
    gridLayer.destroyChildren();

    // Draw vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      const line = new Konva.Line({
        points: [x, startY, x, endY],
        stroke: "#ddd",
        strokeWidth: 1 / stageScale,
        listening: false,
      });
      gridLayer.add(line);
    }

    // Draw horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      const line = new Konva.Line({
        points: [startX, y, endX, y],
        stroke: "#ddd",
        strokeWidth: 1 / stageScale,
        listening: false,
      });
      gridLayer.add(line);
    }
  } else {
    // Update existing lines
    let lineIndex = 0;

    // Update vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      if (lineIndex < existingLines.length) {
        const line = existingLines[lineIndex++];
        line.points([x, startY, x, endY]);
        line.strokeWidth(1 / stageScale);
      }
    }

    // Update horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      if (lineIndex < existingLines.length) {
        const line = existingLines[lineIndex++];
        line.points([startX, y, endX, y]);
        line.strokeWidth(1 / stageScale);
      }
    }

  }

  // Position the grid layer to match the stage's coordinate system
  gridLayer.position({
    x: 0,
    y: 0,
  });
  gridLayer.scale({
    x: 1,
    y: 1,
  });
  gridLayer.visible(true);  
  konvaStore.baseLayer.batchDraw();
  // gridLayer.draw();
  

}

export function hideGrid(gridLayer) {

  
  if (!gridLayer) {
    console.log('missing gridLayer');
    return;
  }
  
  gridLayer.visible(false);
  gridLayer.destroyChildren();  
}
// GRID RELATED HELPER FUNCTIONS

// SNAPPING  RELATED FUNCTIONS
export function findClosestPoint(points, point) {
  if (!points || points.length === 0) {
    return null;
  }

  let minDistance = Infinity;
  let closestIndex = -1;
  let closestCoordinate = null;

  // Calculate the distance for each point and keep track of the minimum
  points.forEach((coordinate, index) => {
    // Calculate Euclidean distance: √((x2 - x1)² + (y1 - y1)²)
    const distance = Math.sqrt(
      Math.pow(coordinate.x - point.x, 2) + Math.pow(coordinate.y - point.y, 2)
    );

    // Update minimum if this distance is smaller
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
      closestCoordinate = coordinate;
    }
  });

  return {
    index: closestIndex,
    coordinate: closestCoordinate,
    distance: minDistance,
  };
}

export function snapToGrid(point, gridLayer) {
  if (!gridLayer) return point;

  // Get all grid lines that are currently visible
  const gridLines = gridLayer.children.filter(
    (child) => child instanceof Konva.Line && child.visible()
  );

  // If no grid lines are visible, snap to the nearest grid point based on gridSize
  if (gridLines.length === 0) {
    const snappedX = Math.round(point.x / gridSize) * gridSize;
    const snappedY = Math.round(point.y / gridSize) * gridSize;
    return {
      coordinate: { x: snappedX, y: snappedY + 5 }, // Keep the 5 unit offset
      distance: Math.sqrt(
        Math.pow(snappedX - point.x, 2) + Math.pow(snappedY - point.y, 2)
      ),
      index: -1
    };
  }

  // Get the stage scale to account for zoom level
  const stage = gridLayer.getStage();
  const scale = stage ? stage.scaleX() : 1;

  // Calculate the snap threshold based on grid size and scale
  const snapThreshold = gridSize * 0.5; // Snap within half a grid cell

  // Separate horizontal and vertical lines and get their coordinates
  const horizontalLines = new Set();
  const verticalLines = new Set();

  gridLines.forEach((line) => {
    const points = line.points();
    if (Math.abs(points[1] - points[3]) < 0.001) { // horizontal line
      horizontalLines.add(points[1]); // y coordinate
    } else if (Math.abs(points[0] - points[2]) < 0.001) { // vertical line
      verticalLines.add(points[0]); // x coordinate
    }
  });

  // Convert Sets to sorted arrays for easier processing
  const hLines = Array.from(horizontalLines).sort((a, b) => a - b);
  const vLines = Array.from(verticalLines).sort((a, b) => a - b);

  // Find the nearest grid lines
  let nearestH = null;
  let nearestV = null;
  let minHDist = Infinity;
  let minVDist = Infinity;

  // Find nearest horizontal line
  for (const y of hLines) {
    const dist = Math.abs(y - point.y);
    if (dist < minHDist) {
      minHDist = dist;
      nearestH = y;
    }
  }

  // Find nearest vertical line
  for (const x of vLines) {
    const dist = Math.abs(x - point.x);
    if (dist < minVDist) {
      minVDist = dist;
      nearestV = x;
    }
  }

  // If we're within snap threshold of both lines, snap to intersection
  if (nearestH !== null && nearestV !== null && 
      minHDist <= snapThreshold && minVDist <= snapThreshold) {
    return {
      coordinate: { x: nearestV, y: nearestH + 5 }, // Keep the 5 unit offset
      distance: Math.sqrt(minHDist * minHDist + minVDist * minVDist),
      index: -1
    };
  }

  // If we're only within threshold of one line, snap to that line
  if (nearestH !== null && minHDist <= snapThreshold) {
    return {
      coordinate: { x: point.x, y: nearestH + 5 },
      distance: minHDist,
      index: -1
    };
  }
  if (nearestV !== null && minVDist <= snapThreshold) {
    return {
      coordinate: { x: nearestV, y: point.y + 5 },
      distance: minVDist,
      index: -1
    };
  }

  // If we're not close enough to any line, snap to nearest grid point
  const snappedX = Math.round(point.x / gridSize) * gridSize;
  const snappedY = Math.round(point.y / gridSize) * gridSize;
  return {
    coordinate: { x: snappedX, y: snappedY + 5 },
    distance: Math.sqrt(
      Math.pow(snappedX - point.x, 2) + Math.pow(snappedY - point.y, 2)
    ),
    index: -1
  };
}

export function renderVisibleGridLines(stage, gridLayer) {
  // Clear previously drawn grid lines
  gridLayer.destroyChildren();
  drawnGridLines.clear();

  const scale = stage.scaleX(); // Assume uniform scale
  const stageWidth = stage.width();
  const stageHeight = stage.height();
  const visibleWidth = stageWidth / scale;
  const visibleHeight = stageHeight / scale;

  const offsetX = stage.x() / scale;
  const offsetY = stage.y() / scale;

  const visibleX = -offsetX;
  const visibleY = -offsetY;

  const centerX = visibleX + visibleWidth / 2;
  const centerY = visibleY + visibleHeight / 2;

  const horizontalLineLength = visibleWidth * maxGridMultiplier;
  const verticalLineLength = visibleHeight * maxGridMultiplier;

  const startX = Math.floor(visibleX / gridSize) * gridSize;
  const endX = Math.ceil((visibleX + visibleWidth) / gridSize) * gridSize;

  const startY = Math.floor(visibleY / gridSize) * gridSize;
  const endY = Math.ceil((visibleY + visibleHeight) / gridSize) * gridSize;

  for (let x = startX; x <= endX; x += gridSize) {
    const key = `v-${x}`;
    if (!drawnGridLines.has(key)) {
      const line = new Konva.Line({
        points: [x, centerY - verticalLineLength / 2, x, centerY + verticalLineLength / 2],
        stroke: '#ddd',
        strokeWidth: 1,
        listening: false,
      });
      gridLayer.add(line);
      drawnGridLines.add(key);
    }
  }

  for (let y = startY; y <= endY; y += gridSize) {
    const key = `h-${y}`;
    if (!drawnGridLines.has(key)) {
      const line = new Konva.Line({
        points: [centerX - horizontalLineLength / 2, y, centerX + horizontalLineLength / 2, y],
        stroke: '#ddd',
        strokeWidth: 1,
        listening: false,
      });
      gridLayer.add(line);
      drawnGridLines.add(key);
    }
  }

  gridLayer.getParent().batchDraw();
}

export function lineIntersectsRect(x1, y1, x2, y2, rect) {
  const { x, y, width, height } = rect;

  // If both points are outside on the same side, it's not visible
  const inside =
    (x1 >= x && x1 <= x + width && y1 >= y && y1 <= y + height) ||
    (x2 >= x && x2 <= x + width && y2 >= y && y2 <= y + height);

  if (inside) return true;

  // Check for actual intersection
  return (
    lineIntersectsLine(x1, y1, x2, y2, x, y, x + width, y) || // Top
    lineIntersectsLine(x1, y1, x2, y2, x, y, x, y + height) || // Left
    lineIntersectsLine(x1, y1, x2, y2, x + width, y, x + width, y + height) || // Right
    lineIntersectsLine(x1, y1, x2, y2, x, y + height, x + width, y + height)    // Bottom
  );
}

export function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
  // Helper function to check if two lines (x1,y1)-(x2,y2) and (x3,y3)-(x4,y4) intersect
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return false;

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}
