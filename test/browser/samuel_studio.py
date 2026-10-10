# Close-ups of Melker on his sofa (phone up / looking around / caught) with a hand-placed camera.
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
TAG = sys.argv[1] if len(sys.argv) > 1 else 'now'
X, Z = 200, 200
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def cam(pg, c, l, fov=40):
    await pg.evaluate('''([c, l, f]) => { const v = window.__gta.view; v.camera.position.set(c[0], c[1], c[2]); v.camera.fov = f; v.camera.updateProjectionMatrix(); v.camera.lookAt(l[0], l[1], l[2]); }''', [c, l, fov])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 960, 'height': 540}, device_scale_factor=1)
        await route_cdn(ctx)
        pg = await ctx.new_page()
        logs = []
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(URL)
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=90000)
        await pg.evaluate('localStorage.removeItem("gta7-progress")')
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('''() => { const g = window.__gta.game; g.mission.offer("samuel"); g.mission.accept("samuel"); g.player.x = 19; g.player.z = -6.2; for (let i = 0; i < 90; i++) g.step(1/60, { moveX: 0, moveY: 0, camYaw: 0, analog: true }); g.player.x = 202; g.player.z = 201.2; }''')
        await frames(pg, 5)
        await pg.evaluate('window.__gta.pause()')
        await pg.add_style_tag(content='#pausemenu, #hud { display: none !important; }')
        shots = {
          'front': ((X + 6.6, 1.6, Z + 8.6), (X + 4.9, 0.9, Z + 6.4), 40),
          'side': ((X + 8.2, 1.3, Z + 6.3), (X + 4.9, 0.85, Z + 6.4), 38),
          'room': ((X + 6.0, 7.5, Z + 12.5), (X + 6.0, 0.0, Z + 5.5), 55),
        }
        async def shoot(tag):
            for name, (c, l, f) in shots.items():
                await cam(pg, c, l, f)
                await frames(pg, 3)
                await pg.screenshot(path=f'test/shots/sam_{TAG}_{tag}_{name}.png')
        await shoot('phone')
        # make him look up to the left
        await pg.evaluate('''() => { const s = window.__gta.game.indoors.samuel; const b = s.ped.body; b.phone = 0; b.headPitch = -0.04; b.headYaw = 0.9; s.cone.on = 1; s.cone.dir = s.ped.h + 0.9; const h = s.head; s.cone.x = h[0]; s.cone.z = h[2]; }''')
        await frames(pg, 2)
        await shoot('look')
        await pg.evaluate('''() => { const s = window.__gta.game.indoors.samuel; s.standUp(); s.mode = 'up'; s.cone.on = 0; }''')
        await frames(pg, 2)
        await shoot('up')
        print('logs', logs)
        await b.close()
asyncio.run(main())
