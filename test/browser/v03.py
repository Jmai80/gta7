# Version 0.3 walkthrough: answering SMS offers, the quest log, following quests, tant Gun's flag.
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]

STEP = '''([sec, extra]) => { const g = window.__gta.game; const inp = Object.assign({ moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, camYaw: window.__gta.view.rig.yaw, analog: true }, extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { g.step(1 / 60, inp); inp.action = false; } }'''

async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)

async def step(pg, sec, extra=None):
    await pg.evaluate(STEP, [sec, extra])

async def shot(pg, name, tag, n=8):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v03_{name}_{tag}.png')

async def info(pg):
    return await pg.evaluate('''(() => { const g = window.__gta.game, m = g.mission; return { state: window.__gta.state, obj: m.objective, sub: m.sub, tracked: m.tracked, new: m.newCount(), money: g.money, flag: Math.round(m.flag.h * 100), prompt: m.prompt, list: m.list().map(q => q.letter + ':' + q.state).join(' '), gps: m.targets.filter(t => t.gps).map(t => t.kind + (t.letter || '')).join(',') }; })()''')

async def tap(pg, sel, mobile):
    if mobile: await pg.tap(sel)
    else: await pg.click(sel)

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
        # Lasse's offer arrives as an SMS you can tap
        await step(pg, 1.6)
        await pg.wait_for_function('document.getElementById("phone").classList.contains("offer")', timeout=60000)
        await shot(pg, name, '01_sms_offer', 4)
        print(name, 'offer sms', await info(pg))
        await tap(pg, '#phone', mobile)
        await frames(pg, 3)
        await shot(pg, name, '02_offer_card', 2)
        print(name, 'card', await info(pg))
        await tap(pg, '#ofAccept', mobile)
        await frames(pg, 2)
        await shot(pg, name, '03_accepted', 6)
        print(name, 'accepted', await info(pg))
        # Sanna's offer: wait with it, then pick it from the list
        await step(pg, 8)
        await pg.evaluate('''() => { const h = window.__gta.hud; h.sms.length = 0; }''')
        await frames(pg, 12)
        await pg.evaluate('() => window.__gta.openOffer("pizza")')
        await frames(pg, 2)
        await tap(pg, '#ofWait', mobile)
        await frames(pg, 2)
        await tap(pg, '#objective', mobile)
        await frames(pg, 3)
        await shot(pg, name, '04_quest_log', 2)
        print(name, 'log', await info(pg))
        await pg.evaluate('''() => { const b = [...document.querySelectorAll('#qList .q')].find(x => /Pizzabudet/.test(x.textContent)); b && b.click(); }''')
        await frames(pg, 2)
        await shot(pg, name, '05_follow_pizza', 8)
        print(name, 'follow pizza', await info(pg))
        # tant Gun waves from her front garden
        await step(pg, 16)
        await pg.evaluate('''() => { const g = window.__gta.game; g.player.x = -98; g.player.z = -46.4; g.player.h = Math.PI; window.__gta.view.rig.yaw = Math.PI + 0.35; }''')
        await step(pg, 0.3)
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        await shot(pg, name, '06_gun', 30)
        await pg.evaluate('''() => { const g = window.__gta.game; g.player.x = -98.6; g.player.z = -50.3; g.player.h = -Math.PI / 2; window.__gta.view.rig.yaw = -Math.PI / 2 + 0.5; }''')
        await step(pg, 0.3)
        await shot(pg, name, '07_prata', 20)
        print(name, 'near gun', await info(pg))
        if mobile: await pg.tap('#bAction')
        else: await pg.keyboard.press('KeyE')
        await frames(pg, 6)
        await shot(pg, name, '08_gun_offer', 2)
        print(name, 'gun card', await info(pg))
        await tap(pg, '#ofAccept', mobile)
        await frames(pg, 2)
        await pg.evaluate('''() => { const g = window.__gta.game; g.player.x = -103.2; g.player.z = -50.6; g.player.h = -Math.PI / 2; window.__gta.view.rig.yaw = -2.3; }''')
        await step(pg, 0.3)
        await step(pg, 1.4, {'actionHeld': True})
        await shot(pg, name, '09_hoisting', 16)
        print(name, 'hoisting', await info(pg))
        await step(pg, 2.2, {'actionHeld': True})
        await shot(pg, name, '10_flag_up', 24)
        await pg.evaluate('''() => { const g = window.__gta.game; g.player.x = -102.5; g.player.z = -33.5; g.player.h = Math.PI; g.camFocus = null; g.mission.flag.admireT = 0; window.__gta.view.rig.yaw = Math.PI; }''')
        await step(pg, 0.2)
        await shot(pg, name, '10b_flag_street', 30)
        print(name, 'flag up', await info(pg))
        await pg.evaluate('window.__gta.pause()')
        await shot(pg, name, '11_pause', 4)
        print(name, 'logs', json.dumps(logs[:25], ensure_ascii=False, indent=1))
        await b.close()

which = sys.argv[1] if len(sys.argv) > 1 else 'land'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
