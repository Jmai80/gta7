# v1.8 walkthrough: the Easter eggs – the skateboard (ride it, an ollie), the ducks, the stump, the golden bun,
# the gnome, the bottle, the phone box that rings, and the sea monster from the end of the pier.
# Usage: python3 test/browser/v18.py phone|land|desk (shots: test/shots/v18_*)
# (from v17.py): three quests at Tivoli Lyckoland on Söderholmen. Main quest part 11 "Utsikten" (Bengt by
# the arch → the Ferris wheel → spot Dahlgren from the top → the chase → caught), "Var är Ebbe?" (Hanna, the
# carousel man, Ebbe on his bench, back to his mother) and "Måsen har fastnat" (the coaster stuck up the lift,
# Rut, Lasse's belt, Måsen runs again). Usage: python3 test/browser/v17.py phone|land|desk (shots: test/shots/v18_*)
import asyncio, sys, json, math, os
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
I0 = "{ moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, analog: true, throttleAxis: 0, steerAxis: 0 }"
STEP = '''([sec, extra]) => { const G = window.__gta, g = G.game; const inp = Object.assign(''' + I0 + ''', extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); inp.action = false; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
# run after a ped (south[key]) for up to sec seconds, stop when the job reaches a stage
CHASE = '''([key, sec, stage]) => { const G = window.__gta, g = G.game, m = g.mission, p = g.player;
  for (let i = 0; i < Math.round(sec * 60); i++) { const D = m.south[key]; const yaw = Math.atan2(D.x - p.x, D.z - p.z);
    g.step(1 / 60, Object.assign(''' + I0 + ''', { camYaw: yaw, moveY: 1 })); G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world);
    if (m.active && m.active.stage === stage) return i / 60; } return -1; }'''
TO = '''([x, z, h]) => { const G = window.__gta, g = G.game, p = g.player; p.x = x; p.z = z; p.y = g.world.groundHeight(x, z); p.vx = p.vz = 0; if (h != null) { p.h = h; G.view.rig.yaw = h; } }'''
INFO = '''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active, p = g.player;
  return { active: j && j.id, stage: j && j.stage, state: p.state, prompt: m.prompt, money: g.money, obj: m.objective,
    done: ['utsikten', 'ebbe', 'masen'].filter((k) => m.done.has(k)), ct: +g.coasterT.toFixed(2) }; })()'''
FREEZE = '''() => { window.__gta.pause(); document.getElementById('pausemenu').hidden = true; }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v18_{name}_{tag}.png')
async def talk_through(pg, at=None):
    await frames(pg, 8)
    for _ in range(60):  # (a talk opens a little after the job asks for it, in game time)
        if await pg.evaluate('() => !document.getElementById("talk").hidden'):
            break
        await frames(pg, 2)
    for i in range(12):
        if not await pg.evaluate('() => !document.getElementById("talk").hidden'):
            return i
        if at is not None and i == at[0]:
            await shot(pg, at[1], at[2], 10)
        await pg.evaluate('() => window.__gta.nextTalk()')
        await frames(pg, 4)
        await pg.wait_for_timeout(280)  # (a page shown less than 260 ms ago ignores the tap)
    return 12
async def main(name, w, h, mobile):
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
        save = {'v': 2, 'money': 500, 'done': ['red', 'lasse', 'pizza', 'race', 'samuel', 'overlamning', 'cykel'], 'known': ['lasse'], 'seen': ['lasse'], 'stats': {'tivoliNews': 1}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        S = await pg.evaluate("import('./src/secrets.js').then((s) => Object.fromEntries(s.SECRETS.map((q) => [q.id, q])))")
        SK = '() => window.__gta.game.stats.secrets || []'
        # ---------------- the skateboard on the pitch
        await pg.evaluate(TO, [S['skate']['x'], 150, None])
        await pg.evaluate(STEP, [1.0, None])
        await pg.evaluate(TO, [S['skate']['x'] - 1.2, S['skate']['z'] - 3.4, 0.35])
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '01_skate')
        await pg.evaluate(TO, [S['skate']['x'] - 0.5, S['skate']['z'] - 1.5, None])
        await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [6.0, None])  # (the banner and the toast)
        await pg.wait_for_timeout(6000)
        await pg.evaluate(STEP, [2.5, {'throttleAxis': 1}])
        await pg.evaluate(STEP, [0.05, {'throttleAxis': 1, 'horn': True}])
        await pg.evaluate(STEP, [0.22, {'throttleAxis': 1}])
        await pg.evaluate(FREEZE)
        await pg.evaluate('() => { const G = window.__gta, g = G.game, c = g.player.car; G.view.rig.yaw = c.h - 1.35; for (let i = 0; i < 3; i++) G.view.rig.update(1e-4, g, { camDX: 0 }, G.view.camera.aspect, g.world); }')
        await shot(pg, name, '02_ollie', 6)
        await pg.evaluate('() => window.__gta.resume()')
        await pg.evaluate(STEP, [2.0, {'handbrake': True}])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [1.0, None])
        # ---------------- things to look at
        views = {'ducks': (0, 2.4, math.pi), 'heart': (0, 1.6, math.pi), 'goldbun': (0, 1.4, math.pi), 'gnome': (1.4, 0, -math.pi / 2), 'bottle': (0, -1.6, 0)}
        tags = {'ducks': '03_ducks', 'heart': '04_heart', 'goldbun': '05_bun', 'gnome': '06_gnome', 'bottle': '07_bottle'}
        for k, (dx, dz, hh) in views.items():
            q = S[k]
            await pg.evaluate(TO, [q['x'] + dx, q['z'] + dz, hh])
            await pg.evaluate(STEP, [1.0, None])
            await shot(pg, name, tags[k])
            await pg.evaluate(TO, [q['x'], q['z'], None])
            await pg.evaluate(STEP, [0.3, None])
            await pg.evaluate(STEP, [0.05, {'action': True}])
            await pg.evaluate(STEP, [0.5, None])
            await pg.wait_for_timeout(6500)  # (the banner and the toast fade before the next picture)
        # ---------------- the phone box
        await pg.evaluate(TO, [S['phone']['x'] + 3, S['phone']['z'] + 3.5, -2.4])
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '08_phonebox')
        await pg.evaluate(TO, [S['phone']['x'], S['phone']['z'], math.pi])
        await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await talk_through(pg, at=(2, name, '09_call'))
        # ---------------- the sea monster, from the end of the pier
        await pg.evaluate(TO, [S['monster']['x'], S['monster']['z'], math.pi * 0.95])
        await pg.evaluate('() => { const g = window.__gta.game; g.time = 75 * Math.ceil(g.time / 75) + 75 * 0.74; }')
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '10_monster')
        found = await pg.evaluate(SK)
        print(name, 'found', found)
        ok = len(found) == 8
        print(name, 'V18', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
