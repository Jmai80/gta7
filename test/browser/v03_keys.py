# Keyboard: J answers the SMS on screen, Enter accepts, U opens the quest log, Esc closes,
# and none of those keys leak into the game afterwards (no pause, no car entering).
import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 1280, 'height': 760}, device_scale_factor=1)
        await route_cdn(ctx)
        pg = await ctx.new_page()
        logs = []
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(URL)
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=90000)
        await pg.evaluate('localStorage.removeItem("gta7-progress")')
        await pg.keyboard.press('Enter')  # title → play? (pointer only) – use the button
        await pg.click('#play')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.evaluate('''() => { const g = window.__gta.game; for (let i = 0; i < 100; i++) g.step(1/60, { moveX: 0, moveY: 0, camYaw: Math.PI }); }''')
        await pg.wait_for_function('document.getElementById("phone").classList.contains("offer")', timeout=60000)
        print('act text:', await pg.evaluate('document.querySelector("#phone .act").textContent'))
        await pg.keyboard.press('KeyJ')
        await frames(pg, 3)
        print('after J:', await pg.evaluate('window.__gta.state'), 'focused:', await pg.evaluate('document.activeElement && document.activeElement.id'))
        await pg.keyboard.press('Enter')
        await frames(pg, 4)
        print('after Enter:', await pg.evaluate('({ state: window.__gta.state, tracked: window.__gta.game.mission.tracked, playerState: window.__gta.game.player.state })'))
        await pg.keyboard.press('KeyU')
        await frames(pg, 3)
        print('after U:', await pg.evaluate('window.__gta.state'), await pg.evaluate('document.querySelectorAll("#qList .q").length'), 'entries')
        await pg.keyboard.press('Escape')
        await frames(pg, 4)
        print('after Esc:', await pg.evaluate('window.__gta.state'))
        await frames(pg, 6)
        print('still playing:', await pg.evaluate('window.__gta.state'))
        print('logs', logs)
        await b.close()

asyncio.run(main())
