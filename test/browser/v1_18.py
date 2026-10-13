# v1.18 walkthrough: "Sjubydagen", the last part of the first chapter – the square with Gun, Knäck's stand and Arne's
# recipe in the window; Signe's bunting, Folke's harmonium and Måns under Ronny's van among the houses by the chapel;
# the bell, the chase after Kexfabriken's van over the west bridge to Västerholmen; Kexfabriken's hall, the biscuit
# line and its emergency stop; the evening on the square, Arne's last line, the fireworks, the credits and the ship.
# Usage: python3 test/browser/v1_18.py phone|land|desk (shots: test/shots/v1_18_*)
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
    await pg.screenshot(path=f'test/shots/v1_18_{name}_{tag}.png')
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
                'cykelretur', 'hemleverans', 'bullfest', 'konsert', 'cykelgomman', 'cyklarhem', 'birger', 'ebbe', 'utsikten', 'skattjakt', 'flaskpost', 'guldbullen', 'skatbo', 'kaffe', 'bageri', 'salong', 'kyrkkaffe', 'moss']
        save = {'v': 2, 'money': 35200, 'done': done, 'known': [d for d in done if d != 'red'] + ['sjuby'], 'seen': [d for d in done if d != 'red'], 'stats': {'secrets': ['phone', 'skate'], 'phoneLast': True, 'skateNova': True, 'bageriKnots': 12}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='body.nophone #phone { visibility: hidden !important; }')
        await pg.evaluate("() => document.body.classList.add('nophone')")
        SJ = await pg.evaluate("import('./src/sjubydagen.js').then((s) => s.SJUBY)")
        FB = await pg.evaluate("import('./src/kexhall.js').then((s) => ({ F: s.FAB, D: s.FAB_DOOR }))")
        SH = await pg.evaluate("import('./src/vedbod.js').then((s) => ({ S: s.SHED, D: s.SHED_DOOR }))")
        F, FD = FB['F'], FB['D']
        steps = {}
        # ---------------- the square: Gun, Knäck's stand, the recipe in the window
        await pg.evaluate(TO, [40, -70, math.pi])
        await pg.evaluate("() => window.__gta.game.mission.accept('sjuby')")
        await pg.evaluate(STEP, [1.0, None])
        await pg.evaluate(TO, [-1.5, 8.0, -1.9])
        await pg.evaluate(CAM, [16.0, 6.5, 15.5, -8.0, 1.6, 8.0, 60])
        await shot(pg, name, '01_torget', 24)
        await pg.evaluate(CAM, [0, 0, 0, 0, 0, 0, 0])
        t = await pg.evaluate(GO, [[[SJ['mark']['x'], SJ['mark']['z']]], 12, None, 'intro'])
        steps['intro'] = t >= 0
        await pg.evaluate(STEP, [1.2, None])
        await talk_through(pg, at=[(0, '02_gun', 300), (3, '03_knack', 200)])
        await pg.evaluate(STEP, [0.4, None])
        # ---------------- Söderholmen: the houses by the chapel
        await pg.evaluate(TO, [-45, 200, math.pi])
        await pg.evaluate(STEP, [1.0, None])
        await pg.evaluate(TO, [-62.4, 257.5, 0])
        ok = await at_prompt(pg, [[SJ['talk']['signe']['x'], SJ['talk']['signe']['z']]], 'PRATA', 20)
        await pg.evaluate(STEP, [0.5, None])
        await talk_through(pg, at=[(0, '04_signe', 300)])
        ok = ok and await at_prompt(pg, [[-63, 266.5], [-72, 267.5], [-78.45, 263.6], [SH['D']['x'], SH['D']['z']]], 'GÅ IN', 30)
        await pg.evaluate(STEP, [1.8, None])
        ok = ok and await at_prompt(pg, [[SJ['box']['x'], SJ['box']['z']]], 'TA', 8)
        await shot(pg, name, '05_vedboden', 8)
        ok = ok and await at_prompt(pg, [[SH['S']['door']['x'], SH['S']['door']['z']]], 'GÅ UT', 8)
        await pg.evaluate(STEP, [1.8, None])
        for k in (1, 0, 2):   # (walking up the lane from Signe's you pass the second pole first)
            P = SJ['poles'][k]
            ok = ok and await at_prompt(pg, [[-72, 267.6], [-63, 266.6], [-62.6, 256], [P['x'] - 0.5, P['z']]] if k == 1 else [[P['x'] - 0.5, P['z']]], 'HÄNG UPP', 30)
        steps['vimplar'] = ok
        if os.environ.get('STOP') == 'vimplar':
            print(name, 'steps', json.dumps(steps)); await b.close(); return
        await pg.evaluate(STEP, [0.5, None])
        await pg.evaluate(CAM, [-55.0, 6.5, 228.0, -62.0, 2.0, 245.0, 58])
        await shot(pg, name, '06_vimplar', 16)
        await pg.evaluate(CAM, [0, 0, 0, 0, 0, 0, 0])
        await pg.evaluate(TO, [-60.2, 230.0, -1.2])
        ok = await at_prompt(pg, [[SJ['talk']['folke']['x'], SJ['talk']['folke']['z']]], 'PRATA', 30)
        await pg.evaluate(STEP, [0.5, None])
        await talk_through(pg)
        ok = ok and await at_prompt(pg, [[-63.4, 231.5], [SJ['organ']['x'] + 0.4, SJ['organ']['z']]], 'BÄR', 20)
        t = await pg.evaluate(GO, [[[-63.4, 231.5], [-60.5, 231.5], [SJ['organTo']['x'], SJ['organTo']['z']]], 7, 'SÄTT NER', None])
        await shot(pg, name, '07_orgeln', 4)
        ok = ok and await at_prompt(pg, [[-60.5, 231.5], [SJ['organTo']['x'], SJ['organTo']['z']]], 'SÄTT NER', 30)
        steps['orgel'] = ok
        await pg.evaluate(TO, [-62.4, 244.5, 0])
        ok = await at_prompt(pg, [[SJ['talk']['elsa']['x'], SJ['talk']['elsa']['z']]], 'PRATA', 40)
        await pg.evaluate(STEP, [0.5, None])
        await talk_through(pg)
        R = await pg.evaluate("() => { const r = window.__gta.game.mission.active.ronny; return [r.x, r.z]; }")
        await pg.evaluate(CAM, [-36.4, 1.9, 208.6, -38.6, 1.4, 214.0, 50])
        await shot(pg, name, '08a_kexbil', 20)
        await pg.evaluate(CAM, [0, 0, 0, 0, 0, 0, 0])
        ok = ok and await at_prompt(pg, [[-62.6, 236], [-58, 228], [R[0], R[1] + 1]], 'PRATA', 40)
        await pg.evaluate(STEP, [0.5, None])
        await talk_through(pg, at=[(0, '08_ronny', 300)])
        C = await pg.evaluate("() => { const c = window.__gta.game.mission.active.cat; return [c.x, c.z]; }")
        ok = ok and await at_prompt(pg, [[C[0] - 1.6, C[1] + 1.8]], 'LOCKA', 20)
        await pg.evaluate(STEP, [1.6, None])
        await pg.evaluate(CAM, [-41.0, 3.2, 221.0, -50.0, 0.4, 226.0, 56])
        await shot(pg, name, '09_mans', 6)
        await pg.evaluate(CAM, [0, 0, 0, 0, 0, 0, 0])
        await pg.evaluate(STEP, [12, None])
        steps['mans'] = ok and (await pg.evaluate(INFO2))['stage'] == 'gather'
        # ---------------- twelve o'clock: the bell
        t = await pg.evaluate(GO, [[[SJ['bell']['x'], SJ['bell']['z']]], 30, None, 'bellTalk'])
        await pg.evaluate(STEP, [1.2, None])
        await talk_through(pg, at=[(1, '10_klockan', 600), (8, '11_ingvar', 300)])
        steps['bell'] = t >= 0 and (await pg.evaluate(INFO2))['stage'] == 'chase'
        # ---------------- the chase: the Spider, Kungsgatan, Storgatan, the west bridge
        sp = await pg.evaluate("() => { const s = window.__gta.game.spider; return [s.x, s.z, s.h]; }")
        await pg.evaluate(TO, [sp[0] - math.cos(sp[2]) * 1.6, sp[1] + math.sin(sp[2]) * 1.6, None])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [1.2, None])
        ok = await pg.evaluate(DRIVE2, [[[-45, 205], [-40, 198], [-40, 175], [-40, 140], [-37.5, 100], [-37.5, 50]], 90, 'j.moving', 16])
        ok = ok and await pg.evaluate(DRIVE2, ['van', 60, 'j.truck.z < -38 && j.truck.x < -60', 0])
        await shot(pg, name, '12_storgatan', 4)
        ok = ok and await pg.evaluate(DRIVE2, ['van', 60, 'j.gateOpen && j.truck.x < -182', 0])
        await shot(pg, name, '13_bron', 4)
        ok = ok and await pg.evaluate(DRIVE2, ['van', 90, "j.stage !== 'chase'", 0])
        steps['chase'] = ok
        print(name, 'chase', json.dumps(await pg.evaluate(INFO2), ensure_ascii=False))
        await pg.evaluate(STEP, [0.3, {'action': True}])
        await pg.evaluate(STEP, [1.2, None])
        await shot(pg, name, '14_kexfabriken', 10)
        # ---------------- Kexfabriken: Ronny, the hall, the belt
        R = await pg.evaluate("() => { const r = window.__gta.game.mission.active.ronny; return [r.x, r.z]; }")
        ok = await at_prompt(pg, [[R[0] + 1.2, R[1] + 0.4]], 'PRATA', 20)
        await pg.evaluate(STEP, [0.5, None])
        await talk_through(pg, at=[(0, '15_ronny', 300)])
        ok = ok and await at_prompt(pg, [[FD['x'] + 1.4, FD['z'] + 0.6], [FD['x'], FD['z']]], 'GÅ IN', 20)
        await pg.evaluate(STEP, [1.8, None])
        await talk_through(pg, at=[(3, '16_knack', 300)])
        Xo, Zo = F['room']['x0'], F['room']['z0']
        await pg.evaluate(STEP, [3.0, None])
        await shot(pg, name, '17_bandet', 2)
        t = await pg.evaluate(WALK, [[[Xo + 27.2, Zo + 10.4], [Xo + 27.2, Zo + 17.2], [Xo + 17, Zo + 17.2], [Xo + 11.2, Zo + 15.4], [Xo + 8.4, Zo + 15.4], [Xo + 1.6, Zo + 15.4], [Xo + 1.4, Zo + 9.0]], 40, 'NÖDSTOPP'])
        ok = ok and t >= 0
        await press(pg)
        await shot(pg, name, '18_nodstopp', 6)
        Rp = await pg.evaluate("import('./src/kexhall.js').then((s) => { const P = s.beltAt(window.__gta.game.mission.active.recipeS); return [P.x, P.z]; })")
        ok = ok and await at_prompt(pg, [[Xo + 1.6, Zo + 15.4], [Rp[0], Zo + 15.2]], 'TA RECEPTET', 20)
        await pg.evaluate(STEP, [1.0, None])
        await talk_through(pg, at=[(1, '19_pia', 300), (5, '20_knack_fraga', 200)])
        steps['fabrik'] = ok and (await pg.evaluate(INFO2))['stage'] == 'home'
        ok = await at_prompt(pg, [[F['door']['x'] - 0.4, F['door']['z']], [F['door']['x'], F['door']['z']]], 'GÅ UT', 10)
        await pg.evaluate(STEP, [1.8, None])
        # ---------------- the evening on the square
        await pg.evaluate(TO, [25, -2, -2.4])
        await pg.evaluate(STEP, [52, None])
        await pg.evaluate(CAM, [-6.0, 9.0, -14.0, 14.0, 2.0, 8.0, 60])
        await shot(pg, name, '21_kvall', 20)
        await pg.evaluate(CAM, [0, 0, 0, 0, 0, 0, 0])
        t = await pg.evaluate(GO, [[[SJ['finale']['x'], SJ['finale']['z']]], 20, None, 'finaleTalk'])
        await pg.evaluate(STEP, [1.2, None])
        await talk_through(pg, at=[(1, '22_gun_scen', 400), (3, '23_arne', 300)])
        steps['finale'] = t >= 0
        # ---------------- the show: fireworks, credits, the flight to Västerholmen, the ship (paused between the shots,
        # so the real game loop does not run ahead of them)
        await pg.add_style_tag(content='#pausemenu { display: none !important; }')
        await pg.evaluate('window.__gta.pause()')
        for (at, nm) in [(4.0, '24_fyrverkeri'), (9.0, '25_fyrverkeri2'), (16.5, '26_eftertexter'), (31.0, '27_vasterut'), (43.0, '28_kapitel'), (50.5, '29_fartyget')]:
            cur = (await pg.evaluate(INFO2))['showT'] or 0
            if at > cur:
                await pg.evaluate(STEP, [at - cur, None])
            await pg.wait_for_timeout(700)
            await shot(pg, name, nm, 3)
        for _ in range(30):
            await pg.evaluate(STEP, [0.5, None])
            if await pg.evaluate('() => !document.getElementById("endcard").hidden'):
                break
        await frames(pg, 6)
        steps['endcard'] = await pg.evaluate('() => !document.getElementById("endcard").hidden')
        await shot(pg, name, '30_slutkort', 4)
        await pg.evaluate('window.__gta.resume()')
        steps['done'] = await pg.evaluate("() => window.__gta.game.mission.done.has('sjuby') && window.__gta.game.gateWest.open")
        # ---------------- afterwards: the ship at the quay on Västerholmen
        await pg.evaluate(TO, [-300, 36, math.pi * 0.85])
        await pg.evaluate(STEP, [3, None])
        await pg.evaluate(CAM, [-285.0, 9.0, 34.0, -322.0, 4.0, 62.0, 58])
        await shot(pg, name, '31_kajen', 20)
        print(name, 'steps', json.dumps(steps), 'money', await pg.evaluate('window.__gta.game.money'))
        ok = all(steps.values())
        print(name, 'V1_18', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
name_g = ''
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
