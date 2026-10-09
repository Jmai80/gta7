# Chase-camera look at the new car models while driving (sedan and van), with traffic around.
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
STEP = '''([sec, extra]) => { const g = window.__gta.game; const inp = Object.assign({ moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, camYaw: window.__gta.view.rig.yaw, analog: true }, extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = window.__gta.view.rig.yaw; g.step(1 / 60, inp); } }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=1, is_mobile=True, has_touch=True)
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
        for typ, col, x, z, h in [('sedan', 'blue', -123.0, 90.0, 3.14159), ('van', 'white', -123.0, 90.0, 3.14159)]:
            await pg.evaluate('''([t, c, x, z, h]) => { const G = window.__gta, g = G.game;
              if (g.player.car) { g.player.car.driver = null; g.player.car = null; }
              const car = g.addVehicle(t, c, x, z, h); car.driver = 'player'; car.input.park = false; g.player.car = car; g.player.state = 'car'; G.view.rig.yaw = h; }''', [typ, col, x, z, h])
            await pg.evaluate(STEP, [1.5, {'moveY': 1}])
            await frames(pg, 10)
            await pg.screenshot(path=f'test/shots/drive_{typ}_1.png')
            await pg.evaluate(STEP, [0.5, {'moveY': 1, 'moveX': 1}])
            await frames(pg, 10)
            await pg.screenshot(path=f'test/shots/drive_{typ}_2_turn.png')
            info = await pg.evaluate('(() => { const c = window.__gta.game.player.car; return { x: c.x, z: c.z, speed: Math.hypot(c.vx, c.vz), steer: c.steer }; })()')
            print(typ, json.dumps(info))
        print('logs', logs)
        await b.close()
asyncio.run(main())
