# Version 0.6 walkthrough: tant Gun's text, the north bridge opening, Norrholmen, unlocking Arne's
# bike at lott 7, the Bullbilen van coming after you, the ride, the delivery at Gun's gate and the
# quest log. Screenshots in test/shots/v06_<mode>_*.png
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

STEP = '''([sec, extra]) => { const G = window.__gta, g = G.game; const inp = Object.assign({ moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, analog: true }, extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); inp.action = false; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
WALK = '''([x, z, mag, maxSec]) => { const G = window.__gta, g = G.game, p = g.player; let t = 0;
  while (t < maxSec) { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d < 0.3) break;
    const ux = dx / d, uz = dz / d, y = G.view.rig.yaw; const my = ux * Math.sin(y) + uz * Math.cos(y), mx = -ux * Math.cos(y) + uz * Math.sin(y);
    g.step(1 / 60, { moveX: mx * mag, moveY: my * mag, action: false, camYaw: y, analog: true }); t += 1 / 60; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return t; }'''
# ride the bike through waypoints (pure pursuit on the stick), the camera following
RIDE = '''([wps, maxSec]) => { const G = window.__gta, g = G.game, p = g.player; let t = 0, wi = 0;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  while (t < maxSec && p.inCar) { const c = p.car;
    while (wi < wps.length - 1 && Math.hypot(wps[wi][0] - c.x, wps[wi][1] - c.z) < 4) wi++;
    if (wi === wps.length - 1 && Math.hypot(wps[wi][0] - c.x, wps[wi][1] - c.z) < 3) break;
    const err = wrap(Math.atan2(wps[wi][0] - c.x, wps[wi][1] - c.z) - c.h);
    g.step(1 / 60, { moveX: Math.max(-1, Math.min(1, -err * 2.2)), moveY: 1, action: false, camYaw: G.view.rig.yaw, analog: true }); t += 1 / 60;
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return t; }'''

async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)

async def info(pg):
    return await pg.evaluate('''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active; return { state: G.state, obj: m.objective, sub: m.sub, prompt: m.prompt, active: j && j.id, stage: j && j.stage, gate: g.gateN.k, bike: g.bike && [+g.bike.x.toFixed(1), +g.bike.z.toFixed(1), g.bike.locked], van: j && j.van && [+j.van.x.toFixed(1), +j.van.z.toFixed(1), +j.van.speed.toFixed(1), j.chaser.mode], p: [+g.player.x.toFixed(1), +g.player.z.toFixed(1), g.player.state], money: g.money }; })()''')

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
        save = {'v': 2, 'money': 4300, 'done': ['red', 'lasse', 'pizza', 'race', 'samuel', 'overlamning'], 'known': ['lasse', 'pizza', 'race', 'samuel', 'overlamning'], 'seen': ['lasse', 'pizza', 'race', 'samuel', 'overlamning'], 'stats': {}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.evaluate(STEP, [15.5, None])
        await frames(pg, 30)
        await pg.screenshot(path=f'test/shots/v06_{name}_01_sms.png')
        await pg.evaluate('() => window.__gta.openOffer("cykel")')
        await frames(pg, 3)
        await pg.screenshot(path=f'test/shots/v06_{name}_02_offer.png')
        if mobile: await pg.tap('#ofAccept')
        else: await pg.click('#ofAccept')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        print(name, 'accepted', json.dumps(await info(pg), ensure_ascii=False))
        # the open gate on the north bridge
        await pg.evaluate('''() => { const G = window.__gta, g = G.game, p = g.player; p.x = 40; p.z = -160; p.h = Math.PI; p.y = 0; G.view.rig.yaw = Math.PI; G.view.rig.k = 1; }''')
        await pg.evaluate(STEP, [0.6, None])
        await frames(pg, 15)
        await pg.screenshot(path=f'test/shots/v06_{name}_03_bridge.png')
        # into the allotments, up to the bike
        await pg.evaluate('''() => { const G = window.__gta, g = G.game, p = g.player; p.x = 33; p.z = -309; p.h = -Math.PI / 2; p.y = 0.15; G.view.rig.yaw = -Math.PI / 2; G.view.rig.k = 1; }''')
        await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate(WALK, [8.6, -309.2, 0.8, 8])
        await pg.evaluate(WALK, [8.4, -305.6, 0.6, 4])
        await pg.evaluate(STEP, [0.4, None])
        await frames(pg, 15)
        await pg.screenshot(path=f'test/shots/v06_{name}_04_lott7.png')
        print(name, 'at the bike', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [0.6, None])
        await frames(pg, 3)
        await pg.screenshot(path=f'test/shots/v06_{name}_05_unlocked.png')
        await pg.evaluate(STEP, [0.05, {'action': True}])   # hop on
        await pg.evaluate(STEP, [0.3, None])
        print(name, 'on the bike', json.dumps(await info(pg), ensure_ascii=False))
        # out through the east gate, south down the middle road; the van pulls out of the yard
        await pg.evaluate(RIDE, [[[7.5, -309.2], [24, -309], [31, -309], [38, -307], [40, -296]], 12])
        await frames(pg, 2)
        await pg.screenshot(path=f'test/shots/v06_{name}_06_road.png')
        print(name, 'road', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate(RIDE, [[[40, -275], [40, -250], [40, -230], [40, -200]], 14])
        await frames(pg, 2)
        await pg.screenshot(path=f'test/shots/v06_{name}_07_bridge_chase.png')
        print(name, 'bridge', json.dumps(await info(pg), ensure_ascii=False))
        # shake them off (the van far away), then up to tant Gun's gate
        await pg.evaluate('''() => { const g = window.__gta.game, j = g.mission.active; j.chaseT = 99; const v = j.van; v.x = 100; v.z = 60; v.vx = v.vz = 0; const b = g.bike; b.x = -76; b.z = -42.5; b.h = -Math.PI / 2; b.vx = b.vz = 0; window.__gta.view.rig.yaw = -Math.PI / 2; window.__gta.view.rig.k = 1; }''')
        await pg.evaluate(STEP, [4.5, None])
        await pg.evaluate(RIDE, [[[-90, -43], [-99.4, -46.6]], 8])
        await pg.evaluate(STEP, [0.6, {'handbrake': True}])
        await frames(pg, 10)
        await pg.wait_for_function('window.__gta.state === "talk"', timeout=30000)
        await frames(pg, 40)
        await pg.screenshot(path=f'test/shots/v06_{name}_08_gun.png')
        print(name, 'talk', json.dumps(await info(pg), ensure_ascii=False))
        async def nxt():
            if mobile: await pg.tap('#talk', position={'x': w / 2, 'y': h * 0.3})
            else: await pg.click('#tkNext')
            await pg.wait_for_timeout(330)
        for _ in range(3): await nxt()
        await frames(pg, 10)
        await pg.screenshot(path=f'test/shots/v06_{name}_09_recipe.png')
        for _ in range(2): await nxt()
        await frames(pg, 10)
        await pg.screenshot(path=f'test/shots/v06_{name}_10_safe.png')
        await nxt(); await nxt()
        await frames(pg, 12)
        await pg.screenshot(path=f'test/shots/v06_{name}_11_done.png')
        print(name, 'done', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate('() => window.__gta.openLog()')
        await frames(pg, 3)
        await pg.screenshot(path=f'test/shots/v06_{name}_12_log.png')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()

which = sys.argv[1] if len(sys.argv) > 1 else 'land'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
