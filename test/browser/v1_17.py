# v1.17 walkthrough: "Bullbilens bageri" – Knäck's offer in the yard, the cold bake hall, Signe and the flour by car
# against the clock, Stora Bertha lit, the belt, the opening and Knäck's copy of the recipe.
# Usage: python3 test/browser/v1_17.py phone|land|desk (shots: test/shots/v1_17_*)
# (from v1.16:) "Birgers kaffe" – coffee in Birger's garden, Mormor Signe among the houses by the chapel,
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
BAND = '''([sec, shotAt]) => { const G = window.__gta, g = G.game, j = g.mission.active;
  for (let i = 0; i < Math.round(sec * 60) && j.stage === 'band'; i++) {
    const b = j.inReach(), go = b && Math.abs(b.x - 236 + 0.2) < 0.2;
    const W = 230 + 5.8, hit = b && Math.abs(b.x - W) < 0.2;
    g.step(1 / 60, Object.assign(''' + I0 + ''', { action: !!hit }));
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world);
    if (shotAt != null && j.made >= shotAt && j.balls.length >= 4) return 'shot';
  }
  return j.stage; }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v1_17_{name}_{tag}.png')
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
                'cykelretur', 'hemleverans', 'bullfest', 'konsert', 'cykelgomman', 'cyklarhem', 'birger', 'ebbe', 'utsikten', 'skattjakt', 'flaskpost', 'guldbullen', 'skatbo', 'kaffe', 'salong', 'kyrkkaffe', 'moss']
        save = {'v': 2, 'money': 29600, 'done': done, 'known': [d for d in done if d != 'red'] + ['bageri'], 'seen': [d for d in done if d != 'red'], 'stats': {'secrets': ['phone', 'skate'], 'phoneLast': True, 'skateNova': True}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='body.nophone #phone { visibility: hidden !important; }')
        await pg.evaluate("() => document.body.classList.add('nophone')")
        BG = await pg.evaluate("import('./src/bullbageri.js').then((s) => s.BAGERI)")
        BI = await pg.evaluate("import('./src/bageriet.js').then((s) => ({ B: s.BAK, D: s.BAK_DOOR }))")
        BK, D = BI['B'], BI['D']
        steps = {}
        # ---------------- the yard: Knäck's offer
        await pg.evaluate(TO, [BG['mark']['x'] - 2, BG['mark']['z'] + 14, math.pi])
        await pg.evaluate("() => window.__gta.game.mission.accept('bageri')")
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '01_yard', 20)
        t = await pg.evaluate(GO, [[[BG['mark']['x'], BG['mark']['z']]], 12, None, 'intro'])
        steps['offer'] = t >= 0
        await pg.evaluate(STEP, [1.2, None])
        await talk_through(pg, at=[(1, '02_knack', 300), (6, '03_dahlgren', 200)])
        await pg.evaluate(STEP, [0.4, None])
        ok = await at_prompt(pg, [[D['x'] + 2.0, D['z'] + 1.6], [D['x'], D['z']]], 'GÅ IN', 14)
        await pg.evaluate(STEP, [1.8, None])
        await talk_through(pg, at=[(1, '04_hall', 300)])
        steps['hall'] = ok and (await pg.evaluate(INFO))['stage'] == 'errands'
        await at_prompt(pg, [[BK['door']['x'], BK['door']['z']]], 'GÅ UT', 8)
        await pg.evaluate(STEP, [1.6, None])
        # ---------------- Signe at the chapel's car park
        SZ, MZ, YZ = BG['signeZone'], BG['mjolZone'], BG['yard']
        ok = await pg.evaluate(CAR, [SZ['x'] - 14, SZ['z'], math.pi / 2])
        await pg.evaluate(STEP, [0.5, None])
        await shot(pg, name, '05_clock', 6)
        ok = ok and await pg.evaluate(DRIVE, [SZ['x'], SZ['z'], 20, "j.signeState === 'talk'"])
        await pg.evaluate(STEP, [0.6, None])
        await talk_through(pg, at=[(1, '06_signe', 300)])
        await pg.evaluate(STEP, [0.8, None])
        await shot(pg, name, '07_passenger', 8)
        # ---------------- the flour at the allotments
        await pg.evaluate(CAR, [MZ['x'], MZ['z'] + 16, math.pi])
        ok = ok and await pg.evaluate(DRIVE, [MZ['x'], MZ['z'], 20, "j.mjol === 'car'"])
        await pg.evaluate(STEP, [0.5, None])
        await shot(pg, name, '08_flour', 4)
        await pg.evaluate(CAR, [YZ['x'] - 18, YZ['z'], math.pi / 2])
        ok = ok and await pg.evaluate(DRIVE, [YZ['x'], YZ['z'], 20, "j.stage === 'back'"])
        steps['errands'] = ok
        await pg.evaluate(STEP, [0.3, {'action': True}])
        await pg.evaluate(STEP, [1.2, None])
        # ---------------- Stora Bertha and the belt
        ok = await at_prompt(pg, [[D['x'] + 2.0, D['z'] + 1.6], [D['x'], D['z']]], 'GÅ IN', 20)
        await pg.evaluate(STEP, [1.8, None])
        await talk_through(pg, at=[(4, '09_fire', 400)])
        steps['fire'] = ok and await pg.evaluate("() => window.__gta.game.mission.bertha")
        ok = await at_prompt(pg, [[BK['station']['x'], BK['station']['z']]], 'STARTA', 10)
        r = await pg.evaluate(BAND, [40, 7])
        await shot(pg, name, '10_belt', 1)
        r = await pg.evaluate(BAND, [40, None])
        await pg.evaluate(STEP, [1.2, None])
        knots = await pg.evaluate("() => window.__gta.game.mission.active.knots")
        await talk_through(pg)
        await pg.evaluate(STEP, [2.0, None])
        steps['belt'] = ok and knots >= 10
        # ---------------- the opening
        await pg.wait_for_timeout(2500)
        await shot(pg, name, '11_morning', 10)
        t = await pg.evaluate(GO, [[[BG['mark']['x'], BG['mark']['z']]], 12, None, 'openTalk'])
        await pg.evaluate(STEP, [1.0, None])
        await talk_through(pg, at=[(1, '12_folke', 300), (5, '13_receptet', 300)])
        await pg.evaluate(STEP, [1.0, None])
        steps['opening'] = t >= 0 and await pg.evaluate("() => window.__gta.game.mission.done.has('bageri')")
        await pg.evaluate(STEP, [16, None])
        await frames(pg, 6)
        steps['endcard'] = await pg.evaluate('() => !document.getElementById("endcard").hidden')
        await shot(pg, name, '14_endcard', 4)
        await pg.evaluate('window.__gta.resume()')
        print(name, 'steps', json.dumps(steps), 'knots', knots, 'money', await pg.evaluate('window.__gta.game.money'))
        ok = all(steps.values())
        print(name, 'V1_17', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
name_g = ''
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
