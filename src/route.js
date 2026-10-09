// Shortest paths on the road graph (layout.gps: the town's intersections, the north bridge and the
// roads on Norrholmen). Used by the yellow GPS line on the minimap and by the chasing Bullbilen van.
import { onIsle } from './island.js';

// which piece of land a point is on: the town island, the north bridge or Norrholmen
export function landOf(x, z) {
  if (Math.abs(x - 40) < 7 && z < -140 && z > -233.5) return 'bridge';
  return onIsle(x, z) || z < -229 ? 'isle' : 'town';
}

// the road (graph edge) nearest to (x, z) on the same land: { a, b, t, len, d, px, pz }
export function nearestEdge(G, x, z, land = landOf(x, z)) {
  let best = null;
  const N = G.nodes;
  for (let i = 0; i < N.length; i++) {
    const A = N[i];
    for (const j of A.adj) {
      if (j < i) continue;
      const B = N[j];
      if (land !== 'bridge' && A.land !== land && B.land !== land) continue;
      const abx = B.x - A.x, abz = B.z - A.z, l2 = abx * abx + abz * abz || 1;
      const t = Math.max(0, Math.min(1, ((x - A.x) * abx + (z - A.z) * abz) / l2));
      const px = A.x + abx * t, pz = A.z + abz * t, d = Math.hypot(px - x, pz - z);
      if (!best || d < best.d) best = { a: i, b: j, t, len: Math.sqrt(l2), d, px, pz };
    }
  }
  return best;
}

// [[ax, az], …along the roads…, [bx, bz]]: onto the nearest road, the shortest way along the
// roads (Dijkstra – the graph has about 75 nodes), and off the road to the target
export function routePoints(G, ax, az, bx, bz) {
  const s = nearestEdge(G, ax, az), t = nearestEdge(G, bx, bz);
  if (!s || !t) return [[ax, az], [bx, bz]];
  if ((s.a === t.a && s.b === t.b) || (s.a === t.b && s.b === t.a)) return [[ax, az], [s.px, s.pz], [t.px, t.pz], [bx, bz]];
  const N = G.nodes, n = N.length;
  const dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n);
  dist[s.a] = s.t * s.len; dist[s.b] = (1 - s.t) * s.len;
  for (;;) {
    let u = -1, du = Infinity;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < du) { du = dist[i]; u = i; }
    if (u < 0 || (done[t.a] && done[t.b])) break;
    done[u] = 1;
    for (const v of N[u].adj) {
      const d = du + Math.hypot(N[v].x - N[u].x, N[v].z - N[u].z);
      if (d < dist[v]) { dist[v] = d; prev[v] = u; }
    }
  }
  const end = dist[t.a] + t.t * t.len <= dist[t.b] + (1 - t.t) * t.len ? t.a : t.b;
  const path = [];
  for (let v = end; v !== -1; v = prev[v]) path.unshift([N[v].x, N[v].z]);
  return [[ax, az], [s.px, s.pz], ...path, [t.px, t.pz], [bx, bz]];
}
