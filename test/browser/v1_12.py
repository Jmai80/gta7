# v1.12 walkthrough: "Flaskposten" – main quest, part 13. Dahlgren washing up outside the konditori (and
# you drying), Ingvar's message in a bottle on Norrholmen's shore, the tin under the lighthouse steps
# (combination lock 1974), Ingvar's story, Elsa's house by the chapel on Söderholmen (knock, inside,
# search for her glasses), her answer, Ingvar with it, and Sunday in the chapel.
# Usage: python3 test/browser/v1_12.py phone|land|desk (shots: test/shots/v1_12_*)
import asyncio, sys, json, math, os
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
I0 = "{ moveX: 0, moveY: 0, action: false, actionHeld: false, handbrake: false, horn: false, analog: true, throttleAxis: 0, steerAxis: 0 }"
STEP = '''([sec, extra]) => { const G = window.__gta, g = G.game; const inp = Object.assign(''' + I0 + ''', extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); inp.action = false; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
WALK = '''([x, z, sec, prompt, stage]) => { const G = window.__gta, g = G.game, m = g.mission, p = g.player;
  for (let i = 0; i < Math.round(sec * 60); i++) {
    if (prompt && m.prompt === prompt) return i / 60;
    if (stage && m.active && m.active.stage === stage) return i / 60;
    const d = Math.hypot(x - p.x, z - p.z);
    g.step(1 / 60, Object.assign(''' + I0 + ''', { camYaw: Math.atan2(x - p.x, z - p.z), moveY: d > 0.2 ? 0.6 : 0 }));
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return -1; }'''
TO = '''([x, z, h]) => { const G = window.__gta, g = G.game, p = g.player; p.x = x; p.z = z; p.y = g.world.groundHeight(x, z); p.vx = p.vz = 0; if (h != null) { p.h = h; G.view.rig.yaw = h; } }'''
INFO = '''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active, p = g.player, L = g.lock;
  return { active: j && j.id, stage: j && j.stage, plate: j && j.plate, dried: j && j.dried, broken: j && j.broken, carry: j && j.carry, solo: j && j.solo,
    state: p.state, prompt: m.prompt, money: g.money, obj: m.objective, sub: m.sub, indoor: g.indoor, where: g.indoors.where, done: m.done.has('flaskpost'),
    lock: L ? { value: L.value, shown: !document.getElementById('lock').hidden, title: document.getElementById('lkTitle').textContent } : null }; })()'''
# dry the dishes: take every plate after a moment, but let two slip (the 3rd and the 8th)
DISHES = '''([shotAt]) => { const G = window.__gta, g = G.game, j = g.mission.active; const inp = Object.assign(''' + I0 + ''', {});
  let n = 0, k = 0;
  for (let i = 0; i < 60 * 50 && j.stage === 'dishes'; i++) {
    if (j.plate === 'offer' && j.plateT > 0.35 && !inp._took) { n = j.dried + j.broken + 1; inp._took = true; inp.action = !(n === 3 || n === 8); }
    if (j.plate !== 'offer') inp._took = false;
    inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); inp.action = false;
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world);
    if (j.dried + j.broken === shotAt && j.plate === 'offer' && j.plateT > 0.2 && !k) { k = 1; return 'pause'; } }
  return j.stage; }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v1_12_{name}_{tag}.png')
async def talk_through(pg, at=None):
    await frames(pg, 8)
    for _ in range(80):
        if await pg.evaluate('() => !document.getElementById("talk").hidden'):
            break
        await frames(pg, 2)
    await pg.wait_for_timeout(300)
    for i in range(16):
        if not await pg.evaluate('() => !document.getElementById("talk").hidden'):
            return i
        for a in (at or []):
            if i == a[0]:
                await pg.wait_for_timeout(a[2] if len(a) > 2 else 0)
                await shot(pg, name_g, a[1], 12)
        await pg.evaluate('() => window.__gta.nextTalk()')
        await frames(pg, 4)
        await pg.wait_for_timeout(280)
    return 16
async def press(pg):
    await pg.evaluate(STEP, [0.05, {'action': True}])
    await pg.evaluate(STEP, [0.2, None])
