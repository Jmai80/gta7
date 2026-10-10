# v1.1 walkthrough: the new names (Melker, Vera and Jonte on the offer cards), the new bike wheels in
# a turn (chase camera, Arne's bike and the red racer) and Norrholmen's new beach: walk down the
# boardwalk and out along the jetty (the floor holds you up, the railings and the end keep you on it).
# Usage: python3 test/browser/v11.py phone|land|desk  (screenshots in test/shots/v11_*)
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
STEP = '''([sec, extra]) => { const G = window.__gta, g = G.game; const inp = Object.assign({ moveX: 0, moveY: 0, action: false, handbrake: false, horn: false, analog: true }, extra || {});
  for (let i = 0; i < Math.round(sec * 60); i++) { inp.camYaw = G.view.rig.yaw; g.step(1 / 60, inp); inp.action = false; G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
TO = '''([x, z, h]) => { const G = window.__gta, g = G.game, p = g.player; p.x = x; p.z = z; p.y = g.world.groundHeight(x, z); p.vx = p.vz = 0; if (h != null) { p.h = h; G.view.rig.yaw = h; } }'''
WALK = '''([sec, ux, uz]) => { const G = window.__gta, g = G.game;
  for (let i = 0; i < Math.round(sec * 60); i++) { const y = G.view.rig.yaw;
    g.step(1 / 60, { moveX: -ux * Math.cos(y) + uz * Math.sin(y), moveY: ux * Math.sin(y) + uz * Math.cos(y), action: false, camYaw: y, analog: true });
    G.view.rig.update(1 / 60, g, { camDX: 0 }, G.view.camera.aspect, g.world); } }'''
WHERE = '''(() => { const p = window.__gta.game.player; return [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]; })()'''
async def frames(pg, n):
    await pg.evaluate('''n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })''', n)
async def shot(pg, name, tag, n=16):
    await frames(pg, n)
    await pg.screenshot(path=f'test/shots/v11_{name}_{tag}.png')
async def offer(pg, name, tag, qid, mobile):
    await pg.evaluate(f'() => window.__gta.openOffer("{qid}")')
    await frames(pg, 4)
    card = await pg.evaluate('''() => ({ who: document.getElementById('ofWho').textContent, av: document.getElementById('ofAv').textContent, text: document.getElementById('ofText').textContent })''')
    await pg.screenshot(path=f'test/shots/v11_{name}_{tag}.png')
    await pg.tap('#ofWait') if mobile else await pg.click('#ofWait')
    await frames(pg, 2)
    return card
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
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=120000)
        done = ['red', 'lasse', 'pizza', 'race', 'samuel', 'overlamning', 'cykel', 'livs', 'flag', 'nycklar', 'kassaskap', 'konditori', 'verkstad', 'hopp', 'hemleverans', 'syltburken', 'fabriken']
        save = {'v': 2, 'money': 9000, 'done': done, 'known': done[1:], 'seen': done[1:], 'stats': {}}
        await pg.evaluate('s => localStorage.setItem("gta7-progress", JSON.stringify(s))', save)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('window.__gta.view.rig.blend = 1')
        # ---------------- the three new names, on their offer cards
        cards = {}
        for tag, qid in [('01_melker', 'cykelretur'), ('02_vera', 'salong'), ('03_gun_fest', 'bullfest')]:
            cards[qid] = await offer(pg, name, tag, qid, mobile)
        print(name, 'cards', json.dumps({k: [v['who'], v['av']] for k, v in cards.items()}, ensure_ascii=False))
        texts = await pg.evaluate('''async () => { const M = await import('./src/mission.js'), C = await import('./src/config.js');
          const all = JSON.stringify(M.QUESTS) + JSON.stringify(C.WHO); return { old: ['Samuel', 'Sander', 'Fia'].filter((n) => new RegExp('\\\\b' + n + '\\\\b').test(all)), who: C.WHO }; }''')
        print(name, 'old names left in the quests', texts['old'], 'WHO', texts['who']['samuel'], '/', texts['who']['fia'])
        # ---------------- the wheels' geometry: nothing reaches outside the tyre (the old spokes did)
        wheels = await pg.evaluate('''async () => { const M = await import('./src/models.js'), out = {};
          for (const [name, opt] of [['arne', {}], ['racer', { racer: true }]]) {
            const P = M.buildBike(null, opt), G = P.geo;
            for (const [wh, geo, R] of [['rear', P.rear, G.rearR], ['front', P.front, G.frontR]]) {
              const pos = geo.attributes.position; let maxR = 0, side = 0;
              for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getY(i), pos.getZ(i)); maxR = Math.max(maxR, r); if (r > R * 0.8) side = Math.max(side, Math.abs(pos.getX(i))); }
              out[name + '_' + wh] = { R, maxR: +maxR.toFixed(4), side: +side.toFixed(4) };
            } }
          return out; }''')
        tyre = {'arne': 0.03, 'racer': 0.016}
        wok = all(v['maxR'] <= v['R'] + 1e-4 and v['side'] <= tyre[k.split('_')[0]] + 1e-3 for k, v in wheels.items())
        print(name, 'wheels', json.dumps(wheels), 'WHEELS', 'ok' if wok else 'FAIL')
        await pg.add_style_tag(content='#phone, #hint { visibility: hidden !important; }')
        FREEZE = '''() => { window.__gta.pause(); document.getElementById('pausemenu').hidden = true; }'''
        BIKE = '''(which) => { const g = window.__gta.game, b = which === 'red' ? g.redBike : g.bike, p = g.player; return { on: !!(p.inCar && p.car === b), speed: +(b.speed || 0).toFixed(2), lean: +(b.lean || 0).toFixed(2), steer: +(b.steer || 0).toFixed(2), x: +b.x.toFixed(1), z: +b.z.toFixed(1) }; }'''
        # ---------------- Arne's bike, then the red racer, in a turn: the chase camera sees the front
        # wheel turned (where the old spokes poked out through the tyre). Down Kungsgatan from the north.
        for tag, which, at, steer in [('04_bike_turn', 'arne', (-40.6, 36), 0.7), ('05_racer_turn', 'red', (-39.4, 6), -0.7)]:
            await pg.evaluate('''([which, x, z]) => { const G = window.__gta, g = G.game, p = g.player;
              if (p.inCar) { p.inCar = false; p.car = null; }
              if (which === 'red') g.spawnRedBike(x, z, Math.PI); else g.spawnBike(x, z, Math.PI, false);
              p.x = x + 1.1; p.z = z + 1.2; p.y = g.world.groundHeight(p.x, p.z); p.vx = p.vz = 0; p.h = -2.3; G.view.rig.yaw = Math.PI; G.view.rig.k = 1; }''', [which, at[0], at[1]])
            await pg.evaluate(STEP, [0.4, None])
            await pg.evaluate(STEP, [0.05, {'action': True}])
            await pg.evaluate(STEP, [1.6, {'moveY': 1}])
            await pg.evaluate(STEP, [0.4, {'moveY': 1, 'moveX': steer}])
            await pg.evaluate(FREEZE)
            await shot(pg, name, tag, 6)
            print(name, which, json.dumps(await pg.evaluate(BIKE, which)))
            # the same moment a little closer, from behind on the side the front wheel turns away from
            await pg.evaluate('''([which, side]) => { const G = window.__gta, g = G.game, b = which === 'red' ? g.redBike : g.bike, v = G.view;
              const f = [Math.sin(b.h), Math.cos(b.h)], l = [Math.cos(b.h), -Math.sin(b.h)];
              v.camera.position.set(b.x - f[0] * 2.5 + l[0] * side, 1.25, b.z - f[1] * 2.5 + l[1] * side); v.camera.lookAt(b.x + f[0] * 0.35, 0.55, b.z + f[1] * 0.35);
              for (const id of ['hud', 'touch']) { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; } }''', [which, 1.25 if steer < 0 else -1.25])
            await shot(pg, name, tag + '_close', 6)
            # … and from in front, the front wheel turned into the bend
            await pg.evaluate('''([which, side]) => { const G = window.__gta, g = G.game, b = which === 'red' ? g.redBike : g.bike, v = G.view;
              const f = [Math.sin(b.h), Math.cos(b.h)], l = [Math.cos(b.h), -Math.sin(b.h)];
              v.camera.position.set(b.x + f[0] * 2.3 + l[0] * side, 1.05, b.z + f[1] * 2.3 + l[1] * side); v.camera.lookAt(b.x + f[0] * 0.2, 0.62, b.z + f[1] * 0.2); }''', [which, 1.2 if steer > 0 else -1.2])
            await shot(pg, name, tag + '_front', 6)
            await pg.evaluate('''() => { for (const id of ['hud', 'touch']) { const e = document.getElementById(id); if (e) e.style.visibility = ''; } }''')
            await pg.evaluate('() => window.__gta.resume()')
            await pg.evaluate(STEP, [1.6, {'handbrake': True}])
            await pg.evaluate(STEP, [0.05, {'action': True}])
            await pg.evaluate(STEP, [0.6, None])
        # ---------------- Norrholmen's beach: down the boardwalk and out along the jetty
        await pg.evaluate(TO, [4.0, -253.5, 0])
        await pg.evaluate(STEP, [0.6, None])
        await shot(pg, name, '06_beach_arch')
        path = []
        for k in range(16):
            await pg.evaluate(STEP, [0.5, {'moveY': 1}])
            path.append(await pg.evaluate(WHERE))
        print(name, 'walk out', json.dumps(path))
        end = path[-1]
        # sideways, halfway out: the railings hold (east, then west, then back to land and out again)
        await pg.evaluate(TO, [4.0, -227.0, 0])
        await pg.evaluate(WALK, [1.5, 1, 0])
        side_w = await pg.evaluate(WHERE)
        await pg.evaluate(WALK, [1.5, -1, 0])
        side_e = await pg.evaluate(WHERE)
        await pg.evaluate(WALK, [4.0, 0, -1])
        back = await pg.evaluate(WHERE)
        print(name, 'railings', json.dumps({'end': end, '+x': side_w, '-x': side_e, 'back': back}))
        ok = end[2] > -221.3 and end[2] < -220.2 and 3.1 < side_w[0] < 4.9 and 3.1 < side_e[0] < 4.9 and abs(end[1] - 0.17) < 0.03 and back[2] < -236 and abs(back[1] - 0.15) < 0.03
        print(name, 'JETTY', 'ok' if ok else 'FAIL')
        # turn round on the jetty and look back at the beach
        await pg.evaluate(TO, [4.0, -227.5, 3.14159])
        await pg.evaluate(STEP, [0.8, None])
        await shot(pg, name, '07_jetty_back')
        # on the sand: east to the loungers, the kiosk and the volleyball net; west to the tower and the huts
        await pg.evaluate(TO, [5.6, -234.8, 2.34])
        await pg.evaluate(STEP, [0.8, None])
        await shot(pg, name, '08_parasols')
        await pg.evaluate(TO, [2.2, -234.4, -2.16])
        await pg.evaluate(STEP, [0.8, None])
        await shot(pg, name, '09_tower')
        print(name, 'logs', json.dumps(logs[:20], ensure_ascii=False, indent=1))
        await b.close()
which = sys.argv[1] if len(sys.argv) > 1 else 'phone'
cfg = {'desk': (1280, 760, False), 'phone': (390, 844, True), 'land': (844, 390, True)}[which]
asyncio.run(main(which, *cfg))
