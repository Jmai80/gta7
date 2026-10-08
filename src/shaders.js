// One shader family for everything opaque: the merged town, instanced cars and
// instanced people. Lighting = hemisphere + sun + a baked shadow/AO map on the ground.
// Facade details (windows, bricks, boards, tiles…) are procedural, so no textures are downloaded.
import * as THREE from './three.js';
import { SUN } from './config.js';

export function makeUniforms() {
  return {
    uSunDir: { value: new THREE.Vector3(SUN.x, SUN.y, SUN.z) },
    uSunCol: { value: new THREE.Color(0xffe4b8).multiplyScalar(0.92) },
    uSkyCol: { value: new THREE.Color(0x9fb8d8).multiplyScalar(0.62) },
    uGndCol: { value: new THREE.Color(0xb59a7c).multiplyScalar(0.42) },
    uHorizon: { value: new THREE.Color(0xeedac3) },
    uZenith: { value: new THREE.Color(0x4f86d4) },
    uShadow: { value: null },
    uShadowRect: { value: new THREE.Vector4(-160, -160, 1 / 320, 1 / 320) },
    uSigns: { value: null },
    uNoise: { value: null },
    uTime: { value: 0 },
  };
}

const COMMON = /* glsl */ `
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i), b = hash12(i + vec2(1.0, 0.0)), c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
`;

