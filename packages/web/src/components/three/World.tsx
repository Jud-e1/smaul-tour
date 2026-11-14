'use client';

/**
 * Nsoroma's signature 3D scene: a soft clay island of the Gold Coast with a
 * floating black star ("nsoroma" means star in Akan) and orbiting postcards of
 * real places. All geometry is procedural — no model downloads.
 */
import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, ContactShadows, Float, Image as DreiImage, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// Clay palette — kept inside the warm, low-saturation world of the UI.
const C = {
  sand: '#E9DCC6',
  sandDeep: '#DCCBAF',
  plaster: '#F6EFE3',
  stone: '#CDBEA6',
  wood: '#8E6A4E',
  woodDark: '#5B4334',
  ink: '#1F1A17',
  water: '#BFC6C0',
  waterDeep: '#A9B3AE',
  frond: '#6F6A4E',
  frondDark: '#57533D',
};

const clay = (color: string, rough = 0.85) => (
  <meshStandardMaterial color={color} roughness={rough} metalness={0} />
);

function starShape(outer = 1, inner = 0.42, points = 5) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return shape;
}

function BlackStar({ scale = 1, spin = 0.35 }: { scale?: number; spin?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(starShape(), {
      depth: 0.32,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.1,
      bevelSegments: 8,
      curveSegments: 4,
    });
    g.center();
    return g;
  }, []);
  // Sway rather than spin, so the star always shows its face (never edge-on).
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * spin;
    ref.current.rotation.y = Math.sin(t) * 0.55;
    ref.current.rotation.x = Math.sin(t * 0.7) * 0.12;
  });
  return (
    <mesh ref={ref} geometry={geometry} scale={scale} castShadow>
      <meshStandardMaterial color={C.ink} roughness={0.32} metalness={0.25} />
    </mesh>
  );
}

function Palm({ position, height = 1.1, lean = 0.2 }: { position: [number, number, number]; height?: number; lean?: number }) {
  const segs = 6;
  return (
    <group position={position} rotation={[0, 0, lean]}>
      {Array.from({ length: segs }).map((_, i) => (
        <mesh key={i} position={[Math.sin(i / segs) * 0.06, (i + 0.5) * (height / segs), 0]} castShadow>
          <cylinderGeometry args={[0.045 - i * 0.003, 0.05 - i * 0.003, height / segs, 8]} />
          {clay(i % 2 ? C.wood : C.woodDark)}
        </mesh>
      ))}
      <group position={[0.06, height, 0]}>
        {/* drooping fronds: flattened ellipsoids radiating from the crown */}
        {Array.from({ length: 8 }).map((_, i) => (
          <group key={i} rotation={[0, (i / 8) * Math.PI * 2, 0]}>
            <mesh position={[0, -0.05, 0.27]} rotation={[0.55 + (i % 2) * 0.15, 0, 0]} scale={[0.1, 0.022, 0.34]} castShadow>
              <sphereGeometry args={[1, 12, 8]} />
              {clay(i % 2 ? C.frond : C.frondDark, 0.9)}
            </mesh>
          </group>
        ))}
        <mesh castShadow>
          <sphereGeometry args={[0.07, 10, 8]} />
          {clay(C.woodDark)}
        </mesh>
      </group>
    </group>
  );
}

function Lighthouse({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.22 + i * 0.36, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.24 - i * 0.025, 0.27 - i * 0.025, 0.36, 24]} />
          {clay(i % 2 ? C.ink : C.plaster)}
        </mesh>
      ))}
      <mesh position={[0, 1.66, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.22, 16]} />
        <meshStandardMaterial color="#FFF6E2" emissive="#FFE9B8" emissiveIntensity={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.92, 0]} castShadow>
        <coneGeometry args={[0.26, 0.32, 16]} />
        {clay(C.ink, 0.6)}
      </mesh>
    </group>
  );
}

