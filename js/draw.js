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
map.load([-1,-1,-1,2,1,0,0,0,-1,2,2,2,1,0,0,0,2,-1,2,2,1,0,0,0,2,-1,3,-3,1,0,0,0,-1,-1,-2,-3,1,0,0,0,3,-3,4,-4,1,0,0,0,-2,-3,-3,-4,1,0,0,0,-3,-4,-3,-9,1,0,0,0,4,-4,4,-9,1,0,0,0,-3,-9,-1,-10,1,0,0,0,4,-9,2,-10,1,0,0,0,2,-10,3,-13,1,0,0,0,-1,-10,-2,-13,1,0,0,0,3,-13,6,-13,1,0,0,0,6,-13,6,-15,1,0,0,0,-2,-13,-4,-13,1,0,0,0,-4,-13,-4,-15,1,0,0,0,6,-15,8,-17,1,0,0,0,8,-17,8,-19,1,0,0,0,8,-19,6,-21,1,0,0,0,6,-22,6,-21,1,0,0,0,-4,-15,-5,-17,1,0,0,0,-5,-17,-5,-20,1,0,0,0,4,-22,-5,-22,1,0,0,0,4,-22,6,-22,1,0,0,0,-5,-22,-9,-24,1,0,0,0,-5,-20,-10,-22,1,0,0,0,-9,-24,-10,-26,1,0,0,0,-10,-22,-12,-25,1,0,0,0,-10,-26,-10,-28,1,0,0,0,-12,-28,-12,-25,1,0,0,0,-12,-28,-15,-28,1,0,0,0,-15,-28,-15,-37,1,0,0,0,-10,-28,-6,-28,1,0,0,0,-6,-28,-6,-37,1,0,0,0,-15,-37,-9,-37,1,0,0,0,-6,-37,-7,-37,1,0,0,0,-9,-37,-9,-38,1,0,0,0,-9,-38,-8,-39,1,0,0,0,-8,-39,-3,-40,1,0,0,0,-7,-37,-5,-38,1,0,0,0,-5,-38,-3,-39,1,0,0,0,-3,-39,-2,-39,1,0,0,0,-2,-39,-2,-37,1,0,0,0,-3,-40,6,-40,1,0,0,0,-2,-37,0,-38,1,0,0,0,6,-40,2,-35,1,0,0,0,0,-38,2,-38,1,0,0,0,2,-38,0,-33,1,0,0,0,2,-35,6,-37,1,0,0,0,0,-33,5,-35,1,0,0,0,5,-35,4,-32,1,0,0,0,6,-37,6,-31,1,0,0,0,4,-32,5,-30,1,0,0,0,5,-30,5,-27,1,0,0,0,6,-31,10,-31,1,0,0,0,5,-27,4,-26,1,0,0,0,10,-31,11,-32,1,0,0,0,4,-26,5,-25,1,0,0,0,5,-25,6,-26,1,0,0,0,11,-32,12,-31,1,0,0,0,12,-31,11,-30,1,0,0,0,6,-26,8,-25,1,0,0,0,11,-30,11,-26,1,0,0,0,11,-26,9,-28,1,0,0,0,9,-28,8,-25,1,0,0,0]);

var screen = {
  width: 320,
  height: 200
};
var player = new Player();
var fov = 90;
var cameraPlane = new Vec2(0, Math.tan(deg2rad(fov) / 2));

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

  // rotate camera
  var oldDirection = new Vec2(player.direction.x, player.direction.y);
  player.direction.x = oldDirection.x * Math.cos(-movementX) - oldDirection.y * Math.sin(-movementX);
  player.direction.y = oldDirection.x * Math.sin(-movementX) + oldDirection.y * Math.cos(-movementX);

  // rotate camera plane
  var oldCameraPlane = new Vec2(cameraPlane.x, cameraPlane.y);
  cameraPlane.x = oldCameraPlane.x * Math.cos(-movementX) - oldCameraPlane.y * Math.sin(-movementX);
  cameraPlane.y = oldCameraPlane.x * Math.sin(-movementX) + oldCameraPlane.y * Math.cos(-movementX);

  var ray = movementY > 0 ? player.direction : new Vec2(-player.direction.x, -player.direction.y);

  castRayAgainstLineDefs(player.position, ray, map.linedefs, false, function(intersect){
    var dist = getDistance(intersect.x, intersect.y, ray.x, ray.y);

    if ((movementY > 0 && dist - movementY < 0.5) || (movementY < 0 && dist + movementY < 0.5)) {
      movementY = 0;
    }
  });

  // move player
  player.position.x = player.position.x + player.direction.x * movementY;
  player.position.y = player.position.y + player.direction.y * movementY;
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
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, screen.width, screen.height, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array(getColPixels(cols)));
}

