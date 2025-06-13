import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface ThreeBackgroundProps {
  isRecording: boolean;
  audioStream?: MediaStream;
}

// Audio-responsive ribbon system
class AudioRibbon {
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.ShaderMaterial;
  private mesh!: THREE.Mesh;
  private scene: THREE.Scene;
  private points: THREE.Vector3[] = [];
  private audioData: number[] = [];
  private time: number = 0;
  
  // Ribbon parameters
  private segments = 200; // Number of segments along the ribbon
  private width = 1.2; // Ribbon width (much thicker)
  private length = 32; // Total ribbon length (much wider)
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createRibbon();
  }
  
  private createRibbon() {
    // Create ribbon geometry
    this.geometry = new THREE.BufferGeometry();
    
    // Create custom shader material for gradient effect
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        audioData: { value: new Float32Array(this.segments) },
        colorStart: { value: new THREE.Color(0x6366f1) }, // Indigo
        colorEnd: { value: new THREE.Color(0xec4899) }, // Pink
        opacity: { value: 0.9 }
      },
      vertexShader: `
        uniform float time;
        uniform float audioData[${this.segments}];
        varying vec2 vUv;
        varying float vAudioLevel;
        
        void main() {
          vUv = uv;
          
          // Get audio data for this segment
          int segmentIndex = int(floor(uv.x * ${this.segments.toFixed(1)}));
          segmentIndex = clamp(segmentIndex, 0, ${this.segments - 1});
          float audioLevel = audioData[segmentIndex];
          vAudioLevel = audioLevel;
          
          // Create gentle wave motion
          float wave1 = sin(position.x * 0.3 + time * 2.0) * 0.2;
          float wave2 = sin(position.x * 0.5 + time * 1.5) * 0.15;
          
          // Audio-reactive displacement (vertical movement) - increased sensitivity
          float audioDisplacement = audioLevel * 2.5;
          
          vec3 newPosition = position;
          newPosition.y += wave1 + wave2 + audioDisplacement;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorStart;
        uniform vec3 colorEnd;
        uniform float opacity;
        varying vec2 vUv;
        varying float vAudioLevel;
        
        void main() {
          // Create gradient along the ribbon
          vec3 color = mix(colorStart, colorEnd, vUv.x);
          
          // Add audio-reactive brightness - increased sensitivity
          color += vAudioLevel * 0.5;
          
          // Sharper edge fade for crisp edges
          float edgeFade = 1.0 - abs(vUv.y - 0.5) * 2.0;
          edgeFade = smoothstep(0.1, 0.9, edgeFade);
          
          gl_FragColor = vec4(color, opacity * edgeFade);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending, // Keep normal blending for crisp appearance
      depthWrite: false
    });
    
    // Generate straight ribbon geometry
    this.generateStraightRibbonGeometry();
    
    // Create mesh
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }
  
  private generateStraightRibbonGeometry() {
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    // Generate straight ribbon strip
    for (let i = 0; i <= this.segments; i++) {
      const x = (i / this.segments) * this.length - this.length / 2;
      const u = i / this.segments;
      
      // Top vertex
      vertices.push(x, this.width / 2, 0);
      uvs.push(u, 1);
      
      // Bottom vertex
      vertices.push(x, -this.width / 2, 0);
      uvs.push(u, 0);
      
      // Create triangles (except for last segment)
      if (i < this.segments) {
        const base = i * 2;
        
        // First triangle
        indices.push(base, base + 1, base + 2);
        // Second triangle
        indices.push(base + 1, base + 3, base + 2);
      }
    }
    
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    this.geometry.setIndex(indices);
    this.geometry.computeVertexNormals();
  }
  
  updateAudio(audioData: Uint8Array) {
    if (!audioData || audioData.length === 0) {
      // No audio - create gentle baseline wave
      for (let i = 0; i < this.segments; i++) {
        this.audioData[i] = 0.05 + Math.sin(i * 0.2 + this.time * 1.5) * 0.03;
      }
    } else {
      // Process audio data with better distribution
      for (let i = 0; i < this.segments; i++) {
        // Map each segment to the full frequency range for better distribution
        const frequencyIndex = Math.floor((i / this.segments) * audioData.length);
        const clampedIndex = Math.min(frequencyIndex, audioData.length - 1);
        
        // Get the raw audio value
        let audioValue = (audioData[clampedIndex] || 0) / 255.0;
        
        // Also blend with neighboring frequencies for smoother response
        const prevIndex = Math.max(0, clampedIndex - 1);
        const nextIndex = Math.min(audioData.length - 1, clampedIndex + 1);
        const prevValue = (audioData[prevIndex] || 0) / 255.0;
        const nextValue = (audioData[nextIndex] || 0) / 255.0;
        
        // Average with neighbors for smoother distribution
        audioValue = (prevValue + audioValue * 2 + nextValue) / 4;
        
        // Apply sensitivity boost
        audioValue = Math.pow(audioValue, 0.7) * 1.5; // Power curve + amplification
        
        this.audioData[i] = Math.min(1.0, audioValue);
      }
    }
    
    // Update shader uniform
    this.material.uniforms.audioData.value = new Float32Array(this.audioData);
  }
  
  update(time: number) {
    this.time = time;
    this.material.uniforms.time.value = time;
    
    // Remove rotation - keep the ribbon stationary
    // this.mesh.rotation.z = Math.sin(time * 0.2) * 0.1;
    // this.mesh.rotation.y = time * 0.1;
  }
  
  dispose() {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
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

  // Test function to verify audio stream is working
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

  // Setup audio analysis
  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      console.log('Setting up audio analysis...', { streamActive: stream.active, tracks: stream.getTracks().length });
      
      // Test the stream first
      testAudioStream(stream);
      
      // Clean up any existing audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      // More sensitive settings for better audio detection
      analyser.fftSize = 1024; // Increased for better frequency resolution
      analyser.smoothingTimeConstant = 0.3; // Less smoothing for more responsive
      analyser.minDecibels = -100; // Lower threshold
      analyser.maxDecibels = -10;
      
      source.connect(analyser);
      audioAnalyserRef.current = analyser;
      audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      audioContextRef.current = audioContext;
      
      // Resume audio context if it's suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('Audio context resumed');
        });
      }
      
      console.log('Audio analysis setup complete', {
        fftSize: analyser.fftSize,
        frequencyBinCount: analyser.frequencyBinCount,
        contextState: audioContext.state
      });
    } catch (error) {
      console.error('Failed to setup audio analysis:', error);
    }
  };

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
    const audioRibbon = new AudioRibbon(scene);
    audioRibbonRef.current = audioRibbon;

    // Simple lighting for the ribbon
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    console.log('Scene setup complete, starting animation...');

    // Setup audio analysis if stream is available
    if (audioStream && isRecording) {
      setupAudioAnalysis(audioStream);
    }

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
        audioRibbonRef.current.updateAudio(audioDataRef.current || new Uint8Array());
        audioRibbonRef.current.update(time);
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
        audioRibbonRef.current.dispose();
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
      setupAudioAnalysis(audioStream);
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