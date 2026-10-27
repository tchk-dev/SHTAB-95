"""Create a disposable browser-only water scenario; never modifies the checkout.

Usage: python3 tests/prepare-water-preview.py /tmp/shtab-water-preview
Then serve the generated SHTAB-95/ directory on localhost. This intentionally
uses uniform 0.1 m runoff, no losses, and ground-only flow. Rivers do not yet
connect through spilling lakes; the displayed diagnostic water budget and biome
are still from the unmodified worker and must not be interpreted as the scenario.
"""
from pathlib import Path
import shutil
import sys

root = Path(__file__).resolve().parents[1]
target = Path(sys.argv[1])
if target.exists():
    raise SystemExit('Target already exists; choose a new empty path')
target.mkdir(parents=True)
shutil.copytree(root / 'SHTAB-95', target / 'SHTAB-95')
worker = target / 'SHTAB-95/js/terrain/terrain-worker.js'
source = worker.read_text()
old = "'water-mask.js');"
new = "'water-mask.js','surface-flow.js','catchments.js','reservoir.js','reservoir-network.js');"
assert old in source
source = source.replace(old, new, 1)
old = '  self.postMessage(data,['
new = '''  // Test-only static 0.1 m uniform runoff and no losses.
  const natural=self.SH95SurfaceFlow.analyze(data.heightMap,size);
  const basins=self.SH95Catchments.build(data.heightMap,natural.receiver,size);
  const input=new Float64Array(basins.sinks.length);for(let i=0;i<size*size;i++)input[basins.basin[i]]+=.1;
  const pools=self.SH95ReservoirNetwork.solve(data.heightMap,size,basins,input);
  for(let i=0;i<size*size;i++){const level=pools.levels[pools.groups[basins.basin[i]]];const depth=Number.isFinite(level)?Math.max(0,level-data.heightMap[i]):0;data.waterDepth[i]=depth;data.waterMask[i]=depth>.01?1:0}
  data.receiver=natural.receiver;data.accumulation=natural.accumulation;
  self.postMessage(data,['''
assert old in source
worker.write_text(source.replace(old, new, 1))
map_js = target / 'SHTAB-95/js/artillery-map.js'
source = map_js.read_text()
needle = "  console.info('Terrain raster (ms)',Math.round(performance.now()-rasterStart));"
assert needle in source
preview = "  document.getElementById('comparisonRaster')?.remove();terr.id='comparisonRaster';terr.style.cssText='position:fixed;left:0;top:0;width:512px;height:512px;z-index:99999;pointer-events:none';document.body.appendChild(terr);\n"
map_js.write_text(source.replace(needle, preview + needle, 1))
print(target / 'SHTAB-95')
