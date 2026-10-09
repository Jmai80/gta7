# "Photo studio": close-ups of cars and trees with a hand-placed camera (game paused, HUD hidden).
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
import os
URL = os.environ.get('STUDIO_URL', 'http://localhost:8765/index.html')
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
TAG = sys.argv[1] if len(sys.argv) > 1 else 'now'
# name: (camera position, look-at point)
SHOTS = {
  'sedan_front': ((-45.6, 1.5, -13.2), (-52.4, 0.75, -16.4)),
  'sedan_side':  ((-52.6, 1.3, -10.2), (-52.7, 0.7, -16.5)),
  'sedan_rear':  ((-58.8, 1.6, -19.6), (-52.8, 0.7, -16.6)),
  'van':         ((-46.0, 1.8, -4.6), (-52.6, 1.0, -8.4)),
  'lot':         ((-40.0, 7.0, 4.0), (-56.0, 0.5, -10.0)),
  'trees_park':  ((62.0, 3.2, -52.0), (78.0, 3.0, -72.0)),
  'trees_villa': ((-86.0, 4.0, -40.0), (-100.0, 3.0, -62.0)),
  'pines':       ((44.0, 2.5, -40.0), (56.0, 3.0, -60.0)),
  # close-ups (narrow lens)
  'sedan_nose':  ((-47.9, 1.1, -14.4), (-51.4, 0.7, -16.4), 32),
  'sedan_wheel': ((-50.6, 0.6, -13.6), (-51.4, 0.45, -15.7), 34),
  'sedan_top':   ((-49.0, 3.4, -13.4), (-52.7, 0.9, -16.5), 40),
  'van_rear':    ((-58.6, 1.6, -5.2), (-52.6, 1.2, -8.4), 40),
  'van_side':    ((-52.4, 1.4, -2.0), (-52.6, 1.1, -8.4), 50),
  'pizza_car':   ((-47.0, 2.4, -19.0), (-52.75, 1.0, -21.95), 42),
  'wreck':       ((52.0, 2.4, 78.0), (58.8, 0.6, 83.5), 42),
  'oak_close':   ((63.5, 2.0, -45.5), (72.0, 3.6, -53.0), 55),
  'birch_close': ((57.0, 1.8, -54.0), (64.0, 4.2, -62.0), 55),
  'pine_close':  ((47.0, 2.0, -47.0), (54.0, 3.6, -56.0), 55),
  'park_top':    ((40.0, 30.0, -30.0), (66.0, 0.0, -70.0), 50),
}
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 960, 'height': 540}, device_scale_factor=1)
        await route_cdn(ctx)
        pg = await ctx.new_page()
        logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(URL)
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=90000)
        await pg.evaluate('localStorage.removeItem("gta7-progress")')
        await pg.evaluate('window.__gta.start()')
        await frames(pg, 3)
        await pg.evaluate('window.__gta.pause()')
        await pg.add_style_tag(content='#pausemenu, #hud { display: none !important; }')
        await pg.evaluate('window.__gta.view.setDpr(1); window.__gta.perf.apply("pretty")')
        only = sys.argv[2].split(',') if len(sys.argv) > 2 else list(SHOTS)
        for name in only:
            sh = SHOTS[name]
            (cp, la) = sh[0], sh[1]
            fov = sh[2] if len(sh) > 2 else 50
            await pg.evaluate('''([c, l, f]) => { const v = window.__gta.view; v.camera.position.set(c[0], c[1], c[2]); v.camera.fov = f; v.camera.updateProjectionMatrix(); v.camera.lookAt(l[0], l[1], l[2]); }''', [cp, la, fov])
            await frames(pg, 4)
            await pg.screenshot(path=f'test/shots/studio_{TAG}_{name}.png')
        stats = await pg.evaluate('(() => { const v = window.__gta.view; const s = v.stats; const geo = (t) => v.cars[t].geometry.attributes.position.count / 3; return { calls: s.calls, tris: s.tris, sedanTris: geo("sedan"), vanTris: geo("van"), worldTris: v.world.group.children.reduce((a, m) => a + (m.geometry ? m.geometry.attributes.position.count / 3 : 0), 0) }; })()')
        print(TAG, json.dumps(stats))
        print('logs', logs[:10])
        await b.close()
asyncio.run(main())
