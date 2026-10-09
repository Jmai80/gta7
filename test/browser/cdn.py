# Serve the jsDelivr three.js files from node_modules (the sandbox has no CDN access),
# so tests exercise exactly the production import URLs.
import os
ROOT = '/home/claude/gta7/node_modules/three/build/'
async def route_cdn(ctx):
    async def handler(route):
        name = route.request.url.rsplit('/', 1)[-1]
        path = os.path.join(ROOT, name)
        if os.path.exists(path):
            await route.fulfill(path=path, content_type='text/javascript', headers={'Access-Control-Allow-Origin': '*'})
        else:
            await route.abort()
    await ctx.route('https://cdn.jsdelivr.net/npm/three@0.184.0/build/*', handler)
