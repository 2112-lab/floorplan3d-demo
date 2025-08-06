export function centerLayer(layer) {
  if (!layer) return;

  const stage = layer.getStage();
  if (!stage) return;

  // Get stage dimensions
  const stageWidth = stage.width();
  const stageHeight = stage.height();

  // Get the bounding box of all content in the layer
  const box = layer.getClientRect({ skipTransform: true });

  // If there's no content, just center the empty layer
  if (!box || box.width === 0 || box.height === 0) {
    layer.position({
      x: stageWidth / 2,
      y: stageHeight / 2,
    });
    layer.draw();
    return;
  }

  // Calculate the scale needed to fit the content
  // const scaleX = stageWidth / box.width;
  // const scaleY = stageHeight / box.height;
  // const scale = Math.min(scaleX, scaleY);
  const scale = 1;

  // Apply the scale
  layer.scale({ x: scale, y: scale });

  // Calculate the center position with the new scale
  const scaledWidth = box.width * scale;
  const scaledHeight = box.height * scale;
  const centerX = (stageWidth - scaledWidth) / 2;
  const centerY = (stageHeight - scaledHeight) / 2;

  // Apply the position to center the content
  layer.position({
    x: centerX - box.x * scale,
    y: centerY - box.y * scale,
  });

  // Force update
  const baseLayer = layer.getParent();
  baseLayer.batchDraw();
  stage.batchDraw();
}

/**
 * Centers multiple layers as a group without scaling individual layers
 * Useful for Inkscape SVG imports where layers should maintain relative sizes
 * @param {Array} layers - Array of Konva.Layer objects to be centered as a group
 */
export function centerLayersAsGroup(layers, viewbox = {width: 0, height: 0}) {
  if (!layers || layers.length === 0) return;

  // Get the stage from the first layer
  const stage = layers[0].getStage();
  if (!stage) return;

  console.log("centerLayersAsGroup", layers, viewbox);

  // Get stage dimensions
  const stageWidth = stage.width();
  const stageHeight = stage.height();

  // Calculate the bounding box that encompasses all layers
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  layers.forEach((layer) => {
    const box = layer.getClientRect();
    if (box && box.width > 0 && box.height > 0) {
      minX = 0;
      minY = 0;
      maxX = viewbox.width;
      maxY = viewbox.height;
    }
  });

  // If we couldn't find valid bounds, exit
  if (
    minX === Infinity ||
    minY === Infinity ||
    maxX === -Infinity ||
    maxY === -Infinity
  ) {
    return;
  }

  // Calculate center positions
  const groupCenterX = minX;
  const groupCenterY = minY;
  const stageCenterX = stageWidth / 2;
  const stageCenterY = stageHeight / 2;

  // Move all layers by the same offset to center as a group
  layers.forEach((layer) => {
    // Get current position
    const currentX = layer.x();
    const currentY = layer.y();

    // Calculate offset needed to center the entire group
    const offsetX = (stageCenterX - groupCenterX) + (viewbox.width / -2);
    const offsetY = (stageCenterY - groupCenterY) + (viewbox.height / -2);

    console.log("centerLayersAsGroup bounding box:", minX, minY, maxX, maxY);

    // Apply the position (move from current position by the offset)
    layer.position({
      x: currentX + offsetX,
      y: currentY + offsetY,
    });
  });
  
  const baseLayer = layers[0].getParent();
  if (baseLayer) baseLayer.batchDraw();
  // Update stage
  stage.batchDraw();
}
