var MosaicWorker = function MosaicWorker () {
}

/**
 * Takes an RGB color and returns a hex code for that color based on quality
 * @param  {Int} component    Red value of color
 * @return {String}           Returns a hex value of the component
 */
MosaicWorker.prototype.convertToHex = function (component) {
  var hex = component.toString(16)

  return hex.length === 1 ? '0' + hex : hex
}

/**
 * Takes an RGB color and returns a hex code for that color based on quality
 * @param  {Int} r        Red value of color
 * @param  {Int} g        Green value of color
 * @param  {Int} b        Blue value of color
 * @param  {Int} colors   The base color to use per pixel
 * @return {String}       Returns a hex value of the RGB color
 */
MosaicWorker.prototype.rgbToHex = function (r, g, b, colors) {
  r = Math.floor((Math.floor(r / 255 * colors) / colors) * 255)
  g = Math.floor((Math.floor(g / 255 * colors) / colors) * 255)
  b = Math.floor((Math.floor(b / 255 * colors) / colors) * 255)

  return this.convertToHex(r) +
         this.convertToHex(g) +
         this.convertToHex(b)
}

/**
 * Loops across the image using the quailty color to generate a color map
 * @param  {Object} img     The image data for the mosaic
 * @param  {Int}    colors  The base color to use per pixel
 * @return {Array}          Returns a map of colors used to construct the mosaic
 */
MosaicWorker.prototype.getColorMap = function (img, colors) {
  var length = img.data.length
  var data = []
  var i

  for (i = 0; i < length; i += 4) {
    data.push(
      this.rgbToHex(img.data[i], img.data[i + 1], img.data[i + 2], colors)
    )
  }

  return data
}

// Able to use this file as a webworker, will listen for messages once instantiated
onmessage = function (e) {
  var worker = new MosaicWorker(e.data)

  var workerResult = worker.getColorMap(e.data.img, e.data.colors)

  postMessage(workerResult)
  close()
}
