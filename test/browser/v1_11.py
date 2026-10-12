# v1.11 walkthrough: "Arnes skattjakt" – main quest, part 12. Tant Gun and Bagar-Bengt outside the
# konditori (Arne's envelope and his first note), the riddle in the objective box, the oak stump in the
# park and its combination lock (a wrong code first), a tip from Gun while you stand still, the windmill
# on Norrholmen (Majken, the brake lever and the yellow sail, Majken's ladder), a tip by tapping the
# objective box, Ingvar at the lighthouse, the drive to the phone box on the quay against the clock,
# the call, the chapel (the psalm board, Inga, the altar lock), carrying Arne's butter box to Gun,
# the letter, pounding the cardamom, and the tasting – with Dahlgren.
# Usage: python3 test/browser/v1_11.py phone|land|desk (shots: test/shots/v1_11_*)
import asyncio, sys, json, math, os
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
I0 = "{ moveX: 0, moveY: 0, action: false, actionHeld: false, handbrake: false, horn: false, analog: true, throttleAxis: 0, steerAxis: 0 }"
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
# a car of your own at (x, z), facing h, and you in it
CAR = '''([x, z, h]) => { const G = window.__gta, g = G.game, p = g.player; g.makeRoom('sedan');
  const c = g.addVehicle('sedan', 'blue', x, z, h); const d = c.local(-1.6, 0.3); p.x = d.x; p.z = d.z; p.y = g.world.groundHeight(d.x, d.z); p.vx = p.vz = 0;
  window.__car = c; G.view.rig.yaw = h; return !!c; }'''
CAR_TO = '''([x, z, h]) => { const G = window.__gta, c = G.game.player.car; c.x = x; c.z = z; c.h = h; c.vx = c.vz = c.w = 0; c.y = G.game.world.groundHeight(x, z); G.view.rig.yaw = h; }'''
INFO = '''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active, p = g.player, L = g.lock;
  return { active: j && j.id, stage: j && j.stage, k: j && j.k, state: p.state, prompt: m.prompt, money: g.money, obj: m.objective, sub: m.sub,
    solo: j && j.solo, tip: j && j.tip, onTime: j && j.onTime, carry: j && j.carry, pounds: j && j.pounds, indoor: g.indoor, done: m.done.has('skattjakt'),
    lock: L ? { code: L.code, value: L.value, state: L.state, shown: !document.getElementById('lock').hidden, title: document.getElementById('lkTitle').textContent } : null,
    tipClass: document.getElementById('objective').classList.contains('tip'), millW: g.millW, frozen: p.frozen }; })()'''
