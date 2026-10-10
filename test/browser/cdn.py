# Serve the jsDelivr three.js files from node_modules (the sandbox has no CDN access),
# so tests exercise exactly the production import URLs.
# (v1.1.1) The path is found from this file, so the scripts work wherever the repo is cloned (run
# them from the repo's root: the screenshots go to test/shots/). GTA7_CHROME=/path/to/chrome makes
# Playwright launch that browser instead of its own Chromium (for a machine where
# `playwright install` can't download one, e.g. Chrome for Testing via `npx @puppeteer/browsers`).
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'node_modules', 'three', 'build')
if not os.path.isdir(ROOT): ROOT = '/home/claude/gta7/node_modules/three/build/'

_exe = os.environ.get('GTA7_CHROME')
if _exe:
    from playwright.async_api import BrowserType
    _launch = BrowserType.launch
    async def _launch_with(self, *a, **kw):
        kw.setdefault('executable_path', _exe)
        return await _launch(self, *a, **kw)
    BrowserType.launch = _launch_with

async def route_cdn(ctx):
    async def handler(route):
        name = route.request.url.rsplit('/', 1)[-1]
        path = os.path.join(ROOT, name)
        if os.path.exists(path):
            await route.fulfill(path=path, content_type='text/javascript', headers={'Access-Control-Allow-Origin': '*'})
        else:
            await route.abort()
    await ctx.route('https://cdn.jsdelivr.net/npm/three@0.184.0/build/*', handler)
