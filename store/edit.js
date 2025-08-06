import { defineStore } from "pinia";

export const useEditStore = defineStore("edit", {
  state: () => ({
    viewport: {
      primary: "three",
      secondary: "konva",
    },
    viewPortSize: {
      standard: 30,
      console: 30,
    },
    coords: {
      x: 0,
      y: 0,
    },
    checkboxes: [
      {
        name: "autoRender",
        label: "Auto Render",
        value: false,
      },
      {
        name: "autoAdjust",
        label: "Auto Adjust",
        value: true,
      },
      {
        name: "2dgrid",
        label: "2d Grid",
        value: false,
      },
      {
        name: "3dgrid",
        label: "3d Grid",
        value: true,
      },
      {
        name: "gridSnap",
        label: "Grid snap",
        value: false,
      },
      {
        name: "pointSnap",
        label: "Point snap",
        value: false,
      },
    ],
    uploadedImage: null,
    uploadedSVG: null,
    outputStage: 0,
    leftPanelModel: [0],
  }),
  getters: {
    is2dGridEnabled() {
      return this.checkboxes.find((checkbox) => checkbox.name === "2dgrid")
        .value;
    },
    is3dGridEnabled() {
      return this.checkboxes.find((checkbox) => checkbox.name === "3dgrid")
        .value;
    },
  },
  actions: {
    swapViewports() {
      this.viewport = {
        primary: this.viewport.secondary,
        secondary: this.viewport.primary,
      };
    },
    setLeftPanelModel(model) {
      this.leftPanelModel = model;
    },
    setUploadedImage(image) {
      this.uploadedImage = image;
    },
    setUploadedSVG(svg) {
      this.uploadedSVG = svg;
    },
    setOutputStage(stage) {
      this.outputStage = stage;
    },
    setViewPortSize(size) {
      this.viewPortSize = size;
    },
    setCoords(coords) {
      this.coords = { x: parseInt(coords.x), y: parseInt(coords.y) };
    },
    toggleCheckbox(name) {
      this.checkboxes = this.checkboxes.map((checkbox) => {
        if (checkbox.name === name) {
          return {
            ...checkbox,
            value: !checkbox.value,
          };
        } else return checkbox;
      });
    },
    isGridSnapEnabled() {
      return this.checkboxes.find((checkbox) => checkbox.name === "gridSnap")
        .value;
    },
    isPointSnapEnabled() {
      return this.checkboxes.find((checkbox) => checkbox.name === "pointSnap")
        .value;
    },
  },
});
