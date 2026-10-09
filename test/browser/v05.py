# Version 0.5 walkthrough: the handover on the pier – the offer, the figure on the bench, the walk-up,
# the conversation (the reveal, the clue about the north bridge), the reward and the quest log.
# Screenshots in test/shots/v05_<mode>_*.png
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

# step the game with the camera following (no input)
STEPCAM = '''([sec]) => { const G = window.__gta, g = G.game;
  for (let i = 0; i < Math.round(sec * 60); i++) { g.step(1 / 60, { moveX: 0, moveY: 0, action: false, camYaw: G.view.rig.yaw, analog: true }); G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
WALK = '''([x, z, mag, maxSec]) => { const G = window.__gta, g = G.game, p = g.player; let t = 0;
  while (t < maxSec) { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d < 0.25 || g.mission.active) break;
    const ux = dx / d, uz = dz / d, y = G.view.rig.yaw; const my = ux * Math.sin(y) + uz * Math.cos(y), mx = -ux * Math.cos(y) + uz * Math.sin(y);
    g.step(1 / 60, { moveX: mx * mag, moveY: my * mag, action: false, camYaw: y, analog: true }); t += 1 / 60; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); }
  return t; }'''

async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)

async def info(pg):
    return await pg.evaluate('''(() => { const G = window.__gta, g = G.game, m = g.mission, gun = m.flag.gun; return { state: G.state, obj: m.objective, active: m.active && m.active.id, stage: m.active && m.active.stage, talk: G.talk && G.talk.i, gun: { away: !!gun.away, disguised: !!gun.disguised, st: gun.state, x: +gun.x.toFixed(2), z: +gun.z.toFixed(2) }, p: [+g.player.x.toFixed(2), +g.player.z.toFixed(2)], money: g.money, done: [...m.done] }; })()''')

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
        # part 1 done (the short way), then a few seconds outside: the unknown number texts
        await pg.evaluate('''() => { const m = window.__gta.game.mission; for (const id of ['lasse', 'pizza', 'race', 'samuel']) { m.known.add(id); m.seen.add(id); } m.done.add('samuel'); m.flags.doneAt = { samuel: m.t }; m.flags.answerHint = true; }''')
        await pg.evaluate(STEPCAM, [6.5])
        await frames(pg, 30)
        await pg.screenshot(path=f'test/shots/v05_{name}_01_sms.png')
        await pg.evaluate('() => window.__gta.openOffer("overlamning")')
        await frames(pg, 3)
        await pg.screenshot(path=f'test/shots/v05_{name}_02_offer.png')
        if mobile: await pg.tap('#ofAccept')
        else: await pg.click('#ofAccept')
        await frames(pg, 2)
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        print(name, 'accepted', json.dumps(await info(pg), ensure_ascii=False))
        # out on the pier: the figure on the bench at the far end
        await pg.evaluate('''() => { const G = window.__gta, g = G.game, p = g.player; p.x = -74.2; p.z = -147.5; p.h = Math.PI; p.y = g.world.groundHeight(p.x, p.z); G.view.rig.yaw = Math.PI; G.view.rig.k = 1; }''')
        await pg.evaluate(STEPCAM, [0.5])
        await pg.evaluate(WALK, [-74.4, -158, 0.6, 8])
        await frames(pg, 20)
        await pg.screenshot(path=f'test/shots/v05_{name}_03_pier.png')
        print(name, 'on the pier', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate(WALK, [-75, -166.9, 0.5, 10])
        await pg.evaluate(STEPCAM, [1.0])
        await frames(pg, 10)
        await pg.screenshot(path=f'test/shots/v05_{name}_04_walkup.png')
        print(name, 'walk-up', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate(STEPCAM, [1.6])
        await frames(pg, 6)
        await pg.wait_for_function('window.__gta.state === "talk"', timeout=20000)
        await frames(pg, 40)
        await pg.screenshot(path=f'test/shots/v05_{name}_05_talk1.png')
        print(name, 'talk', json.dumps(await info(pg), ensure_ascii=False))
        async def nxt():
            if mobile: await pg.tap('#talk', position={'x': w / 2, 'y': h * 0.3})
            else: await pg.click('#tkNext')
            await pg.wait_for_timeout(330)
        await nxt()
        await frames(pg, 10)
        await pg.screenshot(path=f'test/shots/v05_{name}_06_talk2_you.png')
        await nxt()
        await frames(pg, 70)
        await pg.screenshot(path=f'test/shots/v05_{name}_07_talk3_reveal.png')
        print(name, 'reveal', json.dumps(await info(pg), ensure_ascii=False))
        for _ in range(3): await nxt()
        await frames(pg, 10)
        await pg.screenshot(path=f'test/shots/v05_{name}_08_talk6_bullbilen.png')
        await nxt()
        await nxt()
        await frames(pg, 30)
        await pg.screenshot(path=f'test/shots/v05_{name}_09_talk8_bridge.png')
        await nxt()
        await frames(pg, 10)
        await pg.screenshot(path=f'test/shots/v05_{name}_10_talk9_last.png')
        print(name, 'last page', json.dumps(await info(pg), ensure_ascii=False))
        await nxt()
        await frames(pg, 12)
        await pg.screenshot(path=f'test/shots/v05_{name}_11_done.png')
        print(name, 'done', json.dumps(await info(pg), ensure_ascii=False))
        await pg.evaluate('() => window.__gta.openLog()')
        await frames(pg, 3)
        await pg.screenshot(path=f'test/shots/v05_{name}_12_log.png')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()

which = sys.argv[1] if len(sys.argv) > 1 else 'land'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
