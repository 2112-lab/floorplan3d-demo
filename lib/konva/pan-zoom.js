import { useEditStore } from "~/store/edit";
import { useKonvaStore } from "~/store/konva-store";
import { renderVisibleGridLines } from './grid';

export const gridSize = 30;
const maxGridMultiplier = 2;
const drawnGridLines = new Set();


export function setupZoom(stage) {
    if (!stage) return;
  
    // Remove all existing event listeners first
    stage.off("wheel");
    stage.off("mousedown");
    stage.off("mousemove");
    stage.off("mouseup");
    stage.off("keydown")
    stage.off("keyup")
  
    // Create debounced version of renderGrid for better performance
  
    const handleKeyDown = (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault(); // Prevent page scrolling
        
        // Zoom the entire stage instead of just the active layer
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition() || {
          x: stage.width() / 2,
          y: stage.height() / 2,
        };
  
        const mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale,
        };
  
        // Zoom in with up arrow, zoom out with down arrow
        const newScale = e.key === "ArrowUp" ? oldScale * 1.1 : oldScale * 0.9;
        stage.scale({ x: newScale, y: newScale });
  
        const newPos = {
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        };
        stage.position(newPos);
  
        // Update grid if visible - use debounced version
        // const { value } = editStore.checkboxes.find((x) => x.name === "2dgrid");
        // if (value && konvaStore.gridLayer) {
        //   debouncedRenderGrid(konvaStore.gridLayer);
        // }
  
        stage.batchDraw();
      }
    };
  
    document.removeEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleKeyDown);
  
    stage.on("wheel", (e) => {
      e.evt.preventDefault();
      
      // Zoom the entire stage instead of just the active layer
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
  
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };
  
      const newScale = e.evt.deltaY > 0 ? oldScale * 0.95 : oldScale * 1.05;
      stage.scale({ x: newScale, y: newScale });
  
      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };
      stage.position(newPos);
  
      // // Update grid if visible - use debounced version to improve performance
      // const { value } = editStore.checkboxes.find((x) => x.name === "2dgrid");
      // if (value && konvaStore.gridLayer) {
      //   debouncedRenderGrid(konvaStore.gridLayer);
      // }


      // AFTER ZOOM CHECK IF LINES IN THE GRID LAYER ARE VISIBLE IN SCREEN, IF YES, SHOW THEM, ELSE HIDE THEM

      if(!useEditStore().is2dGridEnabled) return;
      const gridLayer = useKonvaStore().gridLayer;

      const scale = stage.scaleX(); 
      const position = stage.position();

      // 1. Calculate visible area in grid coordinates
      const stageWidth = stage.width();
      const stageHeight = stage.height();

      const visibleX = -position.x / scale;
      const visibleY = -position.y / scale;
      const visibleW = stageWidth / scale;
      const visibleH = stageHeight / scale;

      const visibleRect = {
        x: visibleX,
        y: visibleY,
        width: visibleW,
        height: visibleH,
      };
      gridLayer.getChildren().forEach(line => {
        const [x1, y1, x2, y2] = line.points();
        const isVisible = lineIntersectsRect(x1, y1, x2, y2, visibleRect);
        if (!isVisible) {
          const key = x1 === x2 ? `x:${x1}` : `y:${y1}`;
          drawnGridLines.delete(key);
          line.destroy();
        }
      });
      renderVisibleGridLines(stage, gridLayer);
      gridLayer.getParent().batchDraw();

    });
  }



  function lineIntersectsRect(x1, y1, x2, y2, rect) {
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
  
  function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Helper function to check if two lines (x1,y1)-(x2,y2) and (x3,y3)-(x4,y4) intersect
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false;
  
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  
export function setupPanning(stage) {
    let isDragging = false;
    let lastPointerPosition = null;
    let isShiftPressed = false;
    // const editStore = useEditStore();

  
    // Add keydown event listener for Shift key
    const handleShiftKeyDown = (e) => {
      if (e.key === "Shift") {
        isShiftPressed = true;
        // Disable drag handles when Shift is pressed
        stage.find("Circle").forEach((circle) => {
          if (circle.name().includes("handle")) {
            circle.draggable(false);
          }
        });
      }
    };
    document.addEventListener("keydown", handleShiftKeyDown);
  
    // Add keyup event listener for Shift key
    const handleShiftKeyUp = (e) => {
      if (e.key === "Shift") {
        isShiftPressed = false;
        // Re-enable drag handles when Shift is released
        stage.find("Circle").forEach((circle) => {
          if (circle.name().includes("handle")) {
            circle.draggable(true);
          }
        });
      }
    };
    document.addEventListener("keyup", handleShiftKeyUp);
  
    stage.on("mousedown", (e) => {
      // Only start panning if Shift is pressed and we're not clicking on a handle
      if (!isShiftPressed || e.target.name()?.includes("handle")) return;
      isDragging = true;
      lastPointerPosition = stage.getPointerPosition();
    });
  
    stage.on("mousemove", () => {
      if (!isDragging || !isShiftPressed) {
        // Only update coords if not dragging or Shift not pressed
        // editStore.setCoords(stage.getRelativePointerPosition());
        return;
      }
  
      const newPointerPosition = stage.getPointerPosition();
      if (!lastPointerPosition) {
        lastPointerPosition = newPointerPosition;
        return;
      }
  
      const dx = newPointerPosition.x - lastPointerPosition.x;
      const dy = newPointerPosition.y - lastPointerPosition.y;
  
      // Move the entire stage instead of just the active layer
      const currentX = isNaN(stage.x()) ? 0 : stage.x();
      const currentY = isNaN(stage.y()) ? 0 : stage.y();
  
      stage.position({
        x: currentX + dx,
        y: currentY + dy,
      });
  
    
  
      lastPointerPosition = newPointerPosition;
      // stage.batchDraw();
    });
  
    stage.on("mouseup", () => {
      isDragging = false;
      lastPointerPosition = null;
    });
  }