# v0.9: a line-up of the people (the player, the story characters, a few passers-by) for screenshots
import asyncio, sys, json
from playwright.async_api import async_playwright
sys.path.insert(0, "/home/claude/gta7/test/browser")
from cdn import route_cdn
URL = 'http://localhost:8765/index.html'
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
SETUP = '''async () => {
  const G = window.__gta, g = G.game;
  const { Ped, makeLook } = await import('./src/peds.js');
  const ST = { long: 1, bun: 2, beard: 4, glasses: 8, cap: 16, apron: 32, baker: 64, jacket: 128 };
  const looks = [
    ['Gun', { shirt: 0xb48fd0, pants: 0x3d3550, skin: 0xf2d0b5, hair: 0xdedad2, height: 0.92, bulk: 1.1, style: ST.bun | ST.glasses | ST.jacket, accent: 0x7a5a9a }],
    ['Melker', { shirt: 0x6e7a46, pants: 0x2b2e35, skin: 0xe8b996, hair: 0x3a2618, height: 1.0, bulk: 1.02, style: 16 | 128, accent: 0x3b3f33 }],
    ['Yasmin', { shirt: 0x2f8f83, pants: 0x2b2d36, skin: 0xb98a64, hair: 0x1e1612, height: 0.97, bulk: 1.0, style: 1 | 32, accent: 0x2c62a8 }],
    ['Ingvar', { shirt: 0x2b3d5c, pants: 0x3b3f46, skin: 0xe9c3a6, hair: 0xd8d8d8, height: 1.0, bulk: 1.15, style: 4 | 16, accent: 0x1d2a44 }],
    ['Leif', { shirt: 0x3a5f8a, pants: 0x2b2d36, skin: 0xd9a77e, hair: 0x8a8a8a, height: 0.98, bulk: 1.18, style: 4 | 8 | 32, accent: 0x6b4a32 }],
    ['Bengt', { shirt: 0xf2efe6, pants: 0xe2ddd0, skin: 0xe9c3a6, hair: 0x3a2a1a, height: 1.04, bulk: 1.28, style: 4 | 32 | 64, accent: 0xf8f6f0 }],
    ['Majken', { shirt: 0xe8e2d2, pants: 0x5a4632, skin: 0xf0c8a8, hair: 0xb8b0a0, height: 0.95, bulk: 1.05, style: 2 | 32, accent: 0x8a6a48 }],
  ];
  const R = g.rng;
  for (let i = 0; i < 5; i++) looks.push(['ped', makeLook(R)]);
  const x0 = -4, z = 6;
  const p = g.player; p.x = x0 - 1.0; p.z = z; p.h = 0; p.y = g.world.groundHeight(p.x, p.z);
  looks.forEach(([n, L], i) => {
    const ped = new Ped(g, L);
    ped.x = i < 7 ? x0 + i * 1.0 : x0 + 0.5 + (i - 7) * 1.2; ped.z = i < 7 ? z : z - 2.4; ped.y = g.world.groundHeight(ped.x, ped.z);
    ped.h = ped.standH = 0; ped.state = 'stand'; ped.keep = true; ped.npc = 'studio';
    ped.body.x = ped.x; ped.body.y = ped.y; ped.body.z = ped.z; ped.body.h = 0;
    g.peds.add(ped);
  });
  g.peds.list = g.peds.list.filter((q) => q.npc === 'studio' || Math.hypot(q.x - x0, q.z - z) > 30);
  return looks.length;
}'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 1280, 'height': 760}, device_scale_factor=1)
        await route_cdn(ctx)
        pg = await ctx.new_page()
        logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(URL)
        await pg.wait_for_function('window.__gta && window.__gta.state === "title"', timeout=120000)
        await pg.evaluate('window.__gta.start()')
        await pg.evaluate('() => { const g = window.__gta.game; g.missionActive = false; }')
        print(await pg.evaluate(SETUP))
        await pg.add_style_tag(content='#hud, #phone, .hint, #toast { visibility: hidden !important; }')
        # a fixed camera in front of the line-up
        await pg.evaluate('''() => { const G = window.__gta, g = G.game; g.camFocus = { x: -1.0, y: 1.0, z: 6.0, yaw: Math.PI + 0.2, owner: 'studio', near: true }; G.view.rig.blend = 1; }''')
        for k in range(90):
            await pg.evaluate('() => window.__gta.game.step(1/60, { moveX: 0, moveY: 0, action: false, camYaw: window.__gta.view.rig.yaw, analog: true })')
        await pg.evaluate('n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })', 60)
        await pg.screenshot(path='test/shots/v09_people.png')
        print(json.dumps(logs[:10]))
        await b.close()
asyncio.run(main())