async def main(name, w, h, mobile):
    global name_g
    name_g = name
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
        done = ['red', 'lasse', 'pizza', 'race', 'flag', 'samuel', 'overlamning', 'cykel', 'livs', 'nycklar', 'kassaskap', 'konditori', 'syltburken', 'fabriken', 'cykelretur', 'hemleverans', 'bullfest', 'cykelgomman', 'birger', 'utsikten', 'kyrkkaffe', 'skattjakt']
        save = {'v': 2, 'money': 3200, 'done': done, 'known': [d for d in done if d != 'red'] + ['flaskpost'], 'seen': [d for d in done if d != 'red'], 'stats': {'tivoliNews': 1, 'chapel': 2}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='body.nophone #phone { visibility: hidden !important; }')
        await pg.evaluate("() => document.body.classList.add('nophone')")
        F = await pg.evaluate("import('./src/flaskpost.js').then((s) => s.FLASK)")
        E = await pg.evaluate("import('./src/elsa.js').then((s) => ({ house: s.ELSA_HOUSE, spots: s.ELSA_SPOTS, door: s.ELSA_DOOR }))")
        EH, SP = E['house'], E['spots']
        C = await pg.evaluate("import('./src/chapel.js').then((s) => ({ door: s.CHAPEL_DOOR }))")
        CD = C['door']
        KO = await pg.evaluate("import('./src/config.js').then((s) => ({ k: s.KONDITORI, ing: s.INGVAR }))")
        K, ING = KO['k'], KO['ing']
        steps = {}
        # ---------------- 1. the konditori: Dahlgren washes up, you dry
        await pg.evaluate(TO, [60, -20, 0])
        await pg.evaluate(STEP, [1.0, None])
        await pg.evaluate("() => window.__gta.game.mission.accept('flaskpost')")
        await pg.evaluate(TO, [K['x'] + 0.4, K['z'] - 6, 0])
        await pg.evaluate(STEP, [0.6, None])
        await shot(pg, name, '01_dahlgren')
        t = await pg.evaluate(WALK, [K['x'], K['z'], 8, None, 'intro'])
        steps['start'] = t >= 0
        await talk_through(pg, at=[(1, '02_intro', 300)])
        await pg.evaluate(STEP, [0.4, None])
        r = await pg.evaluate(DISHES, [4])
        await pg.evaluate(STEP, [0.05, None])
        steps['torka'] = (await pg.evaluate(INFO))['prompt'] == 'TORKA'
        await shot(pg, name, '03_dishes', 4)
        r = await pg.evaluate(DISHES, [-1])
        i1 = await pg.evaluate(INFO)
        steps['dishes'] = i1['dried'] + i1['broken'] == 12 and i1['broken'] >= 2  # (the real loop runs on during a shot)
        dried = i1['dried']
        await pg.evaluate(STEP, [0.8, None])
        await shot(pg, name, '04_shards', 6)
        await talk_through(pg, at=[(2, '05_after', 300)])
        await pg.evaluate(STEP, [0.3, None])
        steps['bottle_go'] = (await pg.evaluate(INFO))['stage'] == 'bottle'
        # ---------------- 2. the bottle on the shore
        await pg.evaluate(TO, [F['bottle']['x'] + 1, F['bottle']['z'] - 6, 0])
        await pg.evaluate(STEP, [0.4, None])
        t = await pg.evaluate(WALK, [F['bottle']['x'], F['bottle']['z'], 8, 'UNDERSÖK', None])
        if t < 0:
            print(name, 'bottle prompt', (await pg.evaluate(INFO))['prompt'])
        steps['bottle'] = t >= 0
        await shot(pg, name, '06_bottle')
        await press(pg)
        await talk_through(pg, at=[(1, '07_bottle_note', 0)])
        await pg.evaluate(STEP, [1.5, None])
        # ---------------- 3. under the lighthouse steps
        await pg.evaluate(TO, [F['stair']['x'] + 3, F['stair']['z'] + 2, None])
        await pg.evaluate(STEP, [0.4, None])
        await shot(pg, name, '08_stairs')
        t = await pg.evaluate(WALK, [F['stair']['x'], F['stair']['z'], 8, None, None])
        i2 = await pg.evaluate(INFO)
        print(name, 'at stairs', i2['prompt'], i2['stage'])
        await press(pg)
        await pg.evaluate(STEP, [1.2, None])
        await pg.evaluate('() => { const G = window.__gta; G.lockTurn(0, 1); G.lockTurn(1, -1); G.lockTurn(2, -3); G.lockTurn(3, 4); }')
        await pg.evaluate(STEP, [0.1, None])
        i3 = await pg.evaluate(INFO)
        print(name, 'lock', json.dumps(i3['lock']))
        steps['lock'] = bool(i3['lock'])
        await shot(pg, name, '09_lock', 6)
        await pg.evaluate("() => { const L = window.__gta.game.lock; for (let i = 0; i < 4; i++) { L.select(i); L.type(+'1974'[i]); } }")
        await pg.evaluate('() => window.__gta.lockTry()')
        await pg.evaluate(STEP, [1.2, None])
        await talk_through(pg, at=[(0, '10_tin', 300)])
        for _ in range(160):
            if (await pg.evaluate(INFO))['stage'] != 'ingvarWalk':
                break
            await pg.evaluate(STEP, [0.1, None])
        await talk_through(pg, at=[(2, '11_ingvar', 300)])
        await pg.evaluate(STEP, [0.3, None])
        steps['elsa_go'] = (await pg.evaluate(INFO))['stage'] == 'elsa'
        # ---------------- 4. Elsa's house by the chapel
        await pg.evaluate(TO, [E['door']['x'] + 3.3, E['door']['z'] + 0.3, -math.pi / 2])
        await pg.evaluate(STEP, [0.5, None])
        await shot(pg, name, '12_elsa_house')
        t = await pg.evaluate(WALK, [E['door']['x'], E['door']['z'], 10, 'KNACKA', None])
        steps['knock'] = t >= 0
        await press(pg)
        for _ in range(60):
            if (await pg.evaluate(INFO))['indoor']:
                break
            await pg.evaluate(STEP, [0.1, None])
        await pg.evaluate(STEP, [0.6, None])
        await talk_through(pg, at=[(0, '13_elsa', 300)])
        await pg.evaluate(STEP, [0.4, None])
        steps['inside'] = (await pg.evaluate(INFO))['where'] == 'elsa'
        await shot(pg, name, '14_room')
        n = 0
        for s in SP:
            if (await pg.evaluate(INFO))['stage'] != 'search':
                break
            t = await pg.evaluate(WALK, [s['x'], s['z'], 10, None, None])
            await press(pg)
            await pg.evaluate(STEP, [0.6, None])
            n += 1
            await talk_through(pg, at=[(0, f'15_spot_{s["id"]}', 200)] if s['id'] in ('kikare', 'korg') else None)
            await pg.evaluate(STEP, [0.3, None])
        i4 = await pg.evaluate(INFO)
        print(name, 'searched', n, i4['stage'], i4['carry'], 'solo', i4['solo'])
        solo = i4['solo']
        t = await pg.evaluate(WALK, [EH['talk']['x'], EH['talk']['z'], 10, 'GE', None])
        steps['ge'] = t >= 0
        await press(pg)
        await talk_through(pg, at=[(2, '16_letter', 0), (5, '17_elsa_reads', 300)])
        await pg.evaluate(STEP, [0.4, None])
        t = await pg.evaluate(WALK, [EH['door']['x'], EH['door']['z'], 12, 'GÅ UT', None])
        await press(pg)
        await pg.evaluate(STEP, [1.6, None])
        steps['out'] = not (await pg.evaluate(INFO))['indoor']
        # ---------------- 5. back to Ingvar with her answer
        await pg.evaluate(TO, [ING['x'] + 3, ING['z'] + 5, None])
        await pg.evaluate(STEP, [0.5, None])
        t = await pg.evaluate(WALK, [ING['x'], ING['z'] + 1.3, 10, 'PRATA', None])
        steps['ingvar2'] = t >= 0
        await press(pg)
        await talk_through(pg, at=[(1, '18_reply', 300)])
        await pg.evaluate(STEP, [0.4, None])
        steps['sunday'] = (await pg.evaluate(INFO))['stage'] == 'sunday'
        # ---------------- 6. Sunday in the chapel
        await pg.evaluate(TO, [CD['x'] + 3, CD['z'] - 9, 0])
        await pg.evaluate(STEP, [0.5, None])
        t = await pg.evaluate(WALK, [CD['x'], CD['z'], 12, 'GÅ IN', None])
        await press(pg)
        for _ in range(60):
            if (await pg.evaluate(INFO))['indoor']:
                break
            await pg.evaluate(STEP, [0.1, None])
        await pg.evaluate(STEP, [1.5, None])
        await shot(pg, name, '19_church')
        for _ in range(300):
            if (await pg.evaluate(INFO))['stage'] != 'church':
                break
            await pg.evaluate(STEP, [0.1, None])
            if _ == 40:
                await shot(pg, name, '20_ingvar_walks', 4)
        await talk_through(pg, at=[(1, '21_finale', 300), (5, '22_finale2', 300)])
        await pg.evaluate(STEP, [1.2, None])
        await shot(pg, name, '23_done', 6)
        i5 = await pg.evaluate(INFO)
        steps['done'] = i5['done'] and i5['money'] == 3200 + 5000 + dried * 25 + (200 if solo else 0)
        print(name, 'steps', json.dumps(steps), 'money', i5['money'])
        ok = all(steps.values())
        print(name, 'V1_12', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
name_g = ''
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
