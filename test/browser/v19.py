# v1.9 walkthrough: Söderholmens kapell from the inside – GÅ IN at the tower door, the pews and the aisle,
# up to the altar, kyrkoherde Inga, a look back over the pews, and out again.
# Usage: python3 test/browser/v19.py phone|land|desk (shots: test/shots/v19_*)
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
    await pg.screenshot(path=f'test/shots/v19_{name}_{tag}.png')
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
        C = await pg.evaluate("import('./src/chapel.js').then((s) => ({ door: s.CHAPEL_DOOR, spawn: s.CHAPEL.spawn, room: s.CHAPEL.room }))")
        D = C['door']
        # ---------------- outside: the tower door
        await pg.evaluate(TO, [D['x'] + 1.2, D['z'] - 6, -0.2])
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '01_door')
        await pg.evaluate(TO, [D['x'], D['z'], 0])
        await pg.evaluate(STEP, [0.3, None])
        prompt_out = (await pg.evaluate(INFO))['prompt']
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [1.4, None])
        where = await pg.evaluate('() => window.__gta.game.indoors.where')
        await pg.evaluate('() => { const G = window.__gta; G.view.rig.yaw = 0; }')
        await pg.evaluate(STEP, [1.0, None])
        await pg.wait_for_timeout(4500)  # (the toast fades)
        await shot(pg, name, '02_inside')
        # ---------------- up the aisle
        await pg.evaluate(STEP, [0.9, {'moveY': 1}])
        await pg.evaluate(STEP, [0.6, None])
        await shot(pg, name, '03_aisle')
        t = 0
        while (await pg.evaluate(INFO))['prompt'] != 'PRATA' and t < 40:
            await pg.evaluate(STEP, [0.1, {'moveY': 1}])
            t += 1
        await pg.evaluate(STEP, [0.6, None])
        await shot(pg, name, '04_altar')
        prompt_in = (await pg.evaluate(INFO))['prompt']
        await pg.evaluate(STEP, [0.05, {'action': True}])
        pages = await talk_through(pg, at=(4, name, '05_inga'))
        await pg.evaluate(STEP, [0.5, None])
        # a look back over the pews, from beside the altar
        await pg.evaluate(TO, [C['room']['x0'] + 5.7, C['room']['z0'] + 11.9, math.pi])
        await pg.evaluate('() => { window.__gta.view.rig.yaw = Math.PI; }')
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '06_pews')
        # ---------------- out again
        await pg.evaluate(TO, [C['spawn']['x'], C['spawn']['z'] - 0.4, math.pi])
        await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate(STEP, [0.05, {'action': True}])
        await pg.evaluate(STEP, [1.4, None])
        out = await pg.evaluate('() => !window.__gta.game.indoor')
        print(name, 'prompts', prompt_out, prompt_in, 'where', where, 'pages', pages, 'out', out)
        ok = prompt_out == 'GÅ IN' and where == 'chapel' and prompt_in == 'PRATA' and pages >= 5 and out
        print(name, 'V19', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
