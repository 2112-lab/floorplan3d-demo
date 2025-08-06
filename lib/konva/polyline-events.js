import { useEditStore } from "~/store/edit";
import { useKonvaStore } from "~/store/konva-store";
import { createDragHandle } from "./editing";
import { handleLineClick, handleLineHandleDragEnd, handleLineHandleDragMove, handleLineHandleDragStart } from "./line-events";
import { renderSvgInKonva } from "./konva";
import { 
  canBeClosed, 
  flatToXyPoints, 
  getLinesFromPoints,
  findIntersectionInLines,
  formsClosedPolygon,
  linesToPolylines,
  getOldAndNewPoints,
  updateConnectedLines,
  straightenLineOnHandleClick,
} from "./konva-math";
import { findClosestPoint, snapToGrid } from "./grid";

export const polyLineHandleDragStart = (e) => {
  const konvaStore = useKonvaStore();
  konvaStore.saveState();
};
export const polyLineHandleDragMove = (e) => {
  const handle = e.target;
  const polyline = handle.getParent().children[0];
  if (!polyline) return;
  const pointIndex = handle.attrs.pointIndex;
  const flatPoints = polyline.points();
  flatPoints[pointIndex * 2] = handle.x();
  flatPoints[pointIndex * 2 + 1] = handle.y();
  polyline.points(flatPoints);
};
export const polyLineHandleDragEnd = (e) => {
  const handle = e.target;
  const editStore = useEditStore();
  const polyline = handle.getParent().children[0];
  if (!polyline) return;

  const konvaStore = useKonvaStore();
  const doc = konvaStore.getActiveDocument();
  if (!doc) return;
  const object = doc.konva.objects[polyline.attrs.id];
  if (!object) return;

  // Get the current points from the polyline
  const flatpoints = polyline.points();
  let points = flatToXyPoints(flatpoints);
  console.log("points", points);

  // If grid snap is enabled, snap the moved point to grid
  if (editStore.isGridSnapEnabled()) {
    const pointIndex = handle.attrs.pointIndex;
    const movedPoint = points[pointIndex];
    const gridLayer = konvaStore.gridLayer;
    const closestPoint = snapToGrid(movedPoint, gridLayer);
    // if(closestPoint.distance < 20){
      points[pointIndex] = closestPoint.coordinate;
    // }
    
  }

  // If point snap is enabled, snap the moved point to the closest point on the polyline
  if (editStore.isPointSnapEnabled()) {
    console.log("point snap is enabled");
    const pointIndex = handle.attrs.pointIndex;
    const movedPoint = points[pointIndex];
    // This point also contains the point which is moved, hence, the closed, is the moved one itself, so we need to remove the moved point from the points array
    const pointsWithoutMovedPoint = points.filter((_, index) => index !== pointIndex);
    const closestPoint = findClosestPoint(pointsWithoutMovedPoint, movedPoint);
    if(closestPoint.distance < 20){
      points[pointIndex] = closestPoint.coordinate;
    }
   
  }

  // Determine if the polyline forms a closed polygon
  let closed = !polyline.attrs.closed
    ? canBeClosed(points)
    : polyline.attrs.closed;

  // Generate lines from points
  const lines = getLinesFromPoints(flatpoints, polyline.attrs.id, closed);
  console.log("lines", lines);

  // Find intersections
  const { intersectionLines, intersectionPoints } =
    findIntersectionInLines(lines);

  console.log("lines", lines);
  // Update the object with new data
  const newObject = {
    ...object,
    points: points,
    lines: lines,
    intersectionLines: intersectionLines,
    intersectionPoints: intersectionPoints,
    closed: closed,
  };

  // Update the store and save state
  konvaStore.setKonvaObject(doc.id, polyline.attrs.id, newObject);
  konvaStore.saveState();

  // Render the updated SVG
  renderSvgInKonva(doc.konva.layer, doc.konva.objects);
};
export const handlePolylineClick = (e) => {
  const isMetaKey = e.evt.metaKey || e.evt.ctrlKey;
  const clickedObject = e.target;

  // Determine if we clicked on a polyline or a group
  let polylineGroup, polyline;

  const konvaStore = useKonvaStore();
  const activeDoc = konvaStore.getActiveDocument();
  
  if(!konvaStore.clickedObjectInActiveDocument(clickedObject.attrs.id)) return;

  if (clickedObject instanceof Konva.Line) {
    // We clicked directly on a polyline
    polyline = clickedObject;
    polylineGroup = polyline.getParent();
  } else if (clickedObject.attrs.type === "polyline-group") {
    // We clicked on a polyline group
    polylineGroup = clickedObject;
    polyline = polylineGroup.children.find(
      (child) => child instanceof Konva.Line
    );
  } else {
    // We clicked on something else, possibly a handle
    return;
  }

  if (!polylineGroup || !polyline) {
    console.error("Could not identify polyline structure", clickedObject);
    return;
  }

  const layer = polylineGroup.getLayer();
  const allPolylineGroups = layer.find("[type='polyline-group']");

  const selectedGroups = allPolylineGroups.filter(
    (group) => group.attrs.selected
  );
  const selectedCount = selectedGroups.length;

  if (!isMetaKey) {
    // Deselect all other polyline groups and remove their handles
    allPolylineGroups.forEach((group) => {
      group.attrs.selected = false;

      const groupPolyline = group.children.find(
        (child) => child instanceof Konva.Line
      );
      if (groupPolyline) {
        groupPolyline.attrs.selected = false;

        if (groupPolyline.attrs.closed) {
          groupPolyline.fill(groupPolyline.attrs.originalFill || "#000000");
        } else {
          groupPolyline.stroke("#000000");
        }
      }

      // Remove all handles from the group
      group.find("Circle").forEach((handle) => {
        handle.destroy();
      });
    });

    // Select the clicked polyline group and create handles
    polylineGroup.attrs.selected = true;
    polyline.attrs.selected = true;

    if (polyline.attrs.closed) {
      polyline.fill("#ff0000");
    } else {
      polyline.stroke("#ff0000");
    }

    // Create and add handles for the selected polyline
    const object = activeDoc.konva.objects[polyline.attrs.id];
    if (object) {
      const handles = addHandlesToPolyline(object);
      handles.forEach((handle) => {
        polylineGroup.add(handle);
        handle.on("dragstart", polyLineHandleDragStart);
        handle.on("dragmove", polyLineHandleDragMove);
        handle.on("dragend", polyLineHandleDragEnd);
        handle.on("click", handlePolylineHandleClick);
        handle.on("dblclick", handleHandleDoubleClick);
      });
    }
    polylineGroup.find("Circle").forEach((handle) => {
      handle.visible(true);
      handle.radius(getHandleRadius());
    });
  } else {
    // Handle meta key selection logic (toggle selection)
    if (polylineGroup.attrs.selected) {
      // Deselect and remove handles
      polylineGroup.attrs.selected = false;
      polyline.attrs.selected = false;

      if (polyline.attrs.closed) {
        polyline.fill(polyline.attrs.originalFill || "#000000");
      } else {
        polyline.stroke("#000000");
      }

      // Remove all handles from the group
      polylineGroup.find("Circle").forEach((handle) => {
        handle.destroy();
        // handle.visible(false);
        
      });
    } else if (selectedCount < 2) {
      // Select if fewer than 2 are already selected and create handles
      polylineGroup.attrs.selected = true;
      polyline.attrs.selected = true;

      if (polyline.attrs.closed) {
        polyline.fill("#ff0000");
      } else {
        polyline.stroke("#ff0000");
      }

      // Create and add handles for the selected polyline
      const object = activeDoc.konva.objects[polyline.attrs.id];
      if (object) {
        const handles = addHandlesToPolyline(object);
        handles.forEach((handle) => {
          polylineGroup.add(handle);
          handle.on("dragstart", polyLineHandleDragStart);
          handle.on("dragmove", polyLineHandleDragMove);
          handle.on("dragend", polyLineHandleDragEnd);
          handle.on("click", handlePolylineHandleClick);
          handle.on("dblclick", handleHandleDoubleClick);
        });
      }
      polylineGroup.find("Circle").forEach((handle) => {
        handle.visible(true);       
      });
    } else {
      alert("You can only select 2 polygons at a time");
    }
  }

  // Update the data structure in the store
  if (activeDoc && polyline.attrs.id) {
    const objects = { ...activeDoc.konva.objects };

    // Update selection state in the store
    Object.keys(objects).forEach((key) => {
      if (key === polyline.attrs.id) {
        objects[key].selected = polyline.attrs.selected;
      } else if (!isMetaKey) {
        objects[key].selected = false;
      }
    });

    konvaStore.setKonvaObjects(activeDoc.id, objects);
  }

  // Redraw the layer to reflect changes
  layer.batchDraw();
};
export const handlePolylineHandleClick = (e) => {
  const handle = e.target;
  if (handle.attrs.selected) {
    handle.setAttrs({
      fill: "#ffffff",
      selected: false,
    });
  } else {
    handle.fill("#ff0000");
    handle.setAttrs({
      selected: true,
    });
  }
};
export const handleHandleDoubleClick = (e) => {
  if (!(e.target instanceof Konva.Circle)) return;
  const handle = e.target;
  const group = handle.getParent();
  // Can be polyline or a single line
  const line = group.children[0];
  const objectId = line.attrs.id.split("-")[0];
  if (!objectId) return;

  const konvaStore = useKonvaStore();
  const doc = konvaStore.getActiveDocument();
  const object = doc.konva.objects[objectId];
  if (!object) return;

  let lineToModify = null;
  const pointIndex = handle.attrs.pointIndex;
  if (group.attrs.type === "polyline-single-line-group") {
    lineToModify = object.lines[line.attrs.id];
  } else {
    lineToModify = Object.values(object.lines)[pointIndex];
  }
  const originalPoints = lineToModify.points;

  const autoAdjust =
    useEditStore().checkboxes.find((checkbox) => checkbox.name === "autoAdjust")
      ?.value ?? true;

  if (autoAdjust) {
    // First straighten the clicked line
    let newCords = straightenLineOnHandleClick(lineToModify.points, pointIndex);
    let newPoints = [
      newCords.startX,
      newCords.startY,
      newCords.endX,
      newCords.endY,
    ];

    // Update the clicked line first
    const updatedLines = {
      ...object.lines,
      [lineToModify.id]: {
        id: lineToModify.id,
        points: newPoints,
      },
    };

    // Then update connected lines
    const { oldPoint, newPoint } = getOldAndNewPoints(
      originalPoints,
      newPoints
    );

    if (oldPoint && newPoint) {
      const changedLines = updateConnectedLines(
        object,
        lineToModify.id,
        oldPoint,
        newPoint
      );
      Object.assign(updatedLines, changedLines);
    }

    const polygonPoints = linesToPolylines(updatedLines);
    const { intersectionLines, intersectionPoints } =
      findIntersectionInLines(updatedLines);

    konvaStore.setKonvaObject(doc.id, objectId, {
      ...object,
      lines: updatedLines,
      points: flatToXyPoints(polygonPoints),
      intersectionLines,
      intersectionPoints,
    });
    renderSvgInKonva(doc.konva.layer, doc.konva.objects);
  } else {
    let newCords = straightenLineOnHandleClick(lineToModify.points, pointIndex);
    let newPoints = [
      newCords.startX,
      newCords.startY,
      newCords.endX,
      newCords.endY,
    ];
    const updatedLines = {
      ...object.lines,
      [lineToModify.id]: {
        id: lineToModify.id,
        points: newPoints,
      },
    };
    const isClosed = formsClosedPolygon(updatedLines);
    const points = linesToPolylines(updatedLines, isClosed);
    const { intersectionLines, intersectionPoints } =
      findIntersectionInLines(updatedLines);

    konvaStore.setKonvaObject(doc.id, objectId, {
      ...object,
      lines: updatedLines,
      points: flatToXyPoints(points),
      closed: isClosed,
      intersectionLines,
      intersectionPoints,
    });
    konvaStore.saveState();
    renderSvgInKonva(doc.konva.layer, doc.konva.objects);
  }
}
export const handlePolylineDoubleClick = (e) => {
  const konvaStore = useKonvaStore();
  const handle = e.target;
  const layer = handle.getLayer();
  console.log("LAYER", layer);
  const polylineGroup = handle.getParent();
  const polyline = polylineGroup.children[0];


  if(!konvaStore.clickedObjectInActiveDocument(handle.attrs.id)) return;

  if (!polyline) return;

  polylineGroup.find("Circle").forEach((handle) => {
    handle.visible(false);
  });
  polylineGroup.attrs.selected = false;
  polyline.setAttrs({
    opacity: 0.5,
    mode: "line",
    selected: false,
  });
  polyline.listening(false);
  const lineGroup = new Konva.Group({
    name: `polyline-${polyline.attrs.id}-lines-group`,
    type: "polyline-lines-group",
  });
  const lines =
    konvaStore.getActiveDocument().konva.objects[polyline.attrs.id].lines;
  Object.values(lines).forEach((lineObject) => {
    const singleLineGroup = new Konva.Group({
      name: `object-${polyline.attrs.id}-line-group-${lineObject.id}`,
      type: "polyline-single-line-group",
    });
    const lineId = lineObject.id;

    const line = new Konva.Line({
      points: lineObject.points,
      stroke: "black",
      strokeWidth: 1,
      id: lineObject.id,
    });
    singleLineGroup.add(line);
    const handle1 = createDragHandle(
      lineObject.points[0],
      lineObject.points[1],
      0,
      {
        name: `handle-${lineId}-1`,
        type: "handle",
        radius: 1,
        fill: "#ffffff",
        stroke: "#000000",
        strokeWidth: 1,
        draggable: true,
      }
    );
    const handle2 = createDragHandle(
      lineObject.points[2],
      lineObject.points[3],
      1,
      {
        name: `handle-${lineId}-2`,
        type: "handle",
        radius: 1,
        fill: "#ffffff",
        stroke: "#000000",
        strokeWidth: 1,
        draggable: true,
      }
    );
    singleLineGroup.add(handle1);
    singleLineGroup.add(handle2);
    const handlesArray = new Array(handle1, handle2);
    handlesArray.forEach((handle) => {
      handle.on("dragstart", handleLineHandleDragStart);
      handle.on("dragmove", handleLineHandleDragMove);
      handle.on("dragend", handleLineHandleDragEnd);
      handle.on("dblclick", handleHandleDoubleClick);
    });
    line.on("click", handleLineClick);
    lineGroup.add(singleLineGroup);
  });
  layer.add(lineGroup);
};
export const addHandlesToPolyline = (object) => {
  const handleRadius = getHandleRadius();
  return object.points.map((_, pointIndex) => {
    return createHandle(object, pointIndex, handleRadius);
  });
};
export const createHandle = (object, pointIndex, handleRadius =1) => {
  return new Konva.Circle({
    x: object.points[pointIndex].x,
    y: object.points[pointIndex].y,
    radius: handleRadius,
    fill: "#ffffff",
    stroke: "#000000",
    strokeWidth: 0.5,
    name: `handle-${pointIndex}`,
    type: "handle",
    pointIndex: pointIndex,
    visible: true,
    draggable: true,
  });
};

