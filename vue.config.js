module.exports = {
  css: {
    loaderOptions: {
      sass: {
        data: `@import "@/styles/styles.scss";`,
      },
    },
  },
  transpileDependencies: [
    'firebase', 
    '@firebase',
    '@mediapipe/tasks-vision'
  ],
  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto'
        }
      ]
    }
  }
}
