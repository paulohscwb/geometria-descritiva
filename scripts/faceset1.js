import {Geometry} from "three.js/examples/jsm/deprecated/Geometry.js";
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	if (typeof AFRAME === 'undefined') {
	  throw new Error('Component attempted to register before AFRAME was available.');
	}

	var Delaunay = __webpack_require__(1);

	AFRAME.registerComponent('faceset', {
	  schema: {
	    vertices: {
	      default: [
	        { x: -0.5, y: 0, z: 0.5 },
	        { x: 0.5, y: 0, z: 0.5 },
	        { x: 0.5, y: 0, z: -0.5 },
	        { x: -0.5, y: 0, z: -0.5 }
	      ],
	      // Deserialize vertices in the form of any-separated vec3s: `0 0 0, 1 1 1, 2 0 3`.
	      parse: function (value) { return parseVec3s (value) },
	      // Serialize array of vec3s in case someone does getAttribute('faceset', 'vertices', [...]).
	      stringify: function (data) {
	        return data.map(AFRAME.utils.coordinates.stringify).join(',');
	      }
	    },
	    triangles: {
	      default: [],
	      // Deserialize index in the form of any-separated vec3s: `0 0 0, 1 1 1, 2 0 3`.
	      parse: function (value) { return parseFace3s (value) } ,
	      // Serialize array of vec3s in case someone does getAttribute('faceset', 'triangles', [...]).
	      stringify: function (data) {
	        return data.map(function face2coord(face) {
						return { x:face.a, y: face.b, z: face.c };
					} )
					.map(AFRAME.utils.coordinates.stringify).join(',');
	      }
	    }, 
	    uvs: { // texture coordinates as list 
	      default: [],
	      parse: function (value) { return parseVec2s (value) } ,
	      stringify: function (data) {
	        return data.map( function stringify (data) {
	          if (typeof data !== 'object') { return data; }
	          return [data.x, data.y].join(' ');
	        }).join(',');
	      }
	    },
	    //crease: { default: false },
	    projectdir: { 
	      type: 'string',
	      default: 'auto'
	    }, // normal along which to project, x, y and z are recognized; otherwise based on bb
	    translate: { type: 'vec3' }
	  },
	  
	  init: function () {
	    //always create new
	    //collapse onto which plane
	    this.dmaps = {
	      x: {      //2d x coordinate will be
	        x: 'y', //y if x size is smallest
	        y: 'x',
	        z: 'x'
	      },
	      y: {
	        x: 'z',
	        y: 'z',
	        z: 'y'
	      }
	    }
	    var mesh = this.el.getOrCreateObject3D('mesh', THREE.Mesh);
	    mesh.geometry.dispose(); // remove BufferGeometry
	    mesh.geometry = null;
	    mesh.geometry = new THREE.Geometry(); // replace with regular geometry
	  },

	  update: function (previousData) {
	   
	    previousData = previousData || {};
	    var data = this.data;
	    var currentTranslate = previousData.translate || this.schema.translate.default;
	    //var currentVertices = previousData.vertices || this.schema.vertices.default;
	    //var currentTriangles = previousData.triangles || this.schema.triangles.default;
	    
	    var diff = AFRAME.utils.diff(previousData, data);
	    var mesh = this.el.getOrCreateObject3D('mesh', THREE.Mesh);
	    var g = mesh.geometry;
	    var geometryNeedsUpdate = !( Object.keys(diff).length === 1 && ('translate' in diff || 'uvs' in diff) ); // also except uvs only diff
	    var keepMesh = ( data.vertices.length == g.vertices.length ) && 
	                   ( data.triangles.length == g.faces.length ) ;
			var translateNeedsUpdate = !AFRAME.utils.deepEqual(data.translate, currentTranslate);
			var facesNeedUpdate = true;
	    var facesNeedUpdate = ( data.vertices.length !== g.vertices.length ) || 
	                          ( data.triangles.length !== g.faces.length ) ;
	    var uvsNeedUpdate = 'uvs' in diff || facesNeedUpdate ;
			

	    if (geometryNeedsUpdate) {
				if (keepMesh) { updateGeometry(g, this.data); }
	      else {
					mesh.geometry.dispose(); // hm, old geometry is not gc'ed
					mesh.geometry = null;
					var mat = mesh.material;
					g = getGeometry(this.data, this.dmaps, facesNeedUpdate);
					//var bg = new THREE.BufferGeometry().fromGeometry(g);
					mesh = new THREE.Mesh(g, mat);
					this.el.setObject3D('mesh', mesh);
	      }
			}
	    
	    if (translateNeedsUpdate) {
	      applyTranslate(g, data.translate, currentTranslate);
	    }
	    
	    if (uvsNeedUpdate) {
	      g.faceVertexUvs[0] = [];
	      var fs = g.faces ;
	      var _uvs = getUvs(data, g, this.dmaps)
	      fs.forEach( function assignUVs(f, i) {
	        g.faceVertexUvs[0].push( [ _uvs[f.a], _uvs[f.b], _uvs[f.c] ]) ;
	      });
	         
	      g.uvsNeedUpdate = true;
	    }
	    
	    g.mergeVertices();
				g.computeFaceNormals();
				g.computeVertexNormals();
	      g.verticesNeedUpdate = true; // issue #7179, does not work, will need replace vertices
				
	    //if (data.crease) { mesh.material.shading = THREE.FlatShading; };
	    //g.computeBoundingSphere(); // have boundingBox
	    
	  },
	    
	  /**
	   * Removes geometry on remove (callback).
	   */
	  remove: function () {
	    this.el.getObject3D('mesh').geometry.dispose();
			this.el.getObject3D('mesh').geometry = new THREE.Geometry();
			
	  }
	});

	function parseVec3s (value) {
	  if (typeof value === 'object') {return value} // perhaps also check value.isArray
	  var mc = value.match(/([+\-0-9eE\.]+)/g);
	  var vecs = [];
	  var vec = {};
	  for (var i=0, n=mc?mc.length:0; i<n; i+=3) {
	    vec = new THREE.Vector3(+mc[i+0], +mc[i+1], +mc[i+2]);
	    vecs.push( vec );
	  }
	  return vecs;
	}

	function parseFace3s (value) {
	  if (typeof value === 'object') {return value} // perhaps also check value.isArray
	  var mc = value.match(/([+\-0-9eE\.]+)/g);
	  var vecs = [];
	  var vec = {};
	  for (var i=0, n=mc?mc.length:0; i<n; i+=3) {
	    vec = new THREE.Face3(+mc[i+0], +mc[i+1], +mc[i+2]);
	    vecs.push( vec );
	  }
	  return vecs;
	}

	function parseVec2s (value) {
	  if (typeof value === 'object') {return value} // perhaps also check value.isArray
	  var mc = value.match(/([+\-0-9eE\.]+)/g);
	  var vecs = [];
	  var vec = {};
	  for (var i=0, n=mc?mc.length:0; i<n; i+=2) {
	    vec = new THREE.Vector2(+mc[i+0], +mc[i+1]);
	    vecs.push( vec );
	  }
	  return vecs;
	}

	function updateGeometry (g, data) {
		g.vertices.forEach(function applyXYZ (v, i) {
			var d = data.vertices[i];
			g.vertices[i].set(d.x, d.y, d.z);
		});
	  g.computeBoundingBox();
	}


	function getGeometry (data, dmaps, facesNeedUpdate) {
	  var geometry = new THREE.Geometry();
	  
	  geometry.vertices = data.vertices;
	  geometry.computeBoundingBox();

	  if ( data.triangles.length == 0 ) {
	    //if no triangles triangulate
	    //find shortest dimension and ignore it for 2d vertices
	    var size = BboxSize(geometry);
	    var dir = ProjectionDirection(data, size);
	    var xd = dmaps.x[dir];
	    var yd = dmaps.y[dir];
	    var vertices2d = data.vertices.map (
	      function project (vtx) {
	        //some very minor fuzzing to avoid identical vertices for triangulation
	        //var fuzz = 1/10000; // 1/100000 too small if size around 1
	        //var xfuzz = size[xd] * (Math.random() - 0.5) * fuzz;
	        //var yfuzz = size[yd] * (Math.random() - 0.5) * fuzz;
	        return [ vtx[xd] + 0, vtx[yd] + 0 ]
	      }
	    );
	    //vertices2d: array of arrays [[2, 4], [5, 6]]
	    //triangles: flat array of indices [0, 1, 2,   2, 1, 3 ]
	    var triangles = Delaunay.triangulate(vertices2d); // look for a more robust algo
	    for (var i=0; i < triangles.length; i+=3) {
	      geometry.faces.push(
	        new THREE.Face3( triangles[i], triangles[i+1], triangles[i+2] )
	      );
	    }
	    return geometry
	  }
	  
	  //if (facesNeedUpdate) { geometry.faces = data.triangles; } ;
	  geometry.faces = data.triangles;
	  
	  return geometry
	}

	function BboxSize (geometry) {
	  
	  var bb = geometry.boundingBox;
	    
	  var size = bb.max.clone();
	  size.sub(bb.min);
	  return size
	  
	} 

	function ProjectionDirection (data, size) {
	  
	    var dir = data.projectdir.toLowerCase();
	    if ( !(dir === 'x' || dir === 'y' || dir === 'z') ) { // auto dir
	      dir = 'z';
	      if ( (size.x < size.y) && (size.x < size.z) ) { dir = 'x';}
	      if ( (size.y < size.x) && (size.y < size.z) ) { dir = 'y';}
	      // if size.y < size.x && size.y < size.z {xd='x',yd='z'}
	    }
	    return dir
	}

	function getUvs (data, g, dmaps) {
	  var uvs = data.uvs ;
	  if ( uvs.length > 0 ) {
	    var uvsLength = +uvs.length ;
	    //fill in missing uvs if any
	    for (var i = uvsLength; i < g.vertices.length; i++) {
	      uvs.push(uvs[uvsLength].clone) ;
	    }
	    return uvs
	  }
	  //else {
	    //produce default uvs
	    var size = BboxSize(g);
	    var dir = ProjectionDirection(data, size);
	    var xd = dmaps.x[dir];
	    var yd = dmaps.y[dir];
	    var vs = g.vertices;
	    var bb = g.boundingBox ;
	    var xoffset = bb.min[xd];
	    var yoffset = bb.min[yd];
	    var tmpUvs = [];
	    vs.forEach( function computeUV(v) {
	      tmpUvs.push( new THREE.Vector2 (
	        (v[xd] - xoffset) / size[xd] ,
	        (v[yd] - yoffset) / size[yd] 
	        ));
	    });
	    
	    return tmpUvs 
	}

	/**
	 * Translates geometry vertices.
	 *
	 * @param {object} geometry - three.js geometry.
	 * @param {object} translate - New translation.
	 * @param {object} currentTranslate - Currently applied translation.
	 */
	function applyTranslate (geometry, translate, currentTranslate) {
	  var translation = helperMatrix.makeTranslation(
	    translate.x - currentTranslate.x,
	    translate.y - currentTranslate.y,
	    translate.z - currentTranslate.z
	  );
	  geometry.applyMatrix(translation);
	  geometry.verticesNeedsUpdate = true;
	}

	//primitive

	var extendDeep = AFRAME.utils.extendDeep;
	// The mesh mixin provides common material properties for creating mesh-based primitives.
	// This makes the material component a default component and maps all the base material properties.
	var meshMixin = AFRAME.primitives.getMeshMixin();
	AFRAME.registerPrimitive('a-faceset', extendDeep({}, meshMixin, {
	  // Preset default components. These components and component properties will be attached to the entity out-of-the-box.
	  defaultComponents: {
	    faceset: {}
	  },
	  // Defined mappings from HTML attributes to component properties (using dots as delimiters).
	  // If we set `depth="5"` in HTML, then the primitive will automatically set `geometry="depth: 5"`.
	  mappings: {
	    vertices: 'faceset.vertices',
	    triangles: 'faceset.triangles',
	    uvs: 'faceset.uvs',
	    projectdir: 'faceset.projectdir'
	  }
	}));

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	//https://github.com/ironwallaby/delaunay

	var Delaunay;

	(function() {
	  "use strict";

	  var EPSILON = 1.0 / 1048576.0;

	  function supertriangle(vertices) {
	    var xmin = Number.POSITIVE_INFINITY,
	        ymin = Number.POSITIVE_INFINITY,
	        xmax = Number.NEGATIVE_INFINITY,
	        ymax = Number.NEGATIVE_INFINITY,
	        i, dx, dy, dmax, xmid, ymid;

	    for(i = vertices.length; i--; ) {
	      if(vertices[i][0] < xmin) xmin = vertices[i][0];
	      if(vertices[i][0] > xmax) xmax = vertices[i][0];
	      if(vertices[i][1] < ymin) ymin = vertices[i][1];
	      if(vertices[i][1] > ymax) ymax = vertices[i][1];
	    }

	    dx = xmax - xmin;
	    dy = ymax - ymin;
	    dmax = Math.max(dx, dy);
	    xmid = xmin + dx * 0.5;
	    ymid = ymin + dy * 0.5;

	    return [
	      [xmid - 20 * dmax, ymid -      dmax],
	      [xmid            , ymid + 20 * dmax],
	      [xmid + 20 * dmax, ymid -      dmax]
	    ];
	  }

	  function circumcircle(vertices, i, j, k) {
	    var x1 = vertices[i][0],
	        y1 = vertices[i][1],
	        x2 = vertices[j][0],
	        y2 = vertices[j][1],
	        x3 = vertices[k][0],
	        y3 = vertices[k][1],
	        fabsy1y2 = Math.abs(y1 - y2),
	        fabsy2y3 = Math.abs(y2 - y3),
	        xc, yc, m1, m2, mx1, mx2, my1, my2, dx, dy;

	    /* Check for coincident points */
	    if(fabsy1y2 < EPSILON && fabsy2y3 < EPSILON)
	      throw new Error("Eek! Coincident points!");

	    if(fabsy1y2 < EPSILON) {
	      m2  = -((x3 - x2) / (y3 - y2));
	      mx2 = (x2 + x3) / 2.0;
	      my2 = (y2 + y3) / 2.0;
	      xc  = (x2 + x1) / 2.0;
	      yc  = m2 * (xc - mx2) + my2;
	    }

	    else if(fabsy2y3 < EPSILON) {
	      m1  = -((x2 - x1) / (y2 - y1));
	      mx1 = (x1 + x2) / 2.0;
	      my1 = (y1 + y2) / 2.0;
	      xc  = (x3 + x2) / 2.0;
	      yc  = m1 * (xc - mx1) + my1;
	    }

	    else {
	      m1  = -((x2 - x1) / (y2 - y1));
	      m2  = -((x3 - x2) / (y3 - y2));
	      mx1 = (x1 + x2) / 2.0;
	      mx2 = (x2 + x3) / 2.0;
	      my1 = (y1 + y2) / 2.0;
	      my2 = (y2 + y3) / 2.0;
	      xc  = (m1 * mx1 - m2 * mx2 + my2 - my1) / (m1 - m2);
	      yc  = (fabsy1y2 > fabsy2y3) ?
	        m1 * (xc - mx1) + my1 :
	        m2 * (xc - mx2) + my2;
	    }

	    dx = x2 - xc;
	    dy = y2 - yc;
	    return {i: i, j: j, k: k, x: xc, y: yc, r: dx * dx + dy * dy};
	  }

	  function dedup(edges) {
	    var i, j, a, b, m, n;

	    for(j = edges.length; j; ) {
	      b = edges[--j];
	      a = edges[--j];

	      for(i = j; i; ) {
	        n = edges[--i];
	        m = edges[--i];

	        if((a === m && b === n) || (a === n && b === m)) {
	          edges.splice(j, 2);
	          edges.splice(i, 2);
	          break;
	        }
	      }
	    }
	  }

	  Delaunay = {
	    triangulate: function(vertices, key) {
	      var n = vertices.length,
	          i, j, indices, st, open, closed, edges, dx, dy, a, b, c;

	      /* Bail if there aren't enough vertices to form any triangles. */
	      if(n < 3)
	        return [];

	      /* Slice out the actual vertices from the passed objects. (Duplicate the
	       * array even if we don't, though, since we need to make a supertriangle
	       * later on!) */
	      vertices = vertices.slice(0);

	      if(key)
	        for(i = n; i--; )
	          vertices[i] = vertices[i][key];

	      /* Make an array of indices into the vertex array, sorted by the
	       * vertices' x-position. */
	      indices = new Array(n);

	      for(i = n; i--; )
	        indices[i] = i;

	      indices.sort(function(i, j) {
	        return vertices[j][0] - vertices[i][0];
	      });

	      /* Next, find the vertices of the supertriangle (which contains all other
	       * triangles), and append them onto the end of a (copy of) the vertex
	       * array. */
	      st = supertriangle(vertices);
	      vertices.push(st[0], st[1], st[2]);
	      
	      /* Initialize the open list (containing the supertriangle and nothing
	       * else) and the closed list (which is empty since we havn't processed
	       * any triangles yet). */
	      open   = [circumcircle(vertices, n + 0, n + 1, n + 2)];
	      closed = [];
	      edges  = [];

	      /* Incrementally add each vertex to the mesh. */
	      for(i = indices.length; i--; edges.length = 0) {
	        c = indices[i];

	        /* For each open triangle, check to see if the current point is
	         * inside it's circumcircle. If it is, remove the triangle and add
	         * it's edges to an edge list. */
	        for(j = open.length; j--; ) {
	          /* If this point is to the right of this triangle's circumcircle,
	           * then this triangle should never get checked again. Remove it
	           * from the open list, add it to the closed list, and skip. */
	          dx = vertices[c][0] - open[j].x;
	          if(dx > 0.0 && dx * dx > open[j].r) {
	            closed.push(open[j]);
	            open.splice(j, 1);
	            continue;
	          }

	          /* If we're outside the circumcircle, skip this triangle. */
	          dy = vertices[c][1] - open[j].y;
	          if(dx * dx + dy * dy - open[j].r > EPSILON)
	            continue;

	          /* Remove the triangle and add it's edges to the edge list. */
	          edges.push(
	            open[j].i, open[j].j,
	            open[j].j, open[j].k,
	            open[j].k, open[j].i
	          );
	          open.splice(j, 1);
	        }

	        /* Remove any doubled edges. */
	        dedup(edges);

	        /* Add a new triangle for each edge. */
	        for(j = edges.length; j; ) {
	          b = edges[--j];
	          a = edges[--j];
	          open.push(circumcircle(vertices, a, b, c));
	        }
	      }

	      /* Copy any remaining open triangles to the closed list, and then
	       * remove any triangles that share a vertex with the supertriangle,
	       * building a list of triplets that represent triangles. */
	      for(i = open.length; i--; )
	        closed.push(open[i]);
	      open.length = 0;

	      for(i = closed.length; i--; )
	        if(closed[i].i < n && closed[i].j < n && closed[i].k < n)
	          open.push(closed[i].i, closed[i].j, closed[i].k);

	      /* Yay, we're done! */
	      return open;
	    },
	    contains: function(tri, p) {
	      /* Bounding box test first, for quick rejections. */
	      if((p[0] < tri[0][0] && p[0] < tri[1][0] && p[0] < tri[2][0]) ||
	         (p[0] > tri[0][0] && p[0] > tri[1][0] && p[0] > tri[2][0]) ||
	         (p[1] < tri[0][1] && p[1] < tri[1][1] && p[1] < tri[2][1]) ||
	         (p[1] > tri[0][1] && p[1] > tri[1][1] && p[1] > tri[2][1]))
	        return null;

	      var a = tri[1][0] - tri[0][0],
	          b = tri[2][0] - tri[0][0],
	          c = tri[1][1] - tri[0][1],
	          d = tri[2][1] - tri[0][1],
	          i = a * d - b * c;

	      /* Degenerate tri. */
	      if(i === 0.0)
	        return null;

	      var u = (d * (p[0] - tri[0][0]) - b * (p[1] - tri[0][1])) / i,
	          v = (a * (p[1] - tri[0][1]) - c * (p[0] - tri[0][0])) / i;

	      /* If we're outside the tri, fail. */
	      if(u < 0.0 || v < 0.0 || (u + v) > 1.0)
	        return null;

	      return [u, v];
	    }
	  };

	  if(true)
	    module.exports = Delaunay;
	})();


/***/ })
/******/ ]);