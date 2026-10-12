# v1.15 walkthrough: the main quest's part 15 "Skatans bo" – the lighthouse from the inside (Ingvar's kitchen, the
# watch room with the logbooks, the lantern), sneaking up on the magpie's nest, the four things home to Majken, Kim,
# Vera and Inga, the lamp lit and its beams over Sjuby, the end card, the phone box's last call and a free visit.
# Usage: python3 test/browser/v1_15.py phone|land|desk (shots: test/shots/v1_15_*)
# (based on the v1.14 walkthrough:)
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
    bird: j && j.bird ? j.bird.state : null, dives: j ? j.dives : null, left: j && j.left ? j.left.join(',') : null, lit: !!m.lampLit,
    skatbo: m.done.has('skatbo'), secrets: (g.stats.secrets || []).join(',') }; })()'''
# sneak up on the nest: walk while she preens (and just as she looks up), stand still otherwise; stop at TA BOET
SNEAK = '''([pts, sec, shotState]) => { const G = window.__gta, g = G.game, m = g.mission, j = m.active, p = g.player; let k = 0;
  for (let i = 0; i < Math.round(sec * 60) && j.stage === 'sneak'; i++) {
    const B = j.bird, [x, z] = pts[Math.min(k, pts.length - 1)], d = Math.hypot(x - p.x, z - p.z);
    if (shotState && B.state === shotState && B.t > 0.4 && k > 0) return shotState;
    if (m.prompt === 'TA BOET' && B.state === 'preen') return 'take';
    if (d < 0.35 && k < pts.length - 1) { k++; continue; }
    const go = B.state === 'preen' || (B.state === 'look' && B.t < 0.35);
    g.step(1 / 60, Object.assign(''' + I0 + ''', { camYaw: Math.atan2(x - p.x, z - p.z), moveY: go && d > 0.2 ? 0.55 : 0 }));
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return j.stage; }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v1_15_{name}_{tag}.png')
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

CAM = '''([cx, cy, cz, fx, fy, fz, fov]) => { const g = window.__gta.game; g.camFocus = fov ? { x: fx, y: fy, z: fz, owner: 'shot', cam: { x: cx, y: cy, z: cz, fov } } : null; }'''
async def stairs(pg, S, label):
    t = await pg.evaluate(GO, [[[S['x'], S['z']]], 10, label, None])
    if t < 0:
        print(name_g, 'no stairs', label, json.dumps(await pg.evaluate(INFO), ensure_ascii=False))
        return False
    await press(pg)
    await pg.evaluate(STEP, [0.9, None])
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
                'cykelretur', 'hemleverans', 'bullfest', 'konsert', 'cykelgomman', 'birger', 'ebbe', 'utsikten', 'skattjakt', 'flaskpost', 'guldbullen', 'salong']
        save = {'v': 2, 'money': 18400, 'done': done, 'known': [d for d in done if d != 'red'] + ['skatbo'], 'seen': [d for d in done if d != 'red'], 'stats': {'secrets': ['phone']}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='body.nophone #phone { visibility: hidden !important; }')
        await pg.evaluate("() => document.body.classList.add('nophone')")
        FY = await pg.evaluate("import('./src/fyren.js').then((s) => ({ F: s.FYR, door: s.FYR_DOOR }))")
        SK = await pg.evaluate("import('./src/skatbo.js').then((s) => ({ S: s.SKAT, owners: s.OWNERS }))")
        F, D = FY['F'], FY['door']
        St = F['stairs']
        steps = {}
        # ---------------- outside: the dark lighthouse, the nest in the lantern
        L = {'x': 113, 'z': -386}
        await pg.evaluate(TO, [D['x'] + 4, D['z'] + 9, math.pi + 0.4])
        await pg.evaluate(CAM, [L['x'] + 14, 6, L['z'] + 30, L['x'], 9.5, L['z'], 50])
        await pg.evaluate(STEP, [1.5, None])
        await shot(pg, name, '01_dark_lighthouse', 30)
        await pg.evaluate(CAM, [0, 0, 0, 0, 0, 0, 0])
        await pg.evaluate("() => window.__gta.game.mission.accept('skatbo')")
        t = await pg.evaluate(GO, [[[D['x'] + 1.0, D['z'] + 2.5], [D['x'], D['z']]], 14, None, 'intro'])
        steps['enter'] = t >= 0
        await pg.evaluate(STEP, [1.2, None])
        await talk_through(pg, at=[(1, '02_kitchen', 300), (4, '03_ingvar_magpie', 200)])
        await pg.evaluate(STEP, [0.6, None])
        ok = await stairs(pg, St[0]['up'], 'UPP')
        await shot(pg, name, '04_watch_room', 6)
        ok = ok and await stairs(pg, St[1]['up'], 'UPP')
        await pg.evaluate(STEP, [0.3, None])
        steps['climb'] = ok and (await pg.evaluate(INFO))['stage'] == 'sneak'
        x2, z2 = F['floors'][2]['x0'], F['floors'][2]['z0']
        PTS = [[x2 + 3.0, z2 + 1.95], [x2 + 6.15, z2 + 2.0], [x2 + 6.1, z2 + 4.0], [F['take']['x'], F['take']['z']]]
        await pg.evaluate(STEP, [2.0, None])
        await pg.wait_for_timeout(9000)
        r = await pg.evaluate(SNEAK, [PTS, 30, 'watch'])
        await shot(pg, name, '05_magpie_watches', 1)
        r = await pg.evaluate(SNEAK, [PTS, 60, None])
        if r == 'take':
            await press(pg)
        await pg.evaluate(STEP, [1.5, None])
        await talk_through(pg, at=[(1, '06_nest', 200)])
        i1 = await pg.evaluate(INFO)
        steps['nest'] = r == 'take' and i1['stage'] == 'read'
        ok = await stairs(pg, St[2]['down'], 'NER')
        ok = ok and await at_prompt(pg, [[F['desk']['x'], F['desk']['z']]], 'LÄS')
        await pg.evaluate(STEP, [0.7, None])
        await talk_through(pg, at=[(1, '07_logbook', 200)])
        ok = ok and await stairs(pg, St[1]['down'], 'NER')
        await shot(pg, name, '08_carry_nest', 4)
        ok = ok and await at_prompt(pg, [[F['give']['x'], F['give']['z']]], 'GE')
        await pg.evaluate(STEP, [0.7, None])
        await talk_through(pg, at=[(5, '09_elsa_earring', 300)])
        steps['elsa'] = ok and (await pg.evaluate(INFO))['stage'] == 'deliver'
        await at_prompt(pg, [[F['door']['x'], F['door']['z'] - 0.6], [F['door']['x'], F['door']['z']]], 'GÅ UT', 12)
        await pg.evaluate(STEP, [1.6, None])
        # ---------------- the four things home
        ok = True
        for O in SK['owners']:
            q = await pg.evaluate("id => { const q = window.__gta.game.mission.active.owners[id]; return q ? { x: q.x, z: q.z } : null; }", O['id'])
            if not q:
                ok = False; continue
            dx, dz = (6, 0) if O['id'] != 'inga' else (0, -7)
            await pg.evaluate(TO, [q['x'] + dx, q['z'] + dz, math.atan2(-dx, -dz)])
            await pg.evaluate(STEP, [0.5, None])
            ok = ok and await at_prompt(pg, [[q['x'] + 0.9, q['z'] + 0.2]], 'GE', 10)
            await pg.evaluate(STEP, [0.6, None])
            await talk_through(pg, at=[(1, f"10_{O['id']}", 300)] if O['id'] in ('majken', 'inga', 'kim') else None)
            await pg.evaluate(STEP, [0.4, None])
        i2 = await pg.evaluate(INFO)
        steps['deliver'] = ok and i2['stage'] == 'back'
        # ---------------- the lamp
        await pg.evaluate(TO, [D['x'] + 1.0, D['z'] + 3, math.pi])
        await pg.evaluate(STEP, [0.4, None])
        ok = await at_prompt(pg, [[D['x'], D['z']]], 'GÅ IN', 10)
        await pg.evaluate(STEP, [1.5, None])
        ok = ok and await stairs(pg, St[0]['up'], 'UPP')
        ok = ok and await stairs(pg, St[1]['up'], 'UPP')
        await pg.evaluate(STEP, [0.8, None])
        await talk_through(pg, at=[(3, '11_lantern', 300)])
        await pg.evaluate(STEP, [0.3, None])
        ok = ok and await at_prompt(pg, [[x2 + 2.4, z2 + 6.2], [F['light']['x'], F['light']['z']]], 'TÄND', 12)
        await pg.evaluate(STEP, [1.8, None])
        await shot(pg, name, '12_lit', 2)
        await talk_through(pg)
        await pg.evaluate(STEP, [2.0, None])
        await talk_through(pg, at=[(0, '13_beam', 600), (2, '14_for_elsa', 300)])
        await pg.evaluate(STEP, [1.0, None])
        i3 = await pg.evaluate(INFO)
        steps['lamp'] = ok and i3['skatbo']
        print(name, 'skatbo money', i3['money'])
        await pg.evaluate(STEP, [16, None])
        await frames(pg, 6)
        steps['endcard'] = await pg.evaluate('() => !document.getElementById("endcard").hidden')
        await shot(pg, name, '15_endcard', 4)
        await pg.evaluate('window.__gta.resume()')
        # the beam from the town: the square, looking north
        await pg.evaluate(TO, [L['x'] - 40, L['z'] + 30, math.pi * 0.75])
        await pg.evaluate(CAM, [L['x'] - 46, 7, L['z'] + 42, L['x'], 11, L['z'], 55])
        await pg.evaluate(STEP, [1.5, None])
        await shot(pg, name, '16_beam_far', 30)
        await pg.evaluate(CAM, [0, 0, 0, 0, 0, 0, 0])
        # the phone box: its last call
        PH = await pg.evaluate("import('./src/secrets.js').then((s) => s.SECRETS.find((q) => q.id === 'phone'))")
        await pg.evaluate("() => { window.__gta.game.mission.secrets.quietUntil = 0; }")
        await pg.evaluate(TO, [PH['x'] + 4, PH['z'], -math.pi / 2])
        await pg.evaluate(STEP, [0.4, None])
        ok = await at_prompt(pg, [[PH['x'], PH['z']]], 'SVARA', 8)
        await pg.evaluate(STEP, [0.5, None])
        await talk_through(pg, at=[(3, '17_last_call', 300)])
        steps['phone'] = ok and await pg.evaluate("() => !!window.__gta.game.stats.phoneLast")
        # a visit afterwards: Ingvar and Elsa at the table
        await pg.evaluate(TO, [D['x'] + 1.0, D['z'] + 3, math.pi])
        await pg.evaluate(STEP, [0.4, None])
        ok = await at_prompt(pg, [[D['x'], D['z']]], 'GÅ IN', 10)
        await pg.evaluate(STEP, [1.6, None])
        await shot(pg, name, '18_visit', 6)
        steps['visit'] = ok and await pg.evaluate("() => window.__gta.game.indoors.fyrFolk.length === 2")
        print(name, 'steps', json.dumps(steps))
        ok = all(steps.values())
        print(name, 'V1_15', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
name_g = ''
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
