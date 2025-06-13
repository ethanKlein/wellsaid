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
    const indices = [];
    
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
  const mountRef = useRef<HTMLDivElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Audio ribbon system
  const audioRibbonRef = useRef<AudioRibbon | null>(null);

  const updateRibbon = useCallback((dataArray: Uint8Array) => {
    if (!audioRibbonRef.current) return;
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

  useEffect(() => {
    console.log('ThreeBackground mounting...');
    
    if (!mountRef.current) {
      console.error('Mount ref not available');
      return;
    }
    const mountDiv = mountRef.current; // Capture for cleanup

    // Ensure any previous animation is stopped
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    // Get the actual size of the mount container
    const container = mountRef.current;
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    
    try {
      // Clear any existing canvas first
      const existingCanvas = mountRef.current.querySelector('canvas');
      if (existingCanvas) {
        mountRef.current.removeChild(existingCanvas);
      }
      
      mountRef.current.appendChild(renderer.domElement);
      console.log('Renderer added to DOM');
    } catch (error) {
      console.error('Failed to add renderer to DOM:', error);
      return;
    }

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Position camera
    camera.position.z = 6;
    camera.position.y = 2; // Move camera up to push the ribbon down on screen

    // Create audio-responsive ribbon
    const audioRibbon = new AudioRibbon();
    audioRibbonRef.current = audioRibbon;

    // Simple lighting for the ribbon
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    console.log('Scene setup complete, starting animation...');

    // Animation state tracking
    let isAnimating = true;

    // Animation loop for ribbon
    const animate = () => {
      if (!isAnimating) {
        console.log('Animation stopped');
        return;
      }

      animationIdRef.current = requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001; // Convert to seconds
      
      // Get audio data and update ribbon
      if (audioRibbonRef.current) {
        audioRibbonRef.current.update(audioDataRef.current || new Uint8Array());
      }
      
      // Debug: Log audio level occasionally
      const audioLevel = getAudioLevel();
      if (audioLevel > 0.02 && Math.floor(time * 2) % 10 === 0) {
        console.log('Audio level:', audioLevel.toFixed(3), 'Ribbon active:', !!audioRibbonRef.current);
      }
      
      try {
        renderer.render(scene, camera);
      } catch (error) {
        console.error('Render error:', error);
        isAnimating = false;
      }
    };
    
    // Start animation
    animate();
    console.log('Animation started');

    // Handle resize of the container
    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.offsetWidth;
      const height = mountRef.current.offsetHeight;
      if (camera && renderer) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      console.log('Cleaning up ThreeBackground...');
      
      isAnimating = false;
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      
      window.removeEventListener('resize', handleResize);
      
      // Clean up audio resources
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (error) {
          console.error('Error closing audio context:', error);
        }
      }
      
      // Clean up ribbon
      if (audioRibbonRef.current) {
        audioRibbonRef.current = null;
      }
      
      if (mountDiv && renderer.domElement && mountDiv.contains(renderer.domElement)) {
        try {
          mountDiv.removeChild(renderer.domElement);
        } catch (error) {
          console.error('Error removing canvas:', error);
        }
      }
      
      renderer.dispose();
    };
  }, []); // Only run once on mount

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
      ref={mountRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
        pointerEvents: 'none', // Disable interaction for ribbon
      }}
    />
  );
};

export default ThreeBackground; 