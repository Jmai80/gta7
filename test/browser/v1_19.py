# v1.19 walkthrough: "Förbjudet område", the first part of the second chapter – the reception on Västerholmen's quay
# with Ragnhild Kardell and the ban; the poster and Vakt Yngve at the west bridge; Vera's disguise in Salong Saxen;
# sneaking past the guards in Kexfabriken's yard; the office, the photo from 1962 and Ragnhild.
# Usage: python3 test/browser/v1_19.py phone|land|desk (shots: test/shots/v1_19_*)
import asyncio, sys, json, math, os
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
I0 = "{ moveX: 0, moveY: 0, action: false, actionHeld: false, handbrake: false, horn: false, analog: true, throttleAxis: 0, steerAxis: 0 }"
STEP = '''([sec, extra]) => { const G = window.__gta, g = G.game; const inp = Object.assign(''' + I0 + ''', extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); inp.action = false; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
# walk through a list of points; stop early when a prompt or a stage shows up
GO = '''([pts, sec, prompt, stage]) => { const G = window.__gta, g = G.game, m = g.mission, p = g.player; let k = 0;
  for (let i = 0; i < Math.round(sec * 60); i++) {
    if (prompt && m.prompt === prompt) return i / 60;
    if (stage && m.active && m.active.stage === stage) return i / 60;
    const [x, z] = pts[Math.min(k, pts.length - 1)], d = Math.hypot(x - p.x, z - p.z);
    if (d < 0.35 && k < pts.length - 1) { k++; continue; }
    g.step(1 / 60, Object.assign(''' + I0 + ''', { camYaw: Math.atan2(x - p.x, z - p.z), moveY: d > 0.2 ? 0.6 : 0 }));
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return prompt || stage ? -1 : 0; }'''
TO = '''([x, z, h]) => { const G = window.__gta, g = G.game, p = g.player; p.x = x; p.z = z; p.y = g.world.groundHeight(x, z); p.vx = p.vz = 0; if (h != null) { p.h = h; G.view.rig.yaw = h; } }'''
INFO = '''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active, p = g.player;
  return { active: j && j.id, stage: j && j.stage, prompt: m.prompt, money: g.money, obj: m.objective, sub: m.sub, indoor: g.indoor, where: g.indoors.where,
    want: j && j.want, hand: j && j.hand, tray: j && j.trayState, carry: j && j.carry, flights: j && j.magpie ? j.magpie.flights : null,
    good: j && j.good, film: j && j.film, carried: j && j.carried ? j.carried.join(',') : null,
    bird: j && j.bird ? j.bird.state : null, dives: j ? j.dives : null, left: j && j.left ? j.left.join(',') : null, lit: !!m.lampLit,
    skatbo: m.done.has('skatbo'), secrets: (g.stats.secrets || []).join(',') }; })()'''

# drive the car you are in to a point and stop there; stop early when the predicate (JS) is true
DRIVE = '''([x, z, sec, until]) => { const G = window.__gta, g = G.game, m = g.mission, p = g.player, j = m.active; const U = new Function('j', 'm', 'return ' + until);
  for (let i = 0; i < Math.round(sec * 60); i++) {
    if (U(j, m)) return true; const c = p.car; if (!c) return false;
    const d = Math.hypot(x - c.x, z - c.z), want = Math.atan2(x - c.x, z - c.z), err = Math.atan2(Math.sin(want - c.h), Math.cos(want - c.h));
    const tgt = d > 3 ? Math.min(12, d * 0.7) : 0, fwd = c.vx * Math.sin(c.h) + c.vz * Math.cos(c.h);
    g.step(1 / 60, Object.assign(''' + I0 + ''', { analog: false, throttleAxis: null, steerAxis: null, moveY: fwd < tgt ? 0.8 : fwd > tgt + 1 ? -1 : 0, moveX: Math.max(-1, Math.min(1, -err * 2)), handbrake: d < 2 && c.speed > 0.5 }));
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return U(j, m); }'''
CAR = '''([x, z, h]) => { const G = window.__gta, g = G.game, p = g.player; let c = g.__testCar;
  if (!c || c.removed) { c = g.__testCar = g.addVehicle('sedan', 'blue', x, z, h); c.parkedSpot = true; }
  if (p.car === c) { c.x = x; c.z = z; c.h = h; c.vx = c.vz = c.w = 0; c.y = g.world.groundHeight(x, z); G.view.rig.yaw = h; return true; }
  c.x = x; c.z = z; c.h = h; c.vx = c.vz = 0; c.y = g.world.groundHeight(x, z);
  p.x = x - Math.cos(h) * 1.6; p.z = z + Math.sin(h) * 1.6; p.y = g.world.groundHeight(p.x, p.z);
  for (let i = 0; i < 70; i++) g.step(1 / 60, Object.assign(''' + I0 + ''', { action: i === 0 }));
  G.view.rig.yaw = h; return p.car === c; }'''
CAM = '''([cx, cy, cz, fx, fy, fz, fov]) => { const g = window.__gta.game; g.camFocus = fov ? { x: fx, y: fy, z: fz, owner: 'shot', cam: { x: cx, y: cy, z: cz, fov } } : null; }'''
INFO2 = '''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active, p = g.player;
  return { active: j && j.id, stage: j && j.stage, prompt: m.prompt, obj: m.objective, sub: m.sub, indoor: g.indoor, where: g.indoors.where, carry: j && j.carry,
    x: +p.x.toFixed(1), z: +p.z.toFixed(1), car: !!p.car, van: j && j.truck ? [+j.truck.x.toFixed(0), +j.truck.z.toFixed(0)] : null, gate: !!(g.gateWest && g.gateWest.open), dusk: g.dusk, showT: j && j.showT }; })()'''
# drive along points in the car you are in (or follow the van when pts is 'van'); stop when the predicate is true
DRIVE2 = '''([pts, sec, until, vmax]) => { const G = window.__gta, g = G.game, m = g.mission, p = g.player, j = m.active; const U = new Function('j', 'm', 'g', 'return ' + until); let i = 0;
  for (let k = 0; k < Math.round(sec * 60); k++) {
    if (U(j, m, g)) return true; const c = p.car; if (!c) return false;
    let x, z, tgt;
    const fwd = c.vx * Math.sin(c.h) + c.vz * Math.cos(c.h);
    if (pts === 'van') { const v = j.truck; if (!v) return false; const a = v.local(0, -9); x = a.x; z = a.z; const d = Math.hypot(v.x - c.x, v.z - c.z); tgt = d > 30 ? 16 : d > 14 ? v.speed + 2 : Math.max(0, v.speed - 2); }
    else { [x, z] = pts[Math.min(i, pts.length - 1)]; const d = Math.hypot(x - c.x, z - c.z); if (d < 6 && i < pts.length - 1) { i++; continue; } tgt = i === pts.length - 1 ? (d > 3 ? Math.min(vmax || 16, d * 0.6) : 0) : vmax || 16; }
    const want = Math.atan2(x - c.x, z - c.z), err = Math.atan2(Math.sin(want - c.h), Math.cos(want - c.h));
    if (pts !== 'van' && Math.abs(err) > 0.5) tgt = Math.min(tgt, 7);
    g.step(1 / 60, Object.assign(''' + I0 + ''', { analog: false, throttleAxis: null, steerAxis: null, moveY: fwd < tgt ? 0.9 : fwd > tgt + 1.5 ? -1 : 0, moveX: Math.max(-1, Math.min(1, -err * 2)) }));
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return U(j, m, g); }'''
# walk along points at the keyboard's pace (analog off), stop at a prompt
WALK = '''([pts, sec, prompt]) => { const G = window.__gta, g = G.game, m = g.mission, p = g.player; let k = 0;
  for (let i = 0; i < Math.round(sec * 60); i++) {
    if (prompt && m.prompt === prompt) return i / 60;
    const [x, z] = pts[Math.min(k, pts.length - 1)], d = Math.hypot(x - p.x, z - p.z);
    if (d < 0.5 && k < pts.length - 1) { k++; continue; }
    g.step(1 / 60, Object.assign(''' + I0 + ''', { analog: false, camYaw: Math.atan2(x - p.x, z - p.z), moveY: d > 0.2 ? 1 : 0 }));
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return -1; }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v1_19_{name}_{tag}.png')
async def talk_through(pg, at=None):
    await frames(pg, 8)
    for _ in range(80):
        if await pg.evaluate('() => !document.getElementById("talk").hidden'):
            break
        await frames(pg, 2)
    await pg.wait_for_timeout(300)
    for i in range(20):
        if not await pg.evaluate('() => !document.getElementById("talk").hidden'):
            return i
        for a in (at or []):
            if i == a[0]:
                await pg.wait_for_timeout(a[2] if len(a) > 2 else 0)
                await shot(pg, name_g, a[1], 12)
        await pg.evaluate('() => window.__gta.nextTalk()')
        await frames(pg, 4)
        await pg.wait_for_timeout(250)
    return 20
async def press(pg):
    await pg.evaluate(STEP, [0.05, {'action': True}])
    await pg.evaluate(STEP, [0.15, None])
async def at_prompt(pg, pts, prompt, sec=12):
    t = await pg.evaluate(GO, [pts, sec, prompt, None])
    if t < 0:
        print(name_g, 'no prompt', prompt, json.dumps(await pg.evaluate(INFO2), ensure_ascii=False))
        return False
    await press(pg)
    return True

WAITJ = '''([cond, sec]) => { const G = window.__gta, g = G.game, m = g.mission, j = m.active; const U = new Function('j', 'm', 'g', 'return ' + cond);
  for (let i = 0; i < Math.round(sec * 60); i++) { if (U(j, m, g)) return true; g.step(1 / 60, Object.assign(''' + I0 + ''', { camYaw: G.view.rig.yaw })); G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return U(j, m, g); }'''
INFO3 = '''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active, p = g.player;
  return { active: j && j.id, stage: j && j.stage, prompt: m.prompt, obj: m.objective, sub: m.sub, indoor: g.indoor, where: g.indoors.where,
    x: +p.x.toFixed(1), z: +p.z.toFixed(1), gate: !!(g.gateWest && g.gateWest.open), banned: !!m.banned, disguised: j && j.disguised, caught: g.stats.forbudCaught || 0,
    found: j && j.found ? Object.keys(j.found).join(',') : null, money: g.money, done: m.done.has('forbud'), shirt: p.look.shirt }; })()'''


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
        done = ['red', 'lasse', 'pizza', 'race', 'flag', 'samuel', 'overlamning', 'cykel', 'livs', 'nycklar', 'kassaskap', 'verkstad', 'konditori', 'syltburken', 'fabriken',
                'cykelretur', 'hemleverans', 'bullfest', 'konsert', 'cykelgomman', 'cyklarhem', 'birger', 'ebbe', 'utsikten', 'skattjakt', 'flaskpost', 'guldbullen', 'skatbo', 'kaffe', 'bageri', 'sjuby', 'salong', 'kyrkkaffe', 'moss']
        save = {'v': 2, 'money': 45200, 'done': done, 'known': [d for d in done if d != 'red'] + ['forbud'], 'seen': [d for d in done if d != 'red'], 'stats': {'secrets': ['phone', 'skate'], 'sjuby': {'at': 5}, 'sjubyLeft': 9}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='body.nophone #phone { visibility: hidden !important; }')
        await pg.evaluate("() => document.body.classList.add('nophone')")
        FB = await pg.evaluate("import('./src/forbud.js').then((s) => s.FORBUD)")
        KO = await pg.evaluate("import('./src/kexkontor.js').then((s) => ({ K: s.KONTOR, D: s.KONTOR_DOOR }))")
        SA = await pg.evaluate("import('./src/salon.js').then((s) => s.SALON)")
        K, KD = KO['K'], KO['D']
        steps = {}
        # ---------------- the reception on the quay
        await pg.evaluate("() => window.__gta.game.mission.accept('forbud')")
        await pg.evaluate(STEP, [1.0, None])
        await pg.evaluate(TO, [-306.0, 44.0, -1.6])
        await pg.evaluate(CAM, [-303.0, 6.2, 36.0, -320.0, 2.6, 56.0, 58])
        await shot(pg, name, '01_kajen', 30)
        await pg.evaluate(CAM, [0, 0, 0, 0, 0, 0, 0])
        t = await pg.evaluate(GO, [[[FB['mark']['x'], FB['mark']['z']]], 12, None, 'intro'])
        steps['starts'] = t >= 0
        await talk_through(pg, [[0, '02_mottagning', 200], [11, '03_forbud', 200]])
        await pg.evaluate(STEP, [2.0, None])
        i = await pg.evaluate(INFO3)
        steps['banned'] = i['stage'] == 'banned' and i['banned'] and not i['gate']
        print(name, 'after the reception', json.dumps(i, ensure_ascii=False))
        await pg.evaluate(STEP, [4.0, None])
        # the poster and Yngve at the barrier
        await pg.evaluate(TO, [-171.5, -40.8, -1.75])
        await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate(CAM, [-166.2, 2.0, -40.4, -177.0, 1.4, -40.3, 52])
        await shot(pg, name, '04_lappen', 24)
        await pg.evaluate(CAM, [0, 0, 0, 0, 0, 0, 0])
        # ---------------- Vera's disguise
        await pg.evaluate(TO, [22.0, 32.4, 0])
        await pg.evaluate(STEP, [0.3, None])
        steps['salon_in'] = (await pg.evaluate(INFO3))['prompt'] == 'GÅ IN'
        await press(pg)
        await pg.evaluate(STEP, [1.8, None])
        vera = await pg.evaluate("(() => { const v = window.__gta.game.mission.active.vera; return v ? [v.x, v.z] : null; })()")
        steps['vera'] = (await at_prompt(pg, [[vera[0] - 1.0, vera[1] + 0.2]], 'PRATA')) if vera else False
        await talk_through(pg, [[4, '05_forklad', 400]])
        i = await pg.evaluate(INFO3)
        steps['disguised'] = i['stage'] == 'gate' and bool(i['disguised'])
        await pg.evaluate(TO, [SA['door']['x'], SA['door']['z'], 0])
        await pg.evaluate(STEP, [0.2, None])
        await press(pg)
        await pg.evaluate(STEP, [1.8, None])
        # ---------------- the barrier: Yngve lets the night shift in
        y = await pg.evaluate("(() => { const y = window.__gta.game.mission.forbudGuard; return [y.x, y.z]; })()")
        await pg.evaluate(TO, [y[0] + 1.6, y[1] + 0.5, -1.6])
        await pg.evaluate(STEP, [0.3, None])
        steps['yngve'] = (await pg.evaluate(INFO3))['prompt'] == 'PRATA'
        await press(pg)
        await talk_through(pg)
        await pg.evaluate(STEP, [0.5, None])
        i = await pg.evaluate(INFO3)
        steps['island'] = i['stage'] == 'island' and i['gate']
        # ---------------- the yard: sneak past Gösta, Kerstin and Rolf
        await pg.evaluate(TO, [-262.0, -44.5, -1.57])
        await pg.evaluate(STEP, [0.5, None])
        G = "j.guards.find((G) => G.def.id === '%s')"
        await pg.evaluate(WAITJ, [f"({G % 'gosta'}).mode === 'read' && ({G % 'gosta'}).t > 4.6", 30])
        await pg.evaluate(WALK, [[[-278, -45.5], [-292, -46.4]], 8, None])
        await pg.evaluate(CAM, [-340.0, 22.0, -8.0, -308.0, 0.0, -33.0, 62])
        await shot(pg, name, '06_vakterna', 24)
        await pg.evaluate(CAM, [0, 0, 0, 0, 0, 0, 0])
        await pg.evaluate(WALK, [[[-300, -46.8], [-316, -48.6], [-322, -48.6]], 12, None])
        await pg.evaluate(WAITJ, [f"({G % 'kerstin'}).mode === 'walk' && ({G % 'kerstin'}).leg === 0 && ({G % 'kerstin'}).ped.x > -312", 60])
        await pg.evaluate(WALK, [[[-328.6, -42], [-328.6, -31], [-327.6, -29.6]], 12, None])
        await pg.evaluate(WAITJ, [f"({G % 'rolf'}).mode === 'walk' && ({G % 'rolf'}).leg === 0 && ({G % 'rolf'}).ped.x > -318", 60])
        await shot(pg, name, '07_smyg', 16)
        t = await pg.evaluate(WALK, [[[-329.0, -27.0], [KD['x'], KD['z']]], 12, 'GÅ IN'])
        i = await pg.evaluate(INFO3)
        steps['unseen'] = t >= 0 and i['caught'] == 0
        print(name, 'at the office door', json.dumps(i, ensure_ascii=False))
        await press(pg)
        await pg.evaluate(STEP, [1.8, None])
        # ---------------- the office
        i = await pg.evaluate(INFO3)
        steps['office'] = bool(i['indoor']) and i['where'] == 'kontor'
        await shot(pg, name, '08_kontoret', 20)
        for sid in ['desk', 'model', 'chest', 'photo']:
            S = K['spots'][sid]
            ok = await at_prompt(pg, [[S['x'], S['z']]], 'UNDERSÖK')
            steps['spot_' + sid] = ok
            await talk_through(pg, [[1, '09_fotot', 500]] if sid == 'photo' else None)
            await pg.evaluate(STEP, [0.4, None])
        await pg.evaluate(STEP, [3.4, None])
        await talk_through(pg, [[4, '10_ragnhild', 300]])
        await pg.evaluate(STEP, [1.0, None])
        i = await pg.evaluate(INFO3)
        steps['done'] = i['done'] and i['money'] == 45200 + FB['pay']
        print(name, 'done', json.dumps(i, ensure_ascii=False))
        await pg.evaluate(STEP, [2.0, None])
        await shot(pg, name, '11_klart', 20)
        print(name, json.dumps(steps))
        print('logs', logs)
        if all(steps.values()):
            print('V1_19 ok')
        await b.close()

name_g = ''
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
