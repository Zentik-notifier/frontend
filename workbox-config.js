module.exports = {
  globDirectory: 'dist/',
  globPatterns: [
    '**/*.{js,css,html,png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,eot}',
    '**/manifest.json' 
  ],
  swSrc: 'sw-src.js',
  swDest: 'dist/sw.js',
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
};