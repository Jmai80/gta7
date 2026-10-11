# v1.7 walkthrough: three quests at Tivoli Lyckoland on Söderholmen. Main quest part 11 "Utsikten" (Bengt by
# the arch → the Ferris wheel → spot Dahlgren from the top → the chase → caught), "Var är Ebbe?" (Hanna, the
# carousel man, Ebbe on his bench, back to his mother) and "Måsen har fastnat" (the coaster stuck up the lift,
# Rut, Lasse's belt, Måsen runs again). Usage: python3 test/browser/v17.py phone|land|desk (shots: test/shots/v17_*)
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
    await pg.screenshot(path=f'test/shots/v17_{name}_{tag}.png')
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
        done = ['red', 'lasse', 'pizza', 'race', 'flag', 'samuel', 'overlamning', 'cykel', 'livs', 'nycklar', 'kassaskap', 'konditori', 'verkstad', 'hopp',
                'syltburken', 'fabriken', 'bullfest', 'cykelretur', 'hemleverans', 'salong', 'cykelgomman', 'birger', 'hytter', 'konsert', 'cyklarhem']
        known = done[1:] + ['utsikten', 'ebbe', 'masen']
        save = {'v': 2, 'money': 1000, 'done': done, 'known': known, 'seen': known, 'stats': {'tivoliNews': 1, 'tivoliVisit': 1}, 'tracked': 'utsikten'}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        U = await pg.evaluate("import('./src/tivolijobs.js').then((t) => ({ U: t.UTSIKT, E: t.EBBE, M: t.MASEN }))")
        W = await pg.evaluate("import('./src/southisle.js').then((s) => s.WHEEL)")
        # over the bridge: everyone takes their place out of sight
        await pg.evaluate(TO, [-40, 150, 0])
        await pg.evaluate(STEP, [1.0, None])
        # ---------------- Utsikten: Bengt by the arch
        mk = U['U']['mark']
        await pg.evaluate(TO, [mk['x'], mk['z'], None])
        await pg.evaluate(STEP, [1.2, None])
        await talk_through(pg, at=(4, name, '01_bengt'))
        await pg.evaluate(STEP, [6.0, None])  # (the toasts fade)
        await pg.evaluate(TO, [W['board']['x'], W['board']['z'], math.pi])
        await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        for _ in range(100):  # up to the top of the wheel, where you spot him (a talk)
            await pg.evaluate(STEP, [0.25, None])
            await frames(pg, 2)
            if await pg.evaluate('() => !document.getElementById("talk").hidden'):
                break
        await frames(pg, 30)
        await talk_through(pg, at=(1, name, '02_spot'))
        for _ in range(40):
            await pg.evaluate(STEP, [1.0, None])
            if (await pg.evaluate(INFO))['stage'] == 'approach':
                break
        appr = await pg.evaluate(INFO)
        await pg.evaluate(STEP, [4.5, None])
        t = await pg.evaluate(CHASE, ['dahl', 15, 'chase'])
        t2 = await pg.evaluate(CHASE, ['dahl', 3.2, 'caught'])
        await pg.evaluate(FREEZE)
        await shot(pg, name, '03_chase', 6)
        await pg.evaluate('() => window.__gta.resume()')
        t3 = await pg.evaluate(CHASE, ['dahl', 40, 'caught'])
        await talk_through(pg, at=(3, name, '04_caught'))
        await pg.evaluate(STEP, [2.0, None])
        u_end = await pg.evaluate(INFO)
        print(name, 'utsikten: approach', json.dumps(appr, ensure_ascii=False), '| chase', t, t2, t3, '| end', json.dumps(u_end, ensure_ascii=False))
        # the end card (all fourteen done): look, then on
        await pg.evaluate(STEP, [16, None])
        try:
            await pg.wait_for_function('() => !document.getElementById("endcard").hidden', timeout=20000)
            await shot(pg, name, '04b_endcard', 6)
            await pg.click('#eContinue')
        except Exception as e:
            logs.append(f'[test] no end card: {e}')
        await frames(pg, 4)
        # ---------------- Måsen: stuck up the lift
        await pg.evaluate(TO, [26, 241.4, 0.75])
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '05_stuck')
        stuck = await pg.evaluate(INFO)
        mk = U['M']['mark']
        await pg.evaluate(TO, [mk['x'], mk['z'], math.pi])
        await pg.evaluate(STEP, [1.2, None])
        await talk_through(pg, at=(1, name, '06_rut'))
        # (the drive itself is tested in Node: here straight to the end of it)
        await pg.evaluate('''() => { const m = window.__gta.game.mission, j = m.active; j.stage = 'carry'; j.amount = 900; }''')
        await pg.evaluate(TO, [mk['x'], mk['z'], math.pi])
        await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await talk_through(pg)
        await pg.evaluate(STEP, [4.0, None])
        m_end = await pg.evaluate(INFO)
        await pg.evaluate(TO, [26, 241.4, 0.75])
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '07_running')
        # ---------------- Var är Ebbe?
        mk = U['E']['mark']
        await pg.evaluate(TO, [mk['x'], mk['z'], -math.pi / 2])
        await pg.evaluate(STEP, [1.2, None])
        await talk_through(pg)
        for wt in U['E']['wit']:
            await pg.evaluate(TO, [wt['x'] + math.sin(wt['h']) * 1.3, wt['z'] + math.cos(wt['h']) * 1.3, wt['h'] + math.pi])
            await pg.evaluate(STEP, [0.3, None])
            await pg.evaluate(STEP, [0.05, {'action': True}])
            await talk_through(pg, at=(0, name, '08_kalle') if wt['id'] == 'kalle' else None)
        e = U['E']['ebbe']
        await pg.evaluate(TO, [e['x'], e['z'] - 1.5, 0])
        await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await talk_through(pg, at=(0, name, '09_ebbe'))
        await pg.evaluate(STEP, [5.0, None])
        # walk back toward Hanna, Ebbe behind you
        await pg.evaluate('''() => { const G = window.__gta, g = G.game, m = g.mission, p = g.player; const pts = [[46, 212.6], [30, 212.3], [20.6, 212.2]]; let i = 0;
          for (let k = 0; k < 60 * 30; k++) { const [x, z] = pts[Math.min(i, 2)]; if (Math.hypot(x - p.x, z - p.z) < 0.6 && i < 2) i++;
            const yaw = Math.atan2(x - p.x, z - p.z); g.step(1 / 60, Object.assign(''' + I0 + ''', { camYaw: yaw, moveY: Math.hypot(x - p.x, z - p.z) < 0.6 ? 0 : 0.55 }));
            G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world);
            if (k === 60 * 5) return; } }''')
        await pg.evaluate(FREEZE)
        await shot(pg, name, '10_lead', 6)
        await pg.evaluate('() => window.__gta.resume()')
        await pg.evaluate('''() => { const G = window.__gta, g = G.game, m = g.mission, p = g.player; const pts = [[30, 212.3], [20.6, 212.2]]; let i = 0;
          for (let k = 0; k < 60 * 30; k++) { const [x, z] = pts[Math.min(i, 1)]; if (Math.hypot(x - p.x, z - p.z) < 0.6 && i < 1) i++;
            g.step(1 / 60, Object.assign(''' + I0 + ''', { camYaw: Math.atan2(x - p.x, z - p.z), moveY: Math.hypot(x - p.x, z - p.z) < 0.6 ? 0 : 0.55 }));
            if (m.active && m.active.stage === 'final') return; } }''')
        await talk_through(pg, at=(2, name, '11_home'))
        await pg.evaluate(STEP, [2.0, None])
        e_end = await pg.evaluate(INFO)
        print(name, 'masen: stuck', json.dumps(stuck), '| end', json.dumps(m_end, ensure_ascii=False), '| ebbe end', json.dumps(e_end, ensure_ascii=False))
        ok = 'utsikten' in u_end['done'] and 'masen' in m_end['done'] and 'ebbe' in e_end['done'] and t3 >= 0
        print(name, 'V17', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
