# v0.9 walkthrough: the safe's ending offers the konditori, the two new side quests, Syltburken and Bullfabriken
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
STEP = '''([sec]) => { const G = window.__gta, g = G.game; const inp = { moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, analog: true };
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def info(pg):
    return await pg.evaluate('''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active; return { state: G.state, obj: m.objective, sub: m.sub, active: j && j.id, stage: j && j.stage, money: g.money }; })()''')
async def talk(pg, name, tag, at=1):
    await frames(pg, 6)
    n = 0
    while await pg.evaluate('window.__gta.state') == 'talk' and n < 14:
        await frames(pg, 3)
        if n == at: await pg.screenshot(path=f'test/shots/v09_{name}_{tag}.png')
        await pg.wait_for_timeout(250)
        await pg.evaluate('window.__gta.nextTalk()')
        n += 1
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
        done = ['red', 'lasse', 'pizza', 'race', 'samuel', 'overlamning', 'cykel', 'livs', 'flag', 'nycklar', 'kassaskap', 'konditori', 'verkstad', 'hopp', 'cykelretur', 'hemleverans']
        save = {'v': 2, 'money': 9000, 'done': done, 'known': done[1:], 'seen': done[1:], 'stats': {}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.evaluate(STEP, [4])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v09_{name}_01_waiting.png')
        print(name, 'waiting', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate(STEP, [7])
        await pg.evaluate('() => window.__gta.openOffer("syltburken")')
        await frames(pg, 3)
        await pg.screenshot(path=f'test/shots/v09_{name}_02_offer.png')
        await pg.tap('#ofAccept') if mobile else await pg.click('#ofAccept')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        await pg.evaluate(STEP, [0.5])
        # get into a car behind the black car
        await pg.evaluate('''() => { const g = window.__gta.game, j = g.mission.active, c = j.car;
          const pc = g.addVehicle('sedan', 'blue', c.x - Math.sin(c.h) * 12, c.z - Math.cos(c.h) * 12, c.h);
          const d = pc.local(-1.6, 0.3); g.player.x = d.x; g.player.z = d.z; g.step(1/60, { action: true, moveX: 0, moveY: 0, camYaw: c.h, analog: true }); window.__gta.view.rig.yaw = c.h; }''')
        await pg.evaluate(STEP, [1.5])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v09_{name}_03_chase.png')
        await pg.evaluate('''() => { const g = window.__gta.game, j = g.mission.active; for (let k = 0; k < 6 && j.stage === 'chase'; k++) g.onCrash(j.car, 9, g.player.car, j.car.x, j.car.z); }''')
        await pg.evaluate(STEP, [1.0])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v09_{name}_04_stopped.png')
        print(name, 'stopped', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate('''() => { const g = window.__gta.game, j = g.mission.active; j.jar = true; j.stage = 'return'; g.player.exitCar(true); }''')
        await pg.evaluate('''() => { const g = window.__gta.game, p = g.player; p.x = -6; p.z = 17.4; p.y = g.world.groundHeight(-6, 17.4); }''')
        await pg.evaluate(STEP, [1.2])
        await talk(pg, name, '05_bengt', 1)
        await pg.evaluate(STEP, [13])
        print(name, 'after jar', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate('() => window.__gta.openOffer("fabriken")')
        await frames(pg, 3)
        await pg.tap('#ofAccept') if mobile else await pg.click('#ofAccept')
        await pg.evaluate(STEP, [0.5])
        await pg.evaluate('''() => { const g = window.__gta.game, c = g.addVehicle('sedan', 'blue', 42.6, -279, Math.PI);
          const d = c.local(-1.6, 0.3); g.player.x = d.x; g.player.z = d.z; g.player.y = g.world.groundHeight(d.x, d.z); window.__gta.view.rig.yaw = Math.PI; }''')
        await pg.evaluate(STEP, [0.3])
        await pg.evaluate('''() => { const g = window.__gta.game; g.step(1/60, { action: true, moveX: 0, moveY: 0, camYaw: Math.PI, analog: true }); }''')
        await pg.evaluate(STEP, [4])
        print(name, 'waited', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate('''() => { const G = window.__gta, g = G.game, j = g.mission.active, tr = j.truck, c = g.player.car;
          for (let i = 0; i < 60 * 14; i++) { c.x = tr.x - Math.sin(tr.h) * 28; c.z = tr.z - Math.cos(tr.h) * 28; c.h = tr.h; c.vx = tr.vx; c.vz = tr.vz;
            g.step(1/60, { moveX: 0, moveY: 0, action: false, camYaw: G.view.rig.yaw, analog: true }); G.view.rig.update(1/60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }''')
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v09_{name}_06_tail.png')
        print(name, 'tail', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate('''() => { const G = window.__gta, g = G.game, j = g.mission.active, tr = j.truck, c = g.player.car;
          for (let i = 0; i < 60 * 120 && j.stage === 'tail'; i++) { c.x = tr.x - Math.sin(tr.h) * 28; c.z = tr.z - Math.cos(tr.h) * 28; c.h = tr.h; c.vx = tr.vx; c.vz = tr.vz;
            g.step(1/60, { moveX: 0, moveY: 0, action: false, camYaw: G.view.rig.yaw, analog: true }); G.view.rig.update(1/60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }''')
        print(name, 'arrived', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate('''() => { const g = window.__gta.game; g.player.exitCar(true); const p = g.player; p.x = -58; p.z = 92; p.y = g.world.groundHeight(-58, 92); p.h = 0; window.__gta.view.rig.yaw = 0; }''')
        await pg.evaluate(STEP, [0.8]); await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v09_{name}_07_site.png')
        await pg.evaluate('''() => { const g = window.__gta.game, p = g.player; p.x = -57; p.z = 99.8; }''')
        await pg.evaluate(STEP, [1.0])
        await talk(pg, name, '08_finale', 8)
        await pg.evaluate(STEP, [1.5]); await frames(pg, 12)
        await pg.screenshot(path=f'test/shots/v09_{name}_09_done.png')
        await pg.evaluate(STEP, [16]); await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v09_{name}_10_end.png')
        print(name, 'end', json.dumps(await info(pg), ensure_ascii=False))
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
which = sys.argv[1] if len(sys.argv) > 1 else 'land'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
