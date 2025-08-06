import { useEditStore } from "~/store/edit";
import { useKonvaStore } from "~/store/konva-store";
import { canBeClosed, findIntersectionInLines, flatToXyPoints, getLinesFromPoints, linesToPolylines, xyToFlatPoints } from "./konva-math";
import { findClosestPoint } from "./grid";
import { renderSvgInKonva } from "./konva";

export const handleLineHandleDragStart = (e) => {
    const konvaStore = useKonvaStore();
    konvaStore.saveState();
    const handle = e.target;
    const lineGroup = handle.getParent();
    const line = lineGroup.children[0];
    console.log(line);
  };
export const handleLineHandleDragMove = (e) => {
    const handle = e.target;
    const lineGroup = handle.getParent();
    const line = lineGroup.children[0];
    const pointIndex = handle.attrs.pointIndex;
    const flatPoints = line.points();
    flatPoints[pointIndex * 2] = handle.x();
    flatPoints[pointIndex * 2 + 1] = handle.y();
    line.points(flatPoints);
  };
export const handleLineHandleDragEnd = (e) => {
    const konvaStore = useKonvaStore();
    const editStore = useEditStore();
  
    const handle = e.target;
    const lineGroup = handle.getParent();
    const line = lineGroup.children[0];
    console.log("line", line);
    const polylineId = line.attrs.id.split("-")[0];
    const doc = konvaStore.getActiveDocument();
    const object = doc.konva.objects[polylineId];
    console.log("object", object);
    if (!doc || !object) return;
  
    if (editStore.isGridSnapEnabled()) {
      const pointIndex = handle.attrs.pointIndex;
      const movedPoint = object.points[pointIndex];
      let polyLineCoords = object.points.filter((_, idx) => idx !== pointIndex);
      const closestPoint = findClosestPoint(polyLineCoords, movedPoint);
      let newPolyLineCoords = [...object.points];
      newPolyLineCoords[pointIndex] = closestPoint.coordinate;
  
      if (closestPoint.distance <= 20) {
        const flatPolyLineCoords = xyToFlatPoints(newPolyLineCoords);
        line.points(flatPolyLineCoords);
        const lines = getLinesFromPoints(line.points(), object.id, true);
        const { intersectionLines, intersectionPoints } =
          findIntersectionInLines(lines);
  
        const updatedObject = {
          ...object,
          points: flatToXyPoints(line.points()),
          lines,
          intersectionLines,
          intersectionPoints,
          closed: true,
        };
        konvaStore.setKonvaObject(doc.id, polylineId, updatedObject);
        konvaStore.saveState();
      }
    }

    console.log("editStore.isPointSnapEnabled()", editStore.isPointSnapEnabled());
    if (editStore.isPointSnapEnabled()) {

      console.log("line.points()", line.points());
        // From the moved line, get the moved point, and also line.points() gets all points
        const movedPoint = line.points()[handle.attrs.pointIndex * 2];
        const closestPoint = findClosestPoint(line.points(), movedPoint);

        console.log("closestPoint", line.points(), movedPoint, closestPoint);

      // const pointIndex = handle.attrs.pointIndex;
      // const movedPoint = object.points[pointIndex];
      // const closestPoint = findClosestPoint(object.points, movedPoint);
      // object.points[pointIndex] = closestPoint.coordinate;
    }
  
    const updatedLines = {
      ...object.lines,
      [line.attrs.id]: {
        id: line.attrs.id,
        points: line.points(),
      },
    };
  
    const flatpoints = linesToPolylines(updatedLines);
    const isClosed = canBeClosed(flatToXyPoints(flatpoints));
  
    konvaStore.setKonvaObject(doc.id, polylineId, {
      ...object,
      lines: updatedLines,
      points: flatToXyPoints(flatpoints),
      closed: isClosed,
    });
    konvaStore.saveState();
    console.log("doc.konva.objects", doc.konva.objects);
    renderSvgInKonva(doc.konva.layer, doc.konva.objects);
  };
export const handleLineClick = (e) => {
    const line = e.target;
    const lineGroup = line.getParent();
    lineGroup.attrs.selected = true;
    lineGroup.children.forEach((child) => {
      child.stroke("#ff0000");
      child.fill("#ff0000");
      child.attrs.selected = false;
    });
  };
  