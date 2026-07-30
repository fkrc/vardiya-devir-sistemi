import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// Tekrar yüklenen texture'lar için THREE'nin kendi önbelleğini kullan
// (gereksiz yeniden indirme/decode etmeyi önler).
THREE.Cache.enabled = true;

// Dünya, ekranın merkezinden sağa kaydırılmış bir grup içinde konumlanır;
// böylece kamera merkezde kalırken küre sağ kenardan taşıp "kesilmiş" görünür.
const EARTH_OFFSET_X = 3.4;
const EARTH_RADIUS = 2.3;

const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
    gl_FragColor = vec4(0.35, 0.65, 1.0, 1.0) * intensity;
  }
`;

// Modül seviyesinde sabit: useLoader'a her render'da YENİ bir dizi referansı
// geçmemek için (aksi halde suspense önbelleği her seferinde farklı bir
// anahtarla eşleşip gereksiz/yinelenen yüklemelere yol açabilir).
const EARTH_TEXTURE_URLS = [
  '/textures/earth/earth_day.jpg',
  '/textures/earth/earth_normal.jpg',
  '/textures/earth/earth_specular.jpg',
  '/textures/earth/earth_lights.png',
  '/textures/earth/earth_clouds.png',
] as const;

function Earth() {
  const [dayMap, normalMap, specularMap, lightsMap, cloudsMap] = useLoader(THREE.TextureLoader, EARTH_TEXTURE_URLS as unknown as string[]);

  const globeRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (globeRef.current) globeRef.current.rotation.y += delta * 0.035;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.05;
  });

  return (
    <group position={[EARTH_OFFSET_X, 0, 0]}>
      <mesh ref={globeRef}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <meshPhongMaterial
          map={dayMap}
          normalMap={normalMap}
          specularMap={specularMap}
          emissiveMap={lightsMap}
          emissive={new THREE.Color(0xffe9b0)}
          emissiveIntensity={0.55}
          shininess={10}
        />
      </mesh>

      <mesh ref={cloudsRef} scale={1.012}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <meshStandardMaterial map={cloudsMap} transparent opacity={0.35} depthWrite={false} />
      </mesh>

      {/* Atmosfer parıltısı (Fresnel rim glow) */}
      <mesh scale={1.09}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <shaderMaterial
          vertexShader={ATMOSPHERE_VERTEX_SHADER}
          fragmentShader={ATMOSPHERE_FRAGMENT_SHADER}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

type SatelliteVariant = 'comm' | 'weather' | 'iss';

interface SatelliteConfig {
  radius: number;
  inclination: number; // radyan
  speed: number;
  phase: number;
  variant: SatelliteVariant;
}

const SATELLITES: SatelliteConfig[] = [
  { radius: 2.85, inclination: 0.26, speed: 0.26, phase: 0.0, variant: 'comm' },
  { radius: 3.15, inclination: -0.44, speed: 0.18, phase: 1.4, variant: 'weather' },
  { radius: 2.65, inclination: 0.12, speed: 0.35, phase: 2.6, variant: 'iss' },
  { radius: 3.45, inclination: 0.70, speed: 0.13, phase: 3.7, variant: 'comm' },
  { radius: 3.0, inclination: -0.78, speed: 0.29, phase: 4.9, variant: 'weather' },
  { radius: 3.3, inclination: 1.05, speed: 0.16, phase: 5.8, variant: 'iss' },
];

// Güneş paneli hücre deseni: prosedürel bir canvas dokusu olarak bir kez
// üretilip tüm uydular arasında paylaşılır (performans için).
let solarPanelTexture: THREE.CanvasTexture | null = null;
function getSolarPanelTexture(): THREE.CanvasTexture {
  if (solarPanelTexture) return solarPanelTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0b1638';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cols = 8;
  const rows = 4;
  ctx.strokeStyle = 'rgba(140, 185, 255, 0.55)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= cols; i++) {
    const x = (i / cols) * canvas.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let j = 0; j <= rows; j++) {
    const y = (j / rows) * canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  const sheen = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  sheen.addColorStop(0, 'rgba(255,255,255,0.14)');
  sheen.addColorStop(0.45, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,255,255,0.08)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  solarPanelTexture = texture;
  return texture;
}

// Uydu gövdelerinde yaygın olan altın/gümüş MLI (çok katmanlı yalıtım folyosu)
// görünümü için ortak malzemeler.
const GOLD_FOIL_MATERIAL = <meshStandardMaterial color="#caa24b" metalness={0.9} roughness={0.28} />;
const SILVER_FOIL_MATERIAL = <meshStandardMaterial color="#d7dbe2" metalness={0.75} roughness={0.3} />;
const WHITE_HULL_MATERIAL = <meshStandardMaterial color="#e8e9ec" metalness={0.25} roughness={0.55} />;
const DARK_TRIM_MATERIAL = <meshStandardMaterial color="#1c2536" metalness={0.4} roughness={0.5} />;

function SolarWing({
  side,
  width = 0.34,
  height = 0.13,
  segments = 2,
}: {
  side: 1 | -1;
  width?: number;
  height?: number;
  segments?: number;
}) {
  const texture = getSolarPanelTexture();
  const segWidth = width / segments;
  return (
    <group>
      {/* Bağlantı kolu (yoke) */}
      <mesh position={[side * 0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.06, 6]} />
        {DARK_TRIM_MATERIAL}
      </mesh>
      {Array.from({ length: segments }).map((_, i) => (
        <mesh key={i} position={[side * (0.08 + segWidth * (i + 0.5)), 0, 0]}>
          <boxGeometry args={[segWidth * 0.94, height, 0.006]} />
          <meshStandardMaterial
            map={texture}
            color="#4d7fd6"
            metalness={0.35}
            roughness={0.3}
            emissive="#0d1f4d"
            emissiveIntensity={0.25}
          />
        </mesh>
      ))}
    </group>
  );
}

function SatelliteBody({ variant }: { variant: SatelliteVariant }) {
  if (variant === 'comm') {
    // İletişim uydusu: altın folyo kaplı gövde + besleme boynuzlu büyük
    // parabolik çanak anten + geniş çift kanat güneş paneli.
    return (
      <group>
        {/* Ana gövde (bus) */}
        <mesh>
          <boxGeometry args={[0.13, 0.13, 0.19]} />
          {GOLD_FOIL_MATERIAL}
        </mesh>
        <mesh position={[0, 0, -0.1]}>
          <boxGeometry args={[0.1, 0.1, 0.02]} />
          {DARK_TRIM_MATERIAL}
        </mesh>

        {/* Parabolik çanak anten */}
        <mesh position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 0.06, 24, 1, true]} />
          <meshStandardMaterial color="#f2f5fa" metalness={0.15} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0, 0.155]}>
          <torusGeometry args={[0.1, 0.004, 8, 24]} />
          <meshStandardMaterial color="#c9ced8" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Besleme boynuzu (feed horn) + destek çubuğu */}
        <mesh position={[0, 0, 0.075]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.002, 0.002, 0.11, 6]} />
          {DARK_TRIM_MATERIAL}
        </mesh>
        <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.018, 0.03, 8]} />
          <meshStandardMaterial color="#b8c4d6" metalness={0.5} roughness={0.35} />
        </mesh>

        {/* Küçük omni anten */}
        <mesh position={[0, 0.1, -0.08]}>
          <cylinderGeometry args={[0.003, 0.003, 0.09, 6]} />
          {DARK_TRIM_MATERIAL}
        </mesh>

        <group position={[0.065, 0, 0]}>
          <SolarWing side={1} />
        </group>
        <group position={[-0.065, 0, 0]}>
          <SolarWing side={-1} />
        </group>
      </group>
    );
  }

  if (variant === 'weather') {
    // Meteoroloji uydusu: dönerek stabilize olan silindirik gövde (klasik
    // GOES/Meteosat tarzı) + sensör kubbesi + tarayıcı anten + tek panel.
    return (
      <group>
        <mesh>
          <cylinderGeometry args={[0.07, 0.07, 0.17, 20]} />
          {SILVER_FOIL_MATERIAL}
        </mesh>
        {/* Gövde üzerinde koyu bant (termal örtü şeridi) */}
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.0715, 0.0715, 0.03, 20]} />
          {DARK_TRIM_MATERIAL}
        </mesh>
        {/* Üst sensör kubbesi */}
        <mesh position={[0, 0.11, 0]}>
          <sphereGeometry args={[0.04, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#f5f5f5" metalness={0.2} roughness={0.3} />
        </mesh>
        {/* Alt tarayıcı/anten diski */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.012, 16]} />
          <meshStandardMaterial color="#c9ced8" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.08, 6]} />
          {DARK_TRIM_MATERIAL}
        </mesh>

        <group position={[0.14, 0, 0]} rotation={[0, 0, 0]}>
          <SolarWing side={1} width={0.22} height={0.1} segments={2} />
        </group>
      </group>
    );
  }

  // 'iss': merkezi kafes kirişi (truss) üzerine dizilmiş modüller + büyük
  // çift güneş paneli dizisi + beyaz radyatör panelleri.
  return (
    <group>
      {/* Ana kafes kiriş */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        {SILVER_FOIL_MATERIAL}
      </mesh>

      {/* Basınçlı modüller (gövde boyunca) */}
      {[-0.16, -0.02, 0.14].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.12, 14]} />
          {WHITE_HULL_MATERIAL}
        </mesh>
      ))}

      {/* Radyatör panelleri (beyaz, düz) */}
      <mesh position={[0.06, 0.09, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.1, 0.05, 0.004]} />
        <meshStandardMaterial color="#f5f6f8" metalness={0.1} roughness={0.4} />
      </mesh>
      <mesh position={[0.06, -0.09, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.1, 0.05, 0.004]} />
        <meshStandardMaterial color="#f5f6f8" metalness={0.1} roughness={0.4} />
      </mesh>

      {/* Büyük çift güneş paneli dizisi, kirişin uçlarında */}
      <group position={[-0.25, 0, 0]}>
        <SolarWing side={-1} width={0.42} height={0.16} segments={3} />
      </group>
      <group position={[0.25, 0, 0]}>
        <SolarWing side={1} width={0.42} height={0.16} segments={3} />
      </group>
    </group>
  );
}

function Satellite({ radius, inclination, speed, phase, variant }: SatelliteConfig) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * speed + phase;
    const x = Math.cos(t) * radius;
    const zFlat = Math.sin(t) * radius;
    const y = zFlat * Math.sin(inclination);
    const z = zFlat * Math.cos(inclination);
    ref.current.position.set(x, y, z);
    ref.current.lookAt(0, 0, 0);
  });

  return (
    <group ref={ref}>
      <SatelliteBody variant={variant} />
    </group>
  );
}

function SceneContents({ onReady }: { onReady: () => void }) {
  const group = useRef<THREE.Group>(null);
  const target = useRef({ x: 0, y: 0 });

  // Bu efekt yalnızca Earth'ün texture'ları (useLoader/Suspense) başarıyla
  // çözüldükten SONRA çalışır; dış katmandaki "takılma" bekçisine bunu bildirir.
  useEffect(() => {
    onReady();
  }, [onReady]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, target.current.x * 0.12, 0.04);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, target.current.y * 0.06, 0.04);
  });

  return (
    <group ref={group}>
      <Earth />
      <group position={[EARTH_OFFSET_X, 0, 0]}>
        {SATELLITES.map((cfg, i) => (
          <Satellite key={i} {...cfg} />
        ))}
      </group>
    </group>
  );
}

const MAX_LOAD_RETRIES = 3;
const LOAD_TIMEOUT_MS = 4000;

export default function EarthScene() {
  const dpr = useMemo<[number, number]>(() => [1, 2], []);
  // Bazı tarayıcı/oturum kombinasyonlarında texture yüklemesi çok nadiren hiç
  // çözülmeyen bir Suspense'e takılabiliyor (Dünya hiç görünmez). Bunu tespit
  // edip Suspense alt ağacını yeni bir "key" ile yeniden mount ederek (taze
  // promise'lerle) otomatik olarak kurtarıyoruz.
  const [sceneKey, setSceneKey] = useState(0);
  const readyRef = useRef(false);

  useEffect(() => {
    readyRef.current = false;
    if (sceneKey >= MAX_LOAD_RETRIES) return;

    const timer = setTimeout(() => {
      if (!readyRef.current) {
        setSceneKey(k => k + 1);
      }
    }, LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [sceneKey]);

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: true }}
      camera={{ position: [0, 0, 7], fov: 45 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#02030a']} />
      <ambientLight intensity={0.18} />
      {/* Ana ışık: soldan (key light) */}
      <directionalLight position={[-6, 2.5, 4]} intensity={2.4} color="#ffffff" />
      {/* Sağdan hafif dolgu ışığı, atmosfer kenarını belirginleştirir */}
      <directionalLight position={[5, -1.5, -3]} intensity={0.25} color="#4fc3ff" />

      <Stars radius={300} depth={60} count={5000} factor={3.5} saturation={0} fade speed={0.4} />

      <Suspense fallback={null}>
        <SceneContents key={sceneKey} onReady={() => { readyRef.current = true; }} />
      </Suspense>

      <EffectComposer>
        <Bloom luminanceThreshold={0.25} luminanceSmoothing={0.9} intensity={0.55} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
