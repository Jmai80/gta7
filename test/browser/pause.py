import asyncio, sys
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=1, is_mobile=True, has_touch=True)
        await route_cdn(ctx)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'ERR_TUNNEL' not in m.text else None)
        await pg.goto(URL)
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=60000)
        await pg.tap('#play')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await pg.wait_for_timeout(1500)
        await pg.tap('#pause')
        await pg.wait_for_timeout(800)
        st = await pg.evaluate('window.__gta.state')
        await pg.screenshot(path='test/shots/v_pause2.png')
        await pg.tap('#mDrive')
        await pg.wait_for_timeout(300)
        lbl = await pg.evaluate('document.getElementById("mDrive").textContent + " | " + document.getElementById("game").className')
        await pg.tap('#mResume')
        await pg.wait_for_timeout(500)
        st2 = await pg.evaluate('window.__gta.state')
        print('after pause tap:', st, '| drive toggle:', lbl, '| after resume:', st2, '| errors:', errs)
        await b.close()
asyncio.run(main())