# at the brake lever: wait for the yellow sail (lo..hi from straight down) at full speed, then hold BROMSA
BRAKE = '''([lo, hi]) => { const G = window.__gta, g = G.game, j = g.mission.active; const inp = Object.assign(''' + I0 + ''', {});
  const step = (held) => { inp.camYaw = G.view.rig.yaw; inp.actionHeld = held; g.step(1 / 60, inp); G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); };
  for (let k = 0; k < 60 * 25; k++) { if (Math.abs(g.millW - 0.45) < 1e-6 && j.sailOff() > lo && j.sailOff() < hi) break; step(false); }
  const miss0 = j.brakeMiss;
  for (let k = 0; k < 60 * 3 && j.stage === 'brake' && j.brakeMiss === miss0; k++) step(true);
  return { stage: j.stage, off: j.sailOff(), miss: j.brakeMiss }; }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v1_11_{name}_{tag}.png')
async def talk_through(pg, at=None):
    await frames(pg, 8)
    for _ in range(80):  # (a talk opens a little after the job asks for it, in game time)
        if await pg.evaluate('() => !document.getElementById("talk").hidden'):
            break
        await frames(pg, 2)
    await pg.wait_for_timeout(300)  # (a page shown less than 260 ms ago ignores the tap)
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
        done = ['red', 'lasse', 'pizza', 'race', 'flag', 'samuel', 'overlamning', 'cykel', 'livs', 'nycklar', 'kassaskap', 'konditori', 'syltburken', 'fabriken', 'cykelretur', 'hemleverans', 'bullfest', 'cykelgomman', 'birger', 'utsikten', 'kyrkkaffe']
        save = {'v': 2, 'money': 3200, 'done': done, 'known': [d for d in done if d != 'red'] + ['skattjakt'], 'seen': [d for d in done if d != 'red'], 'stats': {'tivoliNews': 1, 'chapel': 2}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='body.nophone #phone { visibility: hidden !important; }')
        await pg.evaluate("() => document.body.classList.add('nophone')")
        H = await pg.evaluate("import('./src/skattjakt.js').then((s) => ({ hunt: s.HUNT }))")
        HU = H['hunt']
        C = await pg.evaluate("import('./src/chapel.js').then((s) => ({ door: s.CHAPEL_DOOR, inDoor: s.CHAPEL.door, room: s.CHAPEL.room }))")
        CD, R = C['door'], C['room']
        KO = await pg.evaluate("import('./src/config.js').then((s) => ({ k: s.KONDITORI, ing: s.INGVAR }))")
        K, ING = KO['k'], KO['ing']
        steps = {}
        # ---------------- 1. tant Gun and Bengt outside the konditori
        await pg.evaluate(TO, [60, -20, 0])
        await pg.evaluate(STEP, [1.0, None])
        await pg.evaluate("() => window.__gta.game.mission.accept('skattjakt')")
        await pg.evaluate(TO, [K['x'] + 0.4, K['z'] - 6, 0])
        await pg.evaluate(STEP, [0.6, None])
        t = await pg.evaluate(WALK, [K['x'], K['z'], 8, None, 'intro'])
        steps['start'] = t >= 0
        await talk_through(pg, at=[(1, '01_envelope', 300), (6, '02_note', 0)])
        await pg.evaluate(STEP, [1.4, None])
        i1 = await pg.evaluate(INFO)
        steps['riddle'] = i1['stage'] == 'seek' and i1['k'] == 0 and i1['obj'].startswith('Där vårt hjärta')
        await shot(pg, name, '03_riddle')
        steps['tipClass'] = (await pg.evaluate(INFO))['tipClass']
        # ---------------- 2. the oak stump in the park, its lock
        await pg.evaluate(TO, [70, -46, math.pi])
        await pg.evaluate(STEP, [0.5, None])
        t = await pg.evaluate(WALK, [70, -58.75, 10, 'UNDERSÖK', None])
        steps['stump'] = t >= 0 and (await pg.evaluate(INFO))['solo'] == 1
        await shot(pg, name, '04_stump')
        await press(pg)
        await pg.evaluate(STEP, [1.2, None])
        await pg.evaluate('() => { const G = window.__gta; G.lockTurn(0, 1); G.lockTurn(1, -1); G.lockTurn(2, -1); G.lockTurn(2, -1); G.lockTurn(2, -1); G.lockTurn(3, 1); G.lockTurn(3, 1); }')
        await pg.evaluate(STEP, [0.1, None])
        await frames(pg, 3)
        i2 = await pg.evaluate(INFO)
        print(name, 'lock', json.dumps(i2['lock']))
        steps['wheels'] = i2['lock'] and i2['lock']['value'] == '1972' and i2['lock']['shown']
        await pg.evaluate('() => window.__gta.lockTry()')
        await frames(pg, 3)
        steps['wrong'] = (await pg.evaluate(INFO))['lock']['title'] == 'FEL KOD'
        await shot(pg, name, '05_lock_wrong', 2)
        await pg.evaluate(STEP, [0.6, None])
        await pg.evaluate('() => { const G = window.__gta; G.lockTurn(3, -1); }')
        await pg.evaluate(STEP, [0.1, None])
        await shot(pg, name, '06_lock', 6)
        await pg.evaluate('() => window.__gta.lockTry()')
        await pg.evaluate(STEP, [0.2, None])
        await shot(pg, name, '07_lock_open', 4)
        await pg.evaluate(STEP, [1.0, None])
        pages = await talk_through(pg, at=[(1, '08_note2', 0)])
        await pg.evaluate(STEP, [2.0, None])
        i3 = await pg.evaluate(INFO)
        steps['note2'] = i3['stage'] == 'seek' and i3['k'] == 1 and not i3['lock']
        # ---------------- 3. the windmill: a tip after standing still, Majken, the brake
        await pg.evaluate("() => document.body.classList.remove('nophone')")
        await pg.evaluate(STEP, [41.5, None])
        await shot(pg, name, '09_tip', 10)
        await pg.evaluate("() => document.body.classList.add('nophone')")
        i4 = await pg.evaluate(INFO)
        steps['tip'] = i4['tip'] and i4['sub'].startswith('Tips: kvarnen')
        await pg.evaluate(TO, [-20, -365, math.pi / 2])
        await pg.evaluate(STEP, [0.5, None])
        t = await pg.evaluate(WALK, [-2.85, -351.15, 14, 'PRATA', None])
        steps['majken'] = t >= 0
        await press(pg)
        await talk_through(pg, at=[(2, '10_majken', 300)])
        await pg.evaluate(STEP, [0.6, None])
        t = await pg.evaluate(WALK, [HU['mill']['lever']['x'], HU['mill']['lever']['z'], 6, 'BROMSA', None])
        steps['lever'] = t >= 0
        await pg.evaluate(STEP, [1.8, None])
        await shot(pg, name, '11_brake')
        r1 = await pg.evaluate(BRAKE, [0.4, 0.5])
        await pg.evaluate(STEP, [0.3, None])
        await shot(pg, name, '12_brake_late', 6)
        r2 = await pg.evaluate(BRAKE, [-0.3, -0.2])
        steps['brake'] = r1['miss'] == 1 and r2['stage'] == 'millWait'
        for _ in range(40):
            j = await pg.evaluate('() => { const j = window.__gta.game.mission.active; return j.climbing ? j.climbT - j.climbAt : -1; }')
            if j >= 1.3:
                break
            await pg.evaluate(STEP, [0.1, None])
        await shot(pg, name, '13_ladder', 6)
        for _ in range(80):
            if (await pg.evaluate(INFO))['stage'] != 'millWait':
                break
            await pg.evaluate(STEP, [0.1, None])
        await talk_through(pg, at=[(0, '14_majken_tin', 300)])
        await pg.evaluate(STEP, [0.5, None])
        i5 = await pg.evaluate(INFO)
        steps['note3'] = i5['stage'] == 'seek' and i5['k'] == 2
        # ---------------- 4. a tip by tapping the objective box; Ingvar at the lighthouse
        await pg.evaluate("() => document.getElementById('objective').click()")
        await pg.evaluate(STEP, [0.3, None])
        i6 = await pg.evaluate(INFO)
        steps['tap'] = i6['tip'] and i6['sub'].startswith('Tips: Ingvar')
        await pg.evaluate(TO, [98, -377, math.pi])
        await pg.evaluate(STEP, [0.5, None])
        t = await pg.evaluate(WALK, [ING['x'], ING['z'] + 1.3, 12, 'PRATA', None])
        steps['ingvar'] = t >= 0
        await press(pg)
        await talk_through(pg, at=[(3, '15_ingvar', 300)])
        await pg.evaluate(STEP, [0.3, None])
        i7 = await pg.evaluate(INFO)
        steps['phone'] = i7['stage'] == 'phone'
        # the drive: over the north bridge with the clock running
        await pg.evaluate(CAR, [41.5, -212, 0])
        await press(pg)
        await pg.evaluate(CAR_TO, [41.5, -212, 0])
        await pg.evaluate(STEP, [2.5, {'throttleAxis': 1}])
        await shot(pg, name, '16_drive')
        steps['clock'] = (await pg.evaluate(INFO))['sub'].startswith('Ingvar ringer om')
        await pg.evaluate(CAR_TO, [-114.5, -116, math.pi])
        await pg.evaluate(STEP, [1.0, {'throttleAxis': 0.4}])
        await pg.evaluate(STEP, [1.2, {'throttleAxis': -1}])
        i8 = await pg.evaluate(INFO)
        steps['ring'] = i8['onTime'] and i8['obj'] == 'Svara i telefonen'
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [0.8, None])
        t = await pg.evaluate(WALK, [HU['booth']['x'], HU['booth']['z'], 10, 'SVARA', None])
        steps['svara'] = t >= 0
        await pg.evaluate(STEP, [0.6, None])
        await shot(pg, name, '17_booth')
        await press(pg)
        await talk_through(pg, at=[(3, '18_call', 300)])
        await pg.evaluate(STEP, [1.8, None])
        i9 = await pg.evaluate(INFO)
        steps['note4'] = i9['stage'] == 'seek' and i9['k'] == 3
        # ---------------- 5. the chapel: the psalm board, Inga, the altar
        await pg.evaluate(TO, [CD['x'] + 3, CD['z'] - 9, 0])
        await pg.evaluate(STEP, [0.5, None])
        t = await pg.evaluate(WALK, [CD['x'], CD['z'], 12, 'GÅ IN', None])
        await press(pg)
        await pg.evaluate(STEP, [1.6, None])
        steps['inside'] = (await pg.evaluate(INFO))['indoor']
        await pg.evaluate('() => { window.__gta.view.rig.yaw = 0; }')
        await pg.evaluate(STEP, [0.8, None])
        await shot(pg, name, '19_chapel')
        t = await pg.evaluate(WALK, [HU['board']['x'], HU['board']['z'], 12, 'TITTA', None])
        steps['board'] = t >= 0
        await press(pg)
        await pg.evaluate(STEP, [1.2, None])
        await shot(pg, name, '20_board')
        await pg.evaluate(STEP, [2.4, None])
        t = await pg.evaluate(WALK, [R['x0'] + 4, R['z0'] + 10.4, 12, None, None])
        t = await pg.evaluate(WALK, [HU['altar']['x'], HU['altar']['z'], 8, 'UNDERSÖK', None])
        steps['altar'] = t >= 0
        await press(pg)
        await pg.evaluate(STEP, [1.2, None])
        await pg.evaluate('() => { const G = window.__gta; G.lockType(2); G.lockType(8); G.lockType(7); }')
        await pg.evaluate(STEP, [0.1, None])
        await shot(pg, name, '21_altar_lock', 6)
        await pg.evaluate('() => window.__gta.lockTry()')
        await pg.evaluate(STEP, [1.0, None])
        await talk_through(pg, at=[(1, '22_box', 300)])
        await pg.evaluate(STEP, [0.5, None])
        i10 = await pg.evaluate(INFO)
        steps['box'] = i10['stage'] == 'deliver' and i10['carry'] == 'box'
        t = await pg.evaluate(WALK, [R['x0'] + 4, R['z0'] + 10.4, 8, None, None])
        t = await pg.evaluate(WALK, [C['inDoor']['x'], C['inDoor']['z'], 16, 'GÅ UT', None])
        await press(pg)
        await pg.evaluate(STEP, [1.6, None])
        await pg.evaluate(STEP, [1.2, {'moveY': 0.6}])
        await shot(pg, name, '23_carry')
        # ---------------- 6. the konditori: the letter, the mortar, the tasting
        await pg.evaluate(TO, [K['x'] + 0.4, K['z'] - 6, 0])
        await pg.evaluate(STEP, [0.6, None])
        t = await pg.evaluate(WALK, [K['x'], K['z'], 8, None, 'gun'])
        steps['gun'] = t >= 0
        await talk_through(pg, at=[(1, '24_open', 300), (3, '25_letter', 0), (7, '26_mortar', 300)])
        await pg.evaluate(STEP, [0.6, None])
        for i in range(30):
            await pg.evaluate(STEP, [0.05, {'action': True}])
            await pg.evaluate(STEP, [0.07, None])
            if i == 14:
                await shot(pg, name, '27_pestle', 2)
        i11 = await pg.evaluate(INFO)
        steps['pestle'] = i11['stage'] == 'baking'
        for _ in range(120):
            if (await pg.evaluate(INFO))['stage'] != 'baking':
                break
            await pg.evaluate(STEP, [0.1, None])
            await frames(pg, 1)
        await talk_through(pg, at=[(0, '28_taste', 300), (3, '29_dahlgren', 300), (6, '30_thanks', 0)])
        await pg.evaluate(STEP, [1.2, None])
        await shot(pg, name, '31_done', 6)
        i12 = await pg.evaluate(INFO)
        steps['done'] = i12['done'] and i12['money'] == 3200 + 5000 + 2 * 250 + 500
        print(name, 'steps', json.dumps(steps), 'money', i12['money'])
        ok = all(steps.values())
        print(name, 'V1_11', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
name_g = ''
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
