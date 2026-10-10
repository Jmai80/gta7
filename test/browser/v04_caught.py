# Getting caught by Melker: the gaze turns red, the ring fills, "!" and out you go.
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
WALK = '''([x, z, mag, maxSec]) => { const G = window.__gta, g = G.game, p = g.player; let t = 0;
  while (t < maxSec) { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d < 0.25) break;
    const ux = dx / d, uz = dz / d, y = G.view.rig.yaw; const my = ux * Math.sin(y) + uz * Math.cos(y), mx = -ux * Math.cos(y) + uz * Math.sin(y);
    g.step(1 / 60, { moveX: mx * mag, moveY: my * mag, action: false, camYaw: y, analog: true }); t += 1 / 60; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return t; }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def main(name, w, h, mobile):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
        await route_cdn(ctx)
        pg = await ctx.new_page()
        logs = []
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(URL)
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=90000)
        await pg.evaluate('localStorage.removeItem("gta7-progress")')
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        await pg.evaluate('''() => { const g = window.__gta.game; g.mission.offer("samuel"); g.mission.accept("samuel"); g.player.x = 19; g.player.z = -6.2; for (let i = 0; i < 90; i++) g.step(1/60, { moveX: 0, moveY: 0, camYaw: window.__gta.view.rig.yaw, analog: true }); }''')
        await frames(pg, 10)
        X, Z = 200, 200
        await pg.evaluate(WALK, [X + 2.1, Z + 1.6, 0.5, 6])
        await pg.evaluate(WALK, [X + 2.1, Z + 3.3, 0.5, 6])
        await pg.evaluate(WALK, [X + 1.6, Z + 8.2, 0.5, 8])
        await pg.evaluate(WALK, [X + 3.4, Z + 8.6, 0.5, 8])
        await frames(pg, 10)
        await pg.screenshot(path=f'test/shots/v04c_{name}_01_in_front.png')
        # step back out of his face (behind the sofa) and wait for him to look up …
        await pg.evaluate(WALK, [X + 2.0, Z + 4.4, 0.5, 8])
        await pg.evaluate('''async () => { const g = window.__gta.game, s = g.indoors.samuel; let i = 0; while (s.mode !== 'phone' && i++ < 900) g.step(1 / 60, { moveX: 0, moveY: 0, camYaw: window.__gta.view.rig.yaw, analog: true }); }''')
        # … then stand where he will see you, and watch the ring fill
        await pg.evaluate('''() => { const g = window.__gta.game; g.player.x = 203.6; g.player.z = 208.8; }''')
        await pg.evaluate('''async () => { const g = window.__gta.game, s = g.indoors.samuel; let i = 0; while (s.meter < 0.45 && !s.caught && i++ < 1500) g.step(1 / 60, { moveX: 0, moveY: 0, camYaw: window.__gta.view.rig.yaw, analog: true }); }''')
        await frames(pg, 6)
        await pg.screenshot(path=f'test/shots/v04c_{name}_02_noticing.png')
        st = await pg.evaluate('(() => { const s = window.__gta.game.indoors.samuel; return { mode: s.mode, meter: s.meter, eye: document.getElementById("eye").className }; })()')
        print(name, 'noticing', st)
        await pg.evaluate('''async () => { const g = window.__gta.game, s = g.indoors.samuel; let i = 0; while (!s.caught && i++ < 600) g.step(1 / 60, { moveX: 0, moveY: 0, camYaw: window.__gta.view.rig.yaw, analog: true }); for (let k = 0; k < 50; k++) g.step(1/60, { moveX: 0, moveY: 0, camYaw: window.__gta.view.rig.yaw, analog: true }); }''')
        await frames(pg, 8)
        await pg.screenshot(path=f'test/shots/v04c_{name}_03_caught.png')
        await pg.evaluate('''() => { const g = window.__gta.game; for (let k = 0; k < 150; k++) g.step(1/60, { moveX: 0, moveY: 0, camYaw: window.__gta.view.rig.yaw, analog: true }); }''')
        for k in range(3):
            await frames(pg, 30)
            await pg.screenshot(path=f'test/shots/v04c_{name}_04_thrown_out_{k}.png')
            print(name, 'light', await pg.evaluate('(() => { const U = window.__gta.view.U; return [U.uSunCol.value.toArray().map(v => +v.toFixed(3)), window.__gta.view.indoor, getComputedStyle(document.getElementById("fade")).opacity]; })()'))
        print(name, 'after', await pg.evaluate('({ indoor: window.__gta.game.indoor, obj: window.__gta.game.mission.objective })'))
        print('logs', logs)
        await b.close()
which = sys.argv[1] if len(sys.argv) > 1 else 'land'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