const getHandleRadius = () => {
  const baseRadius = 3;
  const konvaStore = useKonvaStore();
  const activeDoc = konvaStore.getActiveDocument();
  if(!activeDoc) return baseRadius;
  const svg = activeDoc.svgPath;
  if(!svg) return baseRadius;

  const parser = new DOMParser();
  const svgElement = parser.parseFromString(svg, "image/svg+xml");

  const svgWidth = svgElement.documentElement.getAttribute("width");
  const svgHeight = svgElement.documentElement.getAttribute("height");  
  const viewBox = svgElement.documentElement.getAttribute("viewBox");
  console.log("SVG ELEMENT", svgWidth, svgHeight, viewBox);

  const width = parseFloat(svgWidth);
  const height = parseFloat(svgHeight);
  let viewWidth = width;
  let viewHeight = height;

  if(viewBox){
    const viewBoxArray = viewBox.split(/\s+|,/).map(parseFloat);
    viewWidth = viewBoxArray[2];
    viewHeight = viewBoxArray[3];
  } else {
    const viewBoxArray = [0, 0, width, height];
    viewWidth = viewBoxArray[2];
    viewHeight = viewBoxArray[3];
  }

  const scaleX = width / viewWidth;
  const scaleY = height / viewHeight;

  const averageScale = (scaleX + scaleY) / 2;

  const adjustedRadius = baseRadius / (averageScale * konvaStore.stage.scaleX());


  console.log("ADJUSTED RADIUS", adjustedRadius);
  if(adjustedRadius < 1) return 1;
  if(adjustedRadius > 3) return 3;

};