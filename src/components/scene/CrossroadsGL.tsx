import { useEffect, useRef, useState, type RefObject } from "react";
import { crossroadsPlate, scenes } from "@/data/quantum";
import { ENTER_EVENT, type EnterDetail } from "@/components/scene/enterSignal";

/**
 * The crossroads as real geometry.
 *
 * The plate is a photograph, so layer-sliding parallax can only ever fake
 * depth — every layer stays flat and nothing occludes anything. Here the frame
 * is mapped onto a subdivided plane and displaced along Z by a depth map built
 * from the scene's own geometry, then filmed with an actual perspective
 * camera. Moving that camera produces true parallax: the near kerb sweeps, the
 * far end of the street barely shifts, and the building banks occlude as they
 * pass.
 *
 * Bloom is the other half. The neon in the plate is already blown out, so a
 * bright-pass threshold isolates the signage and blooms only that, which is
 * what gives the scene its light rather than a flat colour wash.
 *
 * Everything is loaded on demand — three.js never enters the initial bundle —
 * and the whole layer is optional: without WebGL, on a coarse pointer, or
 * under reduced motion the DOM plate underneath simply stays visible.
 */

/** How far the camera may travel. Small: this is parallax, not a flythrough. */
const SWAY_X = 0.085;
const SWAY_Y = 0.05;

/**
 * Where the core hangs, in the displaced plane's own units (the plane is
 * 3.56 x 2.0 centred on the origin, so y runs -1 at the bottom of frame to
 * +1 at the top).
 *
 * Read off the depth map rather than guessed. The street saturates to the
 * horizon at y = -0.20 and the two crossings meet at about y = -0.43, where
 * the road surface sits at z = -0.35. The core hangs above that at z = -0.30,
 * a tenth in front of the asphalt — close enough to belong to the
 * intersection, far enough that the camera sway never drives it through the
 * surface. The shaft is cut to land exactly on the crossing, so its base is
 * swallowed by the road instead of ending in mid-air.
 */
const CORE = { x: 0, y: -0.26, z: -0.3, r: 0.085, shaft: 0.21 } as const;

/** Pointer distance, in plane units, at which the core starts reacting. */
const CORE_REACH = 0.55;

/**
 * How long the camera takes to reach the billboard, and how far in it gets.
 * The veil that covers the cut runs 620ms, so the move has to be over before
 * the next route is uncovered or the visitor sees it snap back.
 */
const ENTER_MS = 430;
/** Stops well short of the board: all the way through it would clip geometry. */
const ENTER_REACH = 0.6;

/** The plate's size in plane units. The signs are projected against this. */
const PLANE_W = 3.56;
const PLANE_H = 2;

/**
 * Reads the depth map back on the CPU, so a sign can be told how far away the
 * billboard it is painted on actually is.
 */