function Castle({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, -0.5, 0]}>
      <RoundedBox args={[1.5, 0.62, 0.9]} radius={0.06} position={[0, 0.31, 0]} castShadow receiveShadow>
        {clay(C.plaster)}
      </RoundedBox>
      <RoundedBox args={[0.5, 0.95, 0.5]} radius={0.05} position={[-0.62, 0.48, -0.08]} castShadow>
        {clay(C.plaster)}
      </RoundedBox>
      {[-0.55, -0.25, 0.05, 0.35, 0.62].map((x) => (
        <mesh key={x} position={[x, 0.7, 0.36]} castShadow>
          <boxGeometry args={[0.14, 0.14, 0.14]} />
          {clay(C.plaster)}
        </mesh>
      ))}
      {[-0.2, 0.2, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.3, 0.452]}>
          <boxGeometry args={[0.1, 0.18, 0.01]} />
          {clay(C.woodDark)}
        </mesh>
      ))}
    </group>
  );
}

function Drum({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0.1, 0, -0.08]}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.13, 0.56, 20]} />
        {clay(C.wood, 0.7)}
      </mesh>
      <mesh position={[0, 0.57, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.03, 20]} />
        {clay(C.plaster)}
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[Math.cos(i) * 0.17, 0.3, Math.sin(i) * 0.17]} rotation={[0, -i, 0.08]}>
          <boxGeometry args={[0.012, 0.5, 0.012]} />
          {clay(C.ink)}
        </mesh>
      ))}
    </group>
  );
}

function CanopyBridge({ position }: { position: [number, number, number] }) {
  const planks = 9;
  return (
    <group position={position} rotation={[0, 0.7, 0]}>
      {Array.from({ length: planks }).map((_, i) => {
        const t = i / (planks - 1);
        const y = 0.75 - Math.sin(t * Math.PI) * 0.18;
        return (
          <mesh key={i} position={[t * 1.6 - 0.8, y, 0]} castShadow>
            <boxGeometry args={[0.15, 0.03, 0.3]} />
            {clay(C.wood)}
          </mesh>
        );
      })}
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} position={[x, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.8, 8]} />
          {clay(C.woodDark)}
        </mesh>
      ))}
    </group>
  );
}

function Island() {
  return (
    <group>
      {/* water */}
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <cylinderGeometry args={[3.7, 3.85, 0.2, 72]} />
        {clay(C.water, 0.55)}
      </mesh>
      <mesh position={[0, -0.24, 0]}>
        <cylinderGeometry args={[3.85, 3.6, 0.12, 72]} />
        {clay(C.waterDeep, 0.6)}
      </mesh>
      {/* land */}
      <mesh position={[0.15, 0.02, -0.15]} receiveShadow castShadow>
        <cylinderGeometry args={[2.75, 2.95, 0.36, 9]} />
        {clay(C.sand)}
      </mesh>
      <mesh position={[0.15, -0.12, -0.15]}>
        <cylinderGeometry args={[2.95, 3.0, 0.1, 9]} />
        {clay(C.sandDeep)}
      </mesh>
      {/* a low hill */}
      <mesh position={[-1.0, 0.18, -0.9]} scale={[1.4, 0.5, 1.1]} castShadow receiveShadow>
        <sphereGeometry args={[0.9, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {clay(C.stone)}
      </mesh>

      <group position={[0, 0.2, 0]}>
        <Lighthouse position={[1.55, 0, 0.55]} />
        <Castle position={[-0.2, 0, 0.95]} />
        <Drum position={[0.95, 0, 1.55]} />
        <CanopyBridge position={[-1.05, 0.2, -0.75]} />
        <Palm position={[-1.85, 0, 0.6]} height={1.25} lean={0.18} />
        <Palm position={[-1.55, 0, 1.25]} height={0.95} lean={-0.12} />
        <Palm position={[2.15, 0, -0.55]} height={1.15} lean={-0.2} />
        <Palm position={[0.55, 0, -1.65]} height={1.05} lean={0.1} />
        {/* tiny boats */}
        {[[2.9, -0.05, 1.2], [-2.6, -0.05, -1.6]].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]} rotation={[0, i * 1.4, 0]} castShadow>
            <boxGeometry args={[0.42, 0.1, 0.14]} />
            {clay(i ? C.ink : C.wood)}
          </mesh>
        ))}
      </group>
    </group>
  );
}

