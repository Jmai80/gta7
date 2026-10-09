# Arne's bike: parked, ridden (chase camera and side views), leaning in a turn, fallen.
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)

STEP = '''([sec, extra]) => { const G = window.__gta, g = G.game; const inp = Object.assign({ moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, analog: true }, extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); inp.action = false; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
CAM = '''([px, py, pz, lx, ly, lz, fov]) => { const G = window.__gta, v = G.view;
  if (G.state === 'play') G.pause();
  document.getElementById('pausemenu').hidden = true;
  v.camera.position.set(px, py, pz); v.camera.lookAt(lx, ly, lz); v.camera.fov = fov; v.camera.updateProjectionMatrix(); }'''

async def main(name, w, h, mobile):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
        await route_cdn(ctx)
        pg = await ctx.new_page()
        logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(URL)
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=120000)
        await pg.evaluate('localStorage.removeItem("gta7-progress")')
        await pg.evaluate('window.__gta.start()')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        await pg.evaluate('''() => { const G = window.__gta, g = G.game; g.spawnBike(-37.4, -2, Math.PI, false); const p = g.player; p.x = -36.3; p.z = -0.6; p.h = -2.3; G.view.rig.yaw = Math.PI; G.view.rig.k = 1; G.view.rig.blend = 1; }''')
        await pg.evaluate(STEP, [0.4, None])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/bike_{name}_01_parked.png')
        print(name, 'near', await pg.evaluate('(() => { const p = window.__gta.game.player; return p.near && p.near.type; })()'))
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [2.5, {'moveY': 1}])
        await frames(pg, 15)
        await pg.screenshot(path=f'test/shots/bike_{name}_02_riding.png')
        await pg.evaluate(STEP, [1.2, {'moveY': 1, 'moveX': 0.8}])
        await frames(pg, 8)
        await pg.screenshot(path=f'test/shots/bike_{name}_03_turn.png')
        st = await pg.evaluate('(() => { const g = window.__gta.game, b = g.bike; return { speed: +b.speed.toFixed(2), lean: +(b.lean || 0).toFixed(2), x: +b.x.toFixed(1), z: +b.z.toFixed(1), h: +b.h.toFixed(2) }; })()')
        print(name, 'riding', json.dumps(st))
        # side views (fixed camera), standing still on the bike and leaning
        await pg.evaluate(STEP, [1.5, {'handbrake': True}])
        bx, bz, bh = st['x'], st['z'], st['h']
        bk = await pg.evaluate('(() => { const b = window.__gta.game.bike; return [b.x, b.z, b.h]; })()')
        import math
        sx, sz = bk[0] + math.cos(bk[2]) * 3.2, bk[1] - math.sin(bk[2]) * 3.2
        await pg.evaluate(CAM, [sx, 1.3, sz, bk[0], 0.75, bk[1], 50])
        await frames(pg, 12)
        await pg.screenshot(path=f'test/shots/bike_{name}_04_side.png')
        await pg.evaluate('() => { window.__gta.resume(); }')
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [0.6, None])
        await pg.evaluate(CAM, [sx, 1.6, sz, bk[0], 0.6, bk[1], 50])
        await frames(pg, 12)
        await pg.screenshot(path=f'test/shots/bike_{name}_05_parked_side.png')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()

which = sys.argv[1] if len(sys.argv) > 1 else 'land'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
