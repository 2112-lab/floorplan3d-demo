/**
 * AI Prompts configuration
 * This file contains all the prompts used for AI-powered features in the application
 */

export const aiPrompts = {  
    rasterToVector: {
    label: "Raster to Vector",
    prompt: `
        You are tasked with analyzing a provided raster image of a floor plan, generating a detailed text description of its contents based solely on the image, and then creating an SVG vector image that matches the description using the "path" tag to describe all geometries. The goal is to produce an SVG that accurately recreates the floor plan while maintaining aspect ratios and dimensions.
        **Phase #1: Image Analysis and Description**
        1. Analyze the provided raster image of the floor plan to identify all visible rooms, objects, dimensions, and annotations.
        2. Generate a detailed text description of the floor plan based entirely on your analysis of the provided image. Do NOT use or reproduce the example description provided below. The description must follow this structure and style:
        - Start with the overall dimensions of the floor plan (e.g., width and height in inches or pixels).
        - List each room or area with its name, area in square feet, approximate location within the floor plan (e.g., top left, bottom right), and key features such as furniture or fixtures (e.g., bed, sink, sofa).
        - Include walls, doors, and any annotations such as dimension lines (e.g., lengths in inches or feet) with their colors and positions.
        - Example description (for format and detail level only, do NOT use this content): "The image is a 500x500 pixel square containing a red circle with a radius of 100 pixels centered at (250, 250), a blue square with a side length of 200 pixels at position (150, 150), and a black line with a 2-pixel stroke from (100, 100) to (400, 400)."
        **Phase #2: SVG Generation**
        1. Using the text description you generated in Phase #1, create SVG code that recreates the described floor plan.
        2. Use the SVG "path" tag to define all geometries (e.g., walls, doors, dimension lines). Do not use other SVG shape tags like "rect" or "line."
        3. Ensure the SVG code:
        - Accurately represents all elements from your generated description, including rooms, walls, doors, and dimension lines, with their respective colors, positions, and stroke/fill properties.
        - Maintains the aspect ratio and dimensions specified in the description.
        - Uses a viewBox attribute to match the floor plan dimensions (e.g., viewBox="0 0 213 108" for a 213"x108" floor plan).
        - Includes appropriate styling (e.g., fill, stroke, stroke-width) within the "path" tags.
        4. Return only the SVG code, with no additional text or explanations.
    `,
    requireAttach: true,
    attachType: ["raster"],
    responseType: "svg",
    disabled: false,
  },  
  removeNoise: {
    label: "Remove Noise",
    prompt: `
        You are being tasked with image processing. 
        Take your time reading, processing the attached image and understanding its content, before continuing with any additional processing. 
        Main goals: 
        1 - Analyze the image and identify all elements in the image.
        2 - Identify graphic elements that could be considered noise.
        3 - Recreate the image, removing noise elements, while maintaining ALL other elements in the image.
        At the end, you must analyze the generated SVG code and compare its rendering with the original attached files. Keep iterating, refining and analyzing the generated SVG code, until all of the main goals are accomplished. Iterate however many times will be necessary.
        Return purely the SVG code, with absolutely no other text - verify this requirement before sending the response.`,
    requireAttach: true,
    attachType: ["raster"],
    responseType: "png",
    disabled: false,
  },
  extractWalls: {
    label: "Extract Walls",
    prompt: `
        You are tasked with analyzing a provided raster image of a floor plan, generating a detailed text description of its walls based solely on the image, and then creating an SVG vector image that represents only the walls using the "path" tag to describe their geometries. The goal is to produce an SVG that accurately recreates the walls of the floor plan while maintaining aspect ratios and dimensions.
        **Phase #1: Image Analysis and Description**
        1. Analyze the provided raster image of the floor plan to identify all visible walls and their associated annotations (e.g., dimension lines).
        2. Generate a detailed text description of the walls based entirely on your analysis of the provided image. Do NOT use or reproduce any example descriptions. The description must follow this structure and style:
        - Start with the overall dimensions of the floor plan (e.g., width and height in inches or pixels).
        - List each wall with its approximate location within the floor plan (e.g., top edge, bottom left), length, thickness, and any annotations such as dimension lines (e.g., lengths in inches or feet) with their colors and positions.
        - Example description (for format and detail level only, do NOT use this content): "The image is a 500x500 pixel square containing a black vertical wall with a 2-pixel thickness from (100, 50) to (100, 450), and a red horizontal wall with a 3-pixel thickness from (50, 100) to (450, 100)."
        **Phase #2: SVG Generation**
        1. Using the text description you generated in Phase #1, create SVG code that recreates only the walls of the described floor plan.
        2. Use the SVG "path" tag to define all wall geometries. Do not use other SVG shape tags like "rect" or "line."
        3. Ensure the SVG code:
        - Accurately represents all walls from your generated description, including their positions, lengths, thicknesses, and any associated dimension lines, with their respective colors and stroke/fill properties.
        - Maintains the aspect ratio and dimensions specified in the description.
        - Uses a viewBox attribute to match the floor plan dimensions (e.g., viewBox="0 0 213 108" for a 213"x108" floor plan).
        - Includes appropriate styling (e.g., stroke, stroke-width) within the "path" tags for walls and dimension lines.
        4. Return only the SVG code, with no additional text or explanations.
    `,
    requireAttach: true,
    attachType: ["raster"],
    responseType: "svg",
    disabled: false,
  },
  detectRooms: {
    label: "Detect Rooms",
    prompt: `
        You are tasked with analyzing a provided raster image of a floor plan, generating a detailed text description of its rooms based solely on the image, and then creating an SVG vector image that represents only the rooms using the "path" tag to describe their geometries. The goal is to produce an SVG that accurately recreates the rooms of the floor plan while maintaining aspect ratios and dimensions.
        **Phase #1: Image Analysis and Description**
        1. Analyze the provided raster image of the floor plan to identify all visible rooms and any associated annotations (e.g., room names or area labels).
        2. Generate a detailed text description of the rooms based entirely on your analysis of the provided image. Do NOT use or reproduce any example descriptions. The description must follow this structure and style:
        - Start with the overall dimensions of the floor plan (e.g., width and height in inches or pixels).
        - List each room with its name (if provided), area in square feet, approximate location within the floor plan (e.g., top left, bottom right), and any annotations such as area labels or room names with their colors and positions.
        - Example description (for format and detail level only, do NOT use this content): "The image is a 500x500 pixel square containing a room named 'Living Room' with an area of 200 sq ft located at the top left, and a room named 'Kitchen' with an area of 150 sq ft located at the bottom right, with a black text label 'Kitchen' at position (400, 400)."
        **Phase #2: SVG Generation**
        1. Using the text description you generated in Phase #1, create SVG code that recreates only the rooms of the described floor plan.
        2. Use the SVG "path" tag to define all room geometries. Do not use other SVG shape tags like "rect" or "polygon."
        3. Ensure the SVG code:
        - Accurately represents all rooms from your generated description, including their shapes, positions, and any associated annotations (e.g., room names or area labels), with their respective colors and fill/stroke properties.
        - Maintains the aspect ratio and dimensions specified in the description.
        - Uses a viewBox attribute to match the floor plan dimensions (e.g., viewBox="0 0 213 108" for a 213"x108" floor plan).
        - Includes appropriate styling (e.g., fill, stroke, stroke-width) within the "path" tags for rooms and text elements for annotations.
        4. Return only the SVG code, with no additional text or explanations.
    `,
    requireAttach: true,
    attachType: ["raster"],
    responseType: "svg",
    disabled: false,
  },
  furnishRooms: {
    label: "Furnish Rooms",
    prompt: `
        You are being tasked with image processing. 
        Take your time reading, processing the attached image and understanding its content, before continuing with any additional processing. 
        Main goals: 
        1 - Generate the necessary SVG code to populate EACH ROOM described in the attached SVG, with the random furniture elements from the list below.
        2 - Furniture Elements: ["table", "chair", "sofa", "bed"]
        At the end, you must analyze the generated SVG code and compare its rendering with the original attached file. Keep iterating, refining and analyzing the generated SVG code, until all of the main goals are accomplished. Iterate however many times will be necessary.
        Return purely the SVG code, with absolutely no other text - verify this requirement before sending the response.`,
    requireAttach: true,
    attachType: ["vector"],
    responseType: "svg",
    disabled: false,
  },
  mergeSVGs: {
    label: "Merge SVGs",
    prompt: `
        You are being tasked with text processing. 
        Take your time reading, processing the attached SVG files and understanding their content, before continuing with any additional processing. 
        Main goals: 
            1 - Merge the SVG code from all of the attached files, producing a single SVG file.
            2 - Make sure the final SVG code includes ALL of the geometries, objects, artifacts, present in the original attached images.
            3 - Maintain aspect ratios and all dimensions.
        At the end, you must analyze the generated SVG code and compare its rendering with the original attached files. Keep iterating, refining and analyzing the generated SVG code, until all of the main goals are accomplished. Iterate however many times will be necessary.
        Return purely the SVG code, with absolutely no other text - verify this requirement before sending the response.`,
    requireAttach: true,
    attachType: ["vector"],
    responseType: "svg",
    disabled: false,
  },
  generateImage: {
    label: "Generate Image",
    prompt: `
        You are being tasked with image generation. 
        Take your time reading, processing the attached image and understanding its content, before continuing with any additional processing. 
        Main goals: 
        1 - Based on the attached floor plan image, generate a photorealistic image of a building that matches the attached floor plan.
        2 - Make sure the generated image includes ALL of the geometries, objects, artifacts, present in the original attached images.
        3 - Maintain aspect ratios and all dimensions.
        At the end, you must analyze the generated image and compare its rendering with the original attached files. Keep iterating, refining and analyzing the generated image, until all of the main goals are accomplished. Iterate however many times will be necessary.
        Return only the generated image, with absolutely no other text - verify this requirement before sending the response.`,
    requireAttach: true,
    attachType: ["raster"],
    responseType: "png",
    disabled: false,
  },
  generateVideo: {
    label: "Generate Video",
    prompt:`
        You are being tasked with video generation. 
        Take your time reading, processing the attached image and understanding its content, before continuing with any additional processing. 
        Main goals: 
        1 - Based on the attached floor plan image, generate a photorealistic, 5 second video of a building that matches the attached floor plan.
        2 - Make sure the generated video includes ALL of the geometries, objects, artifacts, present in the original attached images.
        3 - Maintain aspect ratios and all dimensions.
        At the end, you must analyze the generated video and compare its rendering with the original attached files. Keep iterating, refining and analyzing the generated video, until all of the main goals are accomplished. Iterate however many times will be necessary.
        Return only the generated video, with absolutely no other text - verify this requirement before sending the response.`,
    requireAttach: true,
    attachType: ["vector"],
    responseType: "mp4",
    disabled: true,
  }
};

// Helper function to process template strings in prompts
export function processPromptTemplate(template, context) {
  // First, trim any leading/trailing whitespace from the template
  const trimmedTemplate = template.trim();
  
  // Replace template variables with actual values
  return trimmedTemplate.replace(/\${([^}]+)}/g, (match, path) => {
    // Split the path by dots and navigate through the context object
    const value = path.split('.').reduce((obj, key) => obj?.[key], context);
    return value !== undefined ? value : match; // Return the value or original placeholder if not found
  });
}

// export function processPromptTemplate(template, context) {
//   // Replace template variables with actual values
//   return template.replace(/\${([^}]+)}/g, (match, path) => {
//     // Split the path by dots and navigate through the context object
//     const value = path.split('.').reduce((obj, key) => obj?.[key], context);
//     return value !== undefined ? value : match; // Return the value or original placeholder if not found
//   });
// }

export default aiPrompts;
