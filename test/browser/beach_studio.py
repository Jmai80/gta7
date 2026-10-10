# Norrholmen's beach from a few hand-placed cameras (game paused, HUD hidden).
# Usage: python3 test/browser/beach_studio.py TAG  (screenshots in test/shots/beach_TAG_*)
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
TAG = sys.argv[1] if len(sys.argv) > 1 else 'now'
SIZE = (960, 540)
SHOTS = {
  'sea':      ((-2.0, 7.0, -214.0), (-2.0, 0.6, -244.0), 55),   # from the water, looking at the beach
  'road':     ((-6.0, 4.2, -262.0), (-2.0, 0.6, -238.0), 55),   # from the coastal road, looking out to sea
  'top':      ((-2.0, 34.0, -226.0), (-2.0, 0.0, -246.0), 50),  # from above
  'close':    ((6.0, 2.4, -236.0), (-6.0, 0.8, -246.0), 52),    # among the parasols
  'west':     ((-28.0, 2.6, -246.0), (0.0, 0.8, -240.0), 52),   # from the kiosk end
  'bridge':   ((38.0, 9.0, -206.0), (0.0, 0.6, -244.0), 50),    # as you come over the north bridge
  'jetty':    ((5.6, 2.2, -216.5), (1.5, 0.6, -234.0), 52),     # from the water past the diving board
  'lounge':   ((5.4, 1.5, -234.2), (8.6, 0.45, -238.8), 48),    # the loungers east of the jetty
  'tower':    ((-8.5, 1.8, -235.5), (-3.2, 1.6, -239.8), 50),   # the lifeguard tower and the towels
  'huts':     ((-21.5, 1.7, -243.0), (-28.0, 1.2, -249.5), 50), # the beach huts
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
        await pg.evaluate('''() => { const g = window.__gta.game, p = g.player; p.x = -2; p.z = -262; p.y = g.world.groundHeight(p.x, p.z); }''')
        await frames(pg, 3)
        await pg.evaluate('window.__gta.pause()')
        await pg.add_style_tag(content='#pausemenu, #hud { display: none !important; }')
        await pg.evaluate('window.__gta.view.setDpr(1); window.__gta.perf.apply("pretty")')
        for name, (c, l, f) in SHOTS.items():
            await pg.evaluate('''([c, l, f]) => { const v = window.__gta.view; v.camera.position.set(c[0], c[1], c[2]); v.camera.fov = f; v.camera.updateProjectionMatrix(); v.camera.lookAt(l[0], l[1], l[2]); }''', [c, l, f])
            await frames(pg, 5)
            await pg.screenshot(path=f'test/shots/beach_{TAG}_{name}.png')
        print('logs', json.dumps(logs[:10]))
        await b.close()
asyncio.run(main())
