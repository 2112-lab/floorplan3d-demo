import { useKonvaStore } from "~/store/konva-store";
import { getActiveLayer } from "./utils";
import { renderSvgInKonva } from "./konva";

export function createMarqueeSelector(stage) {
  const konvaStore = useKonvaStore();
  const selectionLayer = konvaStore.selectionLayer;

  if (!selectionLayer) return;

  // Clear existing selection rectangle and event listeners
  selectionLayer.destroyChildren();

  // Ensure selection layer is on top
  selectionLayer.moveToTop();

  let selectionRectangle = new Konva.Rect({
    fill: "rgba(0, 161, 255, 0.2)",
    stroke: "rgba(0, 161, 255, 1)",
    strokeWidth: 1,
    visible: false,
    listening: false,
  });
  selectionLayer.add(selectionRectangle);

  let selectionStartPosition = null;
  let isShiftPressed = false;

  // Helper function to track selected groups
  const trackSelectedGroups = () => {
    const activeLayer = getActiveLayer();
    if (!activeLayer) return [];

    const groups = activeLayer.find("Group");
    return groups.filter((group) => {
      if (group === selectionRectangle) return false;

      const groupBox = group.getClientRect({ skipTransform: false });
      const selectionBox = selectionRectangle.getClientRect();

      const xOverlap = Math.max(
        0,
        Math.min(
          groupBox.x + groupBox.width,
          selectionBox.x + selectionBox.width
        ) - Math.max(groupBox.x, selectionBox.x)
      );
      const yOverlap = Math.max(
        0,
        Math.min(
          groupBox.y + groupBox.height,
          selectionBox.y + selectionBox.height
        ) - Math.max(groupBox.y, selectionBox.y)
      );
      const intersectionArea = xOverlap * yOverlap;
      const groupArea = groupBox.width * groupBox.height;

      return intersectionArea > groupArea * 0.3;
    });
  };

  // Add keydown event listener for Shift key
  const handleShiftKeyDown = (e) => {
    if (e.key === "Shift") {
      isShiftPressed = true;
    }
  };
  document.addEventListener("keydown", handleShiftKeyDown);

  // Add keyup event listener for Shift key
  const handleShiftKeyUp = (e) => {
    if (e.key === "Shift") {
      isShiftPressed = false;
    }
  };
  document.addEventListener("keyup", handleShiftKeyUp);

  // Add mousedown event to the stage
  stage.on("mousedown", (e) => {
    if (isShiftPressed) return;

    selectionLayer.moveToTop();
    selectionStartPosition = stage.getRelativePointerPosition();
    selectionRectangle.visible(true);
    selectionRectangle.width(0);
    selectionRectangle.height(0);
    selectionRectangle.x(selectionStartPosition.x);
    selectionRectangle.y(selectionStartPosition.y);
    selectionLayer.batchDraw();
  });

  // Add mousemove event to the stage
  stage.on("mousemove", () => {
    if (isShiftPressed) return;

    if (selectionStartPosition) {
      selectionLayer.moveToTop();

      const pos = stage.getRelativePointerPosition();
      if (!pos) return;

      const width = pos.x - selectionStartPosition.x;
      const height = pos.y - selectionStartPosition.y;

      selectionRectangle.width(width);
      selectionRectangle.height(height);

      if (width < 0) {
        selectionRectangle.x(pos.x);
        selectionRectangle.width(Math.abs(width));
      }
      if (height < 0) {
        selectionRectangle.y(pos.y);
        selectionRectangle.height(Math.abs(height));
      }

      // Track and highlight selected groups
      const selectedGroups = trackSelectedGroups();
      selectedGroups.forEach((group) => {
        group.children.forEach((child) => {
          if (child instanceof Konva.Line) {
            child.stroke("red");
            child.fill("red");
          }
        });
      });

      selectionLayer.batchDraw();
    }
  });

  // Add mouseup event to the stage
  stage.on("mouseup", () => {
    if (selectionStartPosition) {
      const selectedGroups = trackSelectedGroups();
      handleDragEnd(selectedGroups);

      selectionStartPosition = null;
      selectionRectangle.visible(false);
      selectionLayer.batchDraw();
    }
  });

  // Helper function to handle drag end
  const handleDragEnd = (selectedGroups) => {
    if (!selectedGroups.length) return;
    const konvaStore = useKonvaStore();
    const activeLayer = getActiveLayer();
    const activeDocument = konvaStore.getActiveDocument();
    // Save state before making changes
    konvaStore.saveState();

    selectedGroups.forEach((group) => {
      if (group.children.length === 0) return;
      group.setAttrs({
        selected: true,
      });
      const polyline = group.children[0];
      polyline.setAttrs({
        selected: true,
        stroke: "#ff0000",
        fill: "#ff0000",
      });
      const object = activeDocument.konva.objects[polyline.attrs.id];
      konvaStore.setKonvaObject(activeDocument.id, polyline.attrs.id, {
        ...object,
        selected: true,
      });
    });
    renderSvgInKonva(activeLayer, activeDocument.konva.objects);
  };

  selectionLayer.moveToTop();
  selectionLayer.draw();
}
