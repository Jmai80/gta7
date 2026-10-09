# Version 0.7 walkthrough (Lås-Leif and Samuel, the bakery office and the safe) – based on the 0.6: tant Gun's text, the north bridge opening, Norrholmen, unlocking Arne's
# bike at lott 7, the Bullbilen van coming after you, the ride, the delivery at Gun's gate and the
# quest log. Screenshots in test/shots/v06_<mode>_*.png
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

STEP = '''([sec, extra]) => { const G = window.__gta, g = G.game; const inp = Object.assign({ moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, analog: true }, extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); inp.action = false; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
WALK = '''([x, z, mag, maxSec]) => { const G = window.__gta, g = G.game, p = g.player; let t = 0;
  while (t < maxSec) { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d < 0.3) break;
    const ux = dx / d, uz = dz / d, y = G.view.rig.yaw; const my = ux * Math.sin(y) + uz * Math.cos(y), mx = -ux * Math.cos(y) + uz * Math.sin(y);
    g.step(1 / 60, { moveX: mx * mag, moveY: my * mag, action: false, camYaw: y, analog: true }); t += 1 / 60; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return t; }'''
# ride the bike through waypoints (pure pursuit on the stick), the camera following
RIDE = '''([wps, maxSec]) => { const G = window.__gta, g = G.game, p = g.player; let t = 0, wi = 0;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  while (t < maxSec && p.inCar) { const c = p.car;
    while (wi < wps.length - 1 && Math.hypot(wps[wi][0] - c.x, wps[wi][1] - c.z) < 4) wi++;
    if (wi === wps.length - 1 && Math.hypot(wps[wi][0] - c.x, wps[wi][1] - c.z) < 3) break;
    const err = wrap(Math.atan2(wps[wi][0] - c.x, wps[wi][1] - c.z) - c.h);
    g.step(1 / 60, { moveX: Math.max(-1, Math.min(1, -err * 2.2)), moveY: 1, action: false, camYaw: G.view.rig.yaw, analog: true }); t += 1 / 60;
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return t; }'''

async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)

async def info(pg):
    return await pg.evaluate('''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active; return { state: G.state, obj: m.objective, sub: m.sub, prompt: m.prompt, active: j && j.id, stage: j && j.stage, gate: g.gateN.k, bike: g.bike && [+g.bike.x.toFixed(1), +g.bike.z.toFixed(1), g.bike.locked], van: j && j.van && [+j.van.x.toFixed(1), +j.van.z.toFixed(1), +j.van.speed.toFixed(1), j.chaser.mode], p: [+g.player.x.toFixed(1), +g.player.z.toFixed(1), g.player.state], money: g.money }; })()''')



async def tap(pg, mobile, sel):
    if mobile: await pg.tap(sel)
    else: await pg.click(sel)

async def info(pg):
    return await pg.evaluate("""(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active; return { state: G.state, obj: m.objective, sub: m.sub, prompt: m.prompt, active: j && j.id, stage: j && j.stage, where: g.indoors.where, p: [+g.player.x.toFixed(1), +g.player.z.toFixed(1), g.player.state], money: g.money }; })()""")

async def talkThrough(pg, name, tag, shot_at=2):
    await frames(pg, 6)
    n = 0
    while await pg.evaluate('window.__gta.state') == 'talk' and n < 12:
        await frames(pg, 3)
        if n == shot_at: await pg.screenshot(path=f'test/shots/v07_{name}_{tag}.png')
        await pg.wait_for_timeout(300)
        await pg.evaluate('window.__gta.nextTalk()')
        n += 1

async def act(pg, mobile):
    await tap(pg, mobile, '#bAction')
    await frames(pg, 4)

TP = """([x, z, h]) => { const g = window.__gta.game, p = g.player; p.x = x; p.z = z; p.y = g.world.groundHeight(x, z); if (h != null) { p.h = h; window.__gta.view.rig.yaw = h; } }"""

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
        done = ['red', 'lasse', 'pizza', 'race', 'samuel', 'overlamning', 'cykel', 'livs', 'flag']
        save = {'v': 2, 'money': 7900, 'done': done, 'known': done[1:], 'seen': done[1:], 'stats': {}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.evaluate(STEP, [15.5, None])
        await frames(pg, 30)
        await pg.screenshot(path=f'test/shots/v07_{name}_01_sms.png')
        await pg.evaluate('() => window.__gta.openOffer("nycklar")')
        await frames(pg, 3)
        await tap(pg, mobile, '#ofAccept')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        # Leif's shop on Skolgatan
        await pg.evaluate(TP, [4, 38.5, math_pi()])
        await pg.evaluate(STEP, [0.6, None])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v07_{name}_02_leif.png')
        await pg.evaluate(WALK, [4, 33.9, 0.8, 6])
        await pg.evaluate(STEP, [0.8, None])
        print(name, 'leif', json.dumps(await info(pg), ensure_ascii=False))
        await talkThrough(pg, name, '03_leiftalk', 1)
        # out to Samuel
        await pg.evaluate(TP, [42, -305, -1.5708])
        await pg.evaluate(STEP, [0.5, None])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v07_{name}_04_samuel.png')
        await pg.evaluate(WALK, [36.8, -305.2, 0.8, 8])
        await pg.evaluate(STEP, [1.0, None])
        print(name, 'samuel', json.dumps(await info(pg), ensure_ascii=False))
        await talkThrough(pg, name, '05_samueltalk', 4)
        await pg.evaluate(STEP, [1.0, None])
        print(name, 'keys done', json.dumps(await info(pg), ensure_ascii=False))
        # the safe: Gun texts ~45 s after the eggs
        await pg.evaluate(STEP, [33, None])
        await pg.evaluate('() => window.__gta.openOffer("kassaskap")')
        await frames(pg, 3)
        await pg.screenshot(path=f'test/shots/v07_{name}_06_offer.png')
        await tap(pg, mobile, '#ofAccept')
        await pg.evaluate(TP, [50, -322, 1.5708])
        await pg.evaluate(STEP, [0.6, None])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v07_{name}_07_window.png')
        await pg.evaluate(WALK, [56.7, -322, 0.8, 8])
        await pg.evaluate(STEP, [1.8, None])
        await frames(pg, 20)
        print(name, 'office', json.dumps(await info(pg), ensure_ascii=False))
        await pg.screenshot(path=f'test/shots/v07_{name}_08_office.png')
        O = await pg.evaluate("() => { const j = window.__gta.game.mission.active; return null; }")
        # the note, the diploma, the safe (office local origin = 200, 226)
        await pg.evaluate(WALK, [204.3, 229.75, 0.8, 6]); await pg.evaluate(STEP, [0.2, None]); await act(pg, mobile)
        await frames(pg, 10)
        await pg.screenshot(path=f'test/shots/v07_{name}_09_note.png')
        await pg.evaluate(WALK, [200.75, 229.5, 0.8, 6]); await pg.evaluate(STEP, [0.2, None]); await act(pg, mobile)
        await pg.evaluate(WALK, [207.25, 231.2, 0.8, 6]); await pg.evaluate(STEP, [0.2, None]); await act(pg, mobile)
        await pg.evaluate(STEP, [0.8, None]); await frames(pg, 10)
        await pg.screenshot(path=f'test/shots/v07_{name}_10_safe.png')
        print(name, 'safe', json.dumps(await info(pg), ensure_ascii=False))
        await act(pg, mobile)
        await pg.evaluate(STEP, [0.3, None]); await frames(pg, 6)
        print(name, 'alarm', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate(WALK, [201.6, 232.6, 1.0, 4]); await pg.evaluate(STEP, [0.1, None])
        await act(pg, mobile)
        await pg.evaluate(STEP, [1.5, None])
        print(name, 'escape', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate(TP, [44, -322, 0])
        await pg.evaluate(STEP, [4.5, None]); await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v07_{name}_11_vans.png')
        await pg.evaluate(TP, [-97.5, -42, math_pi()])
        await pg.evaluate(STEP, [0.3, None])
        await pg.evaluate(WALK, [-97.5, -46.8, 0.8, 6])
        await pg.evaluate(STEP, [1.5, None]); await frames(pg, 20)
        print(name, 'gun', json.dumps(await info(pg), ensure_ascii=False))
        await talkThrough(pg, name, '12_gun', 2)
        await pg.evaluate(STEP, [1.5, None]); await frames(pg, 12)
        await pg.screenshot(path=f'test/shots/v07_{name}_13_done.png')
        await pg.evaluate(STEP, [16, None]); await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v07_{name}_14_end.png')
        print(name, 'end', json.dumps(await info(pg), ensure_ascii=False))
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()

def math_pi(): return 3.14159

which = sys.argv[1] if len(sys.argv) > 1 else 'land'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