const VERT = /* glsl */ `
attribute vec3 aColor;
#ifndef HUMAN
attribute float aMat;
#endif
#ifdef VEHICLE
attribute float aBone;
attribute vec3 aPivot;
attribute vec4 iCar;   // spin, steer, roll, pitch
attribute vec2 iCar2;  // brake light, damage
#endif
#ifdef HUMAN
attribute vec2 aBS;    // x: bone (0 torso/head, 3 arm L, 4 arm R, 5 leg L, 6 leg R), y: colour slot (0 fixed, 1 shirt, 2 pants, 3 skin, 4 hair)
attribute vec3 aPivot;
attribute vec4 iAnim;  // phase, leg amp, arm amp, pose
attribute vec3 iPants;
attribute vec3 iSkin;
attribute vec3 iHair;
#endif
uniform float uTime;
varying vec3 vColor;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUv;
varying float vMat;
varying float vLight;
${COMMON}
#include <fog_pars_vertex>
void main() {
  vec3 p = position;
  vec3 n = normal;
  vColor = aColor;
  vLight = 0.0;
#ifdef VEHICLE
  int bone = int(aBone + 0.5);
  if (bone == 0) {
    mat3 R = rotZ(iCar.z) * rotX(iCar.w);
    p = aPivot + R * (p - aPivot); n = R * n;
  } else {
    mat3 S = rotX(iCar.x);
    mat3 T = bone <= 2 ? rotY(iCar.y) : mat3(1.0);
    p = aPivot + T * (S * (p - aPivot)); n = T * (S * n);
  }
  vLight = iCar2.x;
  #ifdef USE_INSTANCING_COLOR
    if (aMat > 0.5 && aMat < 1.5) vColor = aColor * instanceColor * mix(1.0, 0.72, iCar2.y);
  #endif
#endif
#ifdef HUMAN
  int bone = int(aBS.x + 0.5);
  float sw = sin(iAnim.x);
  float pose = iAnim.w;
  float a = 0.0;
  if (bone == 3) {
    a = -sw * iAnim.z;
    if (pose > 0.5 && pose < 1.5) a = -2.7 + sin(uTime * 15.0) * 0.35;
    if (pose > 2.5) a = -1.4;
  } else if (bone == 4) {
    a = sw * iAnim.z;
    if (pose > 2.5) a = -1.4;
  } else if (bone == 5) a = sw * iAnim.y;
  else if (bone == 6) a = -sw * iAnim.y;
  if (bone >= 3) { mat3 R = rotX(a); p = aPivot + R * (p - aPivot); n = R * n; }
  int sel = int(aBS.y + 0.5);
  #ifdef USE_INSTANCING_COLOR
    if (sel == 1) vColor = instanceColor;
  #endif
  if (sel == 2) vColor = iPants;
  else if (sel == 3) vColor = iSkin;
  else if (sel == 4) vColor = iHair;
#endif
  vec4 wp = vec4(p, 1.0);
  vec3 wn = n;
#ifdef USE_INSTANCING
  wp = instanceMatrix * wp;
  wn = mat3(instanceMatrix) * wn;
#endif
  wp = modelMatrix * wp;
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix) * wn);
#ifdef HUMAN
  vUv = vec2(0.0);
  vMat = 0.0;
#else
  vUv = uv;
  vMat = aMat;
#endif
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uSkyCol;
uniform vec3 uGndCol;
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform sampler2D uShadow;
uniform vec4 uShadowRect;
uniform sampler2D uSigns;
uniform sampler2D uNoise;
uniform float uTime;
varying vec3 vColor;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUv;
varying float vMat;
varying float vLight;
${COMMON}
#include <fog_pars_fragment>

float box2(vec2 p, vec2 lo, vec2 hi, vec2 w) {
  vec2 a = smoothstep(lo - w, lo + w, p) * (1.0 - smoothstep(hi - w, hi + w, p));
  return a.x * a.y;
}
// distance to the nearest grid line, anti-aliased (1 on the line)
float gridLine(float x, float width) {
  float d = abs(fract(x + 0.5) - 0.5);
  float w = fwidth(x) + 1e-4;
  return 1.0 - smoothstep(width - w, width + w, d);
}
float tn(vec2 p) { return texture2D(uNoise, p).r; }
vec3 groundStyle(int m, vec3 albedo) {
  if (m == 18) {        // lawn with mowing stripes
    albedo *= 0.93 + 0.07 * step(0.5, fract(vW.x / 9.0));
    albedo *= 0.86 + 0.26 * tn(vW.xz * 0.011);
  } else if (m == 19) { // paving slabs
    float g = max(gridLine(vW.x, 0.035), gridLine(vW.z, 0.035));
    albedo *= (1.0 - g * 0.16) * (0.94 + 0.12 * tn(vW.xz * 0.021));
  } else if (m == 22) { // asphalt
    albedo *= 0.88 + 0.18 * tn(vW.xz * 0.009) + 0.06 * tn(vW.xz * 0.11);
  } else if (m == 23) { // dirt / gravel
    albedo *= 0.8 + 0.32 * tn(vW.xz * 0.012) + 0.1 * tn(vW.xz * 0.13);
  }
  return albedo;
}
vec3 skyRefl(vec3 r) {
  vec3 sky = mix(uHorizon, uZenith, smoothstep(0.0, 0.6, r.y));
  vec3 gnd = mix(uHorizon * 0.5, uGndCol * 0.6, smoothstep(0.0, -0.35, r.y));
  return r.y >= 0.0 ? sky : gnd;
}

void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 albedo = vColor;
  float glass = 0.0, interior = 0.0, spec = 0.0, emit = 0.0;
  int m = int(vMat + 0.5);
  vec2 aa = fwidth(vUv) * 0.75 + 1e-4;
  float far = smoothstep(0.22, 0.55, max(aa.x, aa.y));
  float hw = abs(N.x) > 0.5 ? vW.z : vW.x;   // horizontal coordinate along a wall

#ifdef GROUND
  albedo = groundStyle(m, albedo);
#else
  if (m == 1) {
    spec = 0.85;
  } else if (m == 2) {
    glass = 1.0;
  } else if (m == 3) {
    emit = 1.0;
  } else if (m == 4) {
    emit = 0.6 + vLight * 1.8;
  } else if (m == 5) {
    albedo = texture2D(uSigns, vUv).rgb;
  } else if (m >= 10) {
    vec2 p = vUv;
    vec2 c = fract(p);
    float h = hash12(floor(p) + floor(vW.xz * 0.07) * 7.0);
    if (m == 10 || m == 14) {
      // punched windows (residential plaster or brick)
      if (m == 14) {
        vec2 bp = vec2(hw, vW.y) * vec2(2.6, 6.5);
        bp.x += step(1.0, mod(floor(bp.y), 2.0)) * 0.5;
        vec2 bf = fract(bp);
        vec2 bw = fwidth(bp) + 1e-4;
        float mortar = 1.0 - box2(bf, vec2(0.05, 0.1), vec2(0.95, 0.9), bw);
        float bfar = smoothstep(0.15, 0.4, max(bw.x, bw.y));
        albedo *= mix(0.88 + 0.2 * hash12(floor(bp)), 1.0, bfar);
        albedo = mix(albedo, vec3(0.62, 0.58, 0.52), mortar * 0.55 * (1.0 - bfar));
      }
      float win = box2(c, vec2(0.27, 0.28), vec2(0.73, 0.82), aa);
      float frame = box2(c, vec2(0.23, 0.24), vec2(0.77, 0.86), aa) - win;
      float sill = box2(c, vec2(0.21, 0.2), vec2(0.79, 0.25), aa);
      vec3 fc = m == 14 ? vec3(0.16, 0.16, 0.17) : vec3(0.86, 0.85, 0.82);
      albedo = mix(albedo, fc, clamp(frame + sill, 0.0, 1.0) * (1.0 - far));
      glass = mix(win, 0.2, far);
      interior = step(0.7, h) * 0.65;
    } else if (m == 11) {
      float win = box2(c, vec2(0.05, 0.15), vec2(0.95, 0.97), aa);
      glass = mix(win, 0.8, far);
      interior = step(0.86, h) * 0.4;
    } else if (m == 12) {
      if (p.y < 1.0) {
        vec2 q = vec2(c.x, p.y);
        float win = box2(q, vec2(0.07, 0.08), vec2(0.93, 0.74), aa);
        float frame = box2(q, vec2(0.04, 0.04), vec2(0.96, 0.79), aa) - win;
        albedo = mix(albedo, vec3(0.1, 0.1, 0.11), frame);
        glass = win; interior = 0.85;
      } else {
        float win = box2(c, vec2(0.28, 0.25), vec2(0.72, 0.8), aa);
        float frame = box2(c, vec2(0.24, 0.21), vec2(0.76, 0.84), aa) - win;
        albedo = mix(albedo, vec3(0.88, 0.87, 0.84), frame * (1.0 - far));
        glass = mix(win, 0.2, far);
        interior = step(0.7, h) * 0.65;
      }
    } else if (m == 13 || m == 21) {
      // vertical boards (Falu red houses), optional white-framed windows
      albedo *= 1.0 - gridLine(hw * 5.0, 0.06) * 0.22 * (1.0 - far);
      if (m == 13) {
        float win = box2(c, vec2(0.3, 0.3), vec2(0.7, 0.78), aa);
        float frame = box2(c, vec2(0.25, 0.25), vec2(0.75, 0.83), aa) - win;
        float bars = (box2(c, vec2(0.485, 0.3), vec2(0.515, 0.78), aa) + box2(c, vec2(0.3, 0.525), vec2(0.7, 0.555), aa)) * win;
        albedo = mix(albedo, vec3(0.93, 0.92, 0.89), clamp(frame + bars, 0.0, 1.0) * (1.0 - far * 0.6));
        glass = clamp(win - bars, 0.0, 1.0) * (1.0 - far) + far * 0.12;
        interior = step(0.55, h) * 0.55;
      }
    } else if (m == 15) {
      albedo *= 0.84 + 0.16 * smoothstep(0.35, 0.65, fract(p.y * 9.0));
      float win = box2(c, vec2(0.1, 0.62), vec2(0.9, 0.72), aa);
      glass = win * 0.8;
    } else if (m == 16) {
      albedo *= mix(0.84 + 0.16 * (0.5 + 0.5 * sin(hw * 37.7)), 0.92, far);
    } else if (m == 17) {
      albedo *= 1.0 - gridLine(p.y * 3.0, 0.08) * 0.28 * (1.0 - far);
      albedo *= 0.94 + 0.12 * tn(vW.xz * 0.05);
    } else if (m == 18 || m == 19 || m == 22 || m == 23) {
      albedo = groundStyle(m, albedo);
    } else if (m == 20) {
      vec2 bp = vec2(hw, vW.y) * vec2(2.6, 6.5);
      bp.x += step(1.0, mod(floor(bp.y), 2.0)) * 0.5;
      vec2 bw = fwidth(bp) + 1e-4;
      float mortar = 1.0 - box2(fract(bp), vec2(0.05, 0.1), vec2(0.95, 0.9), bw);
      albedo *= 0.9 + 0.18 * hash12(floor(bp));
      albedo = mix(albedo, vec3(0.62, 0.58, 0.52), mortar * 0.5);
    } else if (m == 24) {
      float l1 = 1.0 - smoothstep(0.05, 0.05 + aa.x * 2.0, abs(c.x - c.y));
      float l2 = 1.0 - smoothstep(0.05, 0.05 + aa.x * 2.0, abs(c.x + c.y - 1.0));
      float edge = 1.0 - box2(c, vec2(0.07), vec2(0.93), aa);
      float lines = clamp(l1 + l2 + edge, 0.0, 1.0);
      albedo = mix(albedo * 0.22, albedo, mix(lines, 0.6, far));
    } else if (m == 25) {
      vec2 bp = vec2(hw, vW.y) * vec2(0.9, 2.2);
      bp.x += step(1.0, mod(floor(bp.y), 2.0)) * 0.5;
      float j = 1.0 - box2(fract(bp), vec2(0.03, 0.06), vec2(0.97, 0.94), fwidth(bp) + 1e-4);
      albedo *= (0.86 + 0.2 * hash12(floor(bp))) * (1.0 - j * 0.3);
    } else if (m == 26) {
      float t = abs(N.y) > 0.5 ? vUv.y : vW.y;
      albedo *= 1.0 - gridLine(t * 4.0, 0.05) * 0.3;
      albedo *= 0.92 + 0.14 * tn(vec2(t * 0.25, hw * 0.05));
    }
  }
#endif

  // ---- lighting ----
  float sh = 1.0, ao = 1.0;
#if defined(VEHICLE) || defined(HUMAN)
  {
    vec2 sp = vW.xz - uSunDir.xz * (max(vW.y, 0.0) / uSunDir.y);
    vec2 s = texture2D(uShadow, (sp - uShadowRect.xy) * uShadowRect.zw).rg;
    sh = s.r; ao = mix(1.0, s.g, 0.7);
  }
#else
  if (N.y > 0.5 && vW.y < 1.2) {
    vec2 s = texture2D(uShadow, (vW.xz - uShadowRect.xy) * uShadowRect.zw).rg;
    sh = s.r; ao = s.g;
  } else if (N.y < 0.5) {
    ao = mix(0.7, 1.0, smoothstep(0.1, 2.4, vW.y));
  }
#endif
  float ndl = max(dot(N, uSunDir), 0.0);
  vec3 hemi = mix(uGndCol, uSkyCol, N.y * 0.5 + 0.5);
  vec3 col = albedo * (hemi * ao + uSunCol * ndl * sh);

#ifndef GROUND
  if (spec > 0.0) {
    vec3 H = normalize(uSunDir + V);
    col += uSunCol * pow(max(dot(N, H), 0.0), 70.0) * spec * sh;
    vec3 R = reflect(-V, N);
    float fr = 0.05 + 0.55 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    col = mix(col, skyRefl(R) * mix(0.55, 1.0, sh), fr * 0.7);
  }
  if (glass > 0.0) {
    vec3 R = reflect(-V, N);
    float fr = 0.15 + 0.85 * pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 base = mix(vec3(0.025, 0.04, 0.055), vec3(0.62, 0.42, 0.22), interior * 0.75);
    vec3 g = mix(base, skyRefl(R) * mix(0.6, 1.0, sh), fr * (1.0 - interior * 0.5));
    g += uSunCol * pow(max(dot(R, uSunDir), 0.0), 160.0) * 2.5 * sh;
    col = mix(col, g, glass);
  }
#endif
  if (m == 6) {
    vec2 q = vW.xz;
    float t = uTime;
    vec3 wn = normalize(vec3(
      sin(q.x * 0.31 + t * 1.1) * 0.05 + sin(q.y * 0.83 + q.x * 0.4 + t * 1.9) * 0.03,
      1.0,
      cos(q.y * 0.27 - t * 0.9) * 0.05 + cos(q.x * 0.77 - q.y * 0.5 + t * 1.6) * 0.03));
    vec3 R = reflect(-V, wn);
    float fr = 0.06 + 0.94 * pow(1.0 - max(dot(wn, V), 0.0), 4.0);
    vec3 deep = albedo * (hemi * 0.8 * ao + uSunCol * 0.25 * sh);
    col = mix(deep, skyRefl(R), fr * 0.85);
    col += uSunCol * pow(max(dot(R, uSunDir), 0.0), 90.0) * 2.0 * sh;
  }
#ifndef GROUND
  if (emit > 0.0) col = mix(col, albedo * (1.0 + emit), min(1.0, emit));
#endif

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function worldMaterial(U, kind = 'static') {
  const defines = {};
  if (kind === 'vehicle') defines.VEHICLE = 1;
  if (kind === 'human') defines.HUMAN = 1;
  if (kind === 'ground') defines.GROUND = 1;
  const uniforms = {
    ...U,
    fogColor: { value: new THREE.Color() },
    fogNear: { value: 1 },
    fogFar: { value: 2000 },
    fogDensity: { value: 0.00025 },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, defines, fog: true });
  mat.extensions = mat.extensions || {};
  return mat;
}

// sky dome: gradient + sun glow; not tone mapped so the horizon matches the fog exactly
export function skyMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: { uSunDir: U.uSunDir, uHorizon: U.uHorizon, uZenith: U.uZenith, uSunCol: U.uSunCol },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir; uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uSunCol;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float t = max(d.y, 0.0);
        vec3 col = mix(uHorizon, uZenith, pow(smoothstep(0.0, 0.75, t), 0.8));
        float s = max(dot(d, uSunDir), 0.0);
        col += vec3(1.0, 0.75, 0.45) * pow(s, 8.0) * 0.35;
        col += vec3(1.0, 0.9, 0.7) * smoothstep(0.9993, 0.9997, s) * 1.6;
        if (d.y < 0.0) col = mix(uHorizon, uHorizon * 0.85, smoothstep(0.0, -0.3, d.y));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
    depthWrite: false,
    side: THREE.BackSide,
    toneMapped: false,
    fog: false,
  });
}
