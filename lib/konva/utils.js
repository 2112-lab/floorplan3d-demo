import { useKonvaStore } from "~/store/konva-store";
import { getRandomHexColor } from "./konva-math";

export const convertColorToHex = (color) => {
  if (!color || color === "none") return getRandomHexColor();
  if (color.startsWith("#")) {
    return color;
  }
  if (color.startsWith("rgb")) {
    const rgb = color.split("(")[1].split(")")[0].split(",").map(Number);
    return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  }

  if (color.startsWith("rgba")) {
    const rgba = color.split("(")[1].split(")")[0].split(",").map(Number);
    return `#${rgba.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  }

  if (color.startsWith("hsl")) {
    const hsl = color.split("(")[1].split(")")[0].split(",").map(Number);
    return `#${hsl.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  }

  if (color.startsWith("hsla")) {
    const hsla = color.split("(")[1].split(")")[0].split(",").map(Number);
    return `#${hsla.map(c.toString(16).padStart(2, "0")).join("")}`;
  }
  return getRandomHexColor();
};

// Utility functions for performance optimization
export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

export const getRandomId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

export const getActiveLayer = () => {
  // Check if konvaStore is available
  try {
    const konvaStore = useKonvaStore();
    if (!konvaStore) return null;

    // Get the active document and verify it exists
    const activeDoc = konvaStore.getActiveDocument();
    if (!activeDoc) return null;

    // Check if the document has a konva property
    if (!activeDoc.konva) return null;

    // Return the layer, or null if layer doesn't exist
    return activeDoc.konva.layer || null;
  } catch (error) {
    console.warn("Error in getActiveLayer:", error);
    return null;
  }
};

const isAutoRender = () => {
  const editStore = useEditStore();
  const autoRender =
    editStore.checkboxes?.find((checkbox) => checkbox.name === "autoRender")
      ?.value ?? false;
  return autoRender;
};

const autoRender = () => {
  // const threeStore = useThreeStore();
  // const consoleStore = useConsoleStore();
  // if (threeStore.scene) {
  //   threeStore.floorplan3d.renderSvgToScene(consoleStore.consoleOutput, threeStore);
  // }
};