function getColPixels(cols) {
  var pixels = [];

  for (var r = 0; r < screen.height; r++) {
    for (var i = 0; i < cols.length; i++) {
      var col = cols[i];

      if (col) {
        // a zero-dist wall should take the whole column.
        // father walls, take less.
        var size = screen.height / col.dist;

        // the wall takes up space in the center
        var wallBottom =  (-size / 2) + (screen.height / 2);
        var wallTop    =  wallBottom + size * col.relativeHeight;

        if (r >= wallBottom && r <= wallTop) {
          var offset = col.lineDirection == 'x' ? 35 : 0;
          var varLighting = Math.max(0.04, lintop(0, 1.0, 6, 0.0, col.dist));
          var hoboTexture = varLighting * lintop(wallBottom, 20+offset, wallTop, 200+offset, r);


          pixels.push(hoboTexture >>> 0);
          pixels.push(hoboTexture >>> 0);
          pixels.push(hoboTexture >>> 0);
          pixels.push(255);
        } else {
          if (r < screen.height / 2) {
            // try to calc imaginary pixels?
            var imDist = screen.height / (screen.height/2 - r + 1);
            var imVarLighting = Math.max(0, lintop(0, 0.8, 6, 0.0, imDist));
            pixels.push(imVarLighting * 255);
            pixels.push(0);
            pixels.push(0);
            pixels.push(255);
          } else {
            // try to calc imaginary pixels... again!?
            var imDist = screen.height / (r - screen.height/2 + 1);
            var imVarLighting = Math.max(0, lintop(0, 0.8, 6, 0.0, imDist));
            pixels.push(0);
            pixels.push(0);
            pixels.push(imVarLighting * 255);
            pixels.push(255);
          }
        }
      } else {
        if (r < screen.height / 2) {
          pixels.push(255);
          pixels.push(0);
          pixels.push(0);
          pixels.push(255);
        } else {
          pixels.push(0);
          pixels.push(0);
          pixels.push(255);
          pixels.push(255);
        }
      }
    }
  }

  return pixels;
}

/* Player stuff */
function Player() {
  this.position = new Vec2(0, 0);
  this.direction = new Vec2(-1, 0);
}

/* Map stuff */

function Map() {
  this.linedefs = [];

  this.load = function(arr) {
    for(var i=0; i<arr.length; i+=8) {
      this.linedefs.push(new Linedef(new Vertex(arr[i], arr[i+1]), new Vertex(arr[i+2], arr[i+3]), arr[i+4]));
    }
  };
}

function Vec2(x, y) {
  this.x = x;
  this.y = y;
}

function Vertex(x, y) {
  this.x = x;
  this.y = y;
}

function Linedef(vert1, vert2, height) {
  this.vert1 = vert1;
  this.vert2 = vert2;
  this.height = height;
}

/* Map render? */
function renderPlayerView(player, map) {
  // somehow we do stuff here...
  // to render pseudo-3d to the screen. yikes.

  var cols = [];

  // loop over screen space in the x direction
  for (var x = 0; x < screen.width; x++) {
    // constrain coordinate to camera space (-1, 1)
    var cameraX = ((2 * x) / screen.width) - 1;
    var rayDirection = new Vec2(
      player.direction.x + cameraPlane.x * cameraX,
      player.direction.y + cameraPlane.y * cameraX
    );
    var rayPosition = new Vec2(
      player.position.x,
      player.position.y
    );

    var rayLongdirection = new Vec2(rayDirection.x, rayDirection.y);
    var dist = null;
    var height = null;
    var lineDirection = null;

    castRayAgainstLineDefs(rayPosition, rayLongdirection, map.linedefs, false, function(intersect, linedef){
      var stepX = rayDirection.x < 0 ? 1 : 1;
      var stepY = rayDirection.y < 0 ? 1 : 1;

      var ydist = Math.abs((intersect.y - rayPosition.y + (1 - stepY) / 2) / rayDirection.y);
      var xdist = Math.abs((intersect.x - rayPosition.x + (1 - stepX) / 2) / rayDirection.x);

      dist = xdist || ydist;
      height = linedef.height;

      if (Math.abs(linedef.vert2.x - linedef.vert1.x) > Math.abs(linedef.vert2.y - linedef.vert1.y)) {
        lineDirection = 'x';
      } else {
        lineDirection = 'y';
      }


    });

    cols.push({
      dist: dist,
      relativeHeight: height,
      lineDirection: lineDirection
    });
  }

  return cols;
}

// casts a ray for a certain distance before giving up.
function castRayAgainstLineDefs(position, direction, linedefs, testAll, callback) {
  var intersect = null;
  var iter = 0;
  var nextPosition = new Vec2(position.x, position.y);
  var nextDirection = new Vec2(direction.x / 5, direction.y / 5);

  // bsp would be very useful here...

  // junk algorithm. ray cast in chunks until we hit a segment or a max
  // testing range.
  while (!intersect && iter++ < 180) {
    for (var j = 0; j < linedefs.length; j++) {
      var linedef = linedefs[j];

      intersect = getLineIntersection(
        nextPosition.x,
        nextPosition.y,
        nextPosition.x + nextDirection.x,
        nextPosition.y + nextDirection.y,
        linedef.vert1.x,
        linedef.vert1.y,
        linedef.vert2.x,
        linedef.vert2.y
      );

      if (intersect) {
        callback(intersect, linedef);

        if (!testAll) {
          break;
        }
      }
    }

    nextPosition = new Vec2(nextPosition.x + nextDirection.x, nextPosition.y + nextDirection.y);
  }
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

function deg2rad(d) {
  return d * (Math.PI/180);
}

// linear interpolation
function lintop(x1, y1, x2, y2, t) {
  return y1 + (y2 - y1) * ((t - x1) / (x2 - x1));
}
