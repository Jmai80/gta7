# v1.2 walkthrough: main quest part 9 "Cykelgömman" and the side quest "Cyklarna hem".
# Polis-Pia at Birger's gate (next door to tant Gun) → the talk → in through the front door → search
# the house full of bikes (the sofa: Jonte's notebook, the bathtub: Vera's saddle) → a horn outside →
# Ronny's van drives off → ram it → Ronny and Pia. Then the three bikes home: Vera's (no saddle).
# Usage: python3 test/browser/v12.py phone|land|desk  (screenshots in test/shots/v12_*)
import asyncio, sys, json, math, os
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
STEP = '''([sec, extra]) => { const G = window.__gta, g = G.game; const inp = Object.assign({ moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, analog: true }, extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); inp.action = false; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
TO = '''([x, z, h]) => { const G = window.__gta, g = G.game, p = g.player; p.x = x; p.z = z; p.y = g.world.groundHeight(x, z); p.vx = p.vz = 0; if (h != null) { p.h = h; G.view.rig.yaw = h; } }'''
INFO = '''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active, p = g.player;
  return { obj: m.objective, sub: m.sub, active: j && j.id, stage: j && j.stage, indoor: g.indoor, where: g.indoors.where, money: g.money,
    done: ['cykelgomman', 'cyklarhem'].filter((k) => m.done.has(k)), prompt: m.prompt, found: j && j.found ? [...j.found] : null }; })()'''
FREEZE = '''() => { window.__gta.pause(); document.getElementById('pausemenu').hidden = true; }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v12_{name}_{tag}.png')
async def talk_through(pg, upto=99, at=None):
    # the dialogue opens a frame after the event: wait, then page through (screenshot page `at`)
    await frames(pg, 8)
    for i in range(upto):
        if not await pg.evaluate('() => !document.getElementById("talk").hidden'):
            return i
        if at is not None and i == at[0]:
            await shot(pg, at[1], at[2], 10)
        await pg.evaluate('() => window.__gta.nextTalk()')
        await frames(pg, 4)
    return upto
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
        done = ['red', 'lasse', 'pizza', 'race', 'flag', 'samuel', 'overlamning', 'cykel', 'livs', 'nycklar', 'kassaskap', 'konditori', 'verkstad', 'hopp',
                'syltburken', 'fabriken', 'bullfest', 'cykelretur', 'hemleverans', 'salong']
        save = {'v': 2, 'money': 12000, 'done': done, 'known': done[1:] + ['cykelgomman'], 'seen': done[1:] + ['cykelgomman'], 'stats': {}, 'tracked': 'cykelgomman'}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        B = await pg.evaluate("import('./src/config.js').then((c) => ({ gate: c.BIRGER.gate, door: c.BIRGER.door, homes: c.BIKES_HOME }))")
        gate, door = B['gate'], B['door']
        # ---------------- Storgatan: Polis-Pia by Birger's gate (tant Gun's house next door)
        await pg.evaluate(TO, [gate['x'] + 0.4, gate['z'] + 4.6, math.pi - 0.25])
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '01_gate')
        pia = await pg.evaluate('(() => { const q = window.__gta.game.mission.gatePia; return q && [q.x, q.z]; })()')
        print(name, 'Pia at the gate', pia)
        await pg.evaluate(TO, [gate['x'], gate['z'], math.pi])
        await pg.evaluate(STEP, [1.2, None])
        info = await pg.evaluate(INFO)
        print(name, 'meet', json.dumps(info, ensure_ascii=False))
        n = await talk_through(pg, at=(3, name, '02_pia'))
        print(name, 'talk pages', n)
        # ---------------- the front door, inside
        await pg.evaluate(TO, [door['x'], door['z'] + 1.6, math.pi])
        await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate(TO, [door['x'], door['z'], math.pi])
        await pg.evaluate(STEP, [1.6, None])
        await pg.evaluate(STEP, [1.2, {'moveY': 0.6}])
        await shot(pg, name, '03_inside')
        inside = await pg.evaluate(INFO)
        print(name, 'inside', json.dumps(inside, ensure_ascii=False))
        spots = await pg.evaluate("import('./src/birger.js').then((b) => b.SPOTS.map((s) => ({ id: s.id, x: s.x, z: s.z })))")
        sp = {s['id']: s for s in spots}
        for sid in ['soffa', 'kyl', 'badkar']:
            s = sp[sid]
            await pg.evaluate(TO, [s['x'], s['z'], None])
            await pg.evaluate(STEP, [0.3, None])
            pr = (await pg.evaluate(INFO))['prompt']
            await pg.evaluate(STEP, [0.05, {'action': True}])
            await pg.evaluate(STEP, [1.0, None])
            await talk_through(pg, at=(0, name, f'04_{sid}') if sid in ('soffa', 'badkar') else None)
            print(name, 'searched', sid, pr, json.dumps(await pg.evaluate(INFO), ensure_ascii=False))
        await pg.evaluate(STEP, [2.0, None])
        honk = await pg.evaluate(INFO)
        hd = await pg.evaluate("import('./src/birger.js').then((b) => b.HOUSE.door)")
        await pg.evaluate(TO, [hd['x'], hd['z'], None])
        await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [1.6, None])
        # ---------------- outside: Ronny's van drives off; a car to chase it
        await pg.evaluate('''() => { const G = window.__gta, g = G.game, p = g.player; const c = g.addVehicle('sedan', 'blue', p.x - 4, -42.5, -Math.PI / 2);
          const d = c.local(-1.6, 0.3); p.x = d.x; p.z = d.z; }''')
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [2.4, {'throttleAxis': 0.7, 'steerAxis': 0}])
        await pg.evaluate(FREEZE)
        await shot(pg, name, '05_van', 6)
        chase = await pg.evaluate(INFO)
        print(name, 'chase', json.dumps(chase, ensure_ascii=False))
        await pg.evaluate('() => window.__gta.resume()')
        await pg.evaluate('() => { const j = window.__gta.game.mission.active; j.van.damage(80); }')
        await pg.evaluate(STEP, [0.5, {'throttleAxis': -1, 'steerAxis': 0}])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [1.0, None])
        await pg.evaluate('''() => { const G = window.__gta, g = G.game, j = g.mission.active, R = j.ronny, p = g.player;
          p.x = R.x + Math.sin(j.van.h) * 1.8; p.z = R.z + Math.cos(j.van.h) * 1.8; p.y = g.world.groundHeight(p.x, p.z); }''')
        await pg.evaluate(STEP, [1.2, None])
        n = await talk_through(pg, at=(2, name, '06_ronny'))
        await pg.evaluate(STEP, [1.0, None])
        end = await pg.evaluate(INFO)
        print(name, 'part 9', json.dumps(end, ensure_ascii=False))
        # ---------------- the side quest: Vera's bike home (no saddle)
        await pg.evaluate('''() => { const g = window.__gta.game; g.step(1 / 60, {}); const m = g.mission; m.flags.allDone = true; m.offer('cyklarhem'); m.accept('cyklarhem'); }''')
        await pg.evaluate('''() => { document.getElementById('endcard').hidden = true; }''')
        await pg.evaluate(STEP, [1.0, None])
        vb = B['homes'][0]
        await pg.evaluate(TO, [vb['bike']['x'] - 0.7, vb['bike']['z'], math.pi / 2])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [1.6, {'throttleAxis': 0.8, 'steerAxis': 0}])
        await pg.evaluate(FREEZE)
        await shot(pg, name, '07_ride', 6)
        ride = await pg.evaluate(INFO)
        print(name, 'riding', json.dumps(ride, ensure_ascii=False))
        await pg.evaluate('() => window.__gta.resume()')
        await pg.evaluate('''([x, z]) => { const g = window.__gta.game, c = g.player.car; c.x = x; c.z = z; c.h = Math.PI / 2; c.vx = c.vz = 0; }''', [vb['zone']['x'] - 1.5, vb['zone']['z']])
        await pg.evaluate(STEP, [1.2, None])
        await talk_through(pg, at=(0, name, '08_vera'))
        home = await pg.evaluate(INFO)
        print(name, 'home', json.dumps(home, ensure_ascii=False))
        ok = (pia is not None and inside['where'] == 'birger' and honk['stage'] == 'honk' and chase['stage'] == 'chase'
              and 'cykelgomman' in end['done'] and ride['active'] == 'cyklarhem' and home['stage'] == 'ride')
        print(name, 'V12', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
