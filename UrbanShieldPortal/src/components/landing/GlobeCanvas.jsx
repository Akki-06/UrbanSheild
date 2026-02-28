import { Suspense, useRef } from "react"
import { Canvas, useFrame, useLoader } from "@react-three/fiber"
import { OrbitControls, Environment } from "@react-three/drei"
import * as THREE from "three"

function Earth() {
  const mesh = useRef()
  const [albedo, bump, night] = useLoader(THREE.TextureLoader, [
    "/textures/earth albedo.jpg",
    "/textures/earth bump.jpg",
    "/textures/earth night_lights_modified.png",
  ])

  useFrame((_state, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.06
  })

  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[1, 96, 96]} />
        <meshStandardMaterial
          map={albedo}
          bumpMap={bump}
          bumpScale={0.02}
          emissiveMap={night}
          emissiveIntensity={0.28}
          emissive={new THREE.Color("#0b1b30")}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.01, 64, 64]} />
        <meshPhongMaterial
          color="#7fc8ff"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

export default function GlobeCanvas() {
  return (
    <div className="globe-3d">
      <Canvas
        camera={{ position: [0, 0, 1.9], fov: 36 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} />
          {/* key light from left for bright limb */}
          <directionalLight position={[-3.5, 1.5, 2.5]} intensity={1.75} />
          {/* soft rim to lift shadows slightly */}
          <directionalLight position={[2, -1, -1]} intensity={0.35} />
          <Environment preset="sunset" />
          <Earth />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.45} />
        </Suspense>
      </Canvas>
    </div>
  )
}
