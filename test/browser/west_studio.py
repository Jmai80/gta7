# (v1.18) Västerholmen and Kexfabriken from a few hand-placed cameras (game paused, HUD hidden).
# Usage: python3 test/browser/west_studio.py TAG [phone] [open]  (screenshots in test/shots/west_TAG_*)
import asyncio, sys, json
from playwright.async_api import async_playwright
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
TAG = sys.argv[1] if len(sys.argv) > 1 else 'now'
SIZE = (960, 540)
SHOTS = {
  'fromtown': ((-128.0, 6.0, -40.0), (-260.0, 6.0, -48.0), 58),     # from the end of Storgatan, over the bridge
  'gate':     ((-160.0, 2.4, -38.0), (-185.0, 1.6, -40.0), 58),     # the west gate on the bridge
  'aerial':   ((-200.0, 120.0, 40.0), (-315.0, 0.0, -38.0), 55),    # from above, south-east of the island
  'landing':  ((-222.0, 3.0, -38.0), (-260.0, 3.0, -42.0), 58),     # driving onto the island
  'kexgate':  ((-258.0, 3.2, -30.0), (-290.0, 4.0, -45.0), 60),     # the factory gate from the junction
  'docks':    ((-282.0, 4.0, -60.0), (-306.0, 3.0, -70.0), 60),     # the loading docks
  'hall':     ((-300.0, 14.0, -20.0), (-335.0, 6.0, -60.0), 58),    # the hall, chimney and silos
  'kexgatan': ((-272.0, 3.4, -82.0), (-254.0, 2.0, -88.0), 60),     # the workers' houses
  'quay':     ((-300.0, 6.0, 30.0), (-320.0, 2.0, 55.0), 60),       # the quay and the crane
  'west':     ((-420.0, 20.0, -40.0), (-330.0, 4.0, -40.0), 55),    # from the sea in the west
}
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        w, h = SIZE
        if len(sys.argv) > 2 and sys.argv[2] == 'phone': w, h = 390, 844
        ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1)
        await route_cdn(ctx)
        pg = await ctx.new_page()
        logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(URL)
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=120000)
        await pg.evaluate('localStorage.removeItem("gta7-progress")')
        await pg.evaluate('window.__gta.start()')
        await frames(pg, 3)
        await pg.evaluate('''() => { const g = window.__gta.game, p = g.player; p.x = -300; p.z = -40; p.y = g.world.groundHeight(p.x, p.z); }''')
        await frames(pg, 3)
        if len(sys.argv) > 3 and sys.argv[3] == 'open':
            await pg.evaluate("() => { const g = window.__gta.game; g.stats.sjuby = { at: 3 }; }")
            await frames(pg, 200)
        elif len(sys.argv) > 3 and sys.argv[3] == 'stuck':
            await pg.evaluate("import('./src/southisle.js').then((s) => { const g = window.__gta.game; g.coasterT = s.CO_STUCK_T; g.mission.known.add('masen'); })")
        elif len(sys.argv) > 3 and sys.argv[3] == 'eggs':
            await pg.evaluate('() => { const g = window.__gta.game; g.time = 75 * 10 + 75 * 0.74; g.coasterT = g.time; g.spawnSkate(-27.5, 99, 0.4); }')
        elif len(sys.argv) > 3:
            await pg.evaluate('t => { const g = window.__gta.game; g.time = t; g.coasterT = t; }', float(sys.argv[3]))
        await frames(pg, 3)
        await pg.evaluate('window.__gta.pause()')
        await pg.add_style_tag(content='#pausemenu, #hud { display: none !important; }')
        await pg.evaluate('window.__gta.view.setDpr(1); window.__gta.perf.apply("pretty")')
        only = os.environ.get('ONLY')
        for name, (c, l, f) in SHOTS.items():
            if only and name not in only.split(','):
                continue
            await pg.evaluate('''([c, l, f]) => { const v = window.__gta.view; v.camera.position.set(c[0], c[1], c[2]); v.camera.fov = f; v.camera.updateProjectionMatrix(); v.camera.lookAt(l[0], l[1], l[2]); }''', [c, l, f])
            await frames(pg, 5)
            await pg.screenshot(path=f'test/shots/west_{TAG}_{name}.png')
        print('logs', json.dumps(logs[:10]))
        await b.close()
asyncio.run(main())
