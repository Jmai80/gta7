import asyncio, json
from playwright.async_api import async_playwright
import sys as _s; _s.path.insert(0, "/home/claude/gta7/test")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 640, 'height': 380}, device_scale_factor=1)
        await route_cdn(ctx)
        pg = await ctx.new_page()
        await pg.goto(URL)
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=60000)
        await pg.evaluate('window.__gta.start(); window.__gta.view.rig.blend = 1; window.__gta.pause();')
        r = await pg.evaluate('''async () => {
          const G = window.__gta, v = G.view, gl = v.renderer.getContext();
          const px = new Uint8Array(4);
          const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          const T = (fn, n = 4) => { fn(); sync(); const t0 = performance.now(); for (let i = 0; i < n; i++) { fn(); sync(); } return (performance.now() - t0) / n; };
          const THREE = await import('/src/three.js');
          const out = {};
          out.full = T(() => v.render());
          v.scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
          out.basicOverride = T(() => v.render());
          v.scene.overrideMaterial = null;
          v.sky.visible = false;
          out.noSky = T(() => v.render());
          v.sky.visible = true;
          v.setDpr(0.5);
          out.halfRes = T(() => v.render());
          v.setDpr(1);
          return out;
        }''')
        print(json.dumps(r, indent=1))
        await b.close()
asyncio.run(main())
