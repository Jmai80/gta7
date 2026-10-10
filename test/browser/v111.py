# v1.1.1 walkthrough: Kim's long jump. The K at the far end of the parking lot across Kungsgatan from
# Hörnlivs: on foot it says you need a car; driving in starts the run (rings over Skolgatan and past
# the ramp); flat out straight south → the jump → "Långhoppet" done.
# Usage: python3 test/browser/v111.py phone|land|desk  (screenshots in test/shots/v111_*)
import asyncio, sys, json, math
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
STEP = '''([sec, extra]) => { const G = window.__gta, g = G.game; const inp = Object.assign({ moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, analog: true }, extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); inp.action = false; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
# step until a condition holds (or the time is up); the condition is JS on (g, car)
UNTIL = '''([cond, extra, maxSec]) => { const G = window.__gta, g = G.game; const f = new Function('g', 'car', 'return ' + cond);
  const inp = Object.assign({ moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, analog: true }, extra || {});
  for (let i = 0; i < Math.round(maxSec * 60); i++) { const car = g.player.inCar ? g.player.car : null; if (f(g, car)) return i / 60;
    inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } return -1; }'''
TO = '''([x, z, h]) => { const G = window.__gta, g = G.game, p = g.player; p.x = x; p.z = z; p.y = g.world.groundHeight(x, z); p.vx = p.vz = 0; if (h != null) { p.h = h; G.view.rig.yaw = h; } }'''
INFO = '''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active, p = g.player, c = p.inCar ? p.car : null;
  return { obj: m.objective, sub: m.sub, active: j && j.id, stage: j && j.stage, money: g.money, done: m.done.has('hopp'), best: m.bestJump,
    car: c && { x: +c.x.toFixed(1), y: +c.y.toFixed(2), z: +c.z.toFixed(1), kmh: Math.round(c.speed * 3.6), air: !!c.air },
    targets: m.targets.map((t) => t.kind + (t.letter ? ':' + t.letter : '') + (t.gps ? '+gps' : '')) }; })()'''
FREEZE = '''() => { window.__gta.pause(); document.getElementById('pausemenu').hidden = true; }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v111_{name}_{tag}.png')
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
        done = ['red', 'lasse', 'pizza', 'race', 'samuel', 'overlamning', 'cykel', 'livs', 'flag', 'nycklar', 'kassaskap', 'konditori', 'verkstad',
                'syltburken', 'fabriken', 'bullfest', 'cykelretur', 'hemleverans', 'salong']
        save = {'v': 2, 'money': 9000, 'done': done, 'known': done[1:] + ['hopp'], 'seen': done[1:] + ['hopp'], 'stats': {}, 'tracked': 'hopp'}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        K = await pg.evaluate("(() => { const q = window.__gta.game.mission.quest('hopp'); return [q.x, q.z, q.r]; })()")
        print(name, 'K', K)
        # ---------------- on foot by the K, then into it
        await pg.evaluate(TO, [K[0] + 4.5, K[1] + 5.5, math.atan2(-4.5, -5.5)])
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '01_k')
        print(name, 'by the K', json.dumps(await pg.evaluate(INFO), ensure_ascii=False))
        await pg.evaluate(TO, [K[0], K[1], 0])
        await pg.evaluate(STEP, [0.6, None])
        await shot(pg, name, '02_onfoot', 6)
        foot = await pg.evaluate(INFO)
        print(name, 'on foot in the K', json.dumps(foot, ensure_ascii=False))
        # ---------------- a car at the north end of the lot, facing south: drive into the K
        await pg.evaluate(TO, [K[0] + 7, K[1] - 7, None])
        await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate('''([x, z]) => { const G = window.__gta, g = G.game; const c = g.addVehicle('sedan', 'blue', x, z, 0); c.paint = 'yellow';
          const d = c.local(-1.6, 0.3); g.player.x = d.x; g.player.z = d.z; G.view.rig.yaw = 0; }''', [K[0], K[1] - 5.5])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [1.2, None])
        t = await pg.evaluate(UNTIL, ['!!g.mission.active', {'throttleAxis': 0.4, 'steerAxis': 0}, 6])
        await pg.evaluate(STEP, [0.9, {'throttleAxis': -0.4, 'steerAxis': 0}])
        await pg.evaluate(STEP, [0.6, {'throttleAxis': 0, 'steerAxis': 0, 'handbrake': True}])
        await pg.evaluate(FREEZE)
        await shot(pg, name, '03_start', 6)
        start = await pg.evaluate(INFO)
        print(name, 'run started after', t, 's', json.dumps(start, ensure_ascii=False))
        await pg.evaluate('() => window.__gta.resume()')
        # ---------------- flat out straight south: over Skolgatan, through the gate, up the ramp
        t = await pg.evaluate(UNTIL, ['car && car.air && car.z > 70', {'throttleAxis': 1, 'steerAxis': 0}, 14])
        await pg.evaluate(FREEZE)
        await shot(pg, name, '04_air', 6)
        air = await pg.evaluate(INFO)
        print(name, 'in the air after', t, 's', json.dumps(air, ensure_ascii=False))
        await pg.evaluate('() => window.__gta.resume()')
        await pg.evaluate(UNTIL, ['car && !car.air', {'throttleAxis': 1, 'steerAxis': 0}, 6])
        await pg.evaluate(STEP, [2.4, {'throttleAxis': -1, 'steerAxis': 0}])
        await pg.evaluate(FREEZE)
        await shot(pg, name, '05_done', 6)
        end = await pg.evaluate(INFO)
        print(name, 'landed', json.dumps(end, ensure_ascii=False))
        ok = (not foot['active']) and start['active'] == 'hopp' and air['car']['air'] and end['done'] and end['best'] >= 34
        print(name, 'LONGJUMP', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
