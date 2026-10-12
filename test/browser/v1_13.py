# v1.13 walkthrough: two side quests indoors. "Fredagsrusningen" in Pizzeria Sjuan's kitchen (Sanna and
# Pino, the order slips, the dough bench, the toppings, the oven – one pizza left too long – the pass,
# Sanna carrying out, Pino tasting his special) and "Möss i kvarnen" in the windmill on Norrholmen
# (Majken, the holes, chasing the mice, Kimchi the white one, the crate out to the old bakery, Nova).
# Usage: python3 test/browser/v1_13.py phone|land|desk (shots: test/shots/v1_13_*)
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
INFO = '''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active, p = g.player;
  return { active: j && j.id, stage: j && j.stage, prompt: m.prompt, money: g.money, obj: m.objective, sub: m.sub, indoor: g.indoor, where: g.indoors.where,
    served: j && j.served, caught: j && j.caught, plugged: j && j.plugged, hand: j && j.hand ? j.hand.top.join(',') : null,
    tickets: document.querySelectorAll('#tickets .tkt').length, fredag: m.done.has('fredag'), moss: m.done.has('moss') }; })()'''
# bake one order: walk to each station (from where you are), press there
CHASE = '''([sec]) => { const G = window.__gta, g = G.game, m = g.mission, j = m.active, p = g.player;
  const inp = Object.assign(''' + I0 + ''', {});
  for (let i = 0; i < Math.round(sec * 60) && j.stage === 'catch'; i++) {
    if (m.prompt === 'FÅNGA') { inp.action = true; }
    else {
      const L = j.mice.filter((q) => q.state !== 'caught' && q.state !== 'hole');
      let best = null, bd = 1e9; for (const q of L) { const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; best = q; } }
      if (best) { inp.camYaw = Math.atan2(best.x - p.x, best.z - p.z); inp.moveY = bd > 2.6 ? 1 : 0.35; } else inp.moveY = 0;
    }
    g.step(1 / 60, inp); inp.action = false;
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world);
  }
  return j.caught; }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v1_13_{name}_{tag}.png')
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
    await pg.evaluate(STEP, [0.15, None])
async def station(pg, x, z, prompt):
    t = await pg.evaluate(WALK, [x, z, 8, prompt, None])
    if t < 0:
        print(name_g, 'no prompt', prompt, json.dumps(await pg.evaluate(INFO), ensure_ascii=False))
        return False
    await press(pg)
    return True
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
        done = ['red', 'lasse', 'pizza', 'race', 'flag', 'samuel', 'overlamning', 'cykel', 'livs', 'nycklar', 'kassaskap', 'konditori', 'syltburken', 'fabriken', 'cykelretur', 'hemleverans', 'bullfest', 'konsert']
        save = {'v': 2, 'money': 2400, 'done': done, 'known': [d for d in done if d != 'red'] + ['fredag', 'moss'], 'seen': [d for d in done if d != 'red'], 'stats': {}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='body.nophone #phone { visibility: hidden !important; }')
        await pg.evaluate("() => document.body.classList.add('nophone')")
        K = await pg.evaluate("import('./src/kitchen.js').then((s) => ({ menu: s.MENU, rush: s.RUSH }))")
        PZ = await pg.evaluate("import('./src/pizzeria.js').then((s) => ({ R: s.PIZZA_ROOM, T: s.TOPPINGS, door: s.PIZZA_DOOR }))")
        MI = await pg.evaluate("import('./src/millroom.js').then((s) => ({ R: s.MILL_ROOM, H: s.HOLES, door: s.MILL_DOOR }))")
        MC = await pg.evaluate("import('./src/mice.js').then((s) => s.MICE)")
        R, TOP = PZ['R'], {t['id']: t for t in PZ['T']}
        steps = {}
        # ---------------- 1. Fredagsrusningen
        await pg.evaluate(TO, [-40, -22, math.pi / 2])
        await pg.evaluate(STEP, [0.5, None])
        await shot(pg, name, '01_pizzeria')
        await pg.evaluate("() => window.__gta.game.mission.accept('fredag')")
        t = await pg.evaluate(WALK, [PZ['door']['x'] - 0.8, PZ['door']['z'], 10, None, 'talk'])
        steps['enter'] = t >= 0
        await pg.evaluate(STEP, [1.2, None])
        await talk_through(pg, at=[(1, '02_pino', 300), (5, '03_sanna', 300)])
        await pg.evaluate(STEP, [0.5, None])
        i1 = await pg.evaluate(INFO)
        steps['rush'] = i1['stage'] == 'rush' and i1['tickets'] >= 1
        await shot(pg, name, '04_dining')
        # into the kitchen
        await pg.evaluate(WALK, [R['kitchenIn']['x'] - 0.8, R['kitchenIn']['z'] - 0.3, 8, None, None])
        await pg.evaluate(WALK, [R['kitchenIn']['x'] + 0.9, R['kitchenIn']['z'] - 0.2, 6, None, None])
        served_shots = 0
        burnt_once = False
        for k in range(12):
            st = await pg.evaluate("() => { const j = window.__gta.game.mission.active; return j && j.stage === 'rush' ? j.open.map((o) => o.pizza) : null; }")
            if st is None:
                break
            if not st:
                await pg.evaluate(STEP, [1.0, None])
                continue
            pz = st[0]
            ok = await station(pg, R['dough']['x'], R['dough']['z'], 'DEG')
            for tid in K['menu'][pz]['top']:
                ok = ok and await station(pg, TOP[tid]['x'], TOP[tid]['z'], TOP[tid]['label'])
            if k == 1:
                await shot(pg, name, '05_toppings', 4)
            ok = ok and await station(pg, R['oven']['x'], R['oven']['z'], 'IN I UGNEN')
            if k == 0:
                await pg.evaluate(STEP, [2.0, None])
                await shot(pg, name, '06_oven', 4)
            wait = K['rush']['ready'] + 0.4 if (k != 2 or burnt_once) else K['rush']['burnt'] + 0.3
            await pg.evaluate(STEP, [wait - (2.0 if k == 0 else 0), None])
            ok = ok and await station(pg, R['oven']['x'], R['oven']['z'], 'TA UT')
            if k == 2 and not burnt_once:
                burnt_once = True
                await shot(pg, name, '07_burnt', 4)
                ok = ok and await station(pg, R['bin']['x'], R['bin']['z'], 'SLÄNG')
                continue
            ok = ok and await station(pg, R['pass']['x'], R['pass']['z'], 'SERVERA')
            if served_shots == 0:
                await pg.evaluate(STEP, [0.6, None])
                await shot(pg, name, '08_served', 4)
                served_shots = 1
            if not ok:
                break
        for _ in range(40):
            if (await pg.evaluate(INFO))['stage'] != 'rush':
                break
            await pg.evaluate(STEP, [0.5, None])
        i2 = await pg.evaluate(INFO)
        steps['served'] = i2['served'] == 6
        await talk_through(pg, at=[(1, '09_pino_tastes', 300), (5, '10_pay', 300)])
        await pg.evaluate(STEP, [1.5, None])
        await shot(pg, name, '11_done', 6)
        i3 = await pg.evaluate(INFO)
        steps['fredag'] = i3['fredag']
        print(name, 'fredag money', i3['money'])
        await pg.evaluate(WALK, [R['kitchenIn']['x'] + 0.9, R['kitchenIn']['z'] - 0.2, 8, None, None])
        await pg.evaluate(WALK, [R['kitchenIn']['x'] - 0.9, R['kitchenIn']['z'] - 0.4, 8, None, None])
        await pg.evaluate(WALK, [R['door']['x'] + 0.4, R['door']['z'], 14, 'GÅ UT', None])
        await press(pg)
        await pg.evaluate(STEP, [1.6, None])
        steps['out1'] = not (await pg.evaluate(INFO))['indoor']
        # ---------------- 2. Möss i kvarnen
        D = MI['door']
        await pg.evaluate(TO, [D['x'] + math.sin(D['h']) * 6, D['z'] + math.cos(D['h']) * 6, D['h'] + math.pi])
        await pg.evaluate(STEP, [0.6, None])
        await shot(pg, name, '12_mill_door')
        await pg.evaluate("() => window.__gta.game.mission.accept('moss')")
        t = await pg.evaluate(WALK, [D['x'], D['z'], 10, None, 'talk'])
        steps['mill'] = t >= 0
        await pg.evaluate(STEP, [1.2, None])
        await talk_through(pg, at=[(1, '13_majken', 300)])
        await pg.evaluate(STEP, [0.6, None])
        await shot(pg, name, '14_mill')
        MR = MI['R']
        for i, Hh in enumerate(MI['H']):
            for _ in range(6):
                pl = await pg.evaluate("(i) => window.__gta.game.mission.active.holes[i].plugged", i)
                if pl:
                    break
                t = await pg.evaluate(WALK, [Hh['sx'], Hh['sz'], 10, 'TÄPP', None])
                if t >= 0:
                    await press(pg)
                    if i == 0:
                        await shot(pg, name, '15_plug', 4)
                else:
                    await pg.evaluate(STEP, [0.3, {'action': True}])
        i4 = await pg.evaluate(INFO)
        steps['plugged'] = i4['plugged'] == 5
        n = await pg.evaluate(CHASE, [1.2])
        await shot(pg, name, '16_chase', 2)
        n = await pg.evaluate(CHASE, [120])
        steps['caught'] = n == 7
        await talk_through(pg, at=[(2, '17_kimchi', 300)])
        await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate(WALK, [MR['door']['x'], MR['door']['z'], 14, 'GÅ UT', None])
        await shot(pg, name, '18_crate', 4)
        await press(pg)
        await pg.evaluate(STEP, [1.6, None])
        Z = MC['release']
        await pg.evaluate(TO, [Z['x'] - 6, Z['z'] + 5, None])
        await pg.evaluate(STEP, [0.4, None])
        t = await pg.evaluate(WALK, [Z['x'], Z['z'], 10, 'SLÄPP', None])
        steps['release'] = t >= 0
        await shot(pg, name, '19_bakery', 4)
        await press(pg)
        await pg.evaluate(STEP, [3.0, None])
        V = MC['nova']
        await pg.evaluate(TO, [V['talk']['x'] + 2, V['talk']['z'] + 8, math.pi])
        await pg.evaluate(STEP, [4.0, None])
        t = await pg.evaluate(WALK, [V['talk']['x'], V['talk']['z'], 10, 'PRATA', None])
        steps['nova'] = t >= 0
        await press(pg)
        await talk_through(pg, at=[(0, '20_nova', 300), (4, '21_nova_pay', 300)])
        await pg.evaluate(STEP, [1.5, None])
        i5 = await pg.evaluate(INFO)
        steps['moss'] = i5['moss']
        print(name, 'steps', json.dumps(steps), 'money', i5['money'])
        ok = all(steps.values())
        print(name, 'V1_13', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
name_g = ''
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
