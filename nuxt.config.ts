// https://nuxt.com/docs/api/configuration/nuxt-config
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import WebpackObfuscator from 'webpack-obfuscator'
import path from 'path'

export default defineNuxtConfig({
  ssr: false,
  build: {
    transpile: ['vuetify'],
  },
  app: {
    head: {
      title: 'Floorplan3D',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Floorplan3D application' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon2.ico' }
      ]
    }
  },
  modules: [
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        // @ts-expect-error
        config.plugins.push(vuetify({ autoImport: true }))
      })
    },
    '@pinia/nuxt',
  ],
  vite: {
    vue: {
      template: {
        transformAssetUrls,
      },
    },
    resolve: {
      alias: process.env.LOCAL_DEV === 'true' ? {
        '@2112-lab/floorplan3d': path.resolve(__dirname, 'floorplan3d/src/index.js')
      } : {}
    }
  },
  // Webpack Configuration for Code Obfuscation
  webpack: {
    plugins: process.env.NODE_ENV === 'production' ? [
      new WebpackObfuscator({
        rotateStringArray: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.8,
        identifierNamesGenerator: 'hexadecimal',
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.4,
        debugProtection: true,
        debugProtectionInterval: true,
        disableConsoleOutput: true,
        renameGlobals: true,
        selfDefending: true,
        unicodeEscapeSequence: false,
      })
    ] : [],
  },
  runtimeConfig: {
    // Public keys that are exposed to the client
    public: {
      inkscapeGtagPrefix: 'FP3D-' // Default value for FloorPlan3D tags
    }
  },
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true }
})
