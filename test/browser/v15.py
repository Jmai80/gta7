# v1.5 walkthrough: main quest part 10 "Birger kommer hem" (the Sjuby Spider) and the beach puzzle
# "Badhyttsgåtan". Birger and the Spider on the quay → the talk → drive (Birger beside you) past
# Hörnlivs, Salong Saxen and Macken → home → the car is yours. Then Tove, the four kids and the huts.
# Usage: python3 test/browser/v15.py phone|land|desk  (screenshots in test/shots/v15_*)
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
CAR_TO = '''([x, z, h]) => { const G = window.__gta, c = G.game.player.car; c.x = x; c.z = z; c.h = h; c.vx = c.vz = c.w = 0; G.view.rig.yaw = h; }'''
INFO = '''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active, p = g.player;
  return { obj: m.objective, sub: m.sub, active: j && j.id, stage: j && j.stage, money: g.money, prompt: m.prompt, inSpider: !!(p.inCar && p.car.type === 'spider'),
    done: ['birger', 'hytter'].filter((k) => m.done.has(k)), tags: j && j.tags ? j.tags.slice() : null }; })()'''
FREEZE = '''() => { window.__gta.pause(); document.getElementById('pausemenu').hidden = true; }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v15_{name}_{tag}.png')
async def talk_through(pg, at=None):
    await frames(pg, 8)
    for i in range(12):
        if not await pg.evaluate('() => !document.getElementById("talk").hidden'):
            return i
        if at is not None and i == at[0]:
            await shot(pg, at[1], at[2], 10)
        await pg.evaluate('() => window.__gta.nextTalk()')
        await frames(pg, 4)
    return 12
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
                'syltburken', 'fabriken', 'bullfest', 'cykelretur', 'hemleverans', 'salong', 'cykelgomman']
        save = {'v': 2, 'money': 8000, 'done': done, 'known': done[1:] + ['birger'], 'seen': done[1:] + ['birger'], 'stats': {}, 'tracked': 'birger'}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        H = await pg.evaluate("import('./src/config.js').then((c) => c.HOMECOMING)")
        # ---------------- the quay: Birger and the Spider
        await pg.evaluate(TO, [-57.5, -133.0, math.atan2(-11.5, -7.5)])
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '01_quay')
        await pg.evaluate(TO, [H['mark']['x'], H['mark']['z'], None])
        await pg.evaluate(STEP, [1.2, None])
        await talk_through(pg, at=(2, name, '02_birger'))
        # ---------------- into the Spider, Birger beside you
        car = H['car']
        await pg.evaluate('''() => { const g = window.__gta.game, c = g.spider, p = g.player, d = c.local(-1.6, 0.3); p.x = d.x; p.z = d.z; }''')
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [1.5, None])
        board = await pg.evaluate(INFO)
        await pg.wait_for_timeout(5500)  # (let the toasts and hints fade: they cover the car)
        # drive a little way along Hamngatan, then a shot of the two of you
        await pg.evaluate(CAR_TO, [-50, -117.5, math.pi / 2])
        await pg.evaluate(STEP, [2.2, {'throttleAxis': 0.8}])
        await pg.evaluate(FREEZE)
        await shot(pg, name, '03_drive', 6)
        drive = await pg.evaluate(INFO)
        await pg.evaluate('() => window.__gta.resume()')
        for i, S in enumerate(H['stops']):
            await pg.evaluate(CAR_TO, [S['x'], S['z'], math.pi / 2 if i == 1 else math.pi])
            await pg.evaluate(STEP, [0.4, None])
            if i == 0:
                await pg.evaluate(STEP, [0.6, {'throttleAxis': 0.3}])
                await pg.evaluate(FREEZE)
                await shot(pg, name, '04_tour', 6)
                await pg.evaluate('() => window.__gta.resume()')
        await pg.evaluate(CAR_TO, [H['home']['x'] + 6, H['home']['z'], -math.pi / 2])
        await pg.evaluate(STEP, [0.8, {'throttleAxis': 0.4}])
        await pg.evaluate(CAR_TO, [H['home']['x'], H['home']['z'], -math.pi / 2])
        await pg.evaluate(STEP, [1.2, None])
        await talk_through(pg, at=(4, name, '05_home'))
        await pg.evaluate(STEP, [1.0, None])
        home = await pg.evaluate(INFO)
        print(name, 'board', json.dumps(board, ensure_ascii=False), '| drive', json.dumps(drive, ensure_ascii=False), '| home', json.dumps(home, ensure_ascii=False))
        # the end card comes a little after part 10 (all thirteen done): look, then drive on
        await pg.evaluate(STEP, [16, None])
        await pg.wait_for_function('() => !document.getElementById("endcard").hidden', timeout=20000)
        await shot(pg, name, '05b_endcard', 6)
        await pg.click('#eContinue')
        await frames(pg, 4)
        # ---------------- the beach puzzle
        await pg.evaluate('''() => { const g = window.__gta.game, m = g.mission; m.offer('hytter'); m.accept('hytter'); }''')
        await pg.evaluate(TO, [4, -340, None])
        await pg.evaluate(STEP, [1.0, None])
        Q = await pg.evaluate("(() => { const m = window.__gta.game.mission, q = m.quest('hytter'); return [q.x, q.z]; })()")
        await pg.evaluate(TO, [Q[0], Q[1], None])
        await pg.evaluate(STEP, [1.2, None])
        await talk_through(pg, at=(1, name, '06_tove'))
        kids = await pg.evaluate("(() => window.__gta.game.mission.beachFolk.kids.map((q) => [q.x, q.z]))()")
        for i, (kx, kz) in enumerate(kids):
            await pg.evaluate(TO, [kx + 1.2, kz, -math.pi / 2])
            await pg.evaluate(STEP, [0.3, None])
            await pg.evaluate(STEP, [0.05, {'action': True}])
            await pg.evaluate(STEP, [0.3, None])
            await talk_through(pg, at=(0, name, '07_bosse') if i == 1 else None)
        huts = await pg.evaluate("import('./src/beachhuts.js').then((b) => b.HUTS.map((h) => ({ i: h.i, x: h.door.x, z: h.door.z })))")
        answer = ['dante', 'alva', 'cleo', 'bosse']
        for hh in huts:
            await pg.evaluate(TO, [hh['x'], hh['z'], None])
            await pg.evaluate(STEP, [0.3, None])
            for _ in range(6):
                t = (await pg.evaluate(INFO))['tags']
                if t[hh['i']] == answer[hh['i']]:
                    break
                await pg.evaluate(STEP, [0.05, {'action': True}])
                await pg.evaluate(STEP, [0.2, None])
        # a look at the signs over the huts: from the water's edge, facing the doors
        await pg.wait_for_timeout(3000)
        n1 = (-0.5046, 0.8633)
        mx, mz = (huts[1]['x'] + huts[2]['x']) / 2, (huts[1]['z'] + huts[2]['z']) / 2
        await pg.evaluate(TO, [mx + n1[0] * 1.6, mz + n1[1] * 1.6, math.atan2(-n1[0], -n1[1])])
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '08_huts')
        signs = await pg.evaluate(INFO)
        T = await pg.evaluate("(() => { const t = window.__gta.game.mission.beachFolk.tove; return [t.x, t.z]; })()")
        await pg.evaluate(TO, [T[0] + 1.2, T[1], None])
        await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [0.3, None])
        await talk_through(pg, at=(0, name, '09_keys'))
        await pg.evaluate(STEP, [1.0, None])
        end = await pg.evaluate(INFO)
        print(name, 'signs', signs['tags'], '| end', json.dumps(end, ensure_ascii=False))
        ok = board['inSpider'] and board['stage'] == 'tour' and drive['inSpider'] and 'birger' in home['done'] and signs['tags'] == answer and 'hytter' in end['done']
        print(name, 'V15', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
