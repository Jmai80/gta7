# v1.4 walkthrough: the side quest "Konsertbiljetten" – Nova's room behind Macken. The new street door,
# the room with the K-POP DEMONJÄGARNA poster, the talk, tidying (the hoodie: the ticket), her mum.
# Also: the car radio is off unless you turn it on. Usage: python3 test/browser/v14.py phone|land|desk
import asyncio, sys, json, math, os
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
STEP = '''([sec, extra]) => { const G = window.__gta, g = G.game; const inp = Object.assign({ moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, analog: true }, extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); inp.action = false; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
TO = '''([x, z, h]) => { const G = window.__gta, g = G.game, p = g.player; p.x = x; p.z = z; p.y = g.world.groundHeight(x, z); p.vx = p.vz = 0; if (h != null) { p.h = h; G.view.rig.yaw = h; } }'''
INFO = '''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active;
  return { obj: m.objective, sub: m.sub, active: j && j.id, stage: j && j.stage, where: g.indoors.where, money: g.money, prompt: m.prompt,
    placed: j && j.things ? j.placed : null, ticket: j ? !!j.ticket : null, done: m.done.has('konsert') }; })()'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v14_{name}_{tag}.png')
async def talk_through(pg, at=None):
    await frames(pg, 8)
    for i in range(12):
        if not await pg.evaluate('() => !document.getElementById("talk").hidden'):
            return i
        if at is not None and i == at[0]:
            await shot(pg, at[1], at[2], 10)
        await pg.evaluate('() => window.__gta.nextTalk()')
        await frames(pg, 4)
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
        done = ['red', 'lasse', 'pizza', 'race', 'flag', 'samuel', 'overlamning', 'cykel', 'livs', 'nycklar', 'kassaskap', 'konditori', 'verkstad', 'hopp']
        save = {'v': 2, 'money': 3000, 'done': done, 'known': done[1:] + ['konsert'], 'seen': done[1:] + ['konsert'], 'stats': {}, 'tracked': 'konsert'}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        radio = await pg.evaluate("document.getElementById('mRadio').textContent")
        D = await pg.evaluate("import('./src/config.js').then((c) => c.NOVA_DOOR)")
        # ---------------- Skolgatan: the new blue door behind Macken
        await pg.evaluate(TO, [D['x'] - 1.2, D['z'] + 5.5, math.pi - 0.15])
        await pg.evaluate(STEP, [1.0, None])
        await shot(pg, name, '01_door')
        await pg.evaluate(TO, [D['x'], D['z'], math.pi])
        await pg.evaluate(STEP, [2.0, None])
        n = await talk_through(pg, at=(1, name, '02_nova'))
        info = await pg.evaluate(INFO)
        print(name, 'radio', radio, '| room', json.dumps(info, ensure_ascii=False), 'pages', n)
        await pg.evaluate(STEP, [0.5, None])
        await shot(pg, name, '03_room')
        things = await pg.evaluate("import('./src/nova.js').then((n) => n.THINGS.map((t) => ({ id: t.id, fx: t.fx, fz: t.fz, sx: t.sx, sz: t.sz })))")
        for i, t in enumerate(things):
            await pg.evaluate(TO, [t['fx'], t['fz'], None])
            await pg.evaluate(STEP, [0.2, None])
            await pg.evaluate(STEP, [0.05, {'action': True}])
            await pg.evaluate(STEP, [0.3, None])
            if t['id'] == 'luva':
                await shot(pg, name, '04_ticket', 6)
            await pg.evaluate(TO, [t['sx'], t['sz'], None])
            await pg.evaluate(STEP, [0.2, None])
            if i == 3:
                await shot(pg, name, '05_carry', 6)
            await pg.evaluate(STEP, [0.05, {'action': True}])
            await pg.evaluate(STEP, [0.3, None])
        tidy = await pg.evaluate(INFO)
        await pg.evaluate(STEP, [4.0, None])
        await talk_through(pg, at=(0, name, '06_mom'))
        await pg.evaluate(STEP, [1.0, None])
        end = await pg.evaluate(INFO)
        print(name, 'tidy', json.dumps(tidy, ensure_ascii=False), '| end', json.dumps(end, ensure_ascii=False))
        ok = radio == 'Bilradio: Av' and info['where'] == 'nova' and info['stage'] == 'tidy' and tidy['ticket'] and end['done']
        print(name, 'V14', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
