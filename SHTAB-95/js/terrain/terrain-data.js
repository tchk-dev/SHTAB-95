// Shared geometry and storage for the next terrain-generation pipeline.
(function(global){
 'use strict';
 const WORLD_SIZE=40000;
 const GRID_SIZE=512;
 const CELL_SIZE=WORLD_SIZE/(GRID_SIZE-1);
 function createHeightMap(){return new Float32Array(GRID_SIZE*GRID_SIZE)}
 global.SH95TerrainData=Object.freeze({WORLD_SIZE,GRID_SIZE,CELL_SIZE,createHeightMap});
})(window);
