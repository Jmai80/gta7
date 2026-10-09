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
        r = await pg.evaluate('''() => {
          const G = window.__gta, v = G.view, g = G.game, gl = v.renderer.getContext();
          const px = new Uint8Array(4);
          const T = (fn, n = 5) => { const t0 = performance.now(); for (let i = 0; i < n; i++) fn(); return (performance.now() - t0) / n; };
          const sync = () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
          v.render(); sync();
          const out = {};
          out.step = T(() => g.step(1/60, { moveX: 0, moveY: 0, camYaw: Math.PI }), 60);
          out.syncView = T(() => v.sync(g, 1/60), 20);
          out.render = T(() => { v.render(); sync(); }, 5);
          // render with a trivial material to see how much is fragment shading
          const mats = [];
          v.scene.traverse(o => { if (o.material) { mats.push([o, o.material]); } });
          const basic = new (v.renderer.constructor === Object ? Object : Object)();
          out.calls = v.renderer.info.render.calls;
          out.dpr = v.dpr; out.size = [v.width, v.height];
          return out;
        }''')
        print(json.dumps(r, indent=1))
        await b.close()
asyncio.run(main())
