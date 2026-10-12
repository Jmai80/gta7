# v1.14 walkthrough: the main quest's part 14 "Den gyllene bullen" – Sjuby Konditori from the inside (Gun, Dahlgren
# baking, the jars, the mortar, the stone oven, the tasting, the photo from 1985), the gnome on Norrholmen, the
# magpie with the golden bun in the spruces, the bun championship on the square, the trophy back on its shelf –
# and the two side quests "Ankorna i dammen" (the fountain, Yasmin, the pier's net, the car wash, the pond) and
# "Odjurets bild" (Nova on the quay, the viewfinder at the end of the pier, the monster and a log).
# Usage: python3 test/browser/v1_14.py phone|land|desk (shots: test/shots/v1_14_*)
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
    guld: m.done.has('guldbullen'), ankor: m.done.has('ankor'), odjuret: m.done.has('odjuret'), secrets: (g.stats.secrets || []).join(',') }; })()'''
# run after the magpie: at it while it sits, after it while it flies (the camera follows)
MAGPIE = '''([sec, shotAt]) => { const G = window.__gta, g = G.game, m = g.mission, j = m.active, p = g.player;
  const inp = Object.assign(''' + I0 + ''', {});
  for (let i = 0; i < Math.round(sec * 60) && (j.stage === 'magpie' || j.stage === 'stone'); i++) {
    const B = j.magpie, T = j.stage === 'stone' ? { x: B.x, z: B.z } : B.state === 'fly' ? B.to : B;
    const d = Math.hypot(T.x - p.x, T.z - p.z);
    inp.camYaw = Math.atan2(T.x - p.x, T.z - p.z); inp.moveY = d > 1.2 ? 0.8 : 0;
    g.step(1 / 60, inp);
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world);
    if (shotAt != null && B.flights >= shotAt && B.state === 'sit' && B.t > 0.3) return 'sit';
  }
  return j.stage; }'''
# the camera on the pier: wait for a surfacing of the right kind and height, then FOTA (or just wait for it)
SHOOT = '''([kind, minUp, press, sec]) => { const G = window.__gta, g = G.game, m = g.mission, j = m.active;
  for (let i = 0; i < Math.round(sec * 60) && j.stage === 'shoot'; i++) {
    const P = g.monsterPose, ok = P && P.kind === kind && P.up >= minUp && !(kind === 'odjur' && j.surf.shot);
    g.step(1 / 60, Object.assign(''' + I0 + ''', { action: !!(ok && press) }));
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world);
    if (ok) return true;
  }
  return false; }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v1_14_{name}_{tag}.png')
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
        done = ['red', 'lasse', 'pizza', 'race', 'flag', 'samuel', 'overlamning', 'cykel', 'livs', 'nycklar', 'kassaskap', 'verkstad', 'konditori', 'syltburken', 'fabriken',
                'cykelretur', 'hemleverans', 'bullfest', 'konsert', 'cykelgomman', 'birger', 'ebbe', 'utsikten', 'skattjakt', 'flaskpost']
        if SIDE:
            done = done + ['guldbullen']
        save = {'v': 2, 'money': 12400, 'done': done, 'known': [d for d in done if d != 'red'] + ['guldbullen', 'ankor', 'odjuret'], 'seen': [d for d in done if d != 'red'], 'stats': {}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='body.nophone #phone { visibility: hidden !important; }')
        await pg.evaluate("() => document.body.classList.add('nophone')")
        KO = await pg.evaluate("import('./src/konditori.js').then((s) => ({ K: s.KOND, J: s.JARS, door: s.KOND_DOOR }))")
        GU = await pg.evaluate("import('./src/guldbullen.js').then((s) => ({ G: s.GULD, order: s.ORDER }))")
        AN = await pg.evaluate("import('./src/ankor.js').then((s) => s.ANKOR)")
        OD = await pg.evaluate("import('./src/odjuret.js').then((s) => s.ODJUR)")
        K, G = KO['K'], GU['G']
        JAR = {j['id']: j for j in KO['J']}
        x0, z0 = K['room']['x0'], K['room']['z0']
        BEHIND = [[x0 + 9.4, z0 + 2.6], [x0 + 9.4, z0 + 5.0]]   # round the east end of the counter, into the bakery
        steps = {}
        if not SIDE:
            # ---------------- 1. Den gyllene bullen: the konditori
            await pg.evaluate(TO, [KO['door']['x'] + 1.5, KO['door']['z'] - 9, 0])
            await pg.evaluate(STEP, [0.5, None])
            await shot(pg, name, '01_konditori_door')
            await pg.evaluate("() => window.__gta.game.mission.accept('guldbullen')")
            t = await pg.evaluate(GO, [[[G['mark']['x'], G['mark']['z']]], 12, None, 'intro'])
            steps['enter'] = t >= 0
            await pg.evaluate(STEP, [1.2, None])
            await talk_through(pg, at=[(1, '02_dahlgren_bakes', 300)])
            await pg.evaluate(STEP, [0.6, None])
            await pg.evaluate(GO, [BEHIND, 10, None, None])
            await shot(pg, name, '03_bakery', 6)
            ok = True
            for i, iid in enumerate(GU['order']):
                if iid == 'kardemumma':
                    ok = ok and await at_prompt(pg, [[K['mortar']['x'], K['mortar']['z']]], 'STÖT')
                    for _ in range(G['pound'] - 1):
                        await press(pg)
                        if _ == 2:
                            await shot(pg, name, '05_mortar', 2)
                else:
                    ok = ok and await at_prompt(pg, [[JAR[iid]['x'], JAR[iid]['z']]], JAR[iid]['label'])
                    if i == 1:
                        await shot(pg, name, '04_jars', 4)
                ok = ok and await at_prompt(pg, [[K['give']['x'], K['give']['z']]], 'GE')
                await pg.evaluate(STEP, [1.8, None])
            i1 = await pg.evaluate(INFO)
            steps['bake'] = ok and i1['stage'] in ('knead', 'tray')
            await pg.evaluate(STEP, [G['knead'] + 0.3, None])
            ok = await at_prompt(pg, [[K['give']['x'], K['give']['z']]], 'PLÅTEN')
            ok = ok and await at_prompt(pg, [[K['oven']['x'], K['oven']['z']]], 'IN I UGNEN')
            await pg.evaluate(STEP, [G['ready'] + 0.4, None])
            await shot(pg, name, '06_oven', 4)
            ok = ok and await at_prompt(pg, [[K['oven']['x'], K['oven']['z']]], 'TA UT')
            ok = ok and await at_prompt(pg, [[K['serve']['x'], K['serve']['z']]], 'BJUD')
            steps['oven'] = ok
            await pg.evaluate(STEP, [1.0, None])
            await talk_through(pg, at=[(1, '07_taste', 300)])
            await pg.evaluate(STEP, [0.4, None])
            ok = await at_prompt(pg, [[x0 + 9.4, z0 + 5.0], [x0 + 9.4, z0 + 2.6], [K['photo']['x'], K['photo']['z']]], 'TITTA', 20)
            await pg.evaluate(STEP, [0.8, None])
            await talk_through(pg, at=[(0, '08_photo', 400), (6, '09_confession', 300)])
            steps['photo'] = ok and (await pg.evaluate(INFO))['stage'] == 'gnome'
            await at_prompt(pg, [[K['door']['x'], K['door']['z'] + 0.6], [K['door']['x'], K['door']['z']]], 'GÅ UT', 14)
            await pg.evaluate(STEP, [1.6, None])
            # the gnome by the allotments
            N = G['gnome']
            await pg.evaluate(TO, [N['x'] + 5, N['z'] + 2, -1.9])
            await pg.evaluate(STEP, [0.6, None])
            ok = await at_prompt(pg, [[N['x'], N['z']]], 'UNDERSÖK')
            await pg.evaluate(STEP, [0.6, None])
            await talk_through(pg, at=[(1, '10_gnome', 300), (2, '11_note', 300)])
            await pg.evaluate(STEP, [1.6, None])
            steps['gnome'] = ok and (await pg.evaluate(INFO))['stage'] == 'stone'
            # the spruces: the magpie by the stone, and after it
            S = G['stone']
            await pg.evaluate(TO, [S['x'] - 2, S['z'] + 22, math.pi])
            await pg.evaluate(STEP, [0.8, None])
            await pg.evaluate(GO, [[[S['x'] - 1, S['z'] + 17]], 6, None, None])
            await shot(pg, name, '12_stone', 6)
            r = await pg.evaluate(MAGPIE, [20, 2])
            await shot(pg, name, '13_magpie', 2)
            r = await pg.evaluate(MAGPIE, [150, None])
            steps['magpie'] = r == 'pick'
            await pg.evaluate(STEP, [0.8, None])
            await shot(pg, name, '14_dropped', 4)
            bun = await pg.evaluate("() => window.__gta.game.mission.active.bunAt")
            ok = await at_prompt(pg, [[bun['x'] + 0.6, bun['z']]], 'TA')
            await pg.evaluate(STEP, [0.6, None])
            await talk_through(pg, at=[(1, '15_trophy', 300)])
            await pg.evaluate(STEP, [3.0, None])
            steps['bun'] = ok and (await pg.evaluate(INFO))['stage'] == 'fest'
            # the championship on the square
            F = G['fest']
            await pg.evaluate(TO, [F['mark']['x'] + 2, F['mark']['z'] - 12, 0])
            await pg.evaluate(STEP, [0.6, None])
            await shot(pg, name, '16_square', 6)
            t = await pg.evaluate(GO, [[[F['mark']['x'], F['mark']['z']]], 14, None, 'festTalk'])
            await pg.evaluate(STEP, [1.0, None])
            await talk_through(pg, at=[(4, '17_judges', 300)])
            await pg.evaluate(STEP, [0.4, None])
            ok = t >= 0
            sb, sd = F['stands'][0], F['stands'][1]
            ok = ok and await at_prompt(pg, [[sb['taste']['x'], sb['taste']['z']]], 'SMAKA', 14)
            await pg.evaluate(STEP, [0.4, None])
            await shot(pg, name, '18_taste', 4)
            ok = ok and await at_prompt(pg, [[sd['taste']['x'], sd['taste']['z']]], 'SMAKA', 18)
            await pg.evaluate(STEP, [0.3, None])
            ok = ok and await at_prompt(pg, [[sd['taste']['x'], sd['taste']['z']]], 'RÖSTA', 4)
            await pg.evaluate(STEP, [1.0, None])
            await talk_through(pg, at=[(3, '19_trophy_to_gun', 300)])
            await pg.evaluate(STEP, [1.5, None])
            i2 = await pg.evaluate(INFO)
            steps['fest'] = ok and i2['guld']
            print(name, 'guld money', i2['money'], i2['secrets'])
            # the konditori now: the trophy on its shelf
            await pg.evaluate(STEP, [16, None])
            await frames(pg, 6)
            steps['endcard'] = await pg.evaluate('() => !document.getElementById("endcard").hidden')
            await shot(pg, name, '19b_endcard', 4)
            await pg.evaluate('window.__gta.resume()')
            await pg.evaluate(TO, [KO['door']['x'], KO['door']['z'] - 3, math.pi])
            await pg.evaluate(STEP, [0.4, None])
            ok = await at_prompt(pg, [[KO['door']['x'], KO['door']['z']]], 'GÅ IN', 8)
            await pg.evaluate(STEP, [1.4, None])
            await pg.evaluate(GO, [[[x0 + 1.4, z0 + 2.4]], 8, None, None])
            await pg.evaluate(TO, [x0 + 1.9, z0 + 2.2, -math.pi / 2])
            await pg.evaluate("([x, y, z]) => { window.__gta.game.camFocus = { x, y, z, owner: 'test', cam: { x: x + 2.4, y: y + 0.5, z: z - 1.0, fov: 50 } }; }", [K['shelf']['x'], K['shelf']['y'] + 0.1, K['shelf']['z'] - 0.6])
            await pg.evaluate(STEP, [0.5, None])
            await shot(pg, name, '20_shelf', 8)
            await pg.evaluate("() => { window.__gta.game.camFocus = null; }")
            steps['shelf'] = ok and (await pg.evaluate(INFO))['where'] == 'konditori'
            await at_prompt(pg, [[K['door']['x'], K['door']['z'] + 0.5], [K['door']['x'], K['door']['z']]], 'GÅ UT', 14)
            await pg.evaluate(STEP, [1.6, None])
        # ---------------- 2. Ankorna i dammen
        await pg.evaluate(TO, [AN['mark']['x'] - 3, AN['mark']['z'] + 12, math.pi])
        await pg.evaluate(STEP, [1.0, None])
        await pg.evaluate("() => window.__gta.game.mission.accept('ankor')")
        t = await pg.evaluate(GO, [[[AN['mark']['x'], AN['mark']['z']]], 14, None, 'intro'])
        await pg.evaluate(STEP, [0.8, None])
        await talk_through(pg, at=[(0, '21_ebbe', 300)])
        await pg.evaluate(STEP, [0.6, None])
        steps['ankor_start'] = t >= 0
        fz = await pg.evaluate("() => window.__gta.game.layout.zones.fountain")
        fx, fzz = fz['x'] + 0.6 * 5.05, fz['z'] + 0.8 * 5.05
        await pg.evaluate(TO, [fx + 3, fzz + 5, math.pi + 0.5])
        await pg.evaluate(STEP, [0.6, None])
        ok = await at_prompt(pg, [[fx, fzz]], 'TA')
        await shot(pg, name, '22_fountain', 4)
        Y = AN['yasmin']
        await pg.evaluate(TO, [Y['x'] + 7, Y['z'] + 0.5, -math.pi / 2])
        await pg.evaluate(STEP, [0.6, None])
        await shot(pg, name, '23_yasmin', 6)
        ok = ok and await at_prompt(pg, [[Y['x'] + 1.0, Y['z']]], 'PRATA')
        await talk_through(pg)
        Ne = AN['net']['end']
        await pg.evaluate(TO, [Ne['x'], Ne['z'] + 6, math.pi])
        await pg.evaluate(STEP, [0.5, None])
        ok = ok and await pg.evaluate(GO, [[[Ne['x'], Ne['z'] + 4], [Ne['x'], Ne['z']]], 10, 'HÅVA', None]) >= 0
        for _ in range(60 * 20):
            close = await pg.evaluate("() => { const j = window.__gta.game.mission.active; return j.netClose && window.__gta.game.mission.prompt === 'HÅVA'; }")
            if close:
                break
            await pg.evaluate(STEP, [0.1, None])
        await press(pg)                                  # (at once: the real game loop runs on while a picture is taken)
        await shot(pg, name, '24_pier_net', 2)
        Wd = AN['wash']
        await pg.evaluate(TO, [Wd['drop']['x'] + 3, Wd['drop']['z'] + 3, -2.3])
        await pg.evaluate(STEP, [0.5, None])
        await shot(pg, name, '25_carwash', 6)
        # a car through the wash
        await pg.evaluate('''([x, z]) => { const g = window.__gta.game, p = g.player; const car = g.vehicles.filter((v) => !v.spec.bike && !v.dead && v.driver !== 'ai').sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
          p.x = car.x + 1.6; p.z = car.z; p.y = g.world.groundHeight(p.x, p.z); return true; }''', [Wd['drop']['x'], Wd['drop']['z']])
        await press(pg)
        await pg.evaluate(STEP, [1.2, None])
        await pg.evaluate('''() => { const g = window.__gta.game, p = g.player, c = p.car; if (!c) return; c.x = 101; c.z = -8; c.h = Math.PI / 2; c.vx = c.vz = 0; c.y = g.world.groundHeight(c.x, c.z); }''')
        await pg.evaluate(STEP, [3.4, None])
        await pg.evaluate("() => { const p = window.__gta.game.player; if (p.inCar) p.exitCar(); }")
        await pg.evaluate(STEP, [1.0, None])
        ok = ok and await at_prompt(pg, [[Wd['drop']['x'], Wd['drop']['z']]], 'TA', 10)
        R = AN['release']
        await pg.evaluate(TO, [R['x'] - 2, R['z'] + 6, math.pi])
        await pg.evaluate(STEP, [0.4, None])
        ok = ok and await at_prompt(pg, [[R['x'], R['z']]], 'SLÄPP')
        await pg.evaluate(STEP, [1.8, None])
        await talk_through(pg, at=[(0, '26_ducks_home', 300)])
        await pg.evaluate(STEP, [1.5, None])
        i3 = await pg.evaluate(INFO)
        steps['ankor'] = ok and i3['ankor']
        await shot(pg, name, '27_pond', 6)
        # ---------------- 3. Odjurets bild
        await pg.evaluate("() => window.__gta.game.mission.accept('odjuret')")
        await pg.evaluate(TO, [OD['mark']['x'] + 2, OD['mark']['z'] + 10, math.pi])
        await pg.evaluate(STEP, [1.0, None])
        t = await pg.evaluate(GO, [[[OD['mark']['x'], OD['mark']['z']]], 14, None, 'intro'])
        await pg.evaluate(STEP, [0.6, None])
        await talk_through(pg, at=[(3, '28_nova', 300)])
        ok = t >= 0 and await at_prompt(pg, [[OD['end']['x'], OD['end']['z']]], 'SIKTA', 40)
        await pg.evaluate(STEP, [0.6, None])
        await pg.evaluate(SHOOT, ['stock', 0.9, False, 60])
        await shot(pg, name, '29_log', 1)
        await pg.evaluate(SHOOT, ['odjur', 0.98, False, 60])
        await shot(pg, name, '30_monster', 1)
        for _ in range(3):
            await pg.evaluate(SHOOT, ['odjur', 0.98, True, 60])
            if _ == 0:
                await shot(pg, name, '31_snap', 2)
        await pg.evaluate(STEP, [1.8, None])
        i4 = await pg.evaluate(INFO)
        steps['photos'] = ok and i4['stage'] == 'back'
        nv = await pg.evaluate("() => { const N = window.__gta.game.mission.odjurNova; return { x: N.x, z: N.z }; }")
        await pg.evaluate(TO, [nv['x'] + 0.5, nv['z'] - 5, 0])
        await pg.evaluate(STEP, [0.4, None])
        ok = await at_prompt(pg, [[nv['x'] + 1.2, nv['z']]], 'PRATA', 10)
        await talk_through(pg, at=[(2, '32_nova_photos', 300)])
        await pg.evaluate(STEP, [1.5, None])
        i5 = await pg.evaluate(INFO)
        steps['odjuret'] = ok and i5['odjuret']
        print(name, 'steps', json.dumps(steps), 'money', i5['money'], i5['secrets'])
        ok = all(steps.values())
        print(name, 'V1_14', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
name_g = ''
SIDE = len(sys.argv) > 2 and sys.argv[2] == 'side'   # (only the two side quests: quicker)
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
