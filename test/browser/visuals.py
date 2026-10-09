import asyncio, json
from playwright.async_api import async_playwright
import sys as _s; _s.path.insert(0, "/home/claude/gta7/test")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
async def frames(pg, n):
    await pg.evaluate('n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })', n)
async def page(p, w, h, mobile=True):
    b = await p.chromium.launch(args=ARGS)
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
    await route_cdn(ctx)
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(URL)
    await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=60000)
    return b, pg, errs
async def main():
    async with async_playwright() as p:
        # title, portrait
        b, pg, errs = await page(p, 390, 844)
        await frames(pg, 6)
        await pg.screenshot(path='test/shots/v_title_portrait.png')
        await b.close()
        # pause + banner + endcard + jump, landscape
        b, pg, errs = await page(p, 844, 390)
        await pg.evaluate('window.__gta.start(); window.__gta.view.rig.blend = 1;')
        await frames(pg, 4)
        await pg.evaluate('window.__gta.pause()')
        await frames(pg, 3)
        await pg.screenshot(path='test/shots/v_pause.png')
        await pg.evaluate('window.__gta.resume()')
        # mid-air jump: put the player in a car on the run-up to the kicker
        await pg.evaluate('''() => { const G = window.__gta, g = G.game; g.mission.stage = 'free';
          const c = g.addVehicle('sedan', 'yellow', -70, 52, 0); c.driver = 'player'; c.input.park = false; c.vz = 25; g.player.car = c; g.player.state = 'car';
          G.view.rig.yaw = 0; }''')
        for k in range(12):
            await frames(pg, 1)
            y = await pg.evaluate('window.__gta.game.player.car.y')
            if y > 2.6: break
        await pg.screenshot(path='test/shots/v_jump.png')
        await pg.evaluate('''() => { const g = window.__gta.game; g.emit('banner', { title: 'UPPDRAG KLART', sub: 'Sno en röd bil', amount: 1000 }); }''')
        await pg.wait_for_timeout(700)
        await pg.screenshot(path='test/shots/v_banner.png')
        await b.close()
        b, pg, errs2 = await page(p, 390, 844)
        await pg.evaluate('window.__gta.start(); window.__gta.view.rig.blend = 1;')
        await frames(pg, 3)
        await pg.evaluate('''() => { const g = window.__gta.game; Object.assign(g.stats, { totalTime: 214, carsStolen: 3, carsJacked: 2, crashes: 7, maxSpeed: 131, driven: 2400, deliveredCondition: 81 }); g.money = 5550; g.emit('endcard', { stats: { ...g.stats, money: g.money } }); }''')
        await frames(pg, 3)
        await pg.screenshot(path='test/shots/v_end.png')
        print('errors', errs, errs2)
        await b.close()
asyncio.run(main())
