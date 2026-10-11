# Söderholmen and Tivoli Lyckoland from a few hand-placed cameras (game paused, HUD hidden).
# Usage: python3 test/browser/south_studio.py TAG [phone] [time]  (screenshots in test/shots/south_TAG_*)
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
  'over':     ((-40.0, 60.0, 95.0), (20.0, 0.0, 235.0), 55),    # from above the south of the town
  'aerial':   ((33.0, 95.0, 320.0), (33.0, 0.0, 232.0), 55),    # from above, south of the island
  'bridge':   ((-40.0, 4.0, 150.0), (10.0, 8.0, 230.0), 58),    # driving over the bridge
  'gate':     ((8.0, 3.0, 192.0), (8.0, 4.5, 215.0), 58),       # the arch
  'wheel':    ((40.0, 6.0, 246.0), (62.0, 13.0, 222.0), 60),    # the Ferris wheel
  'coaster':  ((22.0, 3.0, 239.0), (52.0, 5.0, 256.0), 60),     # the coaster
  'carousel': ((30.0, 3.4, 238.0), (22.0, 3.0, 226.0), 58),     # the carousel
  'bumper':   ((8.0, 6.0, 233.0), (-7.0, 0.0, 220.0), 58),      # the bumper cars
  'west':     ((-30.0, 9.0, 205.0), (-70.0, 2.0, 240.0), 58),   # the houses and the chapel
  'south':    ((0.0, 7.0, 302.0), (0.0, 3.0, 270.0), 58),       # the south cliffs from the sea
  'town':     ((-20.0, 12.0, 205.0), (-40.0, 4.0, 120.0), 58),  # back to the town
  'stuck':    ((34.0, 2.2, 239.5), (56.0, 10.5, 245.0), 62),    # Måsen up the lift hill (v1.7: pass the time 'stuck')
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
        await pg.evaluate('''() => { const g = window.__gta.game, p = g.player; p.x = 8; p.z = 199; p.y = g.world.groundHeight(p.x, p.z); }''')
        await frames(pg, 3)
        if len(sys.argv) > 3 and sys.argv[3] == 'stuck':
            await pg.evaluate("import('./src/southisle.js').then((s) => { const g = window.__gta.game; g.coasterT = s.CO_STUCK_T; g.mission.known.add('masen'); })")
        elif len(sys.argv) > 3:
            await pg.evaluate('t => { const g = window.__gta.game; g.time = t; g.coasterT = t; }', float(sys.argv[3]))
        await frames(pg, 3)
        await pg.evaluate('window.__gta.pause()')
        await pg.add_style_tag(content='#pausemenu, #hud { display: none !important; }')
        await pg.evaluate('window.__gta.view.setDpr(1); window.__gta.perf.apply("pretty")')
        for name, (c, l, f) in SHOTS.items():
            await pg.evaluate('''([c, l, f]) => { const v = window.__gta.view; v.camera.position.set(c[0], c[1], c[2]); v.camera.fov = f; v.camera.updateProjectionMatrix(); v.camera.lookAt(l[0], l[1], l[2]); }''', [c, l, f])
            await frames(pg, 5)
            await pg.screenshot(path=f'test/shots/south_{TAG}_{name}.png')
        print('logs', json.dumps(logs[:10]))
        await b.close()
asyncio.run(main())
