import { defineStore } from "pinia";

export const useThreeStore = defineStore("threeStore", {
  state: () => ({
    scene: null,
    floorGroup: null,
    lineGroup: null,
    walls: null,
    floorplan3d: null,
  }),

  actions: {
    setScene(scene) {
      this.scene = scene;
    },
    setFloorplan3D(floorplan3d) {
      this.floorplan3d = floorplan3d;
    },
  },
});
