# Close-ups of the two bikes (Arne's delivery bike and the red racer), parked side by side with the
# front wheel turned, from a hand-placed camera: are the tyres, rims and spokes in one piece?
# Usage: python3 test/browser/bike_studio.py TAG  (screenshots in test/shots/bikes_TAG_*)
import asyncio, sys, math, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
TAG = sys.argv[1] if len(sys.argv) > 1 else 'now'
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
CAM = '''([c, l, f]) => { const v = window.__gta.view; v.camera.position.set(c[0], c[1], c[2]); v.camera.fov = f; v.camera.updateProjectionMatrix(); v.camera.lookAt(l[0], l[1], l[2]); }'''
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
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=120000)
        await pg.evaluate('localStorage.removeItem("gta7-progress")')
        await pg.evaluate('window.__gta.start()')
        await frames(pg, 3)
        # Arne's bike and the racer on Kungsgatan's pavement, both facing north, front wheels turned left
        H = math.pi
        await pg.evaluate('''([h]) => { const g = window.__gta.game; const a = g.spawnBike(-37.4, -2, h, false); const r = g.spawnRedBike(-37.4, 2.2, h);
          for (const v of [a, r]) { v.steer = 0.45; v.spin = 0.3; }
          const p = g.player; p.x = -30; p.z = 10; }''', [H])
        await frames(pg, 3)
        await pg.evaluate('window.__gta.pause()')
        await pg.add_style_tag(content='#pausemenu, #hud { display: none !important; }')
        await pg.evaluate('window.__gta.view.setDpr(1); window.__gta.perf.apply("pretty")')
        fx, fz = math.sin(H), math.cos(H)          # forward
        lx, lz = math.cos(H), -math.sin(H)         # the bike's left
        shots = []
        for name, (bx, bz) in [('arne', (-37.4, -2)), ('racer', (-37.4, 2.2))]:
            # side (the bike's left), rear three-quarter (as the chase camera sees a turn), front wheel close
            shots.append((f'{name}_side', (bx + lx * 2.6, 0.75, bz + lz * 2.6), (bx, 0.55, bz), 50))
            shots.append((f'{name}_rear', (bx - fx * 2.3 + lx * 0.9, 1.35, bz - fz * 2.3 + lz * 0.9), (bx + fx * 0.5, 0.4, bz + fz * 0.5), 46))
            shots.append((f'{name}_front', (bx + fx * 1.9 - lx * 0.9, 0.7, bz + fz * 1.9 - lz * 0.9), (bx + fx * 0.6, 0.35, bz + fz * 0.6), 38))
            shots.append((f'{name}_wheel', (bx + fx * 0.66 + lx * 1.1, 0.42, bz + fz * 0.66 + lz * 1.1), (bx + fx * 0.6, 0.3, bz + fz * 0.6), 30))
        for (n, c, l, f) in shots:
            await pg.evaluate(CAM, [c, l, f])
            await frames(pg, 4)
            await pg.screenshot(path=f'test/shots/bikes_{TAG}_{n}.png')
        print('logs', json.dumps(logs[:10]))
        await b.close()
asyncio.run(main())
