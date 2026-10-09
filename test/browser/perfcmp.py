# Rough frame-time comparison between two builds (SwiftShader, so CPU-bound; only the ratio matters).
# usage: python3 test/perfcmp.py http://localhost:8765 http://localhost:8766
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
VIEWS = {
  'park':   ((62.0, 3.2, -52.0), (78.0, 3.0, -72.0)),
  'lot':    ((-40.0, 7.0, 4.0), (-56.0, 0.5, -10.0)),
  'street': ((-91.0, 2.0, 40.0), (-91.0, 2.0, -20.0)),
  'ring':   ((-135.0, 3.0, 120.0), (-135.0, 3.0, -40.0)),
}
async def frames(pg, n):
    return await pg.evaluate('''n => new Promise(r => { let k = 0; const t0 = performance.now(); const f = () => (++k >= n ? r(performance.now() - t0) : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def run(base):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=1)
        await route_cdn(ctx)
        pg = await ctx.new_page()
        await pg.goto(base + '/index.html')
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=90000)
        await pg.evaluate('window.__gta.start()')
        await frames(pg, 3)
        await pg.evaluate('window.__gta.pause()')
        await pg.evaluate('window.__gta.view.setDpr(1)')
        out = {}
        for name, (cp, la) in VIEWS.items():
            await pg.evaluate('''([c, l]) => { const v = window.__gta.view; v.camera.position.set(c[0], c[1], c[2]); v.camera.fov = 60; v.camera.updateProjectionMatrix(); v.camera.lookAt(l[0], l[1], l[2]); }''', [cp, la])
            await frames(pg, 5)
            ms = await frames(pg, 30) / 30
            st = await pg.evaluate('({ calls: window.__gta.view.stats.calls, tris: window.__gta.view.stats.tris })')
            out[name] = (round(ms, 1), st['tris'])
        await b.close()
        return out
async def main():
    for base in sys.argv[1:]:
        print(base, json.dumps(await run(base)))
asyncio.run(main())
