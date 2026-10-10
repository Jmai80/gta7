# v1.3 walkthrough: the "LJUD AV" badge and the car radio. Listens to the game's output (an analyser
# tapped in before every connection to the speakers): into a red car (Glada Hits), into a blue one
# (Blå Lounge), B turns the radio off, M turns all sound off (a toast and the badge), tapping the
# badge turns it on again. Usage: python3 test/browser/v13.py phone|land|desk (shots in test/shots/v13_*)
import asyncio, sys, json, os
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"]
TAP = '''(() => { const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (t, ...r) { const out = orig.call(this, t, ...r);
    if (t instanceof AudioDestinationNode) { const c = this.context; if (!c.__an) { c.__an = c.createAnalyser(); c.__an.fftSize = 4096; window.__ctxs = (window.__ctxs || []).concat(c); } orig.call(this, c.__an); }
    return out; }; })();'''
# loudness of the output over ~0.6 s (peak and rms), sampled a few times
LISTEN = '''() => new Promise((res) => { const c = (window.__ctxs || [])[0]; if (!c) return res(null); const a = new Float32Array(4096); let s = 0, n = 0, pk = 0, k = 0;
  const f = () => { c.__an.getFloatTimeDomainData(a); for (const v of a) { s += v * v; n++; pk = Math.max(pk, Math.abs(v)); } if (++k < 6) setTimeout(f, 100); else res({ rms: Math.sqrt(s / n), peak: pk, state: c.state }); }; f(); })'''
STEP = '''([sec]) => { const G = window.__gta, g = G.game; for (let i = 0; i < Math.round(sec * 60); i++) g.step(1 / 60, { moveX: 0, moveY: 0, camYaw: G.view.rig.yaw }); }'''
INTO = '''(paint) => { const G = window.__gta, g = G.game, p = g.player; if (p.inCar) { const old = p.car; p.exitCar(); g.removeVehicle(old); }
  const z = paint === 'red' ? 12 : -2; const c = g.addVehicle('sedan', paint, -37.5, z, Math.PI); G.view.rig.yaw = Math.PI; const d = c.local(-1.6, 0.3); p.x = d.x; p.z = d.z; p.y = g.world.groundHeight(p.x, p.z); return c.id; }'''
TOAST = '''() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent : null; }'''
async def main(name, w, h, mobile):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
        await route_cdn(ctx); await ctx.add_init_script(TAP)
        pg = await ctx.new_page()
        logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(URL)
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=120000)
        await pg.evaluate("localStorage.setItem('gta7-progress', JSON.stringify({ v: 2, money: 500, done: ['red', 'lasse'], known: ['lasse'], seen: ['lasse'], stats: {} }))")
        await pg.click('#bStart' if await pg.query_selector('#bStart') else 'text=SPELA')
        await pg.wait_for_timeout(1200)
        await pg.add_style_tag(content='#phone { visibility: hidden !important; }')
        quiet = await pg.evaluate(LISTEN)
        # a red car: Glada Hits
        await pg.evaluate(INTO, 'red')
        await pg.evaluate("() => window.__gta.game.step(1 / 60, { action: true, moveX: 0, moveY: 0 })")
        await pg.wait_for_timeout(1300)
        t_red = await pg.evaluate(TOAST)
        red = await pg.evaluate(LISTEN)
        await pg.screenshot(path=f'test/shots/v13_{name}_01_red.png')
        # a blue car: Blå Lounge
        await pg.evaluate(INTO, 'blue')
        await pg.wait_for_timeout(300)
        await pg.evaluate("() => window.__gta.game.step(1 / 60, { action: true, moveX: 0, moveY: 0 })")
        await pg.wait_for_timeout(1300)
        t_blue = await pg.evaluate(TOAST)
        blue = await pg.evaluate(LISTEN)
        await pg.screenshot(path=f'test/shots/v13_{name}_02_blue.png')
        # B: the radio off (the engine is still there)
        await pg.keyboard.press('KeyB'); await pg.wait_for_timeout(900)
        t_off = await pg.evaluate(TOAST)
        off = await pg.evaluate(LISTEN)
        await pg.keyboard.press('KeyB'); await pg.wait_for_timeout(600)
        # M: all sound off – a toast and the LJUD AV badge
        await pg.keyboard.press('KeyM'); await pg.wait_for_timeout(700)
        t_mute = await pg.evaluate(TOAST)
        badge = await pg.evaluate("() => !document.getElementById('muted').hidden")
        muted = await pg.evaluate(LISTEN)
        await pg.screenshot(path=f'test/shots/v13_{name}_03_muted.png')
        # tap the badge: sound on again
        await pg.click('#muted'); await pg.wait_for_timeout(900)
        t_on = await pg.evaluate(TOAST)
        badge2 = await pg.evaluate("() => !document.getElementById('muted').hidden")
        on = await pg.evaluate(LISTEN)
        await pg.screenshot(path=f'test/shots/v13_{name}_04_on.png')
        # a reload with the sound off: it says so at the start
        await pg.keyboard.press('KeyM'); await pg.wait_for_timeout(500)
        await pg.reload()
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=120000)
        await pg.click('#bStart' if await pg.query_selector('#bStart') else 'text=SPELA')
        t_start = None
        for _ in range(20):
            await pg.wait_for_timeout(150)
            t_start = t_start or await pg.evaluate(TOAST)
        badge3 = await pg.evaluate("() => !document.getElementById('muted').hidden")
        await pg.screenshot(path=f'test/shots/v13_{name}_05_start.png')
        r = {'quiet': quiet, 'red': [t_red, red], 'blue': [t_blue, blue], 'off': [t_off, off], 'mute': [t_mute, badge, muted], 'on': [t_on, badge2, on], 'start': [t_start, badge3]}
        print(name, json.dumps(r, ensure_ascii=False))
        ok = (red['rms'] > quiet['rms'] * 3 and blue['rms'] > quiet['rms'] * 3 and red['peak'] < 1.0 and t_red and 'Glada Hits' in t_red and t_blue and 'Blå Lounge' in t_blue
              and off['rms'] < red['rms'] * 0.8 and t_mute and 'Ljud av' in t_mute and badge and muted['rms'] < 0.002 and t_on == 'Ljud på' and not badge2 and on['rms'] > 0
              and t_start and 'avstängt' in t_start and badge3)
        print(name, 'V13', 'ok' if ok else 'FAIL')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
