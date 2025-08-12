import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  // Global configuration for reducing Vue reactivity overhead
  
  // You can add global configurations here
  // For example, configuring Vue devtools or other global settings
  
  // Note: Vue 3's reactivity system is deeply integrated and cannot be 
  // completely disabled globally without breaking the framework
  
  console.log('Vue reactivity configuration loaded')
})
