"use strict";

var canvas = document.getElementById('canvas');
var gl = canvas.getContext('experimental-webgl');

var program = twgl.createProgramFromScripts(gl, [
  '2d-vertex-shader', '2d-fragment-shader'
]);

gl.useProgram(program);

var positionLocation   = gl.getAttribLocation(program, 'a_position');
var texcoordLocation   = gl.getAttribLocation(program, 'a_texcoords');

var matrixLocation     = gl.getUniformLocation(program, 'u_matrix');

// buffer for position
var buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
setGeometry(gl);

// buffer for texture
var texcoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
gl.enableVertexAttribArray(texcoordLocation);
gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);
setTexcoords(gl);

// create a texture
var texture = gl.createTexture();

var transformMatrix = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1
];

/* Game setup? */
var map = new Map();
map.linedefs.push(new Linedef(new Vertex(2, 2),      new Vertex(2, 0)));
map.linedefs.push(new Linedef(new Vertex(2, 2),      new Vertex(0, 2)));
map.linedefs.push(new Linedef(new Vertex(0, 2),      new Vertex(-0.5, 2.5)));
map.linedefs.push(new Linedef(new Vertex(-0.5, 2.5), new Vertex(-3.5, 0)));
map.linedefs.push(new Linedef(new Vertex(-3.0, 0),   new Vertex(-6, -6)));
map.linedefs.push(new Linedef(new Vertex(-6, -6),    new Vertex(3, -2)));
map.linedefs.push(new Linedef(new Vertex(3, -2),     new Vertex(2, 0)));

var player = new Player();

requestAnimationFrame(render);

window.onresize = render;

// lock le mouse
canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
canvas.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;

canvas.onclick = function() {
  canvas.requestPointerLock();
};

document.addEventListener('pointerlockchange', lockChangeAlert, false);
document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);

function lockChangeAlert() {
  if(document.pointerLockElement === canvas || document.mozPointerLockElement === canvas || document.webkitPointerLockElement === canvas) {
    document.addEventListener('mousemove', canvasLoop, false);
  } else {
    document.removeEventListener('mousemove', canvasLoop, false);
  }
}

function canvasLoop(e) {
  var movementX =  e.movementX ||  e.mozMovementX ||  e.webkitMovementX || 0;
  var movementY = -e.movementY || -e.mozMovementY || -e.webkitMovementY || 0;

  // dampen movement
  movementX /= 20;
  movementY /= 100;

  // move camera and player!
  player.cameraVector.direction += movementX;

  var ray = createRay(player.position.x, player.position.y, movementY > 0 ? player.cameraVector.direction : (player.cameraVector.direction + 180) % 360);

  castRayAgainstLineDefs(ray, map.linedefs, false, function(intersect){
    var dist = getDistance(intersect.x, intersect.y, ray.x1, ray.y1);

    if ((movementY > 0 && dist - movementY < 0.5) || (movementY < 0 && dist + movementY < 0.5)) {
      movementY = 0;
    }
  });

  player.position.x = player.position.x + Math.cos(player.cameraVector.direction * (Math.PI/180)) * movementY;
  player.position.y = player.position.y + Math.sin(player.cameraVector.direction * (Math.PI/180)) * movementY;
}


/* Render stuff */

function render(time) {
  resize(gl);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var cols = renderPlayerView(player, map);
  renderCols(gl, cols);

  setGeometry(gl);
  setTexcoords(gl);

  gl.uniformMatrix3fv(
    matrixLocation,
    false,
    transformMatrix
  );

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  requestAnimationFrame(render);
}

function resize(gl) {
  var canvas = gl.canvas;

  var displayWidth = canvas.clientWidth;
  var displayHeight = canvas.clientHeight;

  if (canvas.width != displayWidth || canvas.height != displayHeight) {
    canvas.width  = displayWidth;
    canvas.height = displayHeight;

    setViewPort(gl);
  }
}

function setViewPort(gl) {
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function setGeometry(gl) {
 var rect = getRectangleVerts(-1, -1, 2, 2);

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(rect),
    gl.STATIC_DRAW
  );
}

function setTexcoords(gl) {
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      0.0, 0.0,
      1.0, 0.0,
      0.0, 1.0,
      0.0, 1.0,
      1.0, 0.0,
      1.0, 1.0,
    ]),
    gl.STATIC_DRAW
  );
}

function getRectangleVerts(x, y, width, height) {
  var x1 = x
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;

  return [
    x1, y1,
    x2, y1,
    x1, y2,
    x1, y2,
    x2, y1,
    x2, y2,
  ];
}

function makeTranslation(tx, ty) {
  return [
    1,  0,  0,
    0,  1,  0,
    tx, ty, 1
  ];
}

function makeRotation(angleInRadians) {
  var c = Math.cos(angleInRadians);
  var s = Math.sin(angleInRadians);
  return [
    c, -s,  0,
    s,  c,  0,
    0,  0,  1
  ];
}

function makeScale(sx, sy) {
  return [
    sx, 0,  0,
    0,  sy, 0,
    0,  0,  1
  ];
}

