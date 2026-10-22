var MPVip3D = (function () {
  "use strict";
  return {
    mount: function (e) {
      var t = !1,
        a = 0,
        n = null,
        r = null;
      function o() {
        t || (e.innerHTML = '<img src="/img/vip-card-front.png" alt="VIP card">');
      }
      return (
        Promise.all([import("/vendor/three-0.160.0/build/three.module.js"), import("/vendor/three-0.160.0/examples/jsm/environments/RoomEnvironment.js")])
          .then(function (i) {
            if (!t) {
              var s = i[0],
                c = i[1].RoomEnvironment;
              try {
                !(function (i, s) {
                  var c = "light" === document.documentElement.getAttribute("data-theme");
                  try {
                    r = new i.WebGLRenderer({ antialias: !0, alpha: !0 });
                  } catch (e) {
                    return void o();
                  }
                  (r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)),
                    (r.toneMapping = i.ACESFilmicToneMapping),
                    (r.toneMappingExposure = c ? 1.12 : 1.05),
                    (r.outputColorSpace = i.SRGBColorSpace),
                    (r.shadowMap.enabled = !0),
                    (r.shadowMap.type = i.PCFShadowMap),
                    e.appendChild(r.domElement));
                  var l = new i.Scene(),
                    p = new i.PMREMGenerator(r);
                  l.environment = p.fromScene(new s(), 0.04).texture;
                  var d = new i.PerspectiveCamera(38, 1, 0.1, 100);
                  function v() {
                    var t = e.clientWidth || 300,
                      a = e.clientHeight || 375;
                    (r.setSize(t, a, !1), (d.aspect = t / a), d.updateProjectionMatrix());
                  }
                  (d.position.set(0, 0, 9.4),
                    v(),
                    window.ResizeObserver && (n = new ResizeObserver(v)).observe(e));
                  var h = new i.DirectionalLight(16777215, c ? 1.9 : 1.6);
                  (h.position.set(1.5, 3, 9),
                    (h.castShadow = !0),
                    h.shadow.mapSize.set(2048, 2048),
                    (h.shadow.radius = 6),
                    (h.shadow.camera.left = -3.4),
                    (h.shadow.camera.right = 3.4),
                    (h.shadow.camera.top = 4.4),
                    (h.shadow.camera.bottom = -3.2),
                    (h.shadow.camera.near = 1),
                    (h.shadow.camera.far = 24),
                    (h.shadow.bias = -2e-4),
                    l.add(h));
                  var u = new i.DirectionalLight(12374271, 0.9);
                  (u.position.set(-4, 2, -5), l.add(u));
                  var m = new i.PointLight(16777215, 12, 30);
                  (m.position.set(2.5, 1.2, 3.5), l.add(m));
                  var w = new i.ShadowMaterial({ color: 0, opacity: c ? 0.05 : 0.11 }),
                    f = new i.Mesh(new i.PlaneGeometry(40, 40), w);
                  ((f.position.z = -1.15), (f.receiveShadow = !0), l.add(f));
                  var M = 2.13,
                    g = 3,
                    y = 0.17,
                    S = 0.055,
                    b = 0.014;
                  function V(e, t, a) {
                    var n = new i.Shape(),
                      r = -e / 2,
                      o = -t / 2;
                    (n.moveTo(r + a, o),
                      n.lineTo(r + e - a, o),
                      n.quadraticCurveTo(r + e, o, r + e, o + a),
                      n.lineTo(r + e, o + t - a),
                      n.quadraticCurveTo(r + e, o + t, r + e - a, o + t),
                      n.lineTo(r + a, o + t),
                      n.quadraticCurveTo(r, o + t, r, o + t - a),
                      n.lineTo(r, o + a),
                      n.quadraticCurveTo(r, o, r + a, o));
                    var s = 0.175,
                      c = 0.05,
                      l = 1.3,
                      p = 0.05,
                      d = new i.Path();
                    return (
                      d.moveTo(-s + p, l - c),
                      d.lineTo(s - p, l - c),
                      d.quadraticCurveTo(s, l - c, s, l - c + p),
                      d.lineTo(s, l + c - p),
                      d.quadraticCurveTo(s, l + c, s - p, l + c),
                      d.lineTo(-s + p, l + c),
                      d.quadraticCurveTo(-s, l + c, -s, l + c - p),
                      d.lineTo(-s, l - c + p),
                      d.quadraticCurveTo(-s, l - c, -s + p, l - c),
                      n.holes.push(d),
                      n
                    );
                  }
                  var T = new i.Group(),
                    R = new i.ExtrudeGeometry(V(M, g, y), {
                      depth: S,
                      bevelEnabled: !0,
                      bevelThickness: b,
                      bevelSize: b,
                      bevelSegments: 3,
                      curveSegments: 24,
                    });
                  R.translate(0, 0, -S / 2);
                  var C = new i.MeshPhysicalMaterial({
                      color: 15922165,
                      roughness: 0.38,
                      metalness: 0,
                      clearcoat: 0.7,
                      clearcoatRoughness: 0.3,
                      envMapIntensity: 0.7,
                    }),
                    x = new i.Mesh(R, C);
                  ((x.castShadow = !0), (x.receiveShadow = !0), T.add(x));
                  var P = new i.TextureLoader();
                  function z(e) {
                    (e.repeat.set(1 / M, 1 / g), e.offset.set(0.5, 0.5));
                  }
                  function E(e) {
                    var t = P.load(e);
                    return (
                      (t.colorSpace = i.SRGBColorSpace),
                      (t.anisotropy = r.capabilities.getMaxAnisotropy()),
                      z(t),
                      t
                    );
                  }
                  function I(e) {
                    var t = P.load(e);
                    return ((t.anisotropy = 4), z(t), t);
                  }
                  function A(e, t, a, n) {
                    var r = new i.ShapeGeometry(V(M, g, y), 24),
                      o = new i.MeshPhysicalMaterial({
                        map: E(e),
                        roughnessMap: I(t),
                        bumpMap: I(a),
                        bumpScale: 0.6,
                        roughness: 1,
                        metalness: 0,
                        clearcoat: 1,
                        clearcoatRoughness: 0.24,
                        envMapIntensity: 0.85,
                      }),
                      s = new i.Mesh(r, o);
                    return (
                      n
                        ? ((s.rotation.y = Math.PI), (s.position.z = -(S / 2 + b + 0.0012)))
                        : (s.position.z = S / 2 + b + 0.0012),
                      s
                    );
                  }
                  T.add(
                    A(
                      "/img/vip-card-front.png",
                      "/img/vip-card-front-rough.png?v=2",
                      "/img/vip-card-front-bump.png?v=2",
                      !1,
                    ),
                  );
                  var G = A(
                    "/img/vip-card-back.png?v=4",
                    "/img/vip-card-back-rough.png?v=4",
                    "/img/vip-card-back-bump.png?v=4",
                    !0,
                  );
                  T.add(G);
                  var L = P.load("/img/vip-card-holo.png?v=2");
                  ((L.colorSpace = i.SRGBColorSpace),
                    (L.anisotropy = r.capabilities.getMaxAnisotropy()));
                  var q = new i.MeshPhysicalMaterial({
                      map: L,
                      transparent: !0,
                      alphaTest: 0.01,
                      depthWrite: !0,
                      roughness: 0.22,
                      metalness: 0.25,
                      iridescence: 1,
                      iridescenceIOR: 1.32,
                      iridescenceThicknessRange: [100, 800],
                      clearcoat: 0.6,
                      clearcoatRoughness: 0.2,
                      envMapIntensity: 1.4,
                      emissive: 0,
                      emissiveMap: L,
                      emissiveIntensity: 0.12,
                    }),
                    B = new i.Mesh(new i.PlaneGeometry(1.411, 0.379), q);
                  (B.position.set(0.0017, 0.996, 0.0025), (B.renderOrder = 1), G.add(B));
                  var F = new i.Vector3(),
                    U = new i.Vector3();
                  l.add(T);
                  var k = new i.CatmullRomCurve3(
                      [
                        new i.Vector3(0.01, 0, -0.01),
                        new i.Vector3(0.026, 0.014, 0.034),
                        new i.Vector3(0.052, 0.1, 0.057),
                        new i.Vector3(0.072, 0.42, 0.045),
                        new i.Vector3(0.098, 0.72, 0.033),
                        new i.Vector3(0.112, 1.02, 0.023),
                        new i.Vector3(0.138, 1.3, 0.012),
                        new i.Vector3(0.082, 1.5, 0.005),
                        new i.Vector3(0, 1.555, 0),
                        new i.Vector3(-0.082, 1.5, -0.005),
                        new i.Vector3(-0.132, 1.32, -0.012),
                        new i.Vector3(-0.102, 1.05, -0.023),
                        new i.Vector3(-0.092, 0.75, -0.033),
                        new i.Vector3(-0.07, 0.42, -0.042),
                        new i.Vector3(-0.048, 0.15, -0.058),
                        new i.Vector3(-0.03, 0.03, -0.048),
                        new i.Vector3(-0.014, 0.004, -0.024),
                      ],
                      !0,
                    ),
                    D = 96,
                    W = 0.085,
                    H = new i.BufferGeometry(),
                    O = new Float32Array(2 * (D + 1) * 3),
                    X = new Float32Array(2 * (D + 1) * 2);
                  (H.setAttribute("position", new i.BufferAttribute(O, 3)),
                    H.setAttribute("uv", new i.BufferAttribute(X, 2)));
                  for (var Y = 0; Y <= D; Y++) {
                    var j = Y / D;
                    ((X[2 * Y * 2] = 0),
                      (X[2 * Y * 2 + 1] = 7 * j),
                      (X[2 * (2 * Y + 1)] = 1),
                      (X[2 * (2 * Y + 1) + 1] = 7 * j));
                  }
                  for (var Q = [], N = 0; N < D; N++) {
                    var Z = 2 * N,
                      J = 2 * N + 1,
                      K = 2 * N + 2,
                      $ = 2 * N + 3;
                    Q.push(Z, J, K, J, $, K);
                  }
                  function _() {
                    var e = document.createElement("canvas");
                    ((e.width = 128), (e.height = 128));
                    var t = e.getContext("2d");
                    ((t.fillStyle = "#aad4ea"), t.fillRect(0, 0, 128, 128));
                    for (var a = 0; a < 128; a += 3)
                      ((t.fillStyle = "rgba(255,255,255,0.13)"),
                        t.fillRect(0, a, 128, 1),
                        (t.fillStyle = "rgba(70,110,140,0.12)"),
                        t.fillRect(0, a + 1, 128, 1));
                    for (var n = t.getImageData(0, 0, 128, 128), r = 0; r < n.data.length; r += 4) {
                      var o = 11 * (Math.random() - 0.5);
                      ((n.data[r] += o), (n.data[r + 1] += o), (n.data[r + 2] += o));
                    }
                    (t.putImageData(n, 0, 0),
                      (t.fillStyle = "rgba(88,128,164,0.4)"),
                      t.fillRect(0, 0, 3, 128),
                      t.fillRect(125, 0, 3, 128));
                    var s = new i.CanvasTexture(e);
                    return (
                      (s.wrapS = i.RepeatWrapping),
                      (s.wrapT = i.RepeatWrapping),
                      (s.colorSpace = i.SRGBColorSpace),
                      (s.anisotropy = 4),
                      s
                    );
                  }
                  H.setIndex(Q);
                  var ee = _(),
                    te = new i.MeshPhysicalMaterial({
                      map: ee,
                      bumpMap: ee,
                      bumpScale: 0.12,
                      roughness: 0.58,
                      metalness: 0,
                      sheen: 0.7,
                      sheenRoughness: 0.5,
                      sheenColor: 14873599,
                      side: i.DoubleSide,
                      envMapIntensity: 0.5,
                    }),
                    ae = new i.Mesh(H, te);
                  ((ae.position.y = 1.3),
                    (ae.castShadow = !0),
                    (ae.receiveShadow = !0),
                    (ae.frustumCulled = !1),
                    T.add(ae));
                  for (
                    var ne = new i.Vector3(),
                      re = new i.Vector3(0, 0, 1),
                      oe = new i.Vector3(),
                      ie = new i.Vector3(),
                      se = [],
                      ce = 0;
                    ce <= D;
                    ce++
                  )
                    se.push(new i.Vector3());
                  var le = new i.Euler(),
                    pe = new i.Quaternion();
                  function de(e, t, a, n, r) {
                    for (var o = 0; o <= D; o++) {
                      var s = o / D;
                      (k.getPoint(s, se[o]), (se[o].x *= 1 + r));
                      var c = i.MathUtils.smoothstep(se[o].y, 0.18, 0.48);
                      c > 0 &&
                        (le.set(e * c, t * c, a * c, "YXZ"),
                        pe.setFromEuler(le),
                        se[o].applyQuaternion(pe));
                    }
                    for (var l = 1, p = 0, d = 0, v = 0; v <= D; v++) {
                      var h = v / D,
                        u = se[v],
                        m = se[Math.min(v + 1, D)],
                        w = se[Math.max(v - 1, 0)];
                      (ne.subVectors(m, w).normalize(),
                        0 === v
                          ? (ie.crossVectors(ne, re),
                            ie.lengthSq() < 1e-6 && ie.set(1, 0, 0),
                            ie.normalize())
                          : (ie.set(l, p, d), ie.addScaledVector(ne, -ie.dot(ne)).normalize()),
                        (l = ie.x),
                        (p = ie.y),
                        (d = ie.z),
                        oe.crossVectors(ne, ie).normalize());
                      var f =
                          (n + 0.38) *
                          (i.MathUtils.smoothstep(h, 0.18, 0.32) *
                            (1 - i.MathUtils.smoothstep(h, 0.68, 0.82))),
                        M = Math.cos(f),
                        g = Math.sin(f),
                        y = ie.x * M + oe.x * g,
                        S = ie.y * M + oe.y * g,
                        b = ie.z * M + oe.z * g,
                        V = 6 * v;
                      ((O[V] = u.x - y * W),
                        (O[V + 1] = u.y - S * W),
                        (O[V + 2] = u.z - b * W),
                        (O[V + 3] = u.x + y * W),
                        (O[V + 4] = u.y + S * W),
                        (O[V + 5] = u.z + b * W));
                    }
                    ((H.attributes.position.needsUpdate = !0), H.computeVertexNormals());
                  }
                  de(0, 0, 0, 0, 0);
                  var ve = -0.35,
                    he = 0.1,
                    ue = 0,
                    me = 0,
                    we = 0,
                    fe = 0,
                    Me = 0.1,
                    ge = Me,
                    ye = -0.35,
                    Se = 0,
                    be = 0,
                    Ve = !1,
                    Te = 0,
                    Re = 0,
                    Ce = 0,
                    xe = performance.now(),
                    Pe = r.domElement;
                  function ze() {
                    Ve && ((Ve = !1), (xe = performance.now()));
                  }
                  (Pe.addEventListener("pointerdown", function (e) {
                    ((Ve = !0),
                      (Te = e.clientX),
                      (Re = e.clientY),
                      (Ce = performance.now()),
                      (Se = 0),
                      (be = 0));
                    try {
                      Pe.setPointerCapture(e.pointerId);
                    } catch (e) {}
                    xe = performance.now();
                  }),
                    Pe.addEventListener("pointermove", function (e) {
                      if (Ve) {
                        var t = performance.now(),
                          a = Math.max(1, t - Ce),
                          n = e.clientX - Te,
                          r = e.clientY - Re;
                        ((ye += 0.0085 * n),
                          (ge += 0.006 * r),
                          (ge = Math.max(-1.15, Math.min(1.15, ge))),
                          (be = ((0.0085 * n) / a) * 16.7),
                          (Se = ((0.006 * r) / a) * 16.7),
                          (Te = e.clientX),
                          (Re = e.clientY),
                          (Ce = t),
                          (xe = t));
                      }
                    }),
                    Pe.addEventListener("pointerup", ze),
                    Pe.addEventListener("pointercancel", ze));
                  var Ee = new i.Clock();
                  function Ie() {
                    if (!t) {
                      a = requestAnimationFrame(Ie);
                      var e = Ee.getElapsedTime();
                      if (!Ve)
                        ((ye += be),
                          (be *= 0.955),
                          (ge += Se = 0.9 * (Se + 0.045 * (Me - ge))),
                          performance.now() - xe > 2600 && Math.abs(be) < 0.002 && (ye += 0.0035));
                      (T.rotation.set(ge, ye, 0),
                        (T.position.y = 0.035 * Math.sin(1.15 * e)),
                        (T.rotation.z = 0.008 * Math.sin(0.7 * e)),
                        (me += 0.045 * (ye - ve)),
                        (ve += me *= 0.875),
                        (we += 0.06 * (ge - he)),
                        (he += we *= 0.86));
                      var n = i.MathUtils.clamp(0.05 * -be, -0.3, 0.3) + 0.012 * Math.sin(1.3 * e);
                      fe += 0.05 * (n - ue);
                      var o = ve - ye;
                      (de(
                        he - ge,
                        o,
                        (ue += fe *= 0.9),
                        i.MathUtils.clamp(0.8 * -o, -1.15, 1.15),
                        i.MathUtils.clamp(0.1 * Math.abs(o), 0, 0.22),
                      ),
                        (m.position.x = 3.2 * Math.sin(ye) + 1.2),
                        (m.position.y = 1.6 * Math.cos(1.4 * ge) + 0.6),
                        F.set(0, 0, -1).applyEuler(T.rotation),
                        U.copy(h.position).sub(T.position).normalize());
                      var s = Math.pow(Math.max(0, F.dot(U)), 1.5);
                      (q.emissive.setHSL((0.58 + 0.16 * ye) % 1, 0.75, 0.55),
                        (q.emissiveIntensity = 0.25 + 0.95 * s),
                        r.render(l, d));
                    }
                  }
                  Ie();
                })(s, c);
              } catch (e) {
                o();
              }
            }
          })
          .catch(o),
        function () {
          if (((t = !0), a && cancelAnimationFrame(a), n && n.disconnect(), r))
            try {
              r.dispose();
            } catch (e) {}
          e.innerHTML = "";
        }
      );
    },
  };
})();