const POSTCARDS = ['/photos/kente.jpg', '/photos/capecoast.jpg', '/photos/waakye.jpg', '/photos/labadi.jpg', '/photos/drums.jpg', '/photos/kakum.jpg'];

function Postcards({ radius = 4.6, cards = POSTCARDS, y = 1.7 }: { radius?: number; cards?: string[]; y?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.07;
  });
  return (
    <group ref={ref}>
      {cards.map((url, i) => {
        const a = (i / cards.length) * Math.PI * 2;
        return (
          <group key={url} position={[Math.cos(a) * radius, y + (i % 2) * 0.8, Math.sin(a) * radius]}>
            <Float speed={1.4} rotationIntensity={0.18} floatIntensity={0.6}>
              {/* Billboard keeps every postcard facing the viewer as the ring turns */}
              <Billboard>
                <group rotation={[0, 0, (i % 2 ? 1 : -1) * 0.08]}>
                  <RoundedBox args={[1.34, 1.64, 0.04]} radius={0.05} position={[0, 0, -0.03]} castShadow>
                    <meshStandardMaterial color="#FFFDF8" emissive="#FFF8EC" emissiveIntensity={0.35} roughness={0.85} />
                  </RoundedBox>
                  <DreiImage url={url} scale={[1.18, 1.18]} position={[0, 0.14, 0]} radius={0.06} toneMapped={false} />
                </group>
              </Billboard>
            </Float>
          </group>
        );
      })}
    </group>
  );
}

/** Eases the whole world toward the pointer for a tactile, parallax feel. */
function Rig({ children, strength = 0.18 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, pointer.x * strength, 3, dt);
    ref.current.rotation.x = THREE.MathUtils.damp(ref.current.rotation.x, -pointer.y * strength * 0.4, 3, dt);
  });
  return <group ref={ref}>{children}</group>;
}

function Lights() {
  return (
    <>
      <hemisphereLight args={['#FFF8EC', '#C9B79A', 0.9]} />
      <directionalLight
        position={[5, 9, 6]}
        intensity={1.6}
        color="#FFF1DC"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#E8D9C2" />
    </>
  );
}

export type WorldVariant = 'island' | 'star';

export default function World({ variant = 'island', className = '' }: { variant?: WorldVariant; className?: string }) {
  const island = variant === 'island';
  return (
    <div className={className} aria-hidden>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={island ? { position: [0, 4.6, 12.5], fov: 34 } : { position: [0, 0.8, 12.5], fov: 32 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Lights />
        <Suspense fallback={null}>
          <Rig strength={island ? 0.22 : 0.35}>
            {island ? (
              <group position={[0.4, -1.4, 0]} scale={0.88}>
                <Island />
                <Float speed={1.6} floatIntensity={0.9} rotationIntensity={0.15}>
                  <group position={[0.3, 3.35, 0]}>
                    <BlackStar scale={0.72} spin={0.7} />
                  </group>
                </Float>
                <Postcards />
              </group>
            ) : (
              <group position={[0, 0.7, 0]}>
                <Float speed={1.8} floatIntensity={1.1} rotationIntensity={0.4}>
                  <BlackStar scale={1.25} spin={0.8} />
                </Float>
                <Postcards radius={3.2} y={-0.7} cards={POSTCARDS.slice(0, 5)} />
              </group>
            )}
          </Rig>
          <ContactShadows position={[0, island ? -1.62 : -2.6, 0]} opacity={0.35} scale={island ? 14 : 10} blur={2.6} far={4} color="#5B4334" />
        </Suspense>
      </Canvas>
    </div>
  );
}
