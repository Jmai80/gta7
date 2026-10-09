# Loads the game in headless Chromium (SwiftShader WebGL2), collects console errors, takes screenshots.
import asyncio, sys, json
from playwright.async_api import async_playwright
import sys as _s; _s.path.insert(0, "/home/claude/gta7/test")
from cdn import route_cdn

URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"]

async def run(name, viewport, mobile, actions):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport=viewport, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
        await route_cdn(ctx)
        pg = await ctx.new_page()
        logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(URL)
        try:
            await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=60000)
        except Exception as e:
            logs.append(f'[timeout] {e}')
        for a in actions:
            await a(pg, name)
        errs = [l for l in logs if 'error' in l.lower() or 'warn' in l.lower()]
        print(name, 'logs:', json.dumps(logs[:40], ensure_ascii=False, indent=1))
        await b.close()

async def shot(pg, path, wait=0):
    if wait: await pg.wait_for_timeout(wait)
    await pg.screenshot(path=path)

async def main():
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    async def title_and_play(pg, name):
        await pg.wait_for_timeout(1500)
        await shot(pg, f'test/shots/{name}_title.png')
        await pg.evaluate('window.__gta.start()')
        await pg.wait_for_timeout(3500)
        await shot(pg, f'test/shots/{name}_play.png')
        info = await pg.evaluate('(() => { const v = window.__gta.view; const i = v.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, dpr: v.dpr, chunks: v.world.chunks, staticTris: v.world.tris } })()')
        print(name, info)
    if which in ('all', 'phone'):
        await run('phone', {'width': 390, 'height': 844}, True, [title_and_play])
    if which in ('all', 'land'):
        await run('land', {'width': 844, 'height': 390}, True, [title_and_play])
    if which in ('all', 'desk'):
        await run('desk', {'width': 1280, 'height': 760}, False, [title_and_play])

asyncio.run(main())
