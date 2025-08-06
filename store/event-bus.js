// Event bus using Pinia for Nuxt 3
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useEventBusStore = defineStore('eventBus', () => {
  const listeners = ref({});
  const responseType = ref('vector'); // Default response type
  
  // Emit an event
  function emit(event, ...args) {
    if (!listeners.value[event]) {
      return;
    }
    
    listeners.value[event].forEach(callback => {
      callback(...args);
    });
  }

  // Register an event listener
  function on(event, callback) {
    if (!listeners.value[event]) {
      listeners.value[event] = [];
    }
    
    listeners.value[event].push(callback);
    
    // Return a function to remove this specific listener
    return () => {
      off(event, callback);
    };
  }

  // Remove an event listener
  function off(event, callback) {
    if (!listeners.value[event]) {
      return;
    }
    
    if (callback) {
      // Remove specific callback
      listeners.value[event] = listeners.value[event].filter(
        cb => cb !== callback
      );
    } else {
      // Remove all listeners for this event
      listeners.value[event] = [];
    }
  }
  // Set response type
  function setResponseType(type) {
    responseType.value = type;
  }

  return {
    emit,
    on,
    off,
    responseType,
    setResponseType
  };
});