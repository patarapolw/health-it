// import colors from 'vuetify/es5/util/colors'
import yaml from 'js-yaml'
import fs from 'fs'
const config = yaml.safeLoad(fs.readFileSync('../config.yaml'))

export default {
  mode: 'universal',
  /*
  ** Headers of the page
  */
  head: {
    // titleTemplate: '%s - ' + config.title,
    title: config.title,
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: config.description },
      {
        hid: 'og:title',
        property: 'og:title',
        content: config.title
      },
      {
        hid: 'og:description',
        property: 'og:description',
        content: config.description
      },
      // {
      //   hid: 'og:image',
      //   property: 'og:image',
      //   content: metaImage
      // },
      // {
      //   hid: 'og:url',
      //   property: 'og:url',
      //   content: config.fullUrl
      // },
      {
        hid: 'twitter:title',
        property: 'twitter:title',
        content: config.title
      },
      {
        hid: 'twitter:description',
        property: 'twitter:description',
        content: config.description
      },
      // {
      //   hid: 'twitter:image',
      //   property: 'twitter:image',
      //   content: metaImage
      // },
      {
        hid: 'twitter:card',
        property: 'twitter:card',
        content: 'summary_large_image'
      },
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/build/favicon.ico' }
    ],
    script: [
      { 'data-isso': 'http://localhost:1234', src: 'http://localhost:1234/js/embed.min.js' }
    ]
  },
  /*
  ** Customize the progress-bar color
  */
  loading: { color: '#fff' },
  /*
  ** Global CSS
  */
  css: [
  ],
  /*
  ** Plugins to load before mounting the App
  */
  plugins: [
  ],
  /*
  ** Nuxt.js dev-modules
  */
  buildModules: [
    '@nuxtjs/vuetify',
    '@nuxt/typescript-build',
  ],
  /*
  ** Nuxt.js modules
  */
  modules: [
    // Doc: https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
  ],
  /*
  ** Axios module configuration
  ** See https://axios.nuxtjs.org/options
  */
  axios: {
  },
  /*
  ** vuetify module configuration
  ** https://github.com/nuxt-community/vuetify-module
  */
  vuetify: {
    customVariables: ['~/assets/variables.scss'],
    theme: {
      dark: false,
      themes: {
        // dark: {
        //   primary: colors.blue.darken2,
        //   accent: colors.grey.darken3,
        //   secondary: colors.amber.darken3,
        //   info: colors.teal.lighten1,
        //   warning: colors.amber.base,
        //   error: colors.deepOrange.accent4,
        //   success: colors.green.accent3
        // }
      }
    }
  },
  /*
  ** Build configuration
  */
  build: {
    /*
    ** You can extend webpack config here
    */
    extend (config, ctx) {
    }
  },
  serverMiddleware: {
    '/api/config': '~/api/config.ts',
    '/build': '~/api/build.ts'
  }
}
