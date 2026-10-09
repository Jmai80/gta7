# Version 0.4 walkthrough: the main quest – the tower door, the lift, Samuel's flat, sneaking,
# the keys, getting caught. Screenshots in test/shots/v04_<mode>_*.png
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

STEP = '''([sec, extra]) => { const g = window.__gta.game; const inp = Object.assign({ moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, camYaw: window.__gta.view.rig.yaw, analog: true }, extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = window.__gta.view.rig.yaw; g.step(1 / 60, inp); inp.action = false; } }'''
# walk to (x, z) in world coordinates at a sneaking pace (analog stick half way)
WALK = '''([x, z, mag, maxSec]) => { const G = window.__gta, g = G.game, p = g.player; let t = 0;
  while (t < maxSec) { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d < 0.25) break;
    const ux = dx / d, uz = dz / d, y = G.view.rig.yaw; const my = ux * Math.sin(y) + uz * Math.cos(y), mx = -ux * Math.cos(y) + uz * Math.sin(y);
    g.step(1 / 60, { moveX: mx * mag, moveY: my * mag, action: false, camYaw: y, analog: true }); t += 1 / 60; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return t; }'''

async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)

async def info(pg):
    return await pg.evaluate('''(() => { const g = window.__gta.game, m = g.mission, s = g.indoors.samuel; return { state: window.__gta.state, indoor: g.indoor, obj: m.objective, sub: m.sub, prompt: m.prompt, active: m.active && m.active.id, keys: m.active && m.active.keys, sam: s && { mode: s.mode, t: +s.t.toFixed(2), meter: +s.meter.toFixed(2), seen: s.seen }, p: [+g.player.x.toFixed(2), +g.player.z.toFixed(2)], money: g.money, done: [...m.done] }; })()''')

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
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=90000)
        await pg.evaluate('localStorage.removeItem("gta7-progress")')
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        # the offer arrives; accept it from the card
        await pg.evaluate('() => { const g = window.__gta.game; g.mission.offer("samuel"); }')
        await frames(pg, 3)
        await pg.evaluate('() => window.__gta.openOffer("samuel")')
        await frames(pg, 3)
        await pg.screenshot(path=f'test/shots/v04_{name}_01_offer.png')
        if mobile: await pg.tap('#ofAccept')
        else: await pg.click('#ofAccept')
        await frames(pg, 2)
        # walk up to the tower door from the square
        await pg.evaluate('''() => { const g = window.__gta.game; g.player.x = 19; g.player.z = 3; g.player.h = Math.PI; window.__gta.view.rig.yaw = Math.PI; }''')
        await pg.evaluate(STEP, [0.3, None])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v04_{name}_02_door.png')
        print(name, 'outside', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate(WALK, [19, -6.2, 0.5, 8])
        await pg.evaluate(STEP, [1.2, None])
        await frames(pg, 30)
        await pg.screenshot(path=f'test/shots/v04_{name}_03_corridor.png')
        print(name, 'inside', json.dumps(await info(pg), ensure_ascii=False))
        # into the flat: along the corridor, through the door, east behind the sofa
        X, Z = 200, 200
        await pg.evaluate(WALK, [X + 2.1, Z + 1.8, 0.5, 6])
        await pg.evaluate(WALK, [X + 2.1, Z + 3.3, 0.5, 6])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v04_{name}_04_hall.png')
        await pg.evaluate(WALK, [X + 6.5, Z + 3.2, 0.5, 8])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v04_{name}_05_behind_sofa.png')
        print(name, 'behind sofa', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate(WALK, [X + 9.0, Z + 3.4, 0.5, 8])
        await pg.evaluate(WALK, [X + 7.85, Z + 4.6, 0.5, 8])
        await pg.evaluate(STEP, [0.3, None])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v04_{name}_05b_behind_stub.png')
        await pg.evaluate(WALK, [X + 9.0, Z + 4.6, 0.5, 8])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v04_{name}_06_nook.png')
        # wait until he looks up, take a picture of the gaze
        await pg.evaluate('''async () => { const g = window.__gta.game; let i = 0; while (g.indoors.samuel.mode !== 'look' && i++ < 900) g.step(1 / 60, { moveX: 0, moveY: 0, camYaw: window.__gta.view.rig.yaw, analog: true }); }''')
        await pg.evaluate(STEP, [0.8, None])
        await frames(pg, 12)
        await pg.screenshot(path=f'test/shots/v04_{name}_07_looking.png')
        print(name, 'he looks', json.dumps(await info(pg), ensure_ascii=False))
        # back on the phone: grab the keys
        await pg.evaluate('''async () => { const g = window.__gta.game; let i = 0; while (g.indoors.samuel.mode !== 'phone' && i++ < 900) g.step(1 / 60, { moveX: 0, moveY: 0, camYaw: window.__gta.view.rig.yaw, analog: true }); }''')
        await pg.evaluate(WALK, [X + 9.2, Z + 6.5, 0.5, 6])
        await frames(pg, 10)
        await pg.screenshot(path=f'test/shots/v04_{name}_08_table.png')
        print(name, 'at the table', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(WALK, [X + 9.0, Z + 4.4, 0.5, 6])
        await pg.evaluate(STEP, [1.0, None])
        await frames(pg, 10)
        await pg.screenshot(path=f'test/shots/v04_{name}_09_after_jingle.png')
        print(name, 'keys taken', json.dumps(await info(pg), ensure_ascii=False))
        # sneak out the way we came
        await pg.evaluate(WALK, [X + 9.0, Z + 3.3, 0.5, 6])
        await pg.evaluate(WALK, [X + 2.1, Z + 3.3, 0.5, 10])
        await pg.evaluate(WALK, [X + 2.1, Z + 1.6, 0.5, 6])
        await pg.evaluate(STEP, [0.5, None])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v04_{name}_10_done.png')
        print(name, 'out', json.dumps(await info(pg), ensure_ascii=False))
        # down in the lift
        await pg.evaluate(WALK, [X + 0.6, Z + 1.2, 0.5, 6])
        await pg.evaluate(STEP, [0.1, None])
        print(name, 'at the lift', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [1.2, None])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v04_{name}_11_outside.png')
        print(name, 'outside again', json.dumps(await info(pg), ensure_ascii=False))
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()

which = sys.argv[1] if len(sys.argv) > 1 else 'land'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
