# v1.16 walkthrough: "Birgers kaffe" – coffee in Birger's garden, Mormor Signe among the houses by the chapel,
# her woodshed and the tarps, the five bikes home, Jonte's skateboard to Nova, sorry to tant Gun.
# Usage: python3 test/browser/v1_16.py phone|land|desk (shots: test/shots/v1_16_*)
# (from v1.15:) the main quest's part 15 "Skatans bo" – the lighthouse from the inside (Ingvar's kitchen, the
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

# ride the bike (or skateboard) you are on to a point, slowing at the end; stop when the stage changes
RIDE = '''([x, z, sec, stage]) => { const G = window.__gta, g = G.game, m = g.mission, p = g.player;
  for (let i = 0; i < Math.round(sec * 60); i++) {
    const c = p.car; if (m.active && m.active.stage === stage) return stage; if (!c) return 'off';
    const d = Math.hypot(x - c.x, z - c.z), want = Math.atan2(x - c.x, z - c.z), err = Math.atan2(Math.sin(want - c.h), Math.cos(want - c.h));
    g.step(1 / 60, Object.assign(''' + I0 + ''', { analog: false, throttleAxis: null, steerAxis: null, moveY: d > 6 ? 1 : d > 1.2 && c.speed < 2.5 ? 0.6 : 0, moveX: Math.max(-1, Math.min(1, err * 2)), handbrake: d < 1.6 && c.speed > 1 }));
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return m.active && m.active.stage; }'''
MOUNT = '''([id, x, z, h]) => { const G = window.__gta, g = G.game, j = g.mission.active, p = g.player; const c = id === 'skate' ? g.skate : j.bikes[id];
  c.x = x; c.z = z; c.h = h; c.vx = c.vz = 0; c.y = g.world.groundHeight(x, z);
  p.x = x - Math.cos(h) * 1.0; p.z = z + Math.sin(h) * 1.0; p.y = g.world.groundHeight(p.x, p.z);
  for (let i = 0; i < 50; i++) { g.step(1 / 60, Object.assign(''' + I0 + ''', { action: i === 0 })); }
  G.view.rig.yaw = h; return p.car === c; }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v1_16_{name}_{tag}.png')
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
                'cykelretur', 'hemleverans', 'bullfest', 'konsert', 'cykelgomman', 'cyklarhem', 'birger', 'ebbe', 'utsikten', 'skattjakt', 'flaskpost', 'guldbullen', 'skatbo', 'salong', 'kyrkkaffe']
        save = {'v': 2, 'money': 23800, 'done': done, 'known': [d for d in done if d != 'red'] + ['kaffe'], 'seen': [d for d in done if d != 'red'], 'stats': {'secrets': ['phone'], 'phoneLast': True}}
        if FIN:
            save['stats']['kaffe'] = {'at': 4, 'left': []}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='body.nophone #phone { visibility: hidden !important; }')
        await pg.evaluate("() => document.body.classList.add('nophone')")
        KA = await pg.evaluate("import('./src/kaffe.js').then((s) => ({ K: s.KAFFE, B: s.BIKES }))")
        VB = await pg.evaluate("import('./src/vedbod.js').then((s) => ({ S: s.SHED, D: s.SHED_DOOR, T: s.TARPS }))")
        K, BK = KA['K'], KA['B']
        steps = {}
        if FIN:
            await pg.evaluate("() => window.__gta.game.mission.accept('kaffe')")
            F = K['fin']
            await pg.evaluate(TO, [F['mark']['x'] + 30, F['mark']['z'] + 1, -math.pi / 2])
            await pg.evaluate(STEP, [1.0, None])
            t = await pg.evaluate(GO, [[[F['mark']['x'], F['mark']['z']]], 16, None, 'finaleTalk'])
            await pg.evaluate(STEP, [1.0, None])
            await talk_through(pg, at=[(1, '13_sorry', 300), (7, '14_saturdays', 300)])
            print(name, 'FIN', t)
            await b.close()
            return
        # ---------------- coffee in Birger's garden
        await pg.evaluate(TO, [-62.5, -43.5, math.pi])
        await pg.evaluate("() => window.__gta.game.mission.accept('kaffe')")
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '01_garden', 20)
        t = await pg.evaluate(GO, [[[-62.5, -47.5], [K['mark']['x'], K['mark']['z']]], 10, None, 'intro'])
        steps['enter'] = t >= 0
        await pg.evaluate(STEP, [1.3, None])
        await talk_through(pg, at=[(1, '02_coffee', 300), (7, '03_mormor', 200)])
        await pg.evaluate(STEP, [0.6, None])
        steps['south'] = (await pg.evaluate(INFO))['stage'] == 'south'
        # ---------------- Söderholmen: Signe's garden
        await pg.evaluate(TO, [K['gate']['x'], K['gate']['z'] - 16, 0])
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '04_chapel_houses', 20)
        t = await pg.evaluate(GO, [[[K['gate']['x'], K['gate']['z']]], 12, None, 'signeTalk'])
        await pg.evaluate(STEP, [0.8, None])
        await talk_through(pg, at=[(4, '05_signe', 300)])
        await pg.evaluate(STEP, [0.4, None])
        D = VB['D']
        ok = await at_prompt(pg, [[-63.0, 267.0], [-74.0, 267.0], [D['x'], D['z'] + 1.2], [D['x'], D['z']]], 'GÅ IN', 24)
        await pg.evaluate(STEP, [1.5, None])
        steps['shed'] = ok and (await pg.evaluate(INFO))['where'] == 'shed'
        await pg.wait_for_timeout(3000)
        await shot(pg, name, '06_shed', 6)
        x0s, z0s = VB['S']['room']['x0'], VB['S']['room']['z0']
        for i, T in enumerate(VB['T'][::-1]):
            await pg.evaluate(TO, [T['x'], T['z'], math.atan2(T['tx'] - T['x'], T['tz'] - T['z'])])
            await pg.evaluate(STEP, [0.1, None])
            await press(pg)
            await pg.evaluate(STEP, [0.3, None])
            if i == 4:
                await shot(pg, name, '07_tarps', 4)
        await pg.evaluate(STEP, [0.8, None])
        await talk_through(pg)
        await at_prompt(pg, [[VB['S']['door']['x'], VB['S']['door']['z']]], 'GÅ UT', 8)
        await pg.evaluate(STEP, [1.6, None])
        i1 = await pg.evaluate(INFO)
        steps['bikes'] = i1['stage'] == 'deliver'
        await pg.evaluate(CAM, [K['yard']['x'] + 6, 3.2, K['yard']['z'] + 6, K['yard']['x'] + 3.8, 0.6, K['yard']['z'], 55])
        await pg.evaluate(STEP, [1.2, None])
        await shot(pg, name, '08_five_bikes', 30)
        await pg.evaluate(CAM, [0, 0, 0, 0, 0, 0, 0])
        # ---------------- the bikes home
        ok = True
        for B in BK:
            z0 = B['zone']['z'] + (7 if B['id'] in ('nova', 'pia') else -7)
            hh = math.atan2(0, B['zone']['z'] - z0)
            ok = ok and await pg.evaluate(MOUNT, [B['id'], B['zone']['x'], z0, hh])
            await pg.evaluate(STEP, [0.3, None])
            if B['id'] == 'elsa':
                await pg.evaluate(STEP, [0.6, None])
                await shot(pg, name, '09_riding', 6)
            r = await pg.evaluate(RIDE, [B['zone']['x'], B['zone']['z'], 20, 'ownerTalk'])
            ok = ok and r == 'ownerTalk'
            await pg.evaluate(STEP, [0.8, None])
            await talk_through(pg, at=[(2, f"10_{B['id']}", 300)] if B['id'] in ('folke',) else [(0, f"10_{B['id']}", 300)] if B['id'] in ('elsa', 'pia') else None)
            await pg.evaluate(STEP, [0.4, None])
        steps['deliver'] = ok and (await pg.evaluate(INFO))['stage'] == 'skate'
        # ---------------- the skateboard to Nova
        SK = {'x': -27.5, 'z': 99}
        await pg.evaluate(TO, [SK['x'] + 6, SK['z'], -math.pi / 2])
        await pg.evaluate(STEP, [1.0, None])
        nz = K['novaZone']
        ok = await pg.evaluate(MOUNT, ['skate', nz['x'] - 10, nz['z'], math.pi / 2])
        await pg.evaluate(STEP, [0.6, None])
        await shot(pg, name, '11_skate', 6)
        r = await pg.evaluate(RIDE, [nz['x'], nz['z'], 20, 'novaTalk'])
        await pg.evaluate(STEP, [0.8, None])
        await talk_through(pg, at=[(3, '12_nova_skate', 300)])
        steps['skate'] = ok and r == 'novaTalk'
        # ---------------- Gun's gate
        F = K['fin']
        await pg.evaluate(TO, [F['mark']['x'] + 30, F['mark']['z'] + 1, -math.pi / 2])
        await pg.evaluate(STEP, [1.0, None])
        t = await pg.evaluate(GO, [[[F['mark']['x'], F['mark']['z']]], 16, None, 'finaleTalk'])
        await pg.evaluate(STEP, [1.0, None])
        await talk_through(pg, at=[(1, '13_sorry', 300), (7, '14_saturdays', 300)])
        await pg.evaluate(STEP, [1.0, None])
        i3 = await pg.evaluate("() => window.__gta.game.mission.done.has('kaffe')")
        steps['finale'] = t >= 0 and i3
        await pg.evaluate(STEP, [16, None])
        await frames(pg, 6)
        steps['no_endcard_yet'] = await pg.evaluate('() => document.getElementById("endcard").hidden')   # (part 17 is still to come)
        print(name, 'steps', json.dumps(steps), 'money', await pg.evaluate('window.__gta.game.money'))
        ok = all(steps.values())
        print(name, 'V1_16', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
name_g = ''
FIN = len(sys.argv) > 2 and sys.argv[2] == 'fin'
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
