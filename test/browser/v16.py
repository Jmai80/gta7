# v1.6 walkthrough: Söderholmen and Tivoli Lyckoland. The south bridge from Kungsgatan, the island,
# the gate, the rides (the carousel, the wheel, the coaster "Måsen", the bumper cars) and a ride on
# the Ferris wheel with the town below. Usage: python3 test/browser/v16.py phone|land|desk
# (screenshots in test/shots/v16_*)
import asyncio, sys, json, math, os
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
I0 = "{ moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, analog: true, throttleAxis: 0, steerAxis: 0 }"
STEP = '''([sec, extra]) => { const G = window.__gta, g = G.game; const inp = Object.assign(''' + I0 + ''', extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); inp.action = false; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
TO = '''([x, z, h]) => { const G = window.__gta, g = G.game, p = g.player; p.x = x; p.z = z; p.y = g.world.groundHeight(x, z); p.vx = p.vz = 0; if (h != null) { p.h = h; G.view.rig.yaw = h; } }'''
INFO = '''(() => { const G = window.__gta, g = G.game, m = g.mission, p = g.player;
  return { state: p.state, prompt: m.prompt, money: g.money, x: +p.x.toFixed(2), z: +p.z.toFixed(2), hip: p.rideHip ? +p.rideHip.toFixed(2) : null, rides: g.stats.wheelRides || 0 }; })()'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v16_{name}_{tag}.png')
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
        save = {'v': 2, 'money': 300, 'done': ['red', 'lasse', 'pizza', 'race'], 'known': ['lasse', 'pizza', 'race'], 'seen': ['lasse', 'pizza', 'race'], 'stats': {'tivoliNews': 1}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        # ---------------- from Södra Ringvägen: the bridge and the island across the water
        await pg.evaluate('''() => { const G = window.__gta, g = G.game, p = g.player, c = g.addVehicle('sedan', 'red', -37.5, 128, 0), d = c.local(-1.6, 0.3); p.x = d.x; p.z = d.z; G.view.rig.yaw = 0; }''')
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [2.6, {'throttleAxis': 0.55}])
        await pg.evaluate("() => { window.__gta.pause(); document.getElementById('pausemenu').hidden = true; }")
        await shot(pg, name, '01_bridge', 6)
        await pg.evaluate('() => window.__gta.resume()')
        await pg.evaluate("() => { const g = window.__gta.game, c = g.player.car; c.vx = c.vz = 0; g.player.exitCar(); }")
        await pg.evaluate(STEP, [1.0, None])
        # ---------------- the gate under the arch
        await pg.evaluate(TO, [9.5, 199.5, -0.1])
        await pg.evaluate(STEP, [1.5, None])
        await shot(pg, name, '02_gate')
        # ---------------- inside: the carousel and the wheel, then the coaster
        await pg.evaluate(TO, [8, 236.5, 2.2])
        await pg.evaluate(STEP, [1.5, None])
        await shot(pg, name, '03_rides')
        await pg.evaluate(TO, [26, 241.4, 0.62])
        await pg.evaluate(STEP, [1.5, None])
        await shot(pg, name, '04_coaster')
        await pg.evaluate(TO, [4.2, 232.5, -2.35])
        await pg.evaluate(STEP, [1.5, None])
        await shot(pg, name, '05_bumpers')
        # ---------------- a ride on the Ferris wheel
        W = await pg.evaluate("import('./src/southisle.js').then((s) => s.WHEEL)")
        await pg.evaluate(STEP, [12, None])  # (let the toasts fade)
        await pg.evaluate(TO, [W['board']['x'], W['board']['z'], math.pi])
        await pg.evaluate(STEP, [0.3, None])
        board = await pg.evaluate(INFO)
        await pg.evaluate(STEP, [0.05, {'action': True}])
        for _ in range(12):
            await pg.evaluate(STEP, [0.5, None])
            if (await pg.evaluate(INFO))['state'] == 'ride':
                break
        await pg.evaluate(STEP, [1.5, None])
        await shot(pg, name, '06_board')
        riding = await pg.evaluate(INFO)
        await pg.evaluate(STEP, [W['period'] / 2 - 3.4, None])
        await shot(pg, name, '07_top')
        top = await pg.evaluate(INFO)
        await pg.evaluate(STEP, [W['period'] / 2 + 2.5, None])
        await frames(pg, 8)
        end = await pg.evaluate(INFO)
        await shot(pg, name, '08_off')
        # the minimap with the island
        await pg.evaluate(TO, [-40, 186, math.pi])
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '09_map')
        print(name, 'board', json.dumps(board, ensure_ascii=False), '| riding', json.dumps(riding), '| top', json.dumps(top), '| end', json.dumps(end))
        ok = board['prompt'] == 'ÅK HJULET' and riding['state'] == 'ride' and top['hip'] > 24 and end['state'] == 'foot' and end['rides'] == 1 and end['money'] == 280
        print(name, 'V16', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
