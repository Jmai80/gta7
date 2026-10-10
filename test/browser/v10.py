# v1.0 walkthrough: Salong Saxen (Fia's hair salon, indoors) and Bullfesten (the party on the square,
# Sander the bike thief, the chase on the red racing bike, Polis-Pia).
# Usage: python3 test/browser/v10.py phone|land|desk  (screenshots in test/shots/v10_*)
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
STEP = '''([sec]) => { const G = window.__gta, g = G.game; const inp = { moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, analog: true };
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
PRESS = '''() => { const G = window.__gta, g = G.game; g.step(1 / 60, { moveX: 0, moveY: 0, action: true, handbrake: false, horn: false, analog: true, camYaw: G.view.rig.yaw }); }'''
TO = '''([x, z, h]) => { const G = window.__gta, g = G.game, p = g.player; p.x = x; p.z = z; p.y = g.world.groundHeight(x, z); p.vx = p.vz = 0; if (h != null) { p.h = h; G.view.rig.yaw = h; } }'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def info(pg):
    return await pg.evaluate('''(() => { const G = window.__gta, g = G.game, m = g.mission, j = m.active;
      return { state: G.state, obj: m.objective, sub: m.sub, active: j && j.id, stage: j && j.stage, prompt: m.prompt, money: g.money, inside: g.indoors.inside }; })()''')
async def shot(pg, name, tag):
    await frames(pg, 16)
    await pg.screenshot(path=f'test/shots/v10_{name}_{tag}.png')
