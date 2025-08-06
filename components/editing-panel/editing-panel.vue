<template>
  <div class="d-flex flex-wrap pb-4">
    <div
      class="w-25 pa-1 text-center"
      v-for="(btn, index) in filteredButtons"
      :key="index"
    >
      <v-tooltip :text="btn.label">
        <template v-slot:activator="{ props }">
          <v-btn
            icon
            variant="outlined"
            tile
            color="#222"
            class="border border-secondary"
            @click="btn.click"
            :disabled="isButtonDisabled(btn)"
            v-bind="props"
          >
            <v-icon>
              {{ btn.icon }}
            </v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </div>
  </div>

  <ShapeInfo
    v-if="$konvaStore.showInfo && selectedPoly"
    :selectedShape="selectedPoly"
  />
</template>

<script>
import {createMergedPolygon, mergePolys, renderSplitLine, splitPolygonInTwo} from "~/lib/konva/editing"
import {getActiveLayer} from "~/lib/konva/utils"
import {snapToGrid} from "~/lib/konva/grid";
import {
  canBeClosed,
  findHorizontalMidLine,
  findIntersectionInLines,
  flatToXyPoints,
  formsClosedPolygon,
  getLinesFromPoints,
  getRandomHexColor,
  linesToPolylines,
  xyToFlatPoints,
} from "~/lib/konva/konva-math";
import ShapeInfo from "../shape-info/shape-info.vue";
import { renderSvgInKonva } from "~/lib/konva/konva";


