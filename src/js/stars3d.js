// Stars product viewer: frosted-glass casino chips with a star set inside, more of them the bigger the pack, built in three.js like vip3d.js /
// mask3d.js. The glass is real transmission (heavily frosted: a soft glow of what's behind, not a clear view). Every chip is identical;
// each pack size has its own composed arrangement (stacks and standing coins placed so no two coins ever touch):
//   <=100: 1   <=500: 3   <=1500 (1,100): 7   <=4000 (2,400): 15   above (6,500): 31
// The stage's data-pack attribute picks the arrangement; changing it swaps with a small pop.
var MPStars3D = (function () {
  "use strict";
  var PACK_IMGS = [100, 500, 1000, 1100, 2400, 2500, 6500];
  function packNum(el) {
    return parseInt(String(el.getAttribute("data-pack") || "").replace(/[^\d]/g, ""), 10) || 0;
  }
  function tierFor(n) {
    return !n || n <= 100 ? 0 : n <= 500 ? 1 : n <= 1500 ? 2 : n <= 4000 ? 3 : 4;
  }
  // Arrangements in chip radii. s: stacks on the floor [x, z, count], tallest at the back; u: standing chips [x, z, yaw].
  // Stacks sit in a tight honeycomb, centres 2.04 apart (chips are 2.0 wide), so they group closely but never touch.
  var LAYOUTS = [
    { s: [], u: [[0, 0, 0]], pitch: 0.1 },
    { s: [[0, 0, 3]], u: [], pitch: 0.42 },
    { s: [[-1.02, -0.25, 4], [1.02, 0.25, 3]], u: [], pitch: 0.42 },
    { s: [[-1.02, -0.59, 6], [1.02, -0.59, 5], [0, 1.18, 4]], u: [], pitch: 0.44 },
    { s: [[-2.04, -0.885, 6], [0, -0.885, 9], [2.04, -0.885, 7], [-1.02, 0.885, 5], [1.02, 0.885, 4]], u: [], pitch: 0.44 },
  ];
  function isLight() {
    var t = document.documentElement.getAttribute("data-theme");
    return t ? t === "light" : !!(window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches);
  }
  function fallbackSrc(el) {
    var n = packNum(el);
    return "/img/stars-" + (PACK_IMGS.indexOf(n) > -1 ? n + "-" : "") + (isLight() ? "light" : "dark") + ".jpg?v=9";
  }

  return {
    tierFor: tierFor,
    mount: function (el) {
      var dead = false,
        raf = 0,
        ro = null,
        mo = null,
        stopIO = null,
        renderer = null;
      function fallback() {
        if (!dead) el.innerHTML = '<img src="' + fallbackSrc(el) + '" alt="Stars">';
      }

      Promise.all([
        import("/vendor/three-0.160.0/build/three.module.min.js"),
        import("/vendor/three-0.160.0/examples/jsm/environments/RoomEnvironment.js?v=2"),
        import("/vendor/three-0.160.0/examples/jsm/utils/BufferGeometryUtils.js?v=2"),
      ])
        .then(function (mods) {
          if (dead) return;
          try {
            build(mods[0], mods[1].RoomEnvironment, mods[2]);
          } catch (err) {
            fallback();
          }
        })
        .catch(fallback);

      function build(THREE, RoomEnvironment, BGU) {
        var light = isLight();
        var still = el.hasAttribute("data-still"); // single frame, used by tools/stars/render-stills.cjs
        var reduce = still || !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
        try {
          // premultipliedAlpha off so the clear colour below can be the page colour while staying fully transparent
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: still });
        } catch (e) {
          return fallback();
        }
        renderer.setPixelRatio(still ? 1 : Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = light ? 1.0 : 1.1;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        // The frosted glass samples what's behind it; with a black clear colour the gaps between chips and the rounded
        // edges picked up black lines. Clearing to the page colour (still alpha 0) makes them pick up the page instead.
        renderer.setClearColor(el.getAttribute("data-bg") || (light ? 0xffffff : 0x070f29), 0); // stills pass their backdrop colour
        el.appendChild(renderer.domElement);

        var scene = new THREE.Scene();
        var pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

        var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
        var frameR = 1.3;
        function resize() {
          var w = el.clientWidth || 300,
            h = el.clientHeight || 300;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          var fit = frameR / Math.sin((camera.fov * Math.PI) / 360);
          if (camera.aspect < 1) fit /= camera.aspect;
          camera.position.set(0, 0, fit);
          camera.lookAt(0, 0, 0);
          camera.updateProjectionMatrix();
        }
        if (window.ResizeObserver) (ro = new ResizeObserver(resize)).observe(el);

        var key = new THREE.DirectionalLight(0xffffff, light ? 1.6 : 1.8);
        key.position.set(2, 4, 7);
        scene.add(key);
        var rim = new THREE.DirectionalLight(light ? 0xcfe2ff : 0xa9d7f5, light ? 1.6 : 2.2);
        rim.position.set(-5, 3, -4);
        scene.add(rim);
        var spot = new THREE.PointLight(0xffffff, light ? 10 : 16, 30);
        spot.position.set(2.5, 1.5, 4);
        scene.add(spot);

        // ---- materials: frosted glass body, a solid star set inside it, satin bezel ----
        var glass = new THREE.MeshPhysicalMaterial({
          color: light ? 0xeaf3fb : 0xb9cde6,
          transmission: 0.55,
          roughness: 0.62,
          metalness: 0,
          ior: 1.45,
          thickness: 0.6,
          attenuationColor: light ? 0x6f9fd0 : 0x6f9fd0,
          attenuationDistance: light ? 0.9 : 0.9,
          clearcoat: 1,
          clearcoatRoughness: 0.12,
          specularIntensity: 1,
          envMapIntensity: light ? 1.1 : 0.5,
        });
        var inlay = new THREE.MeshPhysicalMaterial({
          color: light ? 0x14204a : 0xd7ecfb,
          roughness: 0.35,
          metalness: 0,
          clearcoat: 0.6,
          emissive: light ? 0x000000 : 0x5b9fd0,
          emissiveIntensity: light ? 0 : 0.12,
        });
        var line = new THREE.MeshStandardMaterial({ color: light ? 0x4f7fb5 : 0xcfe6f8, roughness: 0.4, emissive: light ? 0 : 0x6fa8d6, emissiveIntensity: light ? 0 : 0.1 });
        
        // ---- geometry ----
        var P = [[12, 3.5], [14.6, 8.8], [20.5, 9.7], [16.2, 13.8], [17.2, 19.6], [12, 16.9], [6.8, 19.6], [7.8, 13.8], [3.5, 9.7], [9.4, 8.8]];
        function starShape(w, round) {
          var K = w / 17,
            pts = P.map(function (p) {
              return new THREE.Vector2((p[0] - 12) * K, -(p[1] - 11.9) * K);
            }),
            s = new THREE.Shape();
          for (var i = 0; i < pts.length; i++) {
            var v = pts[i],
              tt = round ? (i % 2 ? 0.16 : 0.2) : 0.04,
              p0 = v.clone().lerp(pts[(i + pts.length - 1) % pts.length], tt),
              p1 = v.clone().lerp(pts[(i + 1) % pts.length], tt);
            if (i === 0) s.moveTo(p0.x, p0.y);
            else s.lineTo(p0.x, p0.y);
            s.quadraticCurveTo(v.x, v.y, p1.x, p1.y);
          }
          s.closePath();
          return s;
        }
        // a star lying in the coin's mid-plane (XZ), centred in thickness
        function starMesh(w, depth, bevel, facet, mat) {
          var g = new THREE.ExtrudeGeometry(starShape(w, !facet), {
            depth: depth,
            bevelEnabled: true,
            bevelThickness: bevel,
            bevelSize: facet ? bevel * 0.9 : bevel * 1.2,
            bevelSegments: facet ? 1 : 2,
            curveSegments: facet ? 2 : 4,
          });
          g.translate(0, 0, -depth / 2);
          var m = new THREE.Mesh(g, facet ? mat.clone() : mat);
          if (facet) m.material.flatShading = true;
          m.rotation.x = -Math.PI / 2;
          return m;
        }
        // chip body: flat faces with a shallow centre recess, near-straight edge
        function bodyGeo(d) {
          var R = d.R,
            T = d.T,
            F = T / 2 - 0.012,
            C = 0.03,
            prof = [[0, F], [0.6 * R, F], [0.62 * R, T / 2], [R - C, T / 2]],
            i,
            a;
          for (i = 1; i <= 4; i++) {
            a = (i / 4) * (Math.PI / 2);
            prof.push([R - C + C * Math.sin(a), T / 2 - C + C * Math.cos(a)]);
          }
          for (i = 0; i <= 4; i++) {
            a = (i / 4) * (Math.PI / 2);
            prof.push([R - C + C * Math.cos(a), -T / 2 + C - C * Math.sin(a)]);
          }
          prof.push([0.62 * R, -T / 2], [0.6 * R, -F], [0, -F]);
          prof.reverse();
          return new THREE.LatheGeometry(
            prof.map(function (p) {
              return new THREE.Vector2(p[0], p[1]);
            }),
            96,
          );
        }
        // ---- one chip, baked into four merged geometries (glass, star, inserts, track lines) ----
        // Every chip is drawn with instancing: a whole pack is 4 draw calls, not ~100 meshes per chip.
        var D = { R: 1, T: 0.17 },
          INSERTS = 6,
          INS = 0.34, // angular width of an edge insert
          LIFT = 0.003, // decorations sit just proud of the glass (with polygon offset) so they never flicker
          tmp = new THREE.Object3D();
        function mat4(px, py, pz, rx, ry, rz) {
          tmp.position.set(px, py, pz);
          tmp.rotation.set(rx, ry, rz);
          tmp.updateMatrix();
          return tmp.matrix.clone();
        }
        function bake(parts) {
          return BGU.mergeGeometries(
            parts.map(function (p) {
              var g = p[0].index ? p[0].toNonIndexed() : p[0].clone();
              Object.keys(g.attributes).forEach(function (k) {
                if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
              });
              return g.applyMatrix4(p[1]);
            }),
          );
        }
        var starG = starMesh(0.86, 0.004, 0.008, false, inlay).geometry,
          ringG = new THREE.RingGeometry(0.62 * D.R - 0.008, 0.62 * D.R + 0.008, 96, 1), // printed (flat) track lines
          dashG = new THREE.PlaneGeometry(0.05, 0.012),
          zFace = D.T / 2 - 0.012 + 0.006,
          starParts = [],
          insParts = [],
          lineParts = [];
        [1, -1].forEach(function (sgn) {
          // the star sits in the face recess; the back one is turned to line up with the front through the glass
          starParts.push([starG, mat4(0, sgn * zFace, 0, (-sgn * Math.PI) / 2, 0, sgn > 0 ? 0 : Math.PI)]);
          lineParts.push([ringG, mat4(0, sgn * (D.T / 2 + LIFT), 0, (-sgn * Math.PI) / 2, 0, 0)]);
          for (var k = 0; k < 36; k++) {
            var a = (k / 36) * Math.PI * 2;
            lineParts.push([dashG, mat4(Math.sin(a) * 0.71, sgn * (D.T / 2 + LIFT), Math.cos(a) * 0.71, (-sgn * Math.PI) / 2, 0, a)]);
          }
        });
        for (var q = 0; q < INSERTS; q++) {
          var c0 = (q / INSERTS) * Math.PI * 2;
          insParts.push([new THREE.CylinderGeometry(D.R + LIFT, D.R + LIFT, D.T * 0.72, 10, 1, true, c0, INS), mat4(0, 0, 0, 0, 0, 0)]);
          insParts.push([new THREE.RingGeometry(0.8 * D.R, D.R - 0.035, 10, 1, c0 - Math.PI / 2, INS), mat4(0, D.T / 2 + LIFT, 0, -Math.PI / 2, 0, 0)]);
          insParts.push([new THREE.RingGeometry(0.8 * D.R, D.R - 0.035, 10, 1, Math.PI / 2 - c0 - INS, INS), mat4(0, -D.T / 2 - LIFT, 0, Math.PI / 2, 0, 0)]);
        }
        var insMat = new THREE.MeshPhysicalMaterial({ color: light ? 0x14204a : 0xeaf4fd, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.2, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
        line.polygonOffset = inlay.polygonOffset = true;
        line.polygonOffsetFactor = inlay.polygonOffsetFactor = -1;
        line.polygonOffsetUnits = inlay.polygonOffsetUnits = -1;
        var CHIP = [
          [bodyGeo(D), glass],
          [bake(starParts), inlay],
          [bake(insParts), insMat],
          [bake(lineParts), line],
        ];
        // chip transforms for a pack, plus their bounds
        function build(tier) {
          var L = LAYOUTS[tier],
            mats = [],
            box = new THREE.Box3(),
            gap = D.T + 0.0008,
            v = new THREE.Vector3();
          L.s.forEach(function (st, si) {
            for (var k = 0; k < st[2]; k++) {
              // inserts don't line up from chip to chip, like a real stack
              mats.push(mat4(st[0], D.T / 2 + k * gap, st[1], 0, ((si * 7 + k * 3) % 10) * 0.63, 0));
              box.expandByPoint(v.set(st[0] - D.R, k * gap, st[1] - D.R));
              box.expandByPoint(v.set(st[0] + D.R, k * gap + D.T, st[1] + D.R));
            }
          });
          L.u.forEach(function (u) {
            var y = tier ? D.R : 0;
            mats.push(mat4(u[0], y, u[1], 0, u[2], 0).multiply(mat4(0, 0, 0, Math.PI / 2, 0, 0))); // standing, face to camera
            box.expandByPoint(v.set(u[0] - D.R, y - D.R, u[1] - D.T));
            box.expandByPoint(v.set(u[0] + D.R, y + D.R, u[1] + D.T));
          });
          var g = new THREE.Group();
          CHIP.forEach(function (c) {
            var im = new THREE.InstancedMesh(c[0], c[1], mats.length);
            mats.forEach(function (m, i) {
              im.setMatrixAt(i, m);
            });
            im.instanceMatrix.needsUpdate = true;
            im.frustumCulled = false;
            g.add(im);
          });
          return { obj: g, pitch: L.pitch, box: box, stacks: L.s };
        }

        // ---- scene graph: turntable (yaw + pitch from drag) > content ----
        var turntable = new THREE.Group();
        scene.add(turntable);
        var content = null,
          basePitch = 0.1,
          pop = 0;

        function layout(n, animate) {
          if (content) {
            turntable.remove(content);
            content.traverse(function (o) {
              if (o.isInstancedMesh) o.dispose();
            });
          }
          var made = build(tierFor(n));
          content = new THREE.Group();
          content.add(made.obj);
          var box = made.box,
            size = box.getSize(new THREE.Vector3());
          made.obj.position.sub(box.getCenter(new THREE.Vector3())); // centre on the turntable
          if (made.stacks.length) {
            // Fit the circle the stacks sweep while spinning (not their box), so big packs fill the stage without ever
            // clipping as they turn.
            var c = box.getCenter(new THREE.Vector3()),
              reach = 0;
            made.stacks.forEach(function (st) {
              reach = Math.max(reach, Math.hypot(st[0] - c.x, st[1] - c.z) + D.R);
            });
            frameR = Math.hypot(reach, size.y / 2) * 1.13; // headroom for perspective: the near edge looks bigger
          } else frameR = 0.5 * Math.max(size.x, size.y, size.z * 0.75) * 1.22 + 0.1;
          frameR *= parseFloat(el.getAttribute("data-fit")) || 1; // stills frame tighter: they never turn
          basePitch = made.pitch;
          turntable.add(content);
          pop = animate && !reduce ? performance.now() : 0;
          if (pop) content.scale.setScalar(0.85);
          resize();
        }

        var curPack = packNum(el);
        layout(curPack, false);
        if (window.MutationObserver) {
          mo = new MutationObserver(function () {
            var n = packNum(el);
            if (tierFor(n) !== tierFor(curPack)) layout(n, true);
            curPack = n;
          });
          mo.observe(el, { attributes: true, attributeFilter: ["data-pack"] });
        }

        // ---- drag to spin (same feel as the VIP card) ----
        var yaw = still ? parseFloat(el.getAttribute("data-still")) || -0.3 : -0.3,
          pitch = basePitch,
          vYaw = 0,
          vPitch = 0,
          dragging = false,
          lx = 0,
          ly = 0,
          lt = 0,
          lastTouch = performance.now(),
          canvas = renderer.domElement;
        function up() {
          if (dragging) {
            dragging = false;
            lastTouch = performance.now();
          }
        }
        canvas.addEventListener("pointerdown", function (e) {
          dragging = true;
          lx = e.clientX;
          ly = e.clientY;
          lt = performance.now();
          vYaw = vPitch = 0;
          try {
            canvas.setPointerCapture(e.pointerId);
          } catch (err) {}
          lastTouch = lt;
        });
        canvas.addEventListener("pointermove", function (e) {
          if (!dragging) return;
          var now = performance.now(),
            dt = Math.max(1, now - lt),
            dx = e.clientX - lx,
            dy = e.clientY - ly;
          yaw += 0.0085 * dx;
          pitch = Math.max(-1.1, Math.min(1.1, pitch + 0.006 * dy));
          vYaw = ((0.0085 * dx) / dt) * 16.7;
          vPitch = ((0.006 * dy) / dt) * 16.7;
          lx = e.clientX;
          ly = e.clientY;
          lt = now;
          lastTouch = now;
        });
        canvas.addEventListener("pointerup", up);
        canvas.addEventListener("pointercancel", up);

        // don't spend GPU time while the viewer is scrolled away or the tab is hidden
        var onScreen = true,
          io = null;
        if (window.IntersectionObserver && !still) {
          io = new IntersectionObserver(function (e) {
            onScreen = e[0].isIntersecting;
          });
          io.observe(el);
        }
        stopIO = function () {
          if (io) io.disconnect();
        };
        var clock = new THREE.Clock();
        function frame() {
          if (dead) return;
          raf = still ? 0 : requestAnimationFrame(frame);
          var t = clock.getElapsedTime(),
            now = performance.now();
          if (!dragging) {
            yaw += vYaw;
            vYaw *= 0.955;
            vPitch = 0.9 * (vPitch + 0.045 * (basePitch - pitch));
            pitch += vPitch;
            if (!reduce && now - lastTouch > 2600 && Math.abs(vYaw) < 0.002) yaw += 0.0035;
          }
          if (still) pitch = basePitch;
          turntable.rotation.set(pitch, yaw, 0, "XYZ");
          turntable.position.y = reduce ? 0 : 0.03 * Math.sin(1.15 * t);
          if (pop) {
            var p = Math.min(1, (now - pop) / 420),
              s = 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2); // ease-out-back
            content.scale.setScalar(0.85 + 0.15 * s);
            if (p >= 1) {
              content.scale.setScalar(1);
              pop = 0;
            }
          }
          spot.position.x = 3 * Math.sin(yaw) + 1.2;
          if (onScreen && !document.hidden) renderer.render(scene, camera);
          if (still) el.setAttribute("data-ready", "1");
        }
        // compile every shader up front (off the main thread where supported) so the first frames don't stutter
        if (renderer.compileAsync && !still) renderer.compileAsync(scene, camera).then(frame, frame);
        else frame();
      }

      return function () {
        dead = true;
        if (raf) cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        if (mo) mo.disconnect();
        if (stopIO) stopIO();
        if (renderer)
          try {
            renderer.dispose();
          } catch (e) {}
        el.innerHTML = "";
      };
    },
  };
})();