async def talk(pg, name, tag, at=1, upto=20):
    await frames(pg, 6)
    n = 0
    while await pg.evaluate('window.__gta.state') == 'talk' and n < upto:
        await frames(pg, 3)
        if n == at: await pg.screenshot(path=f'test/shots/v10_{name}_{tag}.png')
        await pg.wait_for_timeout(280)
        await pg.evaluate('window.__gta.nextTalk()')
        n += 1
    return n
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
        done = ['red', 'lasse', 'pizza', 'race', 'samuel', 'overlamning', 'cykel', 'livs', 'flag', 'nycklar', 'kassaskap', 'konditori', 'verkstad', 'hopp', 'cykelretur', 'hemleverans', 'syltburken', 'fabriken']
        save = {'v': 2, 'money': 9000, 'done': done, 'known': done[1:], 'seen': done[1:], 'stats': {}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        # ---------------- Salong Saxen
        await pg.evaluate(TO, [-100, -60, 0])
        await pg.evaluate(STEP, [31])
        await pg.evaluate('() => window.__gta.openOffer("salong")')
        await frames(pg, 3)
        await pg.screenshot(path=f'test/shots/v10_{name}_01_offer.png')
        await pg.tap('#ofAccept') if mobile else await pg.click('#ofAccept')
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        await pg.evaluate(TO, [22, 36.5, 3.14159])
        await pg.evaluate(STEP, [0.6])
        await shot(pg, name, '02_front')
        await pg.evaluate(TO, [22, 32.6, 3.14159])
        await pg.evaluate(STEP, [1.6])
        print(name, 'inside', json.dumps(await info(pg), ensure_ascii=False))
        await shot(pg, name, '03_inside')
        await pg.evaluate('''() => { const g = window.__gta.game, j = g.mission.active, t = j.fia; const p = g.player; p.x = t.x - 1.3; p.z = t.z + 0.4; p.y = g.world.groundHeight(p.x, p.z); }''')
        await pg.evaluate(STEP, [0.3])
        await pg.evaluate(PRESS)
        await talk(pg, name, '04_fia', 1)
        await pg.evaluate(STEP, [0.4])
        async def serve(tools, tag):
            await pg.evaluate('''() => new Promise(r => { const g = window.__gta.game, j = g.mission.active; let n = 0;
              const f = () => { const c = j.current; if ((c && c.state === 'chair') || ++n > 1200) r(); else { window.__gta.game.step(1/60, { moveX: 0, moveY: 0, action: false, analog: true, camYaw: window.__gta.view.rig.yaw }); f(); } }; f(); })''')
            for k, tool in enumerate(tools):
                await pg.evaluate('''(id) => { const g = window.__gta.game, p = g.player; const t = window.__salonTools[id]; p.x = t.x; p.z = t.z; p.y = g.world.groundHeight(p.x, p.z); p.vx = p.vz = 0; }''', tool)
                await pg.evaluate(STEP, [0.25])
                if k == 0: await shot(pg, name, f'{tag}_pick')
                await pg.evaluate(PRESS)
                await pg.evaluate('''() => { const g = window.__gta.game, p = g.player, w = window.__salonWork; p.x = w.x + 0.15; p.z = w.z + 1.0; p.y = g.world.groundHeight(p.x, p.z); p.vx = p.vz = 0; }''')
                await pg.evaluate(STEP, [0.3])
                await pg.evaluate(PRESS)
                await pg.evaluate(STEP, [1.2])
            await shot(pg, name, f'{tag}_done')
            print(name, tag, json.dumps(await info(pg), ensure_ascii=False))
        # (the tools and the chair, from the module)
        await pg.evaluate('''async () => { const S = await import('./src/salon.js'); window.__salonTools = S.TOOLS; window.__salonWork = S.SALON.work; }''')
        await serve(['sax', 'bla'], '05_kim')
        await serve(['rak'], '06_bengt')
        await serve(['blond'], '07_lasse')
        await pg.evaluate(STEP, [3.5])
        await talk(pg, name, '08_verdict', 0)
        await pg.evaluate(STEP, [4.5])
        print(name, 'salon done', json.dumps(await info(pg), ensure_ascii=False))
        # out through the door
        await pg.evaluate('''async () => { const S = await import('./src/salon.js'); const g = window.__gta.game, p = g.player; p.x = S.SALON.door.x; p.z = S.SALON.door.z; }''')
        await pg.evaluate(STEP, [0.3])
        await pg.evaluate(PRESS)
        await pg.evaluate(STEP, [1.4])
        print(name, 'outside', json.dumps(await info(pg), ensure_ascii=False))
        # ---------------- Bullfesten
        await pg.evaluate(TO, [-100, -60, 0])
        await pg.evaluate(STEP, [17])
        await pg.evaluate('() => window.__gta.openOffer("bullfest")')
        await frames(pg, 3)
        await pg.tap('#ofAccept') if mobile else await pg.click('#ofAccept')
        await pg.evaluate(STEP, [1])
        print(name, 'party up', await pg.evaluate('window.__gta.game.mission.party.up'))
        # a look at the party from the north side of the square
        await pg.evaluate(TO, [-5, -2, 0.1])
        await pg.evaluate(STEP, [0.8])
        await shot(pg, name, '09_party')
        await pg.evaluate(TO, [-6, 8.4, 0.15])
        await pg.evaluate(STEP, [1.6])
        # the party talk, a picture of each camera: Gun, Samuel, Pia, Sander on the bike, the red racer
        await frames(pg, 6)
        for k in range(9):
            await frames(pg, 3)
            if k in (0, 3, 4, 6, 8):
                await pg.wait_for_timeout(900)
                await frames(pg, 30)
                await pg.screenshot(path=f'test/shots/v10_{name}_10_party{k}.png')
            await pg.wait_for_timeout(280)
            await pg.evaluate('window.__gta.nextTalk()')
        await pg.evaluate(STEP, [0.5])
        print(name, 'chase', json.dumps(await info(pg), ensure_ascii=False))
        # onto the red racing bike, then after him
        await pg.evaluate('''() => { const g = window.__gta.game, r = g.redBike, p = g.player; p.x = r.x - 0.6; p.z = r.z; }''')
        await pg.evaluate(STEP, [0.2])
        await pg.evaluate(PRESS)
        await pg.evaluate(STEP, [0.3])
        await pg.evaluate('''() => { const G = window.__gta, g = G.game, bike = g.bike, red = g.redBike;
          for (let i = 0; i < 60 * 5; i++) { red.x = bike.x - Math.sin(bike.h) * 7; red.z = bike.z - Math.cos(bike.h) * 7; red.h = bike.h; red.vx = bike.vx; red.vz = bike.vz;
            g.step(1/60, { moveX: 0, moveY: 0, action: false, camYaw: G.view.rig.yaw, analog: true }); G.view.rig.update(1/60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }''')
        await shot(pg, name, '12_chase')
        print(name, 'chasing', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate('''() => { const G = window.__gta, g = G.game, bike = g.bike, red = g.redBike, j = g.mission.active;
          for (let i = 0; i < 60 * 6 && j.stage === 'chase'; i++) { red.x = bike.x - Math.sin(bike.h) * 1.2; red.z = bike.z - Math.cos(bike.h) * 1.2; red.h = bike.h; red.vx = bike.vx; red.vz = bike.vz;
            g.step(1/60, { moveX: 0, moveY: 0, action: false, camYaw: G.view.rig.yaw, analog: true }); G.view.rig.update(1/60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
          red.vx = red.vz = 0; }''')
        await pg.evaluate(STEP, [0.12])
        await frames(pg, 4)
        await pg.screenshot(path=f'test/shots/v10_{name}_13_fall.png')
        print(name, 'fell', json.dumps(await info(pg), ensure_ascii=False))
        # off the bike and after him on foot
        await pg.evaluate(PRESS)
        await pg.evaluate(STEP, [0.3])
        await pg.evaluate('''() => { const G = window.__gta, g = G.game, j = g.mission.active, S = g.mission.party.sander;
          for (let i = 0; i < 60 * 12 && j.stage === 'run'; i++) { const p = g.player, dx = S.x - p.x, dz = S.z - p.z, d = Math.hypot(dx, dz) || 1, y = G.view.rig.yaw;
            const ux = dx / d, uz = dz / d;
            g.step(1/60, { moveX: (-ux * Math.cos(y) + uz * Math.sin(y)), moveY: (ux * Math.sin(y) + uz * Math.cos(y)), action: false, camYaw: y, analog: true, sprint: true });
            G.view.rig.update(1/60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }''')
        await pg.evaluate(STEP, [0.8])
        await talk(pg, name, '14_caught', 3)
        await pg.evaluate(STEP, [1.5]); await frames(pg, 10)
        await pg.screenshot(path=f'test/shots/v10_{name}_15_done.png')
        await pg.evaluate(STEP, [16]); await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v10_{name}_16_end.png')
        print(name, 'end', json.dumps(await info(pg), ensure_ascii=False))
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
