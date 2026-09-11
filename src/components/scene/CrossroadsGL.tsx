import { useEffect, useRef, useState, type RefObject } from "react";
import { CROSSROADS_SPLINE_SCENE, crossroadsPlate } from "@/data/quantum";

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
      const geometry = new THREE.PlaneGeometry(3.56, 2.0, 200, 112);

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
      // Stood down when a Spline scene is configured, so the two never draw
      // a centrepiece each.
      const wantCore = !CROSSROADS_SPLINE_SCENE;
      const core = new THREE.Group();
      core.visible = wantCore;
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
        const planeAspect = 3.56 / 2.0;
        camera.position.z = camera.aspect > planeAspect ? 3.2 * (planeAspect / camera.aspect) : 3.2;
        camera.updateProjectionMatrix();
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
      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!visible) return;

        cx += (px - cx) * 0.045;
        cy += (py - cy) * 0.045;
        camera.position.x = cx * SWAY_X;
        camera.position.y = -cy * SWAY_Y;
        camera.lookAt(0, 0, -0.3);

        // Cross-fade in once the first frame is ready, so the DOM plate is
        // never swapped for an empty canvas.
        fade = Math.min(1, fade + 0.03);
        material.uniforms["uFade"]!.value = fade;
        if (fade > 0.9 && !disposed) setLive(true);

        // The core turns on its own and leans toward the pointer, so it reads
        // as something suspended and aware rather than a spinning prop.
        if (!wantCore) {
          composer.render();
          return;
        }

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

        composer.render();
      };
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
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
