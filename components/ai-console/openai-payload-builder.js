/**
 * Helper functions to build and validate the OpenAI API request payload
 */

/**
 * Builds a standardized payload for the OpenAI API
 * 
 * @param {Object} options Configuration options
 * @param {String} options.prompt The prompt text to send
 * @param {String} options.responseType The desired response type (vector or raster)
 * @param {Object} options.attachedDocuments Map of attached documents with name as key
 * @param {String} options.model The model to use (default: gpt-4)
 * @param {Boolean} options.use_base64 Whether to use base64 encoding (default: false)
 * @returns {Object} The formatted payload
 */
export function buildOpenAIPayload({
  prompt,
  responseType = "vector",
  attachedDocuments = {},
  model = "gpt-4o",
  use_base64 = false
}) {
  // Build the standard payload structure
  const formattedDocuments = formatAttachedDocuments(attachedDocuments);
  
  // Generate the complete prompt with documents included
  const finalPrompt = generatePromptWithDocuments(formattedDocuments, prompt, use_base64, responseType);
  
  return {
    prompt: finalPrompt,
    use_base64,
    model,
    responseType,
    attachedDocuments: formattedDocuments
  };
}

/**
 * Generates a formatted prompt that includes the user's prompt text and any attached documents
 * 
 * @param {Object} documents Map of formatted documents
 * @param {String} prompt The user's prompt text
 * @param {Boolean} use_base64 Whether to use base64 encoding
 * @param {String} responseType The desired response type (vector or raster)
 * @returns {String} The formatted prompt text
 */
function generatePromptWithDocuments(documents, prompt, use_base64 = false, responseType = "vector") {
  let finalPrompt = `Edit Prompt: ${prompt}\n\nAttached Documents:\n`;
  
  for (const [title, doc] of Object.entries(documents)) {
    if (doc) {
      const category = doc.category || 'unknown';
      let imageData = doc.image || '';
      
      if (use_base64 && (category === 'vector' || (typeof imageData === 'string' && imageData.startsWith('<svg')))) {
        imageData = btoa(imageData);
      }
      
      finalPrompt += `\n--- ${title} (${category}) ---\n${imageData}\n`;
    }
  }
  
  return finalPrompt;
}

/**
 * Format attached documents to match the expected structure
 * 
 * @param {Object} documents Map of documents to format
 * @returns {Object} Formatted documents map
 */
function formatAttachedDocuments(documents) {
  const formattedDocs = {};
  
  for (const [name, doc] of Object.entries(documents)) {
    formattedDocs[name] = {
      category: doc.category,
      image: doc.image
    };
  }
  
  return formattedDocs;
}

/**
 * Checks if the payload size is within limits
 * 
 * @param {Object} payload The payload to check
 * @param {Number} maxSizeMB Maximum size in MB
 * @returns {Object} { valid: boolean, size: number in MB }
 */
export function checkPayloadSize(payload, maxSizeMB = 3) {
  // Convert payload to string and calculate size in bytes
  const payloadStr = JSON.stringify(payload);
  const size = new Blob([payloadStr]).size;
  
  // Convert to MB
  const sizeInMB = size / (1024 * 1024);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  return {
    valid: size <= maxSizeBytes,
    size: sizeInMB
  };
}
