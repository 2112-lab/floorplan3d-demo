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
      apiWallsEndpoint: process.env.API_WALLS_ENDPOINT || 'https://novo-floor.cfg3d.net/dev/walls/extract',
      apiRoomsEndpoint: process.env.API_ROOMS_ENDPOINT || 'https://novo-floor.cfg3d.net/dev/rooms/detect',
      apiOpenAIEndpoint: process.env.API_OPENAI_ENDPOINT || 'https://j23tfrpio644dejn2uuhvnno2e0vdlxt.lambda-url.us-east-1.on.aws/',
      developmentMode: process.env.DEVELOPMENT_MODE || 'default',
      inkscapeGTagPrefix: process.env.INKSCAPE_GTAG_PREFIX || 'floorplan3d-',
      openaiAltEndpoint: process.env.OPENAI_ALT_ENDPOINT || 'https://7tfjnhaienxd2acxzov7p3jjhe0lcayd.lambda-url.us-east-1.on.aws/',
      skyboxBaseUrl : process.env.SKYBOX_BASE_URL || "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr"
    }
  },
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true }
})
