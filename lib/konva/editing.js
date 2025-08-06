import { createMergedPolygonFromPoints, findBoundaryIndices, findCommonBoundary, findIntersectionInLines, flatToXyPoints, getLinesFromPoints, getRandomHexColor, reorderPointsForMerge, splitPolygonByLine, xyToFlatPoints } from "./konva-math";
import { getRandomId } from "./utils";

export function createDragHandle(x, y, index, properties) {
  return new Konva.Circle({
    ...properties,
    index,
    pointIndex: index,
    x,
    y,
  });
}

export function createMergedPolygon(merged) {
  const fillColor = getRandomHexColor();
  const lines = getLinesFromPoints(xyToFlatPoints(merged.points), fillColor);
  const { intersectionLines, intersectionPoints } =
    findIntersectionInLines(lines);
  const mergedObject = {
    id: merged.id,
    fill: fillColor,
    originalFill: fillColor, // Set originalFill in the room object as well
    attrs: {
      id: merged.id,
      fillColor,
      tags: [],
      merged: true,
    },
    points: merged.points,
    lines,
    intersectionLines,
    intersectionPoints,
    closed: true,
    mode: "polygon",
  };
  return mergedObject;
}

export function renderSplitLine(doc_id, obj_id, splitLineCoord, store, layer) {
  const line = new Konva.Line({
    points: splitLineCoord,
    stroke: "black",
    strokeWidth: 2,
    lineJoin: "round",
    dash: [20, 5],
  });

  const updateLine = () => {
    line.points([handle1.x(), handle1.y(), handle2.x(), handle2.y()]);

    store.updateSplitLine({
      doc_id: doc_id,
      obj_id: obj_id,
      line: line.points(),
    });
  };

  const createHandle = (x, y) => {
    return new Konva.Circle({
      fill: "white",
      radius: 3,
      stroke: "3",
      draggable: true,
      x,
      y,
    }).on("dragmove", updateLine);
  };

  const handle1 = createHandle(splitLineCoord[0], splitLineCoord[1]);
  const handle2 = createHandle(splitLineCoord[2], splitLineCoord[3]);

  const group = new Konva.Group({});
  group.add(line);
  group.add(handle1);
  group.add(handle2);
  layer.add(group);
  layer.draw();
  store.updateSplitStage({ doc_id, obj_id, stage: 2 });
}

export function splitPolygonInTwo(selectedRoom, splitLine, store) {
  const polys = splitPolygonByLine(
    xyToFlatPoints(selectedRoom.points),
    splitLine
  );
  let roomcolor1 = getRandomHexColor();
  let roomcolor2 = getRandomHexColor();
  if (polys == null || !polys.polygon1 || !polys.polygon2)
    return console.error("Unable to split this room, cannot find intersection");

  const room1 = new Konva.Line({
    id: roomcolor1,
    fill: roomcolor1,
    originalFill: roomcolor1,
    points: polys.polygon1,
    stroke: "2",
    closed: true,
    selected: false,
  });
  const room2 = new Konva.Line({
    id: roomcolor2,
    fill: roomcolor2,
    originalFill: roomcolor2,
    points: polys.polygon2,
    stroke: "2",
    closed: true,
    selected: false,
  });

  const room1lines = getLinesFromPoints(
    room1.points(),
    room1.fill,
    room1.closed
  );
  const room2lines = getLinesFromPoints(
    room2.points(),
    room2.fill,
    room2.closed
  );
  const room1intersection = findIntersectionInLines(room1lines);
  const room2intersection = findIntersectionInLines(room2lines);
  return [
    {
      ...room1.attrs,
      attrs: {
        id: room1.id(),
        fill: room1.attrs.fill,
        tags: [],
        type: "Room",
      },
      polygon: room1,
      polygonPoints: room1.points(),
      lines: room1lines,
      intersectionLines: room1intersection.intersectionLines,
      intersectionPoints: room1intersection.intersectionPoints,
    },
    {
      ...room2.attrs,
      attrs: {
        id: room2.id(),
        fill: room2.attrs.fill,
        tags: [],
        type: "Room",
      },
      polygon: room2,
      polygonPoints: room2.points(),
      lines: room2lines,
      intersectionLines: room2intersection.intersectionLines,
      intersectionPoints: room2intersection.intersectionPoints,
    },
  ];
}

export function mergePolys(poly1, poly2, tolerance = 4) {
  // Make copies to avoid mutating original data
  const points1 = flatToXyPoints(poly1.points());
  const points2 = flatToXyPoints(poly2.points());

  // Find common boundary segments
  const commonBoundary = findCommonBoundary(points1, points2, tolerance);

  if (commonBoundary.length < 2) {
    console.error("No common boundary found between polygons");
    return null;
  }

  // Reorder points to ensure boundary segments are consecutive
  const orderedPoints1 = reorderPointsForMerge(points1, commonBoundary);
  const orderedPoints2 = reorderPointsForMerge(points2, commonBoundary);

  // Calculate boundary start and end indices
  const boundaryIndices1 = findBoundaryIndices(
    orderedPoints1,
    commonBoundary,
    tolerance
  );
  const boundaryIndices2 = findBoundaryIndices(
    orderedPoints2,
    commonBoundary,
    tolerance
  );

  if (!boundaryIndices1 || !boundaryIndices2) {
    console.error("Failed to find boundary indices");
    return null;
  }

  // Create merged polygon by following the outer path
  const mergedPoints = createMergedPolygonFromPoints(
    orderedPoints1,
    orderedPoints2,
    boundaryIndices1,
    boundaryIndices2
  );

  // Create the new room object
  const id = getRandomId();
  return {
    id: id,
    points: mergedPoints,
  };
}
