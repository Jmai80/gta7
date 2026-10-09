# Scripted play-through in headless Chromium with screenshots of each step.
import asyncio, sys, json
from playwright.async_api import async_playwright
import sys as _s; _s.path.insert(0, "/home/claude/gta7/test")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

async def wait_frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)

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
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=60000)
        await pg.evaluate('window.__gta.start()')
        # skip the camera swoop
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        await wait_frames(pg, 20)
        fps = await pg.evaluate('window.__gta.perf.fps')
        print(name, 'headless fps', fps)
        await pg.screenshot(path=f'test/shots/{name}_1_foot.png')
        # stand next to the parked red car
        await pg.evaluate('''() => { const g = window.__gta.game; const red = g.vehicles.find(v => v.parkedSpot && v.isRed); const d = red.local(-1.8, 0.4); g.player.x = d.x; g.player.z = d.z; g.player.h = red.h - Math.PI/2; window.__gta.view.rig.yaw = red.h + 0.6; }''')
        await wait_frames(pg, 30)
        await pg.screenshot(path=f'test/shots/{name}_2_near.png')
        # steal it (press E / tap STJÄL)
        if mobile:
            await pg.tap('#bAction')
        else:
            await pg.keyboard.press('KeyE')
        await wait_frames(pg, 40)
        await pg.screenshot(path=f'test/shots/{name}_3_incar.png')
        st = await pg.evaluate('(() => { const g = window.__gta.game; return { state: g.player.state, money: g.money, stage: g.mission.stage } })()')
        print(name, st)
        # drive out of the lot for a moment
        if not mobile:
            await pg.keyboard.down('KeyW')
            await wait_frames(pg, 45)
            await pg.keyboard.up('KeyW')
        else:
            await pg.evaluate('''() => { const i = window.__gta; const inp = i.game.player; }''')
        await wait_frames(pg, 10)
        await pg.screenshot(path=f'test/shots/{name}_4_drive.png')
        # jump to the garage approach and look at the checkpoint
        await pg.evaluate('''() => { const g = window.__gta.game; g.time += 0; const c = g.player.car; c.x = 52; c.z = 67; c.h = Math.PI/2; c.vx = c.vz = 0; window.__gta.view.rig.yaw = Math.PI/2; }''')
        await wait_frames(pg, 90)
        await pg.screenshot(path=f'test/shots/{name}_5_garage.png')
        st = await pg.evaluate('(() => { const g = window.__gta.game; return { state: g.player.state, money: g.money, stage: g.mission.stage, objective: g.mission.objective, targets: g.mission.targets.length } })()')
        print(name, st)
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()

which = sys.argv[1] if len(sys.argv) > 1 else 'desk'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
