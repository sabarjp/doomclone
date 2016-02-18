var canvas = document.getElementById('editor');
var context = canvas.getContext('2d');

var isDragging = false;
var currentLinedef = null;

var linedefs = [];

var snap = 10;
var scale = 10;

var center = {
  x: 400,
  y: 400
};

document.body.onmousedown = function(evt) {
  var mouseX = snapTo(evt.clientX);
  var mouseY = snapTo(evt.clientY);

  var newVertex1 = new Vertex((mouseX - center.x) / scale, (mouseY - center.y) / scale);
  var newVertex2 = new Vertex((mouseX - center.x) / scale, (mouseY - center.y) / scale);
  currentLinedef = new Linedef(newVertex1, newVertex2);

  linedefs.push(currentLinedef);

  isDragging = true;
}

document.body.onmousemove = function(evt) {
  var mouseX = snapTo(evt.clientX);
  var mouseY = snapTo(evt.clientY);

  if (isDragging) {
    currentLinedef.vert2.x = (mouseX - center.x) / scale;
    currentLinedef.vert2.y = (mouseY - center.y) / scale;
  }
}

document.body.onmouseup = function(evt) {
  var mouseX = snapTo(evt.clientX);
  var mouseY = snapTo(evt.clientY);

  currentLinedef = null;

  isDragging = false;
}

function loadMapFromString(str) {
  var arr = eval(str);

  loadMap(arr);
}

function loadMap(arr) {
  for(var i=0; i<arr.length; i+=8) {
    var newVertex1 = new Vertex(arr[i], arr[i+1]);
    var newVertex2 = new Vertex(arr[i+2], arr[i+3]);
    var newLinedef = new Linedef(newVertex1, newVertex2);

    linedefs.push(newLinedef);
  }
}

function printMap() {
  var buffer = '[';

  linedefs.forEach(function(linedef) {
    buffer += linedef.vert1.x + ',';
    buffer += linedef.vert1.y + ',';
    buffer += linedef.vert2.x + ',';
    buffer += linedef.vert2.y + ',';
    buffer += '1,';
    buffer += '0,';
    buffer += '0,';
    buffer += '0,';
  });

  // chop last comma
  buffer = buffer.slice(0, -1);
  buffer += ']';

  console.log(buffer);
}

function snapTo(value) {
  return Math.round(value / 10.0) * 10;
}

function Vertex(x, y) {
  this.x = x;
  this.y = y;

  this.draw = function() {
    context.fillStyle = 'rgb(200,0,0)';
    context.fillRect((this.x * scale + center.x), (this.y * scale + center.y), 5, 5);
  };
}

function Linedef(vert1, vert2) {
  this.vert1 = vert1;
  this.vert2 = vert2;

  this.draw = function() {
    context.beginPath();
    context.moveTo((vert1.x * scale + center.x), (vert1.y * scale + center.y));
    context.lineTo((vert2.x * scale + center.x), (vert2.y * scale + center.y));
    context.strokeStyle = 'rgb(200,0,0)';
    context.stroke();

    this.vert1.draw();
    this.vert2.draw();
  };
}

function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  // render start location
  context.fillStyle = 'rgb(200,200,0)';
  context.fillRect(center.x, center.y, 5, 5);

  linedefs.forEach(function(linedef) {
    linedef.draw();
  });

  requestAnimationFrame(render);
}

render();
