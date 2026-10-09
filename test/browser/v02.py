# Version 0.2 visual walkthrough in headless Chromium: contacts, pizza job, street race, menus.
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

STEP = '''([sec, extra]) => { const g = window.__gta.game; const inp = Object.assign({ moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, camYaw: window.__gta.view.rig.yaw, analog: true }, extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { g.step(1 / 60, inp); inp.action = false; } }'''

async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)

async def step(pg, sec, extra=None):
    await pg.evaluate(STEP, [sec, extra])

async def shot(pg, name, tag, n=8):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v02_{name}_{tag}.png')

async def info(pg):
    return await pg.evaluate('''(() => { const g = window.__gta.game, m = g.mission; return { obj: m.objective, sub: m.sub, money: g.money, active: m.active && m.active.id, stage: m.active && m.active.stage, done: [...m.done], targets: m.targets.map(t => t.kind + (t.letter || '')).join(',') }; })()''')

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
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=90000)
        await pg.evaluate('localStorage.removeItem("gta7-progress")')
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        # opening: let the intro texts play out (simulated time), look north toward the pizzeria
        await step(pg, 19)
        await pg.evaluate('''() => { const g = window.__gta.game; g.player.x = -33.6; g.player.z = -6; g.player.h = Math.PI; window.__gta.view.rig.yaw = Math.PI; }''')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        await shot(pg, name, '01_contact_S', 30)
        print(name, 'intro', await info(pg))
        # start the pizza job by walking into S
        await pg.evaluate('''() => { const g = window.__gta.game; g.player.x = -33.4; g.player.z = -22; }''')
        await step(pg, 0.5)
        await pg.evaluate('''() => { const g = window.__gta.game; g.player.x = -36.5; g.player.z = -22; g.player.h = -Math.PI / 2; window.__gta.view.rig.yaw = -Math.PI / 2; }''')
        await shot(pg, name, '02_pizza_start', 30)
        print(name, 'pizza', await info(pg))
        # into the pizza car
        await pg.evaluate('''() => { const g = window.__gta.game, c = g.pizzaCar, d = c.local(-1.6, 0.3); g.player.x = d.x; g.player.z = d.z; }''')
        await step(pg, 0.1)
        await step(pg, 0.05, {'action': True})
        await step(pg, 1.2)
        await pg.evaluate('''() => { const v = window.__gta.view; v.rig.yaw = window.__gta.game.player.car.h + 2.6; v.rig.manual = 0; }''')
        await shot(pg, name, '03_pizza_car', 30)
        print(name, 'in pizza car', await info(pg))
        # drive up to the first stop
        await pg.evaluate('''() => { const g = window.__gta.game, s = g.mission.active.stops[0], c = g.player.car; const h = Math.atan2(s.x - s.cx, s.z - s.cz) + Math.PI / 2; c.x = s.x - Math.sin(h) * 14; c.z = s.z - Math.cos(h) * 14; c.h = h; c.vx = c.vz = 0; window.__gta.view.rig.yaw = h; }''')
        await step(pg, 0.3)
        await shot(pg, name, '04_pizza_stop', 30)
        # deliver all three (teleport into each zone)
        for i in range(3):
            await pg.evaluate('''i => { const g = window.__gta.game, s = g.mission.active && g.mission.active.stops[i], c = g.player.car; if (!s) return; c.x = s.x; c.z = s.z; c.vx = c.vz = 0; }''', i)
            await step(pg, 0.6)
        await shot(pg, name, '05_pizza_done', 12)
        print(name, 'pizza done', await info(pg))
        await step(pg, 4)
        # the race: drive the pizza car into K (Macken) – first a look at the marker
        await pg.evaluate('''() => { const g = window.__gta.game, c = g.player.car; c.x = 46; c.z = 2; c.h = Math.PI / 2; c.vx = c.vz = 0; window.__gta.view.rig.yaw = Math.PI / 2; }''')
        await step(pg, 0.3)
        await shot(pg, name, '06_contact_K', 30)
        await pg.evaluate('''() => { const g = window.__gta.game, c = g.player.car; c.x = 58; c.z = 2; c.vx = c.vz = 0; }''')
        await step(pg, 1.2)
        await shot(pg, name, '07_race_grid', 20)
        await step(pg, 1.2)
        await shot(pg, name, '08_race_count', 4)
        print(name, 'race', await info(pg))
        await step(pg, 2.4)
        # let the rivals go for a few seconds while the player holds back a little
        await step(pg, 2.5, {'throttleAxis': 0.6, 'steerAxis': 0})
        await shot(pg, name, '09_race_go', 20)
        print(name, 'racing', await info(pg))
        # pause menu with the mission list
        await pg.evaluate('window.__gta.pause()')
        await shot(pg, name, '10_pause', 6)
        await pg.evaluate('window.__gta.resume()')
        # leave the car and lose the race
        await step(pg, 0.05, {'action': True})
        await step(pg, 16)
        await shot(pg, name, '11_race_fail', 10)
        print(name, 'after fail', await info(pg))
        # finish everything: Lasse via the red car, then the race through the manager
        await pg.evaluate('''() => { const g = window.__gta.game, m = g.mission; m.done.add('race'); m.done.add('lasse'); m.done.add('red'); m.lasse = 'done'; m.checkAllDone(); }''')
        await step(pg, 10.5)
        await shot(pg, name, '12_endcard', 10)
        saved = await pg.evaluate('localStorage.getItem("gta7-progress")')
        print(name, 'saved', saved[:160] if saved else None)
        print(name, 'logs', json.dumps(logs[:25], ensure_ascii=False, indent=1))
        await b.close()

which = sys.argv[1] if len(sys.argv) > 1 else 'land'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