export default {
  data() {
    return {
      selectedPoly: null,
      buttons: [
        {
          label: "Undo",
          icon: "mdi-undo",
          click: this.handleUndo,
        },
        {
          label: "Redo",
          icon: "mdi-redo",
          click: this.handleRedo,
        },
        {
          label: "Delete",
          icon: "mdi-delete-outline",
          click: this.handleDelete,
          mode: "polygon",
        },
        {
          label: "Add Point",
          icon: "mdi-plus-circle-outline",
          click: this.addPoint,
        },
        {
          label: "Merge Points",
          icon: "mdi-merge",
          click: this.handleMergePoints,
        },
        {
          label: "Create Line",
          icon: "mdi-line-scan",
          click: this.handleCreateLine,
          mode: "polygon",  
        },
        {
          label: "Split",
          icon: "mdi-arrow-split-vertical",
          click: this.handleSplit,
        },
        {
          label: "Merge",
          icon: "mdi-table-merge-cells",
          click: this.handleMerge,
        },
        {
          label: "Snap to Grid",
          icon: "mdi-grid",
          click: this.handleSnapToGrid,
        },
        {
          label: "Info",
          icon: "mdi-information-symbol",
          mode: "polygon",
          click: this.handleShowInfo,
        },
      ],
    };
  },
  computed: {
    filteredButtons() {
      return this.buttons.filter((btn) => btn);
    },
    activeLayer() {
      const layer = getActiveLayer();
      return layer ? layer.attrs.name : null;
    },
  },
  mounted() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        this.handleDelete();
      }
    });
  },
  methods: {
    isButtonDisabled(button) {
      const activeDoc = this.$konvaStore.getActiveDocument()
      if(!activeDoc || !activeDoc.id) return true
      return activeDoc.metadata.category === "vector" ? false : true
    },
    handleDelete() {
      const layer = getActiveLayer();
      const activeDocument = this.$konvaStore.getActiveDocument();
      // Save state before deletion
      this.$konvaStore.saveState();


      // First check for selected circles (handles)
      const selectedCircles = layer
        .find("Circle")
        .filter((circle) => circle.attrs.selected);
        console.log(selectedCircles)


      if (selectedCircles.length > 0) {

        selectedCircles.forEach(circle => {
          const polygon = circle.parent.children[0]
          const object = this.$konvaStore.documents[activeDocument.id].konva.objects[polygon.attrs.id]
          this.$konvaStore.setKonvaObject(activeDocument.id, polygon.attrs.id, {
            ...object,
            points: object.points.filter((point, idx) => idx !== circle.attrs.pointIndex)
          })
          circle.destroy()
          renderSvgInKonva(activeDocument.konva.layer, activeDocument.konva.objects)
        })
      
      } else {
       // If no circles are selected, check for selected groups
       const selectedGroups = layer
          .find("Group")
          .filter((group) => group.attrs.selected);


        // Group selected groups by type
        const lineGroups = selectedGroups.filter(
          (group) => group.attrs.type === "polyline-lines-group" || group.attrs.type === "polyline-single-line-group"
        );
     
        const polylineGroups = selectedGroups.filter(
          (group) => group.attrs.selected && group.attrs.type === "polyline-group"
        );
      
        console.log(polylineGroups)

        // Handle line groups
        lineGroups.forEach((group) => {
          const line = group.children[0]
          const lineId = line.attrs.id
          const polylineId = group.attrs.name.split("-")[1]
          if(!polylineId) return;
          const object = this.$konvaStore.documents[activeDocument.id].konva.objects[polylineId]
          if(!object) return;

          const newLines = {...object.lines}
          delete newLines[lineId]

          console.log("NEW LINES", newLines)
          
          const polygonPoints = linesToPolylines(newLines, false);
          const { intersectionLines, intersectionPoints } =
            findIntersectionInLines(newLines);
          const isClosed = formsClosedPolygon(newLines);
          this.$konvaStore.setKonvaObject(activeDocument.id, polylineId, {
            ...object,
            lines: newLines,
            points: flatToXyPoints(polygonPoints),
            intersectionLines,
            intersectionPoints,
            closed: isClosed,
            mode: isClosed ? "polygon" : "line",
          });
          group.destroy();  
        });

        // Handle polygon groups
        polylineGroups.forEach((group) => {
          const polylineId = group.children[0].id();
          const object = this.$konvaStore.documents[activeDocument.id].konva.objects[polylineId];
        
          if (!object) return;

          // Mark the wall as deprecated
          this.$konvaStore.setKonvaObject(activeDocument.id, polylineId, {
            ...object,
            deprecated: true,
          });
          group.destroy();
        });

        renderSvgInKonva(activeDocument.konva.layer, activeDocument.konva.objects)

      }

      // Save state after deletion
      this.$konvaStore.saveState();

      const baseLayer = layer.getParent();
      baseLayer.batchDraw();
    },



    addPoint() {
      const layer = getActiveLayer();
      const konvaStore = this.$konvaStore;
      const activeDocument = konvaStore.getActiveDocument();
      // Save state before adding point
      konvaStore.saveState();

      const selectedPolylines = layer
        .find("Line")
        .filter((line) => line.attrs.selected);

      if (selectedPolylines.length === 0) return;

      const line = selectedPolylines[0];
      const points = line.points();

      const object = activeDocument.konva.objects[line.attrs.id];
    
      let insertIndex = 2;

      // For open structures, find the correct position
      if (!object.closed) {
        insertIndex = -1;
        for (let i = 0; i < object.points.length; i++) {
          const nextIndex = (i + 1) % object.points.length;
          const p1 = object.points[i];
          const p2 = object.points[nextIndex];

          if (
            (p1.x === points[0] &&
              p1.y === points[1] &&
              p2.x === points[2] &&
              p2.y === points[3]) ||
            (p1.x === points[2] &&
              p1.y === points[3] &&
              p2.x === points[0] &&
              p2.y === points[1])
          ) {
            insertIndex = nextIndex;
            break;
          }
        }
      }

      if (insertIndex === -1) return;

      const midX = (points[0] + points[2]) / 2;
      const midY = (points[1] + points[3]) / 2;

      // Insert the new point
      object.points.splice(insertIndex, 0, { x: midX, y: midY });

     
      // Convert back to flat points
  

      // Update the room's state
      const lines = getLinesFromPoints(xyToFlatPoints(object.points), object.id, object.closed);
      const { intersectionLines, intersectionPoints } =
        findIntersectionInLines(lines);
      const isClosed = formsClosedPolygon(lines);

      this.$konvaStore.setKonvaObject(activeDocument.id, object.id, {
        ...object,
        points: object.points,
        lines,
        intersectionLines,
        intersectionPoints,
        mode: isClosed ? "polygon" : "line",
        selected: true,
      });
     
      renderSvgInKonva(activeDocument.konva.layer, activeDocument.konva.objects)
    },


    handleCreateLine() {
      const layer = getActiveLayer();
      const selectedCircles = layer.find("Circle").filter((circle) => {
        if (circle.attrs.selected === true) {
          return circle;
        }
      });
      if (selectedCircles.length > 2)
        return this.$notification.notify({
          message: "Cannot create line between more than two handles",
          type: "error",
        });

      if (selectedCircles.length === 2) {
        const circle1Group = selectedCircles[0].getParent()
        const circle2Group = selectedCircles[1].getParent()

        if (circle1Group.attrs.name !== circle2Group.attrs.name) {
          return this.$notification.notify({
            message: "Cannot create line between handles from different objects",
            type: "error",
          });
        }

        const activeDocument = this.$konvaStore.getActiveDocument();
        const objectId = circle1Group.children[0]?.attrs?.id
        if(!objectId) return;
        const object = activeDocument.konva.objects[objectId]
        if (!object) return;

        // Save state before creating line
        this.$konvaStore.saveState();

        // Check if this line already exists
        const point1 = [selectedCircles[0].attrs.x, selectedCircles[0].attrs.y];
        const point2 = [selectedCircles[1].attrs.x, selectedCircles[1].attrs.y];
        
        // Check if this line already exists in any direction
        const lineExists = Object.values(object.lines).some(line => {
          const [x1, y1, x2, y2] = line.points;
          return (
            (x1 === point1[0] && y1 === point1[1] && x2 === point2[0] && y2 === point2[1]) ||
            (x1 === point2[0] && y1 === point2[1] && x2 === point1[0] && y2 === point1[1])
          );
        });
        
        if (lineExists) {
          return this.$notification.notify({
            message: "This line already exists",
            type: "error",
          });
        }

        // Create a copy of the lines object to avoid mutation
        const lines = { ...object.lines };
        const lineId = `${object.id}-line-${Object.keys(lines).length + 1}`;
        
        lines[lineId] = {
          id: lineId,
          points: [
            selectedCircles[0].attrs.x,
            selectedCircles[0].attrs.y,
            selectedCircles[1].attrs.x,
            selectedCircles[1].attrs.y,
          ],
        };

        // Generate polygon points properly from lines
        const polygonPoints = linesToPolylines(lines, false);

        const { intersectionLines, intersectionPoints } =
          findIntersectionInLines(lines);

        this.$konvaStore.setKonvaObject(activeDocument.id, objectId, {
          ...object,
          lines, // Only include lines once
          points: flatToXyPoints(polygonPoints),
          intersectionLines,
          intersectionPoints,
          closed: formsClosedPolygon(lines),
        });
        
        renderSvgInKonva(activeDocument.konva.layer, activeDocument.konva.objects)
      }
    },

    handleSplit() {
      const layer = getActiveLayer();
      const activeDocument = this.$konvaStore.getActiveDocument();
      
      const selectedPolylines =  layer.find("Line").filter((line) => line.attrs.selected);
      if(selectedPolylines.length === 0) return;
      const selectedPolyline = selectedPolylines[0];
      const object = activeDocument.konva.objects[selectedPolyline.attrs.id];
      if(!object) return;
      this.$konvaStore.saveState();
      const splitStage = this.$konvaStore.getSplitStage(activeDocument.id,  selectedPolyline.attrs.id);

       if (splitStage === 1) {
        const horizontalLine = findHorizontalMidLine(
          xyToFlatPoints(object.points)
        );
        this.$konvaStore.updateSplitLine({
          doc_id: activeDocument.id,
          obj_id: object.id,
          line: horizontalLine,
        });
        renderSplitLine(
          activeDocument.id,
          object.id,
          horizontalLine,
          this.$konvaStore,
          layer
        );
      } else if (splitStage === 2) {
        console.log("splitStage 2")
        const splitLine = this.$konvaStore.getSplitLine(activeDocument.id, object.id);
        if (!splitLine) return;
        const polys = splitPolygonInTwo(object, splitLine, this.$konvaStore);
        if(!polys || !polys.length === 2) return this.$notification.notify({
          message: "Could not split the polygon",
          type: "error",
        });
        polys.forEach(poly => {
          this.$konvaStore.setKonvaObject(activeDocument.id, poly.id, {
            ...poly
          })
        })
        // MAKE PREV poly DEPRECATED
        this.$konvaStore.setKonvaObject(activeDocument.id, object.id, {
          ...object,
          deprecated: true,
        });
        renderSvgInKonva(activeDocument.konva.layer, activeDocument.konva.objects)
      }
    },
    handleMerge() {
      const layer = getActiveLayer();
      const activeDocument = this.$konvaStore.getActiveDocument();
      const konvaStore = this.$konvaStore;

      // Save state before starting merge operation
      konvaStore.saveState();

      const selectedPolylines =  layer.find("Line").filter((line) => line.attrs.selected);
       layer.find("Line").forEach(line => {console.log(line.attrs.selected)});


      if (selectedPolylines.length !== 2) {
        this.$notification.notify({
          message: "Please select exactly 2 shapes to merge",
          type: "error",
        });
        return;
      }
      const merged = mergePolys(selectedPolylines[0], selectedPolylines[1], 30);
      if (!merged || !merged.id) {
        this.$notification.notify({
          message: "Could not merge these polygons",
          type: "error",
        });
        return;
      }
      const newObject = createMergedPolygon(merged);
      if(!newObject) return;

      // MAKE PREV POLYS DEPRECATED
      selectedPolylines.forEach(poly => {
        const object = activeDocument.konva.objects[poly.attrs.id];
        this.$konvaStore.setKonvaObject(activeDocument.id, poly.attrs.id, {
         ...object,
          deprecated: true,
        })
      })
      this.$konvaStore.setKonvaObject(activeDocument.id, newObject.id, {
        ...newObject,
      })
      renderSvgInKonva(activeDocument.konva.layer, activeDocument.konva.objects)

    },


  
    handleShowInfo() {
      const layer = getActiveLayer();
      const selectedObjects = layer.find("Line").filter((line) => line.attrs.selected);
      if(selectedObjects.length !== 1) return;
      const selectedObject = selectedObjects[0];
      const activeDocument = this.$konvaStore.getActiveDocument();
      const object = this.$konvaStore.documents[activeDocument.id].konva.objects[selectedObject.attrs.id]
      if(!object) return;
      this.selectedPoly = object;
      this.$konvaStore.setShowInfo(true);
    },

    
    handleSnapToGrid() {
      const doc = this.$konvaStore.getActiveDocument();
      const layer = doc.konva.layer;
      const selectedObjects = layer.find("Line").filter((line) => line.attrs.selected);
      

      selectedObjects.forEach((selectedObject) => {
        const object = doc.konva.objects[selectedObject.attrs.id];
        if(!object) return;
        
        object.points.forEach((point, index) => {
          const { coordinate } = snapToGrid(
            point,
            this.$konvaStore.gridLayer
          );
          object.points[index] = coordinate;
        });

        const lines = getLinesFromPoints(
          xyToFlatPoints(object.points),
          object.id,
          object.closed
        );
        const { intersectionLines, intersectionPoints } =
          findIntersectionInLines(lines);

        selectedObject.points(xyToFlatPoints(object.points));
        this.$konvaStore.setKonvaObject(doc.id, selectedObject.attrs.id, {
          ...object,
          points: object.points,
          lines,
          intersectionLines,
          intersectionPoints,
        });
      });
      renderSvgInKonva(layer, doc.konva.objects)
    },
    handleMergePoints() {
      const layer = getActiveLayer();
      const activeDocument = this.$konvaStore.getActiveDocument();
      if (!layer) return;

      // Get selected circles (handles)
      const selectedCircles = layer
        .find("Circle")
        .filter((circle) => circle.attrs.selected);

      if (selectedCircles.length !== 2) {
        this.$notification.notify({
          message: "Please select exactly 2 points to merge",
          type: "error",
        });
        return;
      }

      // Calculate distance between points
      const point1 = { x: selectedCircles[0].x(), y: selectedCircles[0].y() };
      const point2 = { x: selectedCircles[1].x(), y: selectedCircles[1].y() };
      const distance = Math.sqrt(
        Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
      );

      if (distance > 20) {
        this.$notification.notify({
          message: "Points are too far apart to merge (max distance: 20)",
          type: "error",
        });
        return;
      }

      // Save state before merging
      this.$konvaStore.saveState();

      // Get the group and polygon
      const group = selectedCircles[0].getParent();
      const polygon = group.children[0];

      const object = this.$konvaStore.documents[activeDocument.id].konva.objects[polygon.attrs.id]
      if(!object) return;
      const points = flatToXyPoints(polygon.points());
      const point2Index = selectedCircles[1].attrs.pointIndex;
      points.splice(point2Index, 1);
      const flatPoints = xyToFlatPoints(points);
      polygon.points(flatPoints);
      const lines = getLinesFromPoints(flatPoints, object.id, object.closed);
      const { intersectionLines, intersectionPoints } =
          findIntersectionInLines(lines);
      const isClosed = formsClosedPolygon(lines);

      this.$konvaStore.setKonvaObject(activeDocument.id, polygon.attrs.id, {
        ...object,
        points: points,
        lines,
        intersectionLines,
        intersectionPoints,
        closed: isClosed,
        mode: isClosed ? "polygon" : "line",
        });

        // Remove the second handle
        selectedCircles[1].destroy();

        // Update the point indices for remaining handles
        group.find("Circle").forEach((handle, index) => {
          handle.attrs.pointIndex = index;
        });
        renderSvgInKonva(activeDocument.konva.layer, activeDocument.konva.objects)
    },
  },
};
</script>
