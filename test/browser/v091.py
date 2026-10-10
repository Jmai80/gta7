# v0.9.1 walkthrough: Dahlgren's truck in the town's traffic (Bullfabriken) – it joins the traffic at
# the end of the north bridge, waits its turn at the intersections and parks at the site gate.
# Usage: python3 test/browser/v091.py phone|land|desk  (screenshots in test/shots/v091_*)
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
STEP = '''([sec]) => { const G = window.__gta, g = G.game; const inp = { moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, analog: true };
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
# tail the truck `back` metres behind until `until` (a JS condition on g, j, tr) or `sec` seconds
TAIL = '''([back, sec, until]) => { const G = window.__gta, g = G.game, j = g.mission.active, tr = j.truck, c = g.player.car, f = new Function('g', 'j', 'tr', 'return ' + until);
  for (let i = 0; i < 60 * sec && j.stage === 'tail'; i++) { c.x = tr.x - Math.sin(tr.h) * back; c.z = tr.z - Math.cos(tr.h) * back; c.h = tr.h; c.vx = tr.vx; c.vz = tr.vz;
    g.step(1/60, { moveX: 0, moveY: 0, action: false, camYaw: G.view.rig.yaw, analog: true }); G.view.rig.update(1/60, g, { camDX: 0 }, G.view.camera.aspect, g.world);
    if (f(g, j, tr)) return true; } return false; }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def info(pg):
    return await pg.evaluate('''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active, tr = j && j.truck;
      return { state: G.state, obj: m.objective, sub: m.sub, active: j && j.id, stage: j && j.stage,
        truck: tr ? { x: +tr.x.toFixed(1), z: +tr.z.toFixed(1), v: +tr.speed.toFixed(1), driver: tr.driver, dest: !!(tr.ai && tr.ai.dest), parked: !!tr.parkedSpot } : null }; })()''')
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
        done = ['red', 'lasse', 'pizza', 'race', 'samuel', 'overlamning', 'cykel', 'livs', 'flag', 'nycklar', 'kassaskap', 'konditori', 'verkstad', 'hopp', 'cykelretur', 'hemleverans', 'syltburken']
        save = {'v': 2, 'money': 9000, 'done': done, 'known': done[1:], 'seen': done[1:], 'stats': {}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.evaluate(STEP, [16])
        await pg.evaluate('() => window.__gta.openOffer("fabriken")')
        await frames(pg, 3)
        await pg.tap('#ofAccept') if mobile else await pg.click('#ofAccept')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        await pg.evaluate(STEP, [0.5])
        await pg.evaluate('''() => { const g = window.__gta.game, c = g.addVehicle('sedan', 'blue', 42.6, -279, Math.PI);
          const d = c.local(-1.6, 0.3); g.player.x = d.x; g.player.z = d.z; g.player.y = g.world.groundHeight(d.x, d.z); window.__gta.view.rig.yaw = Math.PI; }''')
        await pg.evaluate(STEP, [0.3])
        await pg.evaluate('''() => { const g = window.__gta.game; g.step(1/60, { action: true, moveX: 0, moveY: 0, camYaw: Math.PI, analog: true }); }''')
        await pg.evaluate(STEP, [4])
        print(name, 'tail', json.dumps(await info(pg), ensure_ascii=False))
        # off the bridge: in the town's traffic
        await pg.evaluate(TAIL, [26, 60, "tr.driver === 'ai' && tr.z > -112"])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v091_{name}_01_town.png')
        print(name, 'town', json.dumps(await info(pg), ensure_ascii=False))
        # round the corner onto Skolgatan, westbound past the square
        await pg.evaluate(TAIL, [22, 60, "tr.z > 33 && tr.x < 12 && Math.abs(tr.h + Math.PI / 2) < 0.3"])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v091_{name}_02_turn.png')
        print(name, 'turn', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate(TAIL, [26, 90, "false"])
        await pg.evaluate('''() => { const c = window.__gta.game.player.car; c.vx = c.vz = c.w = 0; }''')
        await pg.evaluate(STEP, [2])
        print(name, 'arrived', json.dumps(await info(pg), ensure_ascii=False))
        # out of the car on the site's pavement, looking along Skolgatan at the truck parked by the gate
        await pg.evaluate('''() => { const g = window.__gta.game, tr = g.mission.active.truck; g.player.exitCar(true); const p = g.player;
          p.x = tr.x + 13; p.z = 45.6; p.y = g.world.groundHeight(p.x, p.z); p.h = Math.atan2(tr.x - p.x, tr.z + 1.5 - p.z); window.__gta.view.rig.yaw = p.h; }''')
        await pg.evaluate(STEP, [6]); await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v091_{name}_03_gate.png')
        print(name, 'gate', json.dumps(await info(pg), ensure_ascii=False))
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
