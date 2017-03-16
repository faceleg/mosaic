/**
 * A constructor that sets up the client
 * @param  {Object}   options    A set of nodes needed by the client
 */
var Client = function Client (options) {
  this.canvas = options.canvas
  this.colors = options.colors
  this.fileButton = options.fileButton
  this.fileInput = options.input
  this.saveButton = options.saveButton
  this.canvasContainer = options.canvasContainer
  this.error = options.error

  this.file = ''

  this.mosaic = new Mosaic()
}

/**
 * Gets the current canvas
 * @return {Object}
 */
Client.prototype.getCanvas = function () {
  return this.canvas
}

/**
 * Blocks all default browser events
 */
Client.prototype.blockEvents = function (e) {
  e.preventDefault()
  e.stopPropagation()
}

/**
 * Renders a mosaic to the canvas
 * @param  {File}  file  The uploaded image file to use
 */
Client.prototype.render = function (file) {
  this.mosaic.create(file, this.canvas, this.colors.value)
}

Client.prototype.renderCanvas = function () {
  var renderCanvas = this.canvas
  var canvasContainer = this.canvasContainer.getBoundingClientRect()

  renderCanvas.width = canvasContainer.width - 64 // Added padding
  renderCanvas.height = canvasContainer.height - 92 // Added padding
}

/**
 * Extacts the data file uploaded and sets nodes with data
 * @param  {File}  input  The uploaded image file to use
 */
Client.prototype.onFileChange = function (input) {
  if (!input.files || input.files.length < 1) {
    return
  }

  var file = input.files[0]

  switch (file.type) {
    case 'image/png':
    case 'image/jpg':
    case 'image/jpeg':
      this.error.textContent = ''
      break
    default:
      this.error.textContent = 'Please upload an image.'
      return
  }

  document.body.classList.add('view')

  var name = file.name

  // set the name of the download
  name = name.split('.')
  name.pop()
  name = name.join('.') + '-mosaic.png'
  this.saveButton.download = name
  this.renderCanvas()

  this.render(file)
}

document.addEventListener('DOMContentLoaded', function () {
  var nodes = {
    canvas: document.getElementById('app-canvas'),
    canvasContainer: document.getElementById('canvasContainer'),
    colors: document.getElementById('colorValues'),
    fileButton: document.getElementById('fileButton'),
    input: document.getElementById('fileInput'),
    saveButton: document.getElementById('saveButton'),
    error: document.getElementById('error')
  }

  var inputBox = document.getElementById('inputBox')
  var fileInput
  var resizeTimer

  var client = new Client(nodes)

  var handleFileChange = function () {
    fileInput = {files: this.files}
    client.onFileChange(fileInput)
  }

  var handleDragEnter = function (e) {
    client.blockEvents(e)
    inputBox.classList.add('dragover')
  }

  var handleDragLeave = function (e) {
    client.blockEvents(e)
    inputBox.classList.remove('dragover')
  }

  var handleDropEvent = function (e) {
    client.blockEvents(e)
    inputBox.classList.remove('dragover')

    fileInput = {files: e.dataTransfer.files}

    client.onFileChange(fileInput)
  }

  nodes.fileButton.addEventListener(
    'click',
    function (e) {
      document.getElementById('fileInput').click()
      client.blockEvents(e)
    },
    false
  )

  inputBox.addEventListener('dragenter', handleDragEnter, false)
  inputBox.addEventListener('dragover', client.blockEvents, false)
  inputBox.addEventListener('dragleave', handleDragLeave, false)
  inputBox.addEventListener('drop', handleDropEvent, false)

  nodes.input.addEventListener('change', handleFileChange)

  // handle saving of the canvas
  // @todo would be nice to disable this button until render is complete
  nodes.saveButton.addEventListener('click', function (e) {
    this.href = client.getCanvas().toDataURL('image/png')
  })

  window.onresize = function () {
    if (fileInput && fileInput !== null) {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(function () {
        // Resizing has "stopped"
        client.renderCanvas()
        client.onFileChange(fileInput)
      }, 300)
    }
  }
})
