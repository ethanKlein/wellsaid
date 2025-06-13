import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

interface ThreeBackgroundProps {
  isRecording: boolean;
  audioStream?: MediaStream;
}

// Audio-responsive ribbon system
class AudioRibbon extends THREE.Mesh {
  public geometry: THREE.BufferGeometry;
  
  constructor() {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    
    super(geometry, material);
    this.geometry = geometry;
    
    // Create initial ribbon shape
    const segments = 50;
    const positions = new Float32Array(segments * 3);
    
    for (let i = 0; i < segments; i++) {
      positions[i * 3] = (i / segments) * 2 - 1; // x
      positions[i * 3 + 1] = 0; // y
      positions[i * 3 + 2] = 0; // z
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
  }
  
  update(dataArray: Uint8Array) {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const segments = positions.length / 3;
    
    for (let i = 0; i < segments; i++) {
      const index = Math.floor((i / segments) * dataArray.length);
      const amplitude = dataArray[index] / 128.0;
      positions[i * 3 + 1] = amplitude * 2;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
  }
}

const ThreeBackground: React.FC<ThreeBackgroundProps> = ({ isRecording, audioStream }) => {
  console.log('[ThreeBackground] FILE LOADED - TOP OF FILE');
  console.log('[ThreeBackground] COMPONENT RENDER');
  React.useEffect(() => {
    console.log('[ThreeBackground] TEST EFFECT');
  });
  console.log('[ThreeBackground] MOUNT isRecording:', isRecording, 'audioStream:', !!audioStream);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const audioRibbonRef = useRef<AudioRibbon | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateRibbon = useCallback((dataArray: Uint8Array) => {
    if (!audioRibbonRef.current) return;
    console.log('[ThreeBackground] updateRibbon called');
    audioRibbonRef.current.update(dataArray);
  }, []);

  const testAudioStream = (stream: MediaStream) => {
    console.log('Testing audio stream:', {
      active: stream.active,
      tracks: stream.getTracks().map(track => ({
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState,
        label: track.label
      }))
    });
    
    // Create a simple test analyser
    try {
      const testContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const testSource = testContext.createMediaStreamSource(stream);
      const testAnalyser = testContext.createAnalyser();
      testAnalyser.fftSize = 256;
      testSource.connect(testAnalyser);
      
      const testData = new Uint8Array(testAnalyser.frequencyBinCount);
      
      // Test for 2 seconds
      let testCount = 0;
      const testInterval = setInterval(() => {
        testAnalyser.getByteFrequencyData(testData);
        const testArray = Array.from(testData);
        const sum = testArray.reduce((a, b) => a + b, 0);
        const max = Math.max(...testArray);
        console.log(`Audio test ${testCount}: sum=${sum}, max=${max}, first10=[${testArray.slice(0, 10).join(',')}]`);
        
        testCount++;
        if (testCount >= 10) {
          clearInterval(testInterval);
          testContext.close();
          console.log('Audio stream test completed');
        }
      }, 200);
      
    } catch (error) {
      console.error('Audio stream test failed:', error);
    }
  };

  const setupAudioAnalysis = useCallback(() => {
    if (!audioStream) return;
    console.log('[ThreeBackground] setupAudioAnalysis called');
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(audioStream);
    
    source.connect(analyser);
    analyser.fftSize = 256;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateVisualizer = () => {
      if (!isRecording) return;
      
      analyser.getByteFrequencyData(dataArray);
      updateRibbon(dataArray);
      requestAnimationFrame(updateVisualizer);
    };
    
    updateVisualizer();
  }, [audioStream, isRecording, updateRibbon]);

  useEffect(() => {
    if (audioStream && isRecording) {
      setupAudioAnalysis();
    }
  }, [audioStream, isRecording, setupAudioAnalysis]);

  // Get audio level with better sensitivity
  const getAudioLevel = () => {
    if (!audioAnalyserRef.current || !audioDataRef.current) {
      return 0;
    }
    
    audioAnalyserRef.current.getByteFrequencyData(audioDataRef.current);
    let sum = 0;
    let maxValue = 0;
    let count = 0;
    
    // Use broader frequency range for better voice detection
    const voiceRange = Math.min(128, audioDataRef.current.length);
    for (let i = 2; i < voiceRange; i++) {
      const value = audioDataRef.current[i];
      sum += value;
      maxValue = Math.max(maxValue, value);
      count++;
    }
    
    if (count === 0) return 0;
    
    const average = sum / count / 255;
    const peak = maxValue / 255;
    
    // More sensitive combination with emphasis on peak detection
    const level = (average * 0.5 + peak * 0.5);
    
    // Apply a small boost to make it more responsive
    return Math.min(1, level * 1.5);
  };

  // Move main Three.js useEffect here
  React.useEffect(() => {
    // Three.js initialization effect
    console.log('[ThreeBackground] useEffect start - [] DEP ARRAY');
    if (!containerRef.current) {
      console.log('[ThreeBackground] containerRef.current is null at effect start, will retry in 100ms');
      setTimeout(() => {
        if (containerRef.current) {
          console.log('[ThreeBackground] setTimeout: containerRef.current is now set');
        } else {
          console.log('[ThreeBackground] setTimeout: containerRef.current is STILL null');
        }
      }, 100);
      return;
    }
    console.log('[ThreeBackground] containerRef.current exists:', containerRef.current);
    console.log('[ThreeBackground] Creating Three.js canvas');

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    console.log('[ThreeBackground] Scene created');

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;
    console.log('[ThreeBackground] Camera created');

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current!.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    console.log('[ThreeBackground] Renderer canvas appended');

    // Create audio-responsive ribbon
    const audioRibbon = new AudioRibbon();
    audioRibbonRef.current = audioRibbon;
    scene.add(audioRibbon);
    console.log('[ThreeBackground] AudioRibbon added to scene');

    // Animation loop
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      // Get audio data and update ribbon
      if (audioRibbonRef.current && audioDataRef.current) {
        audioRibbonRef.current.update(audioDataRef.current);
        console.log('[ThreeBackground] Animation loop: ribbon updated');
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
    console.log('[ThreeBackground] Animation started');

    // Store refs in local variables for cleanup
    const currentAudioContext = audioContextRef.current;
    const currentContainer = containerRef.current;
    const currentRenderer = rendererRef.current;
    const currentAudioRibbon = audioRibbonRef.current;

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (currentAudioContext) {
        currentAudioContext.close();
      }
      if (currentRenderer && currentContainer) {
        currentContainer.removeChild(currentRenderer.domElement);
        currentRenderer.dispose();
      }
      if (currentAudioRibbon) {
        currentAudioRibbon.geometry.dispose();
        (currentAudioRibbon.material as THREE.Material).dispose();
      }
      console.log('[ThreeBackground] Cleanup complete');
    };
  }, []);

  // Handle audio stream changes
  useEffect(() => {
    console.log('Audio stream changed:', !!audioStream, 'Recording:', isRecording);
    
    // Clean up existing audio analysis if stream is no longer available
    if (!audioStream || !isRecording) {
      if (audioAnalyserRef.current) {
        console.log('Cleaning up audio analysis - no stream or not recording');
        audioAnalyserRef.current = null;
        audioDataRef.current = null;
      }
      return;
    }
    
    // Set up audio analysis if we have a stream and are recording
    if (audioStream && isRecording) {
      console.log('Setting up audio analysis from useEffect...');
      setupAudioAnalysis();
    }
  }, [audioStream, isRecording, setupAudioAnalysis]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'yellow', // bright debug background
        pointerEvents: 'none',
        border: '2px solid red',
      }}
    />
  );
};

export default ThreeBackground; 