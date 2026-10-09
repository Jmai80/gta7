# Saved progress: title info, restore on SPELA, two-tap "Börja om".
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
SAVE = {"v": 2, "money": 6450, "done": ["red", "lasse", "pizza"], "stats": {"carsStolen": 3, "crashes": 4, "maxSpeed": 97, "driven": 2400, "pizzas": 3, "playTime": 410}}

async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=1, is_mobile=True, has_touch=True)
        await route_cdn(ctx)
        await ctx.add_init_script(f'localStorage.setItem("gta7-progress", {json.dumps(json.dumps(SAVE))})')
        pg = await ctx.new_page()
        logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(URL)
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=90000)
        await frames(pg, 6)
        print('title info:', await pg.evaluate('document.getElementById("saveInfo").hidden ? null : document.getElementById("saveInfo").textContent'))
        await pg.screenshot(path='test/shots/v02_save_title.png')
        await pg.tap('#play')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await frames(pg, 40)
        st = await pg.evaluate('(() => { const g = window.__gta.game, m = g.mission; return { money: g.money, done: [...m.done], lasse: m.lasse, obj: m.objective, moneyText: document.getElementById("money").textContent, targets: m.targets.map(t => t.kind + (t.letter||"")).join(",") }; })()')
        print('after SPELA:', st)
        await pg.screenshot(path='test/shots/v02_save_play.png')
        await pg.tap('#pause')
        await frames(pg, 3)
        await pg.tap('#mRestart')
        print('restart label:', await pg.evaluate('document.getElementById("mRestart").textContent'))
        await pg.screenshot(path='test/shots/v02_save_restart.png')
        await pg.tap('#mRestart')
        await frames(pg, 5)
        st = await pg.evaluate('(() => { const g = window.__gta.game; return { state: window.__gta.state, money: g.money, done: [...g.mission.done], saved: localStorage.getItem("gta7-progress") }; })()')
        print('after restart:', st)
        print('logs', logs[:10])
        await b.close()

asyncio.run(main())
