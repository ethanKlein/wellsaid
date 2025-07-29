import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

console.log('ThreeBackground component rendered');

interface ThreeBackgroundProps {
  isRecording: boolean;
  audioStream: MediaStream | null;
}

const SEGMENTS = 64;
const LENGTH = 10;
const RADIUS = 0.2;

const ThreeBackground: React.FC<ThreeBackgroundProps> = ({ isRecording, audioStream }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const pointsRef = useRef<THREE.Vector3[]>([]);

  useEffect(() => {
    console.log('ThreeBackground useEffect running', mountRef.current);
    if (!isRecording || !mountRef.current) return;
    if (!window.WebGLRenderingContext) {
      console.error('WebGL not supported in this browser!');
      return;
    }
    try {
      console.log('Creating renderer...');
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(340, 120);
      renderer.setPixelRatio(window.devicePixelRatio);
      console.log('Renderer created:', renderer);
      mountRef.current.appendChild(renderer.domElement);
      console.log('Canvas appended:', renderer.domElement);
      rendererRef.current = renderer;
      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      // Camera
      const camera = new THREE.PerspectiveCamera(60, 340 / 120, 0.1, 100);
      camera.position.set(0, 0, 13);
      // Ribbon points
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < SEGMENTS; i++) {
        const t = i / (SEGMENTS - 1);
        points.push(new THREE.Vector3(
          t * LENGTH - LENGTH / 2,
          0,
          0
        ));
      }
      pointsRef.current = points;
      // Curve
      const curve = new THREE.CatmullRomCurve3(points);
      // Geometry
      const geometry = new THREE.TubeGeometry(curve, SEGMENTS * 2, RADIUS, 8, false);
      // Material
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      // Mesh
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      meshRef.current = mesh;
      // Animate
      const animate = () => {
        animationIdRef.current = requestAnimationFrame(animate);
        // Audio reactivity
        if (analyserRef.current && isRecording) {
          const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(freqData);
          for (let i = 0; i < SEGMENTS; i++) {
            const t = i / (SEGMENTS - 1);
            const freqIdx = Math.floor(t * (freqData.length - 1));
            const amp = freqData[freqIdx] / 255;
            pointsRef.current[i].y = (amp - 0.5) * 3;
          }
          // Update geometry
          const newCurve = new THREE.CatmullRomCurve3(pointsRef.current);
          mesh.geometry.dispose();
          mesh.geometry = new THREE.TubeGeometry(newCurve, SEGMENTS * 2, RADIUS, 8, false);
        }
        renderer.render(scene, camera);
      };
      animate();
    } catch (e) {
      console.error('Error in ThreeBackground useEffect:', e);
      // Try a plain canvas
      if (mountRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = 340;
        canvas.height = 120;
        canvas.style.background = 'red';
        mountRef.current.appendChild(canvas);
        console.log('Plain canvas appended');
      }
    }
    // Cleanup
    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
    };
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording || !audioStream) {
      analyserRef.current = null;
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      return;
    }
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(audioStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    return () => {
      analyserRef.current = null;
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [isRecording, audioStream]);

  if (!isRecording) return null;

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        maxWidth: 340,
        height: 120,
        margin: '0 auto',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#000',
        border: '2px solid #222',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  );
};

export default ThreeBackground; 