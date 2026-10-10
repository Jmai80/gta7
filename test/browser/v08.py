# Version 0.8 walkthrough (Lasse's shop, Kim's jump, Nyöppningen); was: Version 0.7 walkthrough (Lås-Leif and Melker, the bakery office and the safe) – based on the 0.6: tant Gun's text, the north bridge opening, Norrholmen, unlocking Arne's
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
        if n == shot_at: await pg.screenshot(path=f'test/shots/v08_{name}_{tag}.png')
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
        done = ['red', 'lasse', 'pizza', 'race', 'samuel', 'overlamning', 'cykel', 'livs', 'flag', 'nycklar', 'kassaskap']
        save = {'v': 2, 'money': 12500, 'done': done, 'known': done[1:], 'seen': done[1:], 'stats': {}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.evaluate(STEP, [26, None])
        await frames(pg, 30)
        await pg.screenshot(path=f'test/shots/v08_{name}_01_sms.png')
        await pg.evaluate('() => window.__gta.openOffer("verkstad")')
        await frames(pg, 3)
        await tap(pg, mobile, '#ofAccept')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        await pg.evaluate(TP, [70, 58.1, 1.5708])
        await pg.evaluate(STEP, [0.5, None]); await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v08_{name}_02_garage.png')
        await pg.evaluate(WALK, [76.6, 58.1, 0.8, 6])
        await pg.evaluate(STEP, [0.2, None]); await frames(pg, 8)
        print(name, 'shop', await pg.evaluate('window.__gta.state'))
        await pg.screenshot(path=f'test/shots/v08_{name}_03_shop.png')
        await tap(pg, mobile, '#shList button[data-id="turbo"]')
        await frames(pg, 6)
        await pg.screenshot(path=f'test/shots/v08_{name}_04_bought.png')
        await tap(pg, mobile, '#shClose')
        await frames(pg, 4)
        print(name, 'after shop', json.dumps(await info(pg), ensure_ascii=False))
        # Nyöppningen
        await pg.evaluate(STEP, [31, None])
        await pg.evaluate('() => window.__gta.openOffer("konditori")')
        await frames(pg, 3)
        await pg.screenshot(path=f'test/shots/v08_{name}_05_offer.png')
        await tap(pg, mobile, '#ofAccept')
        await pg.evaluate(STEP, [0.5, None])
        await pg.evaluate(TP, [-6, 9, 3.14159])
        await pg.evaluate(STEP, [0.5, None]); await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v08_{name}_06_konditori.png')
        for k, (x, z) in [('kardemumma', (-33.4, -3.2)), ('smor', (58, 2)), ('mjol', (-2.6, -354.8))]:
            await pg.evaluate(TP, [x, z - 4, 0])
            await pg.evaluate(WALK, [x, z, 0.8, 6])
            await pg.evaluate(STEP, [0.6, None]); await frames(pg, 12)
            if k == 'mjol': await pg.screenshot(path=f'test/shots/v08_{name}_07_mjol.png')
        print(name, 'collected', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate(TP, [-6, 13, 0])
        await pg.evaluate(WALK, [-6, 17.4, 0.8, 6])
        await pg.evaluate(STEP, [1.2, None])
        await talkThrough(pg, name, '08_gun', 1)
        await pg.evaluate(STEP, [3.5, None]); await frames(pg, 30)
        print(name, 'ceremony', json.dumps(await info(pg), ensure_ascii=False))
        await talkThrough(pg, name, '09_bengt', 4)
        await pg.evaluate(STEP, [1.5, None]); await frames(pg, 12)
        await pg.screenshot(path=f'test/shots/v08_{name}_10_done.png')
        await pg.evaluate(STEP, [16, None]); await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v08_{name}_11_end.png')
        print(name, 'end', json.dumps(await info(pg), ensure_ascii=False))
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()

def math_pi(): return 3.14159

which = sys.argv[1] if len(sys.argv) > 1 else 'land'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
