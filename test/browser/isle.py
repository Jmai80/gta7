# Norrholmen: a look around the island (aerial views and on foot). Screenshots in test/shots/isle_*.png
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)

# a fixed camera: pause the game (the rig stops) and aim the camera by hand
CAM = '''([px, py, pz, lx, ly, lz, fov, near, far]) => { const G = window.__gta, v = G.view;
  if (G.state === 'play') G.pause();
  document.getElementById('pausemenu').hidden = true;
  v.camera.position.set(px, py, pz); v.camera.lookAt(lx, ly, lz); v.camera.fov = fov; v.camera.updateProjectionMatrix();
  v.setFog(near, far); }'''
# on foot at (x, z) facing h, with the normal follow camera
ONFOOT = '''([x, z, h]) => { const G = window.__gta, g = G.game, p = g.player;
  if (G.state !== 'play') G.resume();
  p.x = x; p.z = z; p.h = h; p.y = g.world.groundHeight(x, z); p.vx = p.vz = 0;
  G.view.rig.yaw = h; G.view.rig.k = 1; G.view.rig.blend = 1; G.view.setFog(80, 285);
  for (let i = 0; i < 30; i++) { g.step(1 / 60, { moveX: 0, moveY: 0, action: false, camYaw: h, analog: true }); G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''

async def main(name, w, h, mobile):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
        await route_cdn(ctx)
        pg = await ctx.new_page()
        logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        t0 = await pg.evaluate('performance.now()')
        await pg.goto(URL)
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=120000)
        print(name, 'boot ms', round(await pg.evaluate('performance.now()')))
        await pg.evaluate('localStorage.removeItem("gta7-progress")')
        await pg.evaluate('window.__gta.start()')
        await pg.add_style_tag(content='#phone, #hint { visibility: hidden !important; }')
        await pg.evaluate('''() => { const m = window.__gta.game.mission; m.known.add('cykel'); }''')
        await pg.evaluate(ONFOOT, [40, -168, 3.14159])
        await frames(pg, 60)
        await pg.screenshot(path=f'test/shots/isle_{name}_01_gate.png')
        print(name, 'gate', json.dumps(await pg.evaluate('window.__gta.game.gateN')))
        shots = [
            ('02_air_south', [40, 140, -150, 45, 0, -318, 50, 400, 1200]),
            ('03_air_west', [-190, 120, -320, 40, 0, -318, 50, 400, 1200]),
            ('04_air_allot', [-30, 55, -270, 8, 0, -312, 55, 300, 900]),
            ('05_air_bakery', [120, 45, -255, 80, 4, -310, 55, 300, 900]),
        ]
        for nm, c in shots:
            await pg.evaluate(CAM, c)
            await frames(pg, 20)
            await pg.screenshot(path=f'test/shots/isle_{name}_{nm}.png')
        walks = [
            ('06_landing', [40, -236, 3.14159]),
            ('07_allot_gate', [36, -309, -1.5708]),
            ('08_lott7', [7.5, -312, 0.0]),
            ('09_mill', [-2, -340, 3.0]),
            ('10_lighthouse', [96, -368, 2.4]),
            ('11_beach', [10, -252, 0.3]),
            ('12_bakery_yard', [40, -287.5, 1.5708]),
        ]
        for nm, c in walks:
            await pg.evaluate(ONFOOT, c)
            await frames(pg, 25)
            await pg.screenshot(path=f'test/shots/isle_{name}_{nm}.png')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()

which = sys.argv[1] if len(sys.argv) > 1 else 'land'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
