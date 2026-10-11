# v1.10 walkthrough: "Kyrkkaffet" – kyrkoherde Inga's side quest. Tant Gun in her garden (the buns go
# into the box on Arne's bike), the ride over the south bridge, in through the chapel's tower door with
# the buns, the bell rope (three rings) and the guests coming in, Inga's welcome, the organ (the keys
# on the screen: play the three verses back, one wrong key on purpose), the finale with Gun – and
# afterwards the organ for free play.
# Usage: python3 test/browser/v1_10.py phone|land|desk (shots: test/shots/v1_10_*)
import asyncio, sys, json, math, os
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
I0 = "{ moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, analog: true, throttleAxis: 0, steerAxis: 0 }"
STEP = '''([sec, extra]) => { const G = window.__gta, g = G.game; const inp = Object.assign(''' + I0 + ''', extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); inp.action = false; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
# walk toward (x, z) until a prompt shows (or a stage is reached), at most sec seconds
WALK = '''([x, z, sec, prompt, stage]) => { const G = window.__gta, g = G.game, m = g.mission, p = g.player;
  for (let i = 0; i < Math.round(sec * 60); i++) {
    if (prompt && m.prompt === prompt) return i / 60;
    if (stage && m.active && m.active.stage === stage) return i / 60;
    const d = Math.hypot(x - p.x, z - p.z);
    g.step(1 / 60, Object.assign(''' + I0 + ''', { camYaw: Math.atan2(x - p.x, z - p.z), moveY: d > 0.2 ? 0.6 : 0 }));
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return -1; }'''
TO = '''([x, z, h]) => { const G = window.__gta, g = G.game, p = g.player; p.x = x; p.z = z; p.y = g.world.groundHeight(x, z); p.vx = p.vz = 0; if (h != null) { p.h = h; G.view.rig.yaw = h; } }'''
BIKE_TO = '''([x, z, h]) => { const G = window.__gta, g = G.game, b = g.bike; b.x = x; b.z = z; b.h = h; b.vx = b.vz = b.w = 0; b.y = g.world.groundHeight(x, z); G.view.rig.yaw = h; }'''
INFO = '''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active, p = g.player, O = g.indoors.organ;
  return { active: j && j.id, stage: j && j.stage, state: p.state, prompt: m.prompt, money: g.money, obj: m.objective, sub: m.sub,
    buns: j && j.buns, table: g.indoors.chapelBuns, where: g.indoors.where, indoor: g.indoor, done: m.done.has('kyrkkaffe'),
    organ: { open: O.open, phase: O.phase, verse: O.verse, pos: O.pos, mistakes: O.mistakes, shown: !document.getElementById('organ').hidden } }; })()'''
# the note the organ wants next (or -1 when it is not your turn)
WANT = '''(() => { const O = window.__gta.game.indoors.organ; if (O.phase !== 'turn') return -1; return O.notes[O.pos]; })()'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v1_10_{name}_{tag}.png')
async def talk_through(pg, at=None):
    await frames(pg, 8)
    for _ in range(80):  # (a talk opens a little after the job asks for it, in game time)
        if await pg.evaluate('() => !document.getElementById("talk").hidden'):
            break
        await frames(pg, 2)
    for i in range(14):
        if not await pg.evaluate('() => !document.getElementById("talk").hidden'):
            return i
        for a in (at or []):
            if i == a[0]:
                await pg.wait_for_timeout(a[2] if len(a) > 2 else 0)
                await shot(pg, name_g, a[1], 12)
        await pg.evaluate('() => window.__gta.nextTalk()')
        await frames(pg, 4)
        await pg.wait_for_timeout(280)  # (a page shown less than 260 ms ago ignores the tap)
    return 14
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
        done = ['red', 'lasse', 'pizza', 'race', 'flag', 'samuel', 'overlamning', 'cykel', 'livs', 'kassaskap', 'konditori', 'syltburken', 'fabriken', 'bullfest', 'cykelgomman', 'birger', 'utsikten']
        save = {'v': 2, 'money': 2500, 'done': done, 'known': [d for d in done if d != 'red'] + ['kyrkkaffe'], 'seen': [d for d in done if d != 'red'], 'stats': {'tivoliNews': 1, 'chapel': 2}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        await pg.evaluate("() => window.__gta.game.mission.accept('kyrkkaffe')")
        K = await pg.evaluate("import('./src/kyrkkaffe.js').then((s) => s.KYRK.mark)")
        C = await pg.evaluate("import('./src/chapel.js').then((s) => ({ door: s.CHAPEL_DOOR, room: s.CHAPEL.room, k: s.CHAPEL_KAFFE }))")
        D, R, CK = C['door'], C['room'], C['k']
        steps = {}
        # ---------------- 1. tant Gun's garden: in through the gap in the hedge
        await pg.evaluate(TO, [-97.5, -45.8, math.pi])
        await pg.evaluate(STEP, [0.6, None])
        t = await pg.evaluate(WALK, [K['x'], K['z'], 8, None, 'gun'])
        steps['gun'] = t >= 0
        await talk_through(pg, at=[(2, '01_gun', 0)])
        await pg.evaluate(STEP, [0.4, None])
        i1 = await pg.evaluate(INFO)
        steps['ride'] = i1['stage'] == 'ride' and i1['buns'] == 24
        # ---------------- 2. on Arne's bike, with the buns – over the south bridge
        bx = await pg.evaluate('() => [window.__gta.game.bike.x, window.__gta.game.bike.z]')
        await pg.evaluate(TO, [bx[0] - 1.0, bx[1] + 0.6, math.pi / 2])
        await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [0.5, None])
        steps['mounted'] = await pg.evaluate('() => { const g = window.__gta.game; return g.player.inCar && g.player.car === g.bike && g.bike.buns; }')
        await pg.evaluate(BIKE_TO, [-37.5, 150, 0])
        await pg.evaluate(STEP, [0.4, None])
        await pg.evaluate(STEP, [1.6, {'throttleAxis': 1}])
        await shot(pg, name, '02_bridge')
        # a fall on the way: six buns go flying
        await pg.evaluate('() => window.__gta.game.player.fallOff()')
        await pg.evaluate(STEP, [0.25, None])
        await shot(pg, name, '03_fall', 4)
        i2 = await pg.evaluate(INFO)
        steps['fall'] = i2['buns'] == 18
        await pg.evaluate(STEP, [2.0, None])
        # back on, and up to the chapel
        await pg.evaluate('() => { const g = window.__gta.game, b = g.bike, p = g.player; p.x = b.x - 0.8; p.z = b.z; p.state = "foot"; }')
        await pg.evaluate(STEP, [0.2, None])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [0.4, None])
        await pg.evaluate(BIKE_TO, [D['x'] + 0.5, D['z'] - 9, 0])
        await pg.evaluate(STEP, [1.2, {'throttleAxis': 0.5}])
        await pg.evaluate(STEP, [1.0, {'throttleAxis': -1}])
        await shot(pg, name, '04_chapel')
        await pg.evaluate(STEP, [0.05, {'action': True}])   # off the bike
        await pg.evaluate(STEP, [0.5, None])
        t = await pg.evaluate(WALK, [D['x'], D['z'], 8, 'BÄR IN', None])
        steps['carry'] = t >= 0
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [1.5, None])
        # ---------------- 3. inside: Inga by the coffee table
        await talk_through(pg, at=[(1, '05_welcome', 300)])
        await pg.evaluate(STEP, [0.4, None])
        i3 = await pg.evaluate(INFO)
        steps['table'] = i3['where'] == 'chapel' and i3['table'] == 18 and i3['stage'] == 'bell'
        # ---------------- 4. the bell rope, three times – and the guests come in
        t = await pg.evaluate(WALK, [CK['rope']['x'] + 0.2, CK['rope']['z'] + 0.55, 8, 'RINGA', None])
        rings = 0
        for _ in range(3):
            for _ in range(30):
                if (await pg.evaluate(INFO))['prompt'] == 'RINGA':
                    break
                await pg.evaluate(STEP, [0.1, None])
            await pg.evaluate(STEP, [0.05, {'action': True}])
            rings += 1
            await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate('() => { window.__gta.view.rig.yaw = 0; }')
        await pg.evaluate(STEP, [3.2, None])
        await shot(pg, name, '06_guests')
        for _ in range(40):
            if (await pg.evaluate(INFO))['stage'] != 'guests':
                break
            await pg.evaluate(STEP, [0.5, None])
        steps['guests'] = (await pg.evaluate(INFO))['stage'] == 'announce'
        await talk_through(pg, at=[(0, '07_announce', 0)])
        await pg.evaluate(STEP, [0.4, None])
        # ---------------- 5. the organ
        t = await pg.evaluate(WALK, [R['x0'] + 4, R['z0'] + 10.2, 12, None, None])
        t = await pg.evaluate(WALK, [R['x0'] + 4, R['z0'] + 11.6, 6, None, None])
        t = await pg.evaluate(WALK, [CK['organ']['x'], CK['organ']['z'], 8, 'SPELA', None])
        steps['spela'] = t >= 0
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [0.2, None])
        shots = set()
        wrong_done = False
        for k in range(2400):
            i = await pg.evaluate(INFO)
            O = i['organ']
            if not O['open']:
                break
            if O['phase'] == 'demo' and O['verse'] == 1 and 'demo' not in shots:
                await pg.evaluate(STEP, [0.9, None])
                await shot(pg, name, '08_organ_listen', 6)
                shots.add('demo')
            want = await pg.evaluate(WANT)
            if want >= 0:
                if O['verse'] == 1 and not wrong_done:
                    await pg.evaluate('k => window.__gta.organKey(k)', (want + 2) % 5)   # one wrong key on purpose
                    wrong_done = True
                    await pg.evaluate(STEP, [0.1, None])
                    await shot(pg, name, '09_organ_wrong', 4)
                    continue
                await pg.evaluate('k => window.__gta.organKey(k)', want)
                if O['verse'] == 2 and O['pos'] == 3 and 'turn' not in shots:
                    await pg.evaluate(STEP, [0.05, None])
                    await shot(pg, name, '10_organ_turn', 4)
                    shots.add('turn')
            if O['phase'] == 'final' and 'final' not in shots:
                await pg.evaluate(STEP, [2.5, None])
                await shot(pg, name, '11_organ_final', 6)
                shots.add('final')
            await pg.evaluate(STEP, [0.1, None])
        i5 = await pg.evaluate(INFO)
        steps['psalm'] = i5['stage'] == 'finale' and i5['organ']['mistakes'] == 1
        await pg.evaluate(STEP, [3.6, None])
        pages = await talk_through(pg, at=[(1, '12_finale_gun', 300), (4, '13_finale_inga', 0)])
        await pg.evaluate(STEP, [4.0, None])
        i6 = await pg.evaluate(INFO)
        steps['done'] = i6['done'] and i6['money'] == 2500 + 700 + 18 * 25 + 250
        # ---------------- 6. afterwards: the organ is yours
        t = await pg.evaluate(WALK, [CK['organ']['x'], CK['organ']['z'], 6, 'SPELA', None])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [0.3, None])
        for k in [0, 2, 4, 2, 0]:
            await pg.evaluate('k => window.__gta.organKey(k)', k)
            await pg.evaluate(STEP, [0.25, None])
        await shot(pg, name, '14_free', 4)
        i7 = await pg.evaluate(INFO)
        steps['free'] = i7['organ']['open'] and i7['organ']['phase'] == 'free' and i7['organ']['shown']
        await pg.evaluate('() => window.__gta.organStop()')
        await pg.evaluate(STEP, [0.3, None])
        await frames(pg, 6)
        steps['up'] = (await pg.evaluate(INFO))['state'] == 'foot' and not (await pg.evaluate(INFO))['organ']['shown']
        print(name, 'steps', json.dumps(steps), 'money', i6['money'], 'pages', pages)
        ok = all(steps.values())
        print(name, 'V1_10', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
name_g = ''
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