function matrixMultiply(a, b) {
  var a00 = a[0*3+0];
  var a01 = a[0*3+1];
  var a02 = a[0*3+2];
  var a10 = a[1*3+0];
  var a11 = a[1*3+1];
  var a12 = a[1*3+2];
  var a20 = a[2*3+0];
  var a21 = a[2*3+1];
  var a22 = a[2*3+2];
  var b00 = b[0*3+0];
  var b01 = b[0*3+1];
  var b02 = b[0*3+2];
  var b10 = b[1*3+0];
  var b11 = b[1*3+1];
  var b12 = b[1*3+2];
  var b20 = b[2*3+0];
  var b21 = b[2*3+1];
  var b22 = b[2*3+2];
  return [a00 * b00 + a01 * b10 + a02 * b20,
          a00 * b01 + a01 * b11 + a02 * b21,
          a00 * b02 + a01 * b12 + a02 * b22,
          a10 * b00 + a11 * b10 + a12 * b20,
          a10 * b01 + a11 * b11 + a12 * b21,
          a10 * b02 + a11 * b12 + a12 * b22,
          a20 * b00 + a21 * b10 + a22 * b20,
          a20 * b01 + a21 * b11 + a22 * b21,
          a20 * b02 + a21 * b12 + a22 * b22];
}

function renderCols(gl, cols) {
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // set parameters for textures
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // fill the texture with a lot of pixel junk
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 320, 200, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array(getColPixels(cols)));
}

function getColPixels(cols) {
  var pixels = [];

  for (var r = 0; r < 200; r++) {
    for (var i = 0; i < cols.length; i++) {
      var col = cols[i];

      if (col) {
        // a zero-dist wall should take the whole column.
        // father walls, take less.
        var size = 200 / col;

        // the wall takes up space in the center
        var wallBottom = (200 / 2) - (size / 2);
        var wallTop    = (200 / 2) + (size / 2);

        if (r >= wallBottom && r <= wallTop) {
          pixels.push(255);
          pixels.push(255);
          pixels.push(255);
          pixels.push(255);
        } else {
          pixels.push(255);
          pixels.push(0);
          pixels.push(0);
          pixels.push(255);
        }
      } else {
        pixels.push(255);
        pixels.push(0);
        pixels.push(0);
        pixels.push(255);
      }
    }
  }

  return pixels;
}

/* Player stuff */
function Player() {
  this.position = {
    x: 0,
    y: 0
  };

  this.cameraVector = {
    direction: 45
  };
}

/* Map stuff */

function Map() {
  this.linedefs = [];
}

function Vertex(x, y) {
  this.x = x;
  this.y = y;
}

function Linedef(vert1, vert2) {
  this.vert1 = vert1;
  this.vert2 = vert2;

  // hardcoded wall for now
  this.height = 20;
}

/* Map render? */
function renderPlayerView(player, map) {
  // somehow we do stuff here...
  // to render pseudo-3d to the screen. yikes.

  var fov = 90;
  var cols = [];

  for (var i = player.cameraVector.direction - (fov / 2); i < player.cameraVector.direction + (fov / 2); i += (fov/320)) {
    var ray = createRay(player.position.x, player.position.y, i);
    var dist = null;

    castRayAgainstLineDefs(ray, map.linedefs, false, function(intersect){
      dist = getDistance(intersect.x, intersect.y, ray.x1, ray.y1);

      // get distance relative to the camera plane

      // this is a little messed up right now
      // dist = dist * Math.cos((player.cameraVector.direction - i) * (Math.PI/180));
      dist = dist;
    });

    cols.push(dist);
  }

  return cols;
}

function castRayAgainstLineDefs(ray, linedefs, testAll, callback) {
  for (var j = 0; j < linedefs.length; j++) {
    var linedef = linedefs[j];
    var intersect = getLineIntersection(ray.x1, ray.y1, ray.x2, ray.y2, linedef.vert1.x, linedef.vert1.y, linedef.vert2.x, linedef.vert2.y);

    if (intersect) {
      callback(intersect);
      if (!testAll) {
        break;
      }
    }
  }
}

function createRay(x, y, angle, size) {
  size = size || 1000;

  var rad = angle * (Math.PI/180);
  var ix = x + Math.cos(rad) * size;
  var iy = y + Math.sin(rad) * size;

  return {
    x1: x,
    y1: y,
    x2: ix,
    y2: iy
  };
}

function getDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1)*(x2 - x1) + (y2 - y1)*(y2 - y1))
}

function getLineIntersection(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) {
  var s1x, s1y, s2x, s2y;
  s1x = p1x - p0x;
  s1y = p1y - p0y;
  s2x = p3x - p2x;
  s2y = p3y - p2y;

  var s, t, d;
  d = -s2x * s1y + s1x * s2y;

  if (d == 0) {
    return false;
  }

  s = (-s1y * (p0x - p2x) + s1x * (p0y - p2y)) / d;
  t = ( s2x * (p0y - p2y) - s2y * (p0x - p2x)) / d;

  if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
    return {
      x: p0x + (t * s1x),
      y: p0y + (t * s1y)
    };
  }

  return false;
}