function depthReader(image: CanvasImageSource, w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, w, h);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return null; // Tainted canvas; the signs simply fall back to holding still.
  }
  return (u: number, v: number) => {
    const x = Math.min(w - 1, Math.max(0, Math.round(u * (w - 1))));
    // The map is stored top-down and uv is bottom-up.
    const y = Math.min(h - 1, Math.max(0, Math.round((1 - v) * (h - 1))));
    return (data[(y * w + x) * 4] ?? 0) / 255;
  };
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function CrossroadsGL({ stageRef }: { stageRef: RefObject<HTMLElement | null> }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    const stage = stageRef.current;
    if (!mount || !stage) return;

    if (
      !webglAvailable() ||
      !window.matchMedia("(pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      // Loaded here, not imported at module scope, so three.js is fetched only
      // for the visitors who can actually use it.
      const THREE = await import("three");
      const { EffectComposer } =
        await import("three/examples/jsm/postprocessing/EffectComposer.js");
      const { RenderPass } = await import("three/examples/jsm/postprocessing/RenderPass.js");
      const { UnrealBloomPass } =
        await import("three/examples/jsm/postprocessing/UnrealBloomPass.js");
      const { OutputPass } = await import("three/examples/jsm/postprocessing/OutputPass.js");
      if (disposed) return;

      const loader = new THREE.TextureLoader();
      const load = (url: string) =>
        new Promise<InstanceType<typeof THREE.Texture>>((res, rej) =>
          loader.load(url, res, undefined, rej),
        );

      const [colour, depth] = await Promise.all([
        load(crossroadsPlate.webp),
        load("/media/crossroads-depth.png"),
      ]).catch(() => [null, null]);
      if (disposed || !colour || !depth) return;

      colour.colorSpace = THREE.SRGBColorSpace;
      for (const t of [colour, depth]) {
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
      }

      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      // 32° vertical FOV is close to the film's own lens, so the displaced
      // geometry keeps the perspective the plate was shot with.
      const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 100);
      camera.position.z = 3.2;

      // Enough subdivision that the depth gradient reads as a surface rather
      // than as facets, without pushing vertex count anywhere near a cost.
      const geometry = new THREE.PlaneGeometry(PLANE_W, PLANE_H, 200, 112);

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uColour: { value: colour },
          uDepth: { value: depth },
          uDisplace: { value: 0.62 },
          uFade: { value: 0 },
        },
        vertexShader: /* glsl */ `
          uniform sampler2D uDepth;
          uniform float uDisplace;
          varying vec2 vUv;

          void main() {
            vUv = uv;
            // The map is 0 = near, 1 = far, so it pushes vertices away from
            // the camera; the near kerb stays put and the street recedes.
            float d = texture2D(uDepth, uv).r;
            vec3 p = position;
            p.z -= d * uDisplace;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uColour;
          uniform float uFade;
          varying vec2 vUv;

          void main() {
            vec4 c = texture2D(uColour, vUv);
            gl_FragColor = vec4(c.rgb, c.a * uFade);
          }
        `,
        transparent: true,
      });

      const mesh = new THREE.Mesh(geometry, material);
      // The plate is transparent, and three.js sorts transparent objects by
      // their bounding sphere — which is computed from the undisplaced plane,
      // so it always sorts as if it sat flat at z = 0 and paints over anything
      // standing in the street. Ordering it explicitly makes it lay down depth
      // first; everything after it then occludes against the real surface.
      mesh.renderOrder = 0;
      scene.add(mesh);

      // ── The core ────────────────────────────────────────────────────────
      // Not an overlay. It is a real object in the same scene, parked at the
      // intersection's own depth, so the camera sway parallaxes it against
      // the street exactly as it does the road, and the bloom pass that
      // lights the neon lights this too. An overlaid <canvas> could do
      // neither — it would slide across the plate instead of standing in it.
      const core = new THREE.Group();
      core.position.set(CORE.x, CORE.y, CORE.z);
      scene.add(core);

      const coreMats: InstanceType<typeof THREE.Material>[] = [];
      const coreGeos: InstanceType<typeof THREE.BufferGeometry>[] = [];

      const shell = new THREE.IcosahedronGeometry(CORE.r, 0);
      const shellMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x7cf2ff),
        wireframe: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const shellMesh = new THREE.Mesh(shell, shellMat);
      shellMesh.renderOrder = 3;
      core.add(shellMesh);
      coreGeos.push(shell);
      coreMats.push(shellMat);

      // Solid inner body, a shade under the shell, so the wireframe reads as
      // a cage around something rather than as an empty scribble.
      const body = new THREE.IcosahedronGeometry(CORE.r * 0.52, 1);
      const bodyMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xff6ad5),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const bodyMesh = new THREE.Mesh(body, bodyMat);
      bodyMesh.renderOrder = 2;
      core.add(bodyMesh);
      coreGeos.push(body);
      coreMats.push(bodyMat);

      const ring = new THREE.TorusGeometry(CORE.r * 1.5, 0.0022, 3, 96);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xbfa8ff),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ring, ringMat);
      ringMesh.rotation.x = 1.15;
      ringMesh.renderOrder = 3;
      core.add(ringMesh);
      coreGeos.push(ring);
      coreMats.push(ringMat);

      // A single ring reads as a saucer. A second one crossed against it
      // reads as an orbit, which is the idea.
      const ringMesh2 = new THREE.Mesh(ring, ringMat);
      ringMesh2.rotation.set(0.3, 0.9, 0);
      ringMesh2.scale.setScalar(0.82);
      ringMesh2.renderOrder = 3;
      core.add(ringMesh2);

      // Halo and shaft are what seat it in the street. Without them it looks
      // pasted on; with them the asphalt appears to be catching its light.
      const haloGeo = new THREE.PlaneGeometry(CORE.r * 7, CORE.r * 7);
      const haloMat = new THREE.ShaderMaterial({
        uniforms: { uFade: { value: 0 }, uTint: { value: new THREE.Color(0x9d6bff) } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uFade;
          uniform vec3 uTint;
          varying vec2 vUv;
          void main() {
            float d = length(vUv - 0.5) * 2.0;
            float a = pow(max(0.0, 1.0 - d), 3.0);
            gl_FragColor = vec4(uTint, a * 0.4 * uFade);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.z = -0.004;
      halo.renderOrder = 1;
      core.add(halo);
      coreGeos.push(haloGeo);

      const SHAFT_H = CORE.shaft;
      const shaftGeo = new THREE.ConeGeometry(CORE.r * 2.4, SHAFT_H, 20, 1, true);
      const shaftMat = new THREE.ShaderMaterial({
        uniforms: { uFade: { value: 0 }, uH: { value: SHAFT_H } },
        vertexShader: /* glsl */ `
          varying float vY;
          void main() {
            vY = position.y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uFade;
          uniform float uH;
          varying float vY;
          void main() {
            // Brightest where it leaves the core, gone before it lands, so
            // the road is lit rather than stamped with a cone.
            float t = clamp((vY + uH * 0.5) / uH, 0.0, 1.0);
            float a = pow(t, 2.4) * 0.19;
            gl_FragColor = vec4(0.42, 0.85, 1.0, a * uFade);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.position.y = -SHAFT_H * 0.5;
      shaft.renderOrder = 1;
      core.add(shaft);
      coreGeos.push(shaftGeo);

      /* ---- Welding the signs to their billboards -------------------- *
       * The signs are DOM, the street is geometry, and until now they moved
       * on different rules: the sign layer slid by a flat percentage of the
       * stage while the camera moved each part of the street by an amount
       * that depends on how far away it is. So the signs drifted off the
       * billboards they are painted on — worst on the near ones, which move
       * most.
       *
       * Each sign is now projected through the same camera as the plate, at
       * the depth the map gives for its own position, and the difference
       * against a camera that has not moved is published as the offset that
       * sign should take. Near signs sweep, far signs barely shift, and every
       * one of them stays stuck to its board.
       */
      const sample = depthReader(depth.image as CanvasImageSource, 256, 144);
      const restCamera = camera.clone();
      const signPoints = scenes.map((scene) => {
        const u = (scene.sign.left + scene.sign.width / 2) / 100;
        const v = 1 - (scene.sign.top + scene.sign.height / 2) / 100;
        const d = sample ? sample(u, v) : 0.5;
        return {
          id: scene.id,
          point: new THREE.Vector3((u - 0.5) * PLANE_W, (v - 0.5) * PLANE_H, -d * 0.62),
          live: new THREE.Vector3(),
          rest: new THREE.Vector3(),
        };
      });

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      // Threshold high enough that only the signage and the moon qualify —
      // blooming the whole frame just makes it foggy.
      const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.62, 0.72, 0.82);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());

      const resize = () => {
        const r = stage.getBoundingClientRect();
        if (!r.width || !r.height) return;
        renderer.setSize(r.width, r.height, false);
        composer.setSize(r.width, r.height);
        bloom.resolution.set(r.width, r.height);
        camera.aspect = r.width / r.height;
        // Frame the plane to the stage however the stage is proportioned, so
        // the WebGL frame always matches the DOM plate exactly.
        const planeAspect = PLANE_W / PLANE_H;
        camera.position.z = camera.aspect > planeAspect ? 3.2 * (planeAspect / camera.aspect) : 3.2;
        camera.updateProjectionMatrix();

        restCamera.aspect = camera.aspect;
        restCamera.position.set(0, 0, camera.position.z);
        restCamera.lookAt(0, 0, -0.3);
        restCamera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(stage);

      let px = 0;
      let py = 0;
      let cx = 0;
      let cy = 0;
      const onMove = (e: PointerEvent) => {
        const r = stage.getBoundingClientRect();
        if (!r.width) return;
        px = ((e.clientX - r.left) / r.width) * 2 - 1;
        py = ((e.clientY - r.top) / r.height) * 2 - 1;
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      // Only render while the stage is actually on screen. A WebGL loop
      // running behind three scrolled-away screens is pure battery cost.
      let visible = true;
      const io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting), {
        threshold: 0,
      });
      io.observe(stage);
      const onHidden = () => (visible = !document.hidden);
      document.addEventListener("visibilitychange", onHidden);

      let raf = 0;
      let fade = 0;
      let hover = 0;

      /* ---- Going in ------------------------------------------------- *
       * Clicking a sign runs the camera at the billboard it sits on. The
       * street opens out around it and the board fills the frame, so the cut
       * to the next route reads as walking in rather than as a page changing
       * behind a wipe. The point flown at is the same one the sign is welded
       * to, so the board the visitor aimed at is the one that arrives.
       */
      let enterFrom: InstanceType<typeof THREE.Vector3> | null = null;
      let enterTo: InstanceType<typeof THREE.Vector3> | null = null;
      let enterStart = 0;

      const onEnter = (event: Event) => {
        const id = (event as CustomEvent<EnterDetail>).detail?.id;
        const target = signPoints.find((sp) => sp.id === id);
        if (!target) return;
        enterFrom = camera.position.clone();
        enterTo = target.point.clone().lerp(camera.position, 1 - ENTER_REACH);
        enterStart = performance.now();
      };
      window.addEventListener(ENTER_EVENT, onEnter);
      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!visible) return;

        cx += (px - cx) * 0.045;
        cy += (py - cy) * 0.045;

        if (enterFrom && enterTo) {
          // Eased in, but only gently. A cubic would spend the window the
          // visitor can actually see barely moving, and the whole point is
          // that the street is seen to open out before the veil arrives.
          const t = Math.min(1, (performance.now() - enterStart) / ENTER_MS);
          camera.position.lerpVectors(enterFrom, enterTo, Math.pow(t, 1.8));
          // Aim is held where it was. Turning to face the board pitched the
          // camera up and tilted the bottom edge of the plate into frame — a
          // black band across the foot of the screen for the whole move. The
          // board still comes to meet the middle of the frame as the camera
          // closes on it, which is what walking at something looks like.
          camera.lookAt(0, 0, -0.3);
        } else {
          camera.position.x = cx * SWAY_X;
          camera.position.y = -cy * SWAY_Y;
          camera.lookAt(0, 0, -0.3);
        }

        // Cross-fade in once the first frame is ready, so the DOM plate is
        // never swapped for an empty canvas.
        fade = Math.min(1, fade + 0.03);
        material.uniforms["uFade"]!.value = fade;
        if (fade > 0.9 && !disposed) setLive(true);

        // The core turns on its own and leans toward the pointer, so it reads
        // as something suspended and aware rather than a spinning prop.
        const t = performance.now() * 0.001;
        shellMesh.rotation.y = t * (0.22 + hover * 0.5);
        shellMesh.rotation.x = Math.sin(t * 0.31) * 0.3;
        bodyMesh.rotation.y = -t * 0.42;
        bodyMesh.rotation.z = t * 0.18;
        ringMesh.rotation.z = t * 0.55;
        core.position.y = CORE.y + Math.sin(t * 0.7) * 0.008;
        core.rotation.y = cx * 0.22;
        core.rotation.x = -cy * 0.12;

        // Reaching for it should do something. Pointer distance is measured in
        // the plane's own units so the response is the same at every viewport
        // width, and it is eased rather than switched so there is no snap.
        const dx = px * 1.78 - CORE.x;
        const dy = -py * 1.0 - CORE.y;
        const near = 1 - Math.min(1, Math.hypot(dx, dy) / CORE_REACH);
        hover += (near - hover) * 0.07;
        core.scale.setScalar(1 + hover * 0.26);

        // Breathing, not blinking: the pulse keeps the bright pass above the
        // bloom threshold at its peak and just under it at the trough.
        const pulse = 0.72 + Math.sin(t * (1.6 + hover * 1.4)) * 0.22;
        shellMat.opacity = fade * (0.85 + hover * 0.5) * pulse;
        bodyMat.opacity = fade * (0.4 + hover * 0.45) * pulse;
        ringMat.opacity = fade * (0.5 + hover * 0.35);
        haloMat.uniforms["uFade"]!.value = fade * pulse;
        shaftMat.uniforms["uFade"]!.value = fade;

        // Published on the stage so the signs can read their own offset. Done
        // after the camera has moved and before the frame is drawn, so the DOM
        // and the geometry are never a frame apart.
        if (signPoints.length) {
          const r = stage.getBoundingClientRect();
          const halfW = r.width / 2;
          const halfH = r.height / 2;
          for (const sign of signPoints) {
            sign.live.copy(sign.point).project(camera);
            sign.rest.copy(sign.point).project(restCamera);
            const dx = (sign.live.x - sign.rest.x) * halfW;
            const dy = -(sign.live.y - sign.rest.y) * halfH;
            stage.style.setProperty(`--gl-sign-${sign.id}-x`, `${dx.toFixed(2)}px`);
            stage.style.setProperty(`--gl-sign-${sign.id}-y`, `${dy.toFixed(2)}px`);
          }
        }

        composer.render();
      };
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        cancelAnimationFrame(raf);
        for (const sign of signPoints) {
          stage.style.removeProperty(`--gl-sign-${sign.id}-x`);
          stage.style.removeProperty(`--gl-sign-${sign.id}-y`);
        }
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener(ENTER_EVENT, onEnter);
        document.removeEventListener("visibilitychange", onHidden);
        composer.dispose();
        geometry.dispose();
        material.dispose();
        for (const g of coreGeos) g.dispose();
        for (const m of coreMats) m.dispose();
        haloMat.dispose();
        shaftMat.dispose();
        colour.dispose();
        depth.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [stageRef]);

  return (
    <div ref={mountRef} className="gl-layer" data-live={live || undefined} aria-hidden="true" />
  );
}
