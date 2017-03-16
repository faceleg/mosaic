// Constants shared between client and server.
var TILE_WIDTH = 8
var TILE_HEIGHT = 8

/**
 * Checks if the item is already in the array
 * @param  {String} value   The value to compare
 * @param  {Int}    index   Current index to compare to
 * @param  {Array}  self    Reference to self
 * @return {Boolean} Return result if unique
 */
function unique (value, index, self) {
  return self.indexOf(value) === index
}

/**
 * Ensures a function is only called once
 * @param  {Function} The callback to check
 * @return {}
 */
var once = function (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

var noop = function noop () {}

var Mosaic = function Mosaic () {
}

/**
 * Finds the current row based on index
 * @param  {Array} pixelMap        The array to find the pixels for
 * @param  {Int}   currentRowIndex The current row index
 * @return {Array}
 */
Mosaic.prototype.findCurrentRow = function (pixelMap, currentRowIndex) {
  return pixelMap.filter(function (pixel) {
    return pixel.y === currentRowIndex
  })
}

/**
 * Gets the image from the uploaded file
 * @param  {File} file  The uploaded file
 * @return {Promise} Node The image node
 */
Mosaic.prototype.getImageFromFile = function (file) {
  var image = new Image()

  return new Promise(function (resolve, reject) {
    image.src = URL.createObjectURL(file)
    image.onload = function () {
      resolve(image)
    }
  })
}

/**
 * Finds the current row based on index
 * @param  {Object} size    Size of the image
 * @param  {Node}   image   The image data to use
 * @param  {Int}    colors  The base color to use per pixel
 * @return {Object} Returns color, x-cord and y-cord with pixel data
 */
Mosaic.prototype.getPixelMap = function (size, image, colors) {
  var tmpCanvas = document.createElement('canvas'),
    context = tmpCanvas.getContext('2d')

  tmpCanvas.width = size.x
  tmpCanvas.height = size.y

  context.drawImage(image, 0, 0, size.x, size.y)

  var pixelMap = this.getColorMap(context.getImageData(0, 0, size.x, size.y), colors)
    .then(function (tileColors) {
      return tileColors.map(function (color, i) {
        return {
          color: color,
          x: (i % size.x) + 1,
          y: Math.floor(i / size.x) + 1
        }
      })
    })

  return pixelMap
}

/**
 * Runs a worker across the canvas object returning a manageable color map
 * @param  {Object} img     The image data for the mosaic
 * @param  {Int}    colors  The base color to use per pixel
 * @return {Promise} Returns a map of colors used to construct the mosaic
 */
Mosaic.prototype.getColorMap = function (img, colors) {
  if (window.Worker) {
    var mosaicWorker = new Worker('js/workers/index.js')

    mosaicWorker.postMessage({img: img, colors: colors}) // Sending message as an array to the worker

    var waitForWorker = new Promise(function (resolve, reject) {
      mosaicWorker.onmessage = function (e) {
        return resolve(e.data)
      }
    })

    return waitForWorker
  } else {
    // Do this on the main thread instead as a fallback
    var MosaicWorker = new MosaicWorker()
    return MosaicWorker.getColorMap(img, colors)
  }
}

/**
 * Checks if the current row has been downloaded completely
 * @param  {Array}   currentRow    An array of the current rows tiles
 * @param  {Object}  completeTiles  An object of color tiles that has been downloaded
 * @return {Boolean} Returns wether the row is ready to be rendered
 */
Mosaic.prototype.currentRowDownloaded = function (currentRow, completeTiles) {
  return !currentRow.some(function (elem) {
    return !(completeTiles[elem.color] && completeTiles[elem.color].complete)
  })
}

/**
 * Queues and downloads a set amount of items
 * @param  {Array}    arr       The array to loop over
 * @param  {Int}      limit     The max limit of items to download
 * @param  {Function} iterator  The function to iterate
 * @param  {Function} callback  The function to call once the itteration completes
 */
Mosaic.prototype.downloadLimitedItems = function (arr, limit, iterator, callback) {
  // Download up to max {limit} images at a time
  var complete = 0
  var aborted = false
  var results = []
  var queued = 0
  var l = arr.length
  var i = 0

  callback = once(callback || noop)

  if (typeof iterator !== 'function') {
    throw new Error('Iterator function must be passed as the third argument')
  }

  for (var r = 0; r < l; r++) {
    results[r] = null
  }

  flush()

  function flush () {
    if (complete === l) {
      return callback(null, results)
    }

    while (queued < limit) {
      if (aborted) break
      if (i === l) break
      push()
    }
  }

  function abort (err) {
    aborted = true
    return callback(err)
  }

  function push () {
    var idx = i++

    queued += 1

    iterator(arr[idx], function (err, result) {
      if (err) return abort(err)
      results[idx] = result
      complete += 1
      queued -= 1
      flush()
    })
  }
}

/**
 * Gets the size of the image maintaing the aspect ratio
 * @param  {Object}   image    The image dimensions
 * @param  {Object}   canvas   The canvas dimensions
 * @return {Object}   Returns the dimensions to use
 */
Mosaic.prototype.getSize = function (image, canvas) {
  var aspectRatio = image.width / image.height
  var width = canvas.width
  var height = canvas.height

  if (width / aspectRatio < height) {
    return {
      x: width,
      y: Math.floor(width / aspectRatio)
    }
  }

  return {
    x: Math.floor(height * aspectRatio),
    y: Math.floor(height)
  }
}

/**
 * Gets the mosaic dimensions to use
 * @param  {Object}   size    The size of the image
 * @param  {Object}   canvas   The canvas dimensions
 * @return {Object}   Returns the dimensions to use
 */
Mosaic.prototype.getDimensions = function (size) {
  return {
    x: Math.ceil(size.x / TILE_WIDTH),
    y: Math.ceil(size.y / TILE_HEIGHT)
  }
}

/**
 * Creates a mosaic from the uploaded image and renders it to a canvas
 * @param  {File}     file     The uploaded file
 * @param  {Object}   canvas   The canvas to use
 * @param  {Int}      colors   The color per pixel to use
 */
Mosaic.prototype.create = function (file, canvas, colors) {
  var self = this,
    context = canvas.getContext('2d')

  colors = colors || 16
  context.clearRect(0, 0, canvas.width, canvas.height)

  this.getImageFromFile(file)
  .then(function (image) {
    var imageSize = self.getSize(image, canvas)
    var mosaicDimensions = self.getDimensions(imageSize)

    return self.getPixelMap(mosaicDimensions, image, colors)
  .then(function (pixelMap) {
    var uniqueMap = pixelMap.filter(unique)

    var uniqueColors = uniqueMap.map(function (pixel) {
      return pixel.color
    })

    var completeTiles = {}
    var currentRowIndex = 1
    var currentRow = self.findCurrentRow(pixelMap, currentRowIndex)

    var offset = {
      x: (canvas.width - imageSize.x) / 2,
      y: (canvas.height - imageSize.y) / 2
    }

    var renderCompleteRows = function () {
      if (!self.currentRowDownloaded(currentRow, completeTiles)) {
        return
      }

      currentRow.forEach(function (pixel) {
        context.drawImage(
          completeTiles[pixel.color],
          offset.x + (pixel.x - 1) * TILE_WIDTH,
          offset.y + (pixel.y - 1) * TILE_HEIGHT
        )
      })

      currentRowIndex++

      currentRow = self.findCurrentRow(pixelMap, currentRowIndex)

      if (currentRow.length === 0) {
        return
      }

      renderCompleteRows()
    }

    self.downloadLimitedItems(uniqueColors, 16, function (color, cb) {
      var image = new Image()
      image.src = 'color/' + color
      image.onload = function () {
        completeTiles[color] = image
        cb(false, image)
        renderCompleteRows()
      }
    },
    function () {
      renderCompleteRows()
    })
  })
  })
}

// Usualy this would live in a constants.js file, but adhering to rules that
// that server should not be modified hence not changing file name.
var exports = exports || null
if (exports) {
  exports.TILE_WIDTH = TILE_WIDTH
  exports.TILE_HEIGHT = TILE_HEIGHT
}
