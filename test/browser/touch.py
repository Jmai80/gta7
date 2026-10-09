# Drives the floating joystick with real touch events (CDP) and checks that the player walks, then drives.
import asyncio, json
from playwright.async_api import async_playwright
import sys as _s; _s.path.insert(0, "/home/claude/gta7/test")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

async def frames(pg, n):
    await pg.evaluate('n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })', n)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 640, 'height': 360}, device_scale_factor=1, is_mobile=True, has_touch=True)
        await route_cdn(ctx)
        pg = await ctx.new_page()
        logs = []
        pg.on('pageerror', lambda e: logs.append(str(e)))
        await pg.goto(URL)
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=60000)
        # tap the title to start (real touch)
        await pg.tap('#play')
        await frames(pg, 3)
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        cdp = await ctx.new_cdp_session(pg)
        async def touch(kind, x, y):
            pts = [] if kind == 'touchEnd' else [{'x': x, 'y': y, 'id': 1}]
            await cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': pts})
        g0 = await pg.evaluate('(() => { const p = window.__gta.game.player; return [p.x, p.z, p.state] })()')
        await touch('touchStart', 120, 250)
        for k in range(8):
            await touch('touchMove', 120, 250 - k * 8)
        await frames(pg, 25)
        mid = await pg.evaluate('(() => { const p = window.__gta.game.player; const i = window.__gta; return [p.x, p.z, p.state, Math.hypot(p.vx, p.vz)] })()')
        stick = await pg.evaluate('document.getElementById("stick").className')
        await touch('touchEnd', 0, 0)
        await frames(pg, 10)
        print('start', g0, 'after stick up', mid, 'stick class while held:', stick)
        moved_north = g0[1] - mid[1]
        print('moved north by', round(moved_north, 2), 'm')
        # put the player into the red car and drive with the stick
        await pg.evaluate('''() => { const g = window.__gta.game; const red = g.vehicles.find(v => v.parkedSpot && v.isRed); const d = red.local(-1.8, 0.4); g.player.x = d.x; g.player.z = d.z; }''')
        await frames(pg, 3)
        await pg.tap('#bAction')
        await frames(pg, 15)
        car = await pg.evaluate('(() => { const p = window.__gta.game.player; return [p.state, p.car && p.car.paint] })()')
        print('after tapping action:', car)
        await touch('touchStart', 120, 250)
        for k in range(8):
            await touch('touchMove', 120, 250 - k * 8)
        await frames(pg, 30)
        sp = await pg.evaluate('(() => { const c = window.__gta.game.player.car; return [c.speed * 3.6, c.input.throttle, c.input.steer] })()')
        await touch('touchEnd', 0, 0)
        print('driving with stick up: km/h, throttle, steer =', sp)
        # handbrake button press & hold via touch on the button
        bb = await pg.evaluate('(() => { const r = document.getElementById("bHand").getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2] })()')
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': bb[0], 'y': bb[1], 'id': 2}]})
        await frames(pg, 4)
        hb = await pg.evaluate('window.__gta.game.player.car.input.handbrake')
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        await frames(pg, 2)
        hb2 = await pg.evaluate('window.__gta.game.player.car.input.handbrake')
        print('handbrake while held:', hb, 'after release:', hb2)
        await pg.screenshot(path='test/shots/touch_drive.png')
        print('errors', logs)
        await b.close()
asyncio.run(main())
