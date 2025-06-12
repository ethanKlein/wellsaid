import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface ThreeBackgroundProps {
  isRecording: boolean;
  audioStream?: MediaStream;
}

const ThreeBackground: React.FC<ThreeBackgroundProps> = ({ isRecording, audioStream }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const blobsRef = useRef<THREE.Mesh[]>([]);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Interaction state
  const [cursorStyle, setCursorStyle] = useState<'grab' | 'grabbing'>('grab');
  
  // Interaction refs
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const isDraggingRef = useRef<boolean>(false);
  const draggedObjectRef = useRef<THREE.Mesh | null>(null);
  const dragOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const intersectionPointRef = useRef<THREE.Vector3>(new THREE.Vector3());

  // Colors from the gradient image
  const colors = [
    '#a7f3d0', // Light teal
    '#6ee7b7', // Medium teal
    '#34d399', // Darker teal
    '#fcd5ce', // Light peach
    '#ffb4a2', // Medium peach
    '#fd9783', // Darker peach
  ];

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
      // Log why we're returning 0
      if (!audioAnalyserRef.current) console.log('No audio analyser');
      if (!audioDataRef.current) console.log('No audio data array');
      return 0;
    }
    
    audioAnalyserRef.current.getByteFrequencyData(audioDataRef.current);
    let sum = 0;
    let maxValue = 0;
    let count = 0;
    
    // Use broader frequency range for better voice detection
    const voiceRange = Math.min(128, audioDataRef.current.length); // Increased range
    for (let i = 2; i < voiceRange; i++) { // Skip very low frequencies (noise)
      const value = audioDataRef.current[i];
      sum += value;
      maxValue = Math.max(maxValue, value);
      count++;
    }
    
    if (count === 0) return 0;
    
    const average = sum / count / 255;
    const peak = maxValue / 255;
    
    // Log raw values for debugging
    if (sum > 0) {
      console.log('Raw audio data:', {
        sum,
        maxValue,
        average: average.toFixed(4),
        peak: peak.toFixed(4),
        dataLength: audioDataRef.current.length,
        firstFewValues: Array.from(audioDataRef.current.slice(0, 10))
      });
    }
    
    // More sensitive combination with emphasis on peak detection
    const level = (average * 0.5 + peak * 0.5);
    
    // Apply a small boost to make it more responsive
    return Math.min(1, level * 1.5);
  };

  // Get frequency data for more detailed audio reactivity
  const getFrequencyData = () => {
    if (!audioAnalyserRef.current || !audioDataRef.current) return { low: 0, mid: 0, high: 0 };
    
    audioAnalyserRef.current.getByteFrequencyData(audioDataRef.current);
    
    const dataLength = audioDataRef.current.length;
    const lowEnd = Math.floor(dataLength * 0.2);
    const midEnd = Math.floor(dataLength * 0.6);
    
    let low = 0, mid = 0, high = 0;
    
    // Low frequencies (bass)
    for (let i = 0; i < lowEnd; i++) {
      low += audioDataRef.current[i];
    }
    low = (low / lowEnd) / 255;
    
    // Mid frequencies (voice)
    for (let i = lowEnd; i < midEnd; i++) {
      mid += audioDataRef.current[i];
    }
    mid = (mid / (midEnd - lowEnd)) / 255;
    
    // High frequencies (treble)
    for (let i = midEnd; i < dataLength; i++) {
      high += audioDataRef.current[i];
    }
    high = (high / (dataLength - midEnd)) / 255;
    
    return { low, mid, high };
  };

  // Helper function to get mouse/touch position in normalized device coordinates
  const getPointerPosition = (event: MouseEvent | TouchEvent): { x: number, y: number } => {
    const rect = rendererRef.current?.domElement.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    let clientX: number, clientY: number;
    
    if ('touches' in event && event.touches.length > 0) {
      // Touch event
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('clientX' in event) {
      // Mouse event
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      return { x: 0, y: 0 };
    }
    
    // Convert to normalized device coordinates (-1 to +1)
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    return { x, y };
  };

  // Handle pointer down (mouse down or touch start)
  const handlePointerDown = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    
    if (!cameraRef.current || !sceneRef.current) return;
    
    const pointer = getPointerPosition(event);
    mouseRef.current.set(pointer.x, pointer.y);
    
    // Update raycaster
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    // Check for intersections with blobs
    const intersects = raycasterRef.current.intersectObjects(blobsRef.current);
    
    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object as THREE.Mesh;
      
      // Start dragging
      isDraggingRef.current = true;
      draggedObjectRef.current = intersectedObject;
      
      // Calculate drag offset
      const intersectionPoint = intersects[0].point;
      dragOffsetRef.current.copy(intersectionPoint).sub(intersectedObject.position);
      
      // Set up drag plane at the object's Z position
      dragPlaneRef.current.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 0, 1),
        intersectedObject.position
      );
      
      // Store original position for potential restoration
      if (!intersectedObject.userData.originalDragPosition) {
        intersectedObject.userData.originalDragPosition = intersectedObject.position.clone();
      }
      
      // Visual feedback - slightly scale up the dragged object
      intersectedObject.scale.multiplyScalar(1.1);
      
      // Update cursor style
      setCursorStyle('grabbing');
      
      console.log('Started dragging shape:', intersectedObject.userData.index);
    }
  };

  // Handle pointer move (mouse move or touch move)
  const handlePointerMove = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    
    if (!isDraggingRef.current || !draggedObjectRef.current || !cameraRef.current) return;
    
    const pointer = getPointerPosition(event);
    mouseRef.current.set(pointer.x, pointer.y);
    
    // Update raycaster
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    // Find intersection with drag plane
    if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectionPointRef.current)) {
      // Update object position
      draggedObjectRef.current.position.copy(intersectionPointRef.current).sub(dragOffsetRef.current);
      
      // Update the original position so the shape doesn't snap back during animation
      draggedObjectRef.current.userData.originalX = draggedObjectRef.current.position.x;
      draggedObjectRef.current.userData.originalY = draggedObjectRef.current.position.y;
      draggedObjectRef.current.userData.originalZ = draggedObjectRef.current.position.z;
    }
  };

  // Handle pointer up (mouse up or touch end)
  const handlePointerUp = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    
    if (isDraggingRef.current && draggedObjectRef.current) {
      // Visual feedback - restore scale
      draggedObjectRef.current.scale.divideScalar(1.1);
      
      // Update cursor style
      setCursorStyle('grab');
      
      console.log('Stopped dragging shape:', draggedObjectRef.current.userData.index);
      
      // Reset dragging state
      isDraggingRef.current = false;
      draggedObjectRef.current = null;
    }
  };

  useEffect(() => {
    console.log('ThreeBackground mounting...');
    
    if (!mountRef.current) {
      console.error('Mount ref not available');
      return;
    }

    // Ensure any previous animation is stopped
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    
    try {
      // Clear any existing canvas first
      const existingCanvas = mountRef.current.querySelector('canvas');
      if (existingCanvas) {
        mountRef.current.removeChild(existingCanvas);
      }
      
      mountRef.current.appendChild(renderer.domElement);
      console.log('Renderer added to DOM');
      
      // Add interaction event listeners to the canvas
      const canvas = renderer.domElement;
      
      // Mouse events
      canvas.addEventListener('mousedown', handlePointerDown);
      canvas.addEventListener('mousemove', handlePointerMove);
      canvas.addEventListener('mouseup', handlePointerUp);
      canvas.addEventListener('mouseleave', handlePointerUp); // Handle mouse leaving canvas
      
      // Touch events
      canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
      canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
      canvas.addEventListener('touchend', handlePointerUp, { passive: false });
      canvas.addEventListener('touchcancel', handlePointerUp, { passive: false });
      
      // Prevent context menu on right click
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      
      console.log('Interaction event listeners added');
    } catch (error) {
      console.error('Failed to add renderer to DOM:', error);
      return;
    }

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Position camera
    camera.position.z = 5;

    // Create varied organic blob shapes instead of uniform spheres
    const blobs: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      let geometry: THREE.BufferGeometry;
      
      // Create different organic shapes for each blob
      switch (i % 6) {
        case 0: // Extremely elongated cigar shape
          geometry = new THREE.SphereGeometry(0.6, 20, 12);
          geometry.scale(2.5, 0.4, 0.5); // Very long and thin
          break;
          
        case 1: // Tall, skinny tower blob
          geometry = new THREE.SphereGeometry(0.5, 12, 20);
          geometry.scale(0.4, 2.8, 0.4); // Very tall and narrow
          break;
          
        case 2: // Flat, wide pancake with bulges
          geometry = new THREE.SphereGeometry(1.0, 24, 8);
          geometry.scale(1.8, 0.3, 1.6); // Very flat and wide
          // Add some bulges to make it more organic
          const pancakePositions = geometry.attributes.position;
          for (let j = 0; j < pancakePositions.count; j++) {
            const x = pancakePositions.getX(j);
            const y = pancakePositions.getY(j);
            const z = pancakePositions.getZ(j);
            
            // Add radial bulges
            const angle = Math.atan2(z, x);
            const bulge = Math.sin(angle * 3) * 0.2 + Math.cos(angle * 5) * 0.1;
            const radius = Math.sqrt(x * x + z * z);
            const factor = 1 + bulge;
            
            pancakePositions.setXYZ(j, x * factor, y, z * factor);
          }
          pancakePositions.needsUpdate = true;
          geometry.computeVertexNormals();
          break;
          
        case 3: // Pear-shaped blob (bulbous bottom, narrow top)
          geometry = new THREE.SphereGeometry(0.8, 16, 16);
          const pearPositions = geometry.attributes.position;
          for (let j = 0; j < pearPositions.count; j++) {
            const x = pearPositions.getX(j);
            const y = pearPositions.getY(j);
            const z = pearPositions.getZ(j);
            
            // Create pear shape - wider at bottom, narrower at top
            const yNorm = (y + 0.8) / 1.6; // Normalize Y to 0-1
            const widthFactor = yNorm < 0.3 ? 1.6 - yNorm * 1.2 : 0.4 + yNorm * 0.8;
            const heightFactor = 1 + y * 0.3;
            
            pearPositions.setXYZ(j, x * widthFactor, y * heightFactor, z * widthFactor);
          }
          pearPositions.needsUpdate = true;
          geometry.computeVertexNormals();
          break;
          
        case 4: // Extremely lumpy, irregular asteroid-like blob
          geometry = new THREE.SphereGeometry(0.7, 16, 12);
          const lumpyPositions = geometry.attributes.position;
          for (let j = 0; j < lumpyPositions.count; j++) {
            const x = lumpyPositions.getX(j);
            const y = lumpyPositions.getY(j);
            const z = lumpyPositions.getZ(j);
            
            // Multiple layers of noise for very irregular shape
            const noise1 = Math.sin(x * 4) * Math.cos(y * 3) * Math.sin(z * 5) * 0.3;
            const noise2 = Math.sin(x * 8) * Math.cos(y * 6) * Math.sin(z * 7) * 0.15;
            const noise3 = Math.sin(x * 12) * Math.cos(y * 10) * Math.sin(z * 9) * 0.08;
            const totalNoise = noise1 + noise2 + noise3;
            
            const length = Math.sqrt(x * x + y * y + z * z);
            const factor = (1 + totalNoise) / length;
            
            lumpyPositions.setXYZ(j, x * factor, y * factor, z * factor);
          }
          lumpyPositions.needsUpdate = true;
          geometry.computeVertexNormals();
          break;
          
        case 5: // Twisted, spiral-stretched blob
          geometry = new THREE.SphereGeometry(0.8, 20, 16);
          const spiralPositions = geometry.attributes.position;
          for (let j = 0; j < spiralPositions.count; j++) {
            const x = spiralPositions.getX(j);
            const y = spiralPositions.getY(j);
            const z = spiralPositions.getZ(j);
            
            // Create spiral twist and stretch
            const angle = Math.atan2(z, x);
            const radius = Math.sqrt(x * x + z * z);
            const twist = y * 0.8; // Twist amount based on height
            const newAngle = angle + twist;
            
            // Stretch based on Y position
            const stretchFactor = 1 + Math.abs(y) * 0.6;
            const radiusStretch = 1 - Math.abs(y) * 0.3;
            
            const newX = Math.cos(newAngle) * radius * radiusStretch;
            const newZ = Math.sin(newAngle) * radius * radiusStretch;
            const newY = y * stretchFactor;
            
            spiralPositions.setXYZ(j, newX, newY, newZ);
          }
          spiralPositions.needsUpdate = true;
          geometry.computeVertexNormals();
          break;
          
        default:
          geometry = new THREE.SphereGeometry(0.8, 16, 16);
      }
      
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(colors[i % colors.length]),
        transparent: false,
        opacity: 1.0,
        shininess: 100,
      });
      
      const blob = new THREE.Mesh(geometry, material);
      
      // Position blobs in a circle - make sure they're visible
      const angle = (i / 6) * Math.PI * 2;
      blob.position.x = Math.cos(angle) * 2; // Reduced from 3 to bring closer
      blob.position.y = Math.sin(angle) * 1.5; // Reduced from 2
      blob.position.z = 0;
      
      // Store original position for movement reference
      blob.userData = {
        originalX: blob.position.x,
        originalY: blob.position.y,
        originalZ: blob.position.z,
        index: i
      };
      
      scene.add(blob);
      blobs.push(blob);
      console.log(`Created blob ${i} at position:`, blob.position, 'color:', colors[i % colors.length]);
    }
    
    blobsRef.current = blobs;

    // Simple lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    console.log('Scene setup complete, starting animation...');

    // Setup audio analysis if stream is available
    if (audioStream && isRecording) {
      setupAudioAnalysis(audioStream);
    }

    // Animation state tracking
    let isAnimating = true;

    // Simple animation loop with obvious movement
    const animate = () => {
      if (!isAnimating) {
        console.log('Animation stopped');
        return;
      }

      animationIdRef.current = requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001; // Convert to seconds
      
      // Debug: Log animation loop is running
      if (Math.floor(time) % 5 === 0 && Math.floor(time * 10) % 10 === 0) {
        console.log('Animation loop running at time:', time.toFixed(1), 'blobs count:', blobs.length);
      }
      
      // Check if scene and blobs still exist
      if (!scene || !blobs.length) {
        console.error('Scene or blobs missing during animation', { scene: !!scene, blobsLength: blobs.length });
        return;
      }
      
      // Get audio data
      const audioLevel = getAudioLevel();
      const frequencies = getFrequencyData();
      
      // Enhanced debugging - log audio data more frequently and with lower threshold
      if (audioLevel > 0.02) {
        // Log basic audio info occasionally when audio is detected
        if (Math.floor(time * 5) % 100 === 0) { // Much less frequent logging
          console.log('Audio responsive - Level:', audioLevel.toFixed(3), 'Frequencies:', {
            low: frequencies.low.toFixed(3),
            mid: frequencies.mid.toFixed(3),
            high: frequencies.high.toFixed(3)
          });
        }
      }
      
      blobs.forEach((blob, index) => {
        if (!blob || !blob.userData) {
          console.warn(`Blob ${index} is missing or has no userData`);
          return;
        }
        
        const material = blob.material as THREE.MeshPhongMaterial;
        const originalColor = new THREE.Color(colors[index % colors.length]);
        
        // Debug: Log blob state for first blob occasionally
        if (index === 0 && Math.floor(time * 2) % 10 === 0) {
          console.log('Blob 0 state:', {
            position: `${blob.position.x.toFixed(2)}, ${blob.position.y.toFixed(2)}, ${blob.position.z.toFixed(2)}`,
            scale: blob.scale.x.toFixed(2),
            rotation: `${blob.rotation.x.toFixed(2)}, ${blob.rotation.y.toFixed(2)}, ${blob.rotation.z.toFixed(2)}`,
            visible: blob.visible,
            inScene: scene.children.includes(blob)
          });
        }
        
        // Audio-enhanced rotation when speaking - make each shape unique
        if (audioLevel > 0.02) { // Raised threshold for less sensitivity
          // Each shape has different rotation sensitivity and frequency focus
          let rotationMultiplier = 1;
          let rotationFocus = { low: 0, mid: 0, high: 0 };
          let rotationOffset = index * 1.7; // Unique rotation phase for each shape
          
          switch (index % 6) {
            case 0: // Slow, low-frequency rotation
              rotationFocus = { low: 0.03, mid: 0.01, high: 0.005 };
              rotationMultiplier = 0.5;
              rotationOffset = index * 1.3;
              break;
            case 1: // Mid-frequency responsive
              rotationFocus = { low: 0.01, mid: 0.04, high: 0.01 };
              rotationMultiplier = 1.0;
              rotationOffset = index * 2.1;
              break;
            case 2: // High-frequency, fast rotation
              rotationFocus = { low: 0.005, mid: 0.01, high: 0.05 };
              rotationMultiplier = 1.5;
              rotationOffset = index * 0.9;
              break;
            case 3: // Minimal rotation
              rotationFocus = { low: 0.01, mid: 0.01, high: 0.01 };
              rotationMultiplier = 0.3;
              rotationOffset = index * 1.8;
              break;
            case 4: // Low-mid rotation
              rotationFocus = { low: 0.025, mid: 0.025, high: 0.005 };
              rotationMultiplier = 0.8;
              rotationOffset = index * 1.4;
              break;
            case 5: // Balanced rotation
              rotationFocus = { low: 0.02, mid: 0.02, high: 0.02 };
              rotationMultiplier = 0.7;
              rotationOffset = index * 2.3;
              break;
          }
          
          const rotationBoost = audioLevel * 0.01 * rotationMultiplier;
          blob.rotation.x += frequencies.mid * rotationFocus.mid + rotationBoost + Math.sin(time + rotationOffset) * 0.005;
          blob.rotation.y += frequencies.high * rotationFocus.high + rotationBoost + Math.cos(time * 0.35 + rotationOffset) * 0.005;
          blob.rotation.z += frequencies.low * rotationFocus.low + rotationBoost + Math.sin(time * 0.65 + rotationOffset) * 0.005;
        } else {
          // Even when not speaking, add subtle independent rotation
          const rotationOffset = index * 1.7;
          blob.rotation.x += Math.sin(time * 0.15 + rotationOffset) * 0.002;
          blob.rotation.y += Math.cos(time * 0.1 + rotationOffset * 1.3) * 0.002;
          blob.rotation.z += Math.sin(time * 0.2 + rotationOffset * 0.8) * 0.002;
        }
        
        // Base floating motion - each shape moves like an independent fish
        const originalX = blob.userData.originalX;
        const originalY = blob.userData.originalY;
        
        // Each shape has its own swimming pattern and territory
        let fishPersonality = { 
          speed: 1, 
          territory: 1, 
          pattern: 'circular',
          xOffset: 0,
          yOffset: 0,
          zOffset: 0,
          timeOffset: 0 // Add unique time offset for each shape
        };
        
        switch (index % 6) {
          case 0: // Slow, wide swimmer
            fishPersonality = { 
              speed: 0.15, // Reduced from 0.3
              territory: 2.5, 
              pattern: 'figure8',
              xOffset: time * 0.1 + index * 1.7, // Reduced from 0.2
              yOffset: time * 0.075 + index * 2.3, // Reduced from 0.15
              zOffset: time * 0.05 + index * 1.1, // Reduced from 0.1
              timeOffset: index * 0.8
            };
            break;
          case 1: // Fast, tight swimmer
            fishPersonality = { 
              speed: 0.4, // Reduced from 0.8
              territory: 1.2, 
              pattern: 'circular',
              xOffset: time * 0.3 + index * 2.1, // Reduced from 0.6
              yOffset: time * 0.25 + index * 1.9, // Reduced from 0.5
              zOffset: time * 0.15 + index * 1.4, // Reduced from 0.3
              timeOffset: index * 1.2
            };
            break;
          case 2: // Vertical swimmer
            fishPersonality = { 
              speed: 0.25, // Reduced from 0.5
              territory: 1.8, 
              pattern: 'vertical',
              xOffset: time * 0.125 + index * 1.3, // Reduced from 0.25
              yOffset: time * 0.35 + index * 2.7, // Reduced from 0.7
              zOffset: time * 0.1 + index * 0.9, // Reduced from 0.2
              timeOffset: index * 0.6
            };
            break;
          case 3: // Lazy floater
            fishPersonality = { 
              speed: 0.1, // Reduced from 0.2
              territory: 1.0, 
              pattern: 'drift',
              xOffset: time * 0.075 + index * 0.7, // Reduced from 0.15
              yOffset: time * 0.05 + index * 1.5, // Reduced from 0.1
              zOffset: time * 0.025 + index * 2.1, // Reduced from 0.05
              timeOffset: index * 1.5
            };
            break;
          case 4: // Diagonal swimmer
            fishPersonality = { 
              speed: 0.3, // Reduced from 0.6
              territory: 2.0, 
              pattern: 'diagonal',
              xOffset: time * 0.2 + index * 1.8, // Reduced from 0.4
              yOffset: time * 0.175 + index * 2.4, // Reduced from 0.35
              zOffset: time * 0.125 + index * 1.6, // Reduced from 0.25
              timeOffset: index * 0.9
            };
            break;
          case 5: // Erratic swimmer
            fishPersonality = { 
              speed: 0.35, // Reduced from 0.7
              territory: 1.5, 
              pattern: 'erratic',
              xOffset: time * 0.25 + Math.sin(time * 1.0 + index * 3.1) * 0.3 + index * 2.2, // Reduced time multipliers
              yOffset: time * 0.225 + Math.cos(time * 0.75 + index * 2.7) * 0.2 + index * 1.8, // Reduced from 0.45 and 1.5
              zOffset: time * 0.175 + Math.sin(time * 1.5 + index * 1.9) * 0.1 + index * 2.5, // Reduced from 0.35 and 3
              timeOffset: index * 1.1
            };
            break;
        }
        
        // Calculate independent swimming positions based on pattern
        let swimX, swimY, swimZ;
        
        switch (fishPersonality.pattern) {
          case 'figure8':
            swimX = originalX + Math.sin(fishPersonality.xOffset) * fishPersonality.territory;
            swimY = originalY + Math.sin(fishPersonality.yOffset * 2) * fishPersonality.territory * 0.5;
            swimZ = Math.sin(fishPersonality.zOffset) * fishPersonality.territory * 0.3;
            break;
            
          case 'circular':
            const angle = fishPersonality.xOffset;
            swimX = originalX + Math.cos(angle) * fishPersonality.territory;
            swimY = originalY + Math.sin(angle) * fishPersonality.territory;
            swimZ = Math.sin(fishPersonality.zOffset) * fishPersonality.territory * 0.2;
            break;
            
          case 'vertical':
            swimX = originalX + Math.sin(fishPersonality.xOffset) * fishPersonality.territory * 0.3;
            swimY = originalY + Math.sin(fishPersonality.yOffset) * fishPersonality.territory;
            swimZ = Math.cos(fishPersonality.zOffset) * fishPersonality.territory * 0.4;
            break;
            
          case 'drift':
            swimX = originalX + Math.sin(fishPersonality.xOffset) * fishPersonality.territory;
            swimY = originalY + Math.cos(fishPersonality.yOffset) * fishPersonality.territory;
            swimZ = Math.sin(fishPersonality.zOffset * 0.5) * fishPersonality.territory * 0.2;
            break;
            
          case 'diagonal':
            swimX = originalX + Math.sin(fishPersonality.xOffset) * fishPersonality.territory;
            swimY = originalY + Math.sin(fishPersonality.yOffset + Math.PI/4) * fishPersonality.territory;
            swimZ = Math.cos(fishPersonality.zOffset) * fishPersonality.territory * 0.3;
            break;
            
          case 'erratic':
            swimX = originalX + Math.sin(fishPersonality.xOffset) * fishPersonality.territory;
            swimY = originalY + Math.cos(fishPersonality.yOffset) * fishPersonality.territory;
            swimZ = Math.sin(fishPersonality.zOffset) * fishPersonality.territory * 0.4;
            break;
            
          default:
            swimX = originalX;
            swimY = originalY;
            swimZ = 0;
        }
        
        // Keep fish within reasonable bounds (tank walls)
        const tankBounds = { x: 4, y: 3, z: 2 };
        swimX = Math.max(-tankBounds.x, Math.min(tankBounds.x, swimX));
        swimY = Math.max(-tankBounds.y, Math.min(tankBounds.y, swimY));
        swimZ = Math.max(-tankBounds.z, Math.min(tankBounds.z, swimZ));
        
        let posX = swimX;
        let posY = swimY;
        let posZ = swimZ;
        
        // Audio-reactive movement - enhances the fish swimming
        if (audioLevel > 0.02) {
          // Audio makes the fish more excited/active in their swimming
          let audioEnhancement = { x: 0, y: 0, z: 0, speedBoost: 1 };
          
          switch (index % 6) {
            case 0: // Slow swimmer gets gentle audio nudges
              audioEnhancement = { 
                x: frequencies.low * 0.3, 
                y: frequencies.mid * 0.2, 
                z: frequencies.high * 0.1,
                speedBoost: 1 + audioLevel * 0.5
              };
              break;
            case 1: // Fast swimmer gets more dramatic responses
              audioEnhancement = { 
                x: frequencies.mid * 0.4, 
                y: frequencies.high * 0.3, 
                z: frequencies.low * 0.2,
                speedBoost: 1 + audioLevel * 0.8
              };
              break;
            case 2: // Vertical swimmer responds with vertical emphasis
              audioEnhancement = { 
                x: frequencies.high * 0.2, 
                y: frequencies.mid * 0.5, 
                z: frequencies.low * 0.3,
                speedBoost: 1 + audioLevel * 0.6
              };
              break;
            case 3: // Lazy floater barely responds
              audioEnhancement = { 
                x: frequencies.low * 0.1, 
                y: frequencies.mid * 0.1, 
                z: frequencies.high * 0.05,
                speedBoost: 1 + audioLevel * 0.3
              };
              break;
            case 4: // Diagonal swimmer gets diagonal boosts
              audioEnhancement = { 
                x: frequencies.low * 0.3, 
                y: frequencies.mid * 0.3, 
                z: frequencies.high * 0.2,
                speedBoost: 1 + audioLevel * 0.7
              };
              break;
            case 5: // Erratic swimmer gets more erratic
              audioEnhancement = { 
                x: frequencies.high * 0.4, 
                y: frequencies.low * 0.3, 
                z: frequencies.mid * 0.3,
                speedBoost: 1 + audioLevel * 1.0
              };
              break;
          }
          
          // Apply audio enhancement to the swimming motion
          const audioX = Math.sin(time * 2 + index) * audioEnhancement.x; // Reduced from 4
          const audioY = Math.cos(time * 1.5 + index * 1.5) * audioEnhancement.y; // Reduced from 3
          const audioZ = Math.sin(time * 1 + index * 2) * audioEnhancement.z; // Reduced from 2
          
          posX += audioX;
          posY += audioY;
          posZ += audioZ;
          
          // Audio can also make fish "dart" occasionally
          const dartChance = audioLevel * frequencies.mid;
          if (dartChance > 0.3) {
            const dartDirection = Math.sin(time * 5 + index) * dartChance; // Reduced from 10
            posX += dartDirection * 0.2;
            posY += Math.cos(time * 4 + index) * dartChance * 0.15; // Reduced from 8
          }
          
          // Keep enhanced position within tank bounds
          posX = Math.max(-tankBounds.x, Math.min(tankBounds.x, posX));
          posY = Math.max(-tankBounds.y, Math.min(tankBounds.y, posY));
          posZ = Math.max(-tankBounds.z, Math.min(tankBounds.z, posZ));
        }
        
        // Only update position if this shape is not being dragged
        if (draggedObjectRef.current !== blob) {
          blob.position.x = posX;
          blob.position.y = posY;
          blob.position.z = posZ;
        }
        
        // Base scale with gentle breathing
        let scale = 1 + Math.sin(time * 0.4 + index * 2.1) * 0.1; // Reduced from 0.8 to 0.4
        
        // More subtle audio-reactive scaling
        if (audioLevel > 0.02) { // Raised threshold
          // Much more subtle scaling based on audio
          const audioScale = 1 + audioLevel * 0.3; // Reduced from 1.5 to 0.3
          
          // Make each shape respond differently based on its index
          let shapeMultiplier = 1;
          let frequencyFocus = { low: 0, mid: 0, high: 0 };
          
          switch (index % 6) {
            case 0: // Low frequency focused
              frequencyFocus = { low: 0.4, mid: 0.1, high: 0.05 };
              shapeMultiplier = 0.8;
              break;
            case 1: // Mid frequency focused  
              frequencyFocus = { low: 0.1, mid: 0.4, high: 0.1 };
              shapeMultiplier = 1.0;
              break;
            case 2: // High frequency focused
              frequencyFocus = { low: 0.05, mid: 0.1, high: 0.4 };
              shapeMultiplier = 0.6;
              break;
            case 3: // Balanced but subtle
              frequencyFocus = { low: 0.15, mid: 0.15, high: 0.15 };
              shapeMultiplier = 0.5;
              break;
            case 4: // Low-mid focused
              frequencyFocus = { low: 0.3, mid: 0.3, high: 0.05 };
              shapeMultiplier = 0.7;
              break;
            case 5: // Mid-high focused
              frequencyFocus = { low: 0.05, mid: 0.3, high: 0.3 };
              shapeMultiplier = 0.9;
              break;
          }
          
          // Apply frequency-specific scaling with shape personality
          const lowScale = frequencies.low * frequencyFocus.low * shapeMultiplier;
          const midScale = frequencies.mid * frequencyFocus.mid * shapeMultiplier;
          const highScale = frequencies.high * frequencyFocus.high * shapeMultiplier;
          
          scale = audioScale + lowScale + midScale + highScale;
          
          // Much more conservative bounds for scaling
          scale = Math.max(0.8, Math.min(scale, 1.4)); // Very subtle scaling range
          
          // Reduce logging frequency
          if (index === 0 && Math.floor(time * 2) % 20 === 0) {
            console.log('Audio scaling:', {
              shapeIndex: index,
              audioScale: audioScale.toFixed(2),
              lowScale: lowScale.toFixed(3),
              midScale: midScale.toFixed(3),
              highScale: highScale.toFixed(3),
              finalScale: scale.toFixed(2)
            });
          }
        }
        
        blob.scale.setScalar(scale);
        
        // Dynamic shape morphing - shapes change form over time and with audio
        const geometry = blob.geometry as THREE.BufferGeometry;
        const positions = geometry.attributes.position;
        
        // Safety check for geometry attributes
        if (!positions || !positions.array) {
          console.warn(`Blob ${index} missing position attributes`);
        } else {
          let originalPositions = blob.userData.originalPositions;
          
          // If we haven't stored original positions yet, do it now
          if (!originalPositions) {
            try {
              blob.userData.originalPositions = new Float32Array(positions.array.length);
              for (let i = 0; i < positions.array.length; i++) {
                blob.userData.originalPositions[i] = positions.array[i];
              }
              originalPositions = blob.userData.originalPositions;
              console.log(`Stored original positions for blob ${index}, length: ${originalPositions.length}`);
            } catch (error) {
              console.error(`Failed to store original positions for blob ${index}:`, error);
              originalPositions = null;
            }
          }
          
          // Safety check for originalPositions and proceed with morphing
          if (originalPositions && originalPositions.length > 0) {
            // Additional safety check: ensure positions.count matches expected array structure
            const expectedLength = positions.count * 3;
            if (originalPositions.length !== expectedLength) {
              console.warn(`Blob ${index}: Position array length mismatch. Expected: ${expectedLength}, Got: ${originalPositions.length}`);
            } else {
              // Each shape has different morphing characteristics
              let morphStyle = { 
                timeSpeed: 1, 
                timeIntensity: 1, 
                audioSensitivity: 1, 
                morphType: 'wave',
                audioResponse: { low: 0, mid: 0, high: 0 },
                timeOffset: index * 1.3 // Unique time offset for independent morphing
              };
              
              switch (index % 6) {
                case 0: // Cigar - undulates like swimming
                  morphStyle = {
                    timeSpeed: 0.4, // Reduced from 0.8
                    timeIntensity: 0.15,
                    audioSensitivity: 0.6,
                    morphType: 'undulate',
                    audioResponse: { low: 0.3, mid: 0.1, high: 0.05 },
                    timeOffset: index * 1.3
                  };
                  break;
                case 1: // Tower - sways and bends
                  morphStyle = {
                    timeSpeed: 0.3, // Reduced from 0.6
                    timeIntensity: 0.2,
                    audioSensitivity: 0.8,
                    morphType: 'sway',
                    audioResponse: { low: 0.1, mid: 0.4, high: 0.2 },
                    timeOffset: index * 2.1
                  };
                  break;
                case 2: // Pancake - ripples like water
                  morphStyle = {
                    timeSpeed: 0.6, // Reduced from 1.2
                    timeIntensity: 0.1,
                    audioSensitivity: 1.0,
                    morphType: 'ripple',
                    audioResponse: { low: 0.2, mid: 0.3, high: 0.4 },
                    timeOffset: index * 0.7
                  };
                  break;
                case 3: // Pear - pulses and breathes
                  morphStyle = {
                    timeSpeed: 0.2, // Reduced from 0.4
                    timeIntensity: 0.08,
                    audioSensitivity: 0.5,
                    morphType: 'pulse',
                    audioResponse: { low: 0.4, mid: 0.2, high: 0.1 },
                    timeOffset: index * 1.8
                  };
                  break;
                case 4: // Asteroid - chaotic morphing
                  morphStyle = {
                    timeSpeed: 0.75, // Reduced from 1.5
                    timeIntensity: 0.25,
                    audioSensitivity: 1.2,
                    morphType: 'chaos',
                    audioResponse: { low: 0.3, mid: 0.3, high: 0.3 },
                    timeOffset: index * 0.9
                  };
                  break;
                case 5: // Spiral - twists and stretches
                  morphStyle = {
                    timeSpeed: 0.45, // Reduced from 0.9
                    timeIntensity: 0.18,
                    audioSensitivity: 0.9,
                    morphType: 'twist',
                    audioResponse: { low: 0.2, mid: 0.4, high: 0.3 },
                    timeOffset: index * 1.6
                  };
                  break;
              }
              
              // Apply dynamic morphing to each vertex
              for (let i = 0; i < positions.count; i++) {
                const i3 = i * 3;
                
                // Additional safety check for array bounds
                if (i3 + 2 >= originalPositions.length) {
                  console.warn(`Blob ${index}: Array bounds exceeded at vertex ${i}, i3=${i3}, arrayLength=${originalPositions.length}`);
                  break;
                }
                
                const originalX = originalPositions[i3];
                const originalY = originalPositions[i3 + 1];
                const originalZ = originalPositions[i3 + 2];
                
                // Safety check for valid original values
                if (originalX === undefined || originalY === undefined || originalZ === undefined) {
                  console.warn(`Blob ${index}: Undefined original values at vertex ${i}`);
                  continue;
                }
                
                let newX = originalX;
                let newY = originalY;
                let newZ = originalZ;
                
                // Time-based morphing
                const timeOffset = time * morphStyle.timeSpeed + morphStyle.timeOffset;
                
                switch (morphStyle.morphType) {
                  case 'undulate': // Wave-like motion along length
                    const waveX = Math.sin(originalX * 2 + timeOffset) * morphStyle.timeIntensity;
                    const waveY = Math.cos(originalX * 1.5 + timeOffset * 0.7) * morphStyle.timeIntensity * 0.5;
                    newY += waveX;
                    newZ += waveY;
                    break;
                    
                  case 'sway': // Bending motion for tall shapes
                    const swayAmount = Math.sin(timeOffset + originalY * 0.5) * morphStyle.timeIntensity;
                    const heightFactor = (originalY + 1) * 0.5; // 0 to 1 based on height
                    newX += swayAmount * heightFactor;
                    newZ += Math.cos(timeOffset * 0.8 + originalY * 0.3) * morphStyle.timeIntensity * 0.5 * heightFactor;
                    break;
                    
                  case 'ripple': // Ripple effect from center
                    const distance = Math.sqrt(originalX * originalX + originalZ * originalZ);
                    const ripple = Math.sin(distance * 4 - timeOffset * 2) * morphStyle.timeIntensity;
                    newY += ripple;
                    break;
                    
                  case 'pulse': // Breathing/pulsing motion
                    const pulseRadius = Math.sqrt(originalX * originalX + originalY * originalY + originalZ * originalZ);
                    const pulse = Math.sin(timeOffset + pulseRadius * 2) * morphStyle.timeIntensity;
                    const factor = 1 + pulse;
                    newX *= factor;
                    newY *= factor;
                    newZ *= factor;
                    break;
                    
                  case 'chaos': // Multiple overlapping waves
                    const chaos1 = Math.sin(originalX * 3 + timeOffset) * morphStyle.timeIntensity * 0.4;
                    const chaos2 = Math.cos(originalY * 4 + timeOffset * 1.3) * morphStyle.timeIntensity * 0.3;
                    const chaos3 = Math.sin(originalZ * 5 + timeOffset * 0.7) * morphStyle.timeIntensity * 0.3;
                    newX += chaos1;
                    newY += chaos2;
                    newZ += chaos3;
                    break;
                    
                  case 'twist': // Twisting motion
                    const radius = Math.sqrt(originalX * originalX + originalZ * originalZ);
                    const angle = Math.atan2(originalZ, originalX);
                    const twistAmount = Math.sin(timeOffset + originalY * 2) * morphStyle.timeIntensity;
                    const newAngle = angle + twistAmount;
                    newX = Math.cos(newAngle) * radius;
                    newZ = Math.sin(newAngle) * radius;
                    break;
                }
                
                // Audio-reactive morphing
                if (audioLevel > 0.02) {
                  const audioIntensity = audioLevel * morphStyle.audioSensitivity;
                  const lowResponse = frequencies.low * morphStyle.audioResponse.low;
                  const midResponse = frequencies.mid * morphStyle.audioResponse.mid;
                  const highResponse = frequencies.high * morphStyle.audioResponse.high;
                  
                  // Audio-specific deformations
                  switch (morphStyle.morphType) {
                    case 'undulate':
                      newY += Math.sin(originalX * 4 + time * 8) * lowResponse * audioIntensity;
                      newZ += Math.cos(originalX * 3 + time * 6) * midResponse * audioIntensity;
                      break;
                      
                    case 'sway':
                      const audioSway = (lowResponse + midResponse) * audioIntensity;
                      const heightFactor = (originalY + 1) * 0.5;
                      newX += audioSway * heightFactor * 0.5;
                      break;
                      
                    case 'ripple':
                      const audioRipple = (midResponse + highResponse) * audioIntensity;
                      const rippleDistance = Math.sqrt(originalX * originalX + originalZ * originalZ);
                      newY += Math.sin(rippleDistance * 6 - time * 10) * audioRipple;
                      break;
                      
                    case 'pulse':
                      const audioPulse = lowResponse * audioIntensity;
                      const pulseFactor = 1 + audioPulse * 0.3;
                      newX *= pulseFactor;
                      newY *= pulseFactor;
                      newZ *= pulseFactor;
                      break;
                      
                    case 'chaos':
                      newX += Math.sin(time * 12 + originalX * 6) * highResponse * audioIntensity * 0.3;
                      newY += Math.cos(time * 10 + originalY * 5) * midResponse * audioIntensity * 0.3;
                      newZ += Math.sin(time * 8 + originalZ * 4) * lowResponse * audioIntensity * 0.3;
                      break;
                      
                    case 'twist':
                      const audioTwist = midResponse * audioIntensity;
                      const twistRadius = Math.sqrt(originalX * originalX + originalZ * originalZ);
                      const twistAngle = Math.atan2(originalZ, originalX) + audioTwist;
                      newX = Math.cos(twistAngle) * twistRadius;
                      newZ = Math.sin(twistAngle) * twistRadius;
                      break;
                  }
                }
                
                // Update vertex position
                if (isFinite(newX) && isFinite(newY) && isFinite(newZ) && i < positions.count) {
                  positions.setXYZ(i, newX, newY, newZ);
                } else {
                  console.warn(`Blob ${index}: Invalid position values at vertex ${i}:`, { newX, newY, newZ, positionsCount: positions.count });
                }
              }
              
              // Mark geometry for update
              positions.needsUpdate = true;
              geometry.computeVertexNormals(); // Recalculate normals for proper lighting
              
              // Debug: Log after effects are applied for first blob
              if (index === 0 && audioLevel > 0.01) {
                console.log('After audio effects applied to blob 0:', {
                  newScale: blob.scale.x.toFixed(3),
                  newPosition: `${blob.position.x.toFixed(2)}, ${blob.position.y.toFixed(2)}, ${blob.position.z.toFixed(2)}`,
                  scaleChanged: scale !== 1,
                  positionChanged: Math.abs(blob.position.x - blob.userData.originalX) > 0.1
                });
              }
              
              // Enhanced audio-reactive colors - each shape responds differently
              if (audioLevel > 0.02) { // Raised threshold
                // Each shape has different color sensitivity and frequency focus
                let colorPersonality = { intensity: 1, low: 0, mid: 0, high: 0, opacity: 1, emissive: 1 };
                
                switch (index % 6) {
                  case 0: // Warm, low-frequency responsive
                    colorPersonality = { intensity: 1.5, low: 0.6, mid: 0.2, high: 0.1, opacity: 0.8, emissive: 0.4 };
                    break;
                  case 1: // Bright, mid-frequency responsive
                    colorPersonality = { intensity: 2.0, low: 0.2, mid: 0.8, high: 0.3, opacity: 1.2, emissive: 0.6 };
                    break;
                  case 2: // Cool, high-frequency responsive
                    colorPersonality = { intensity: 1.3, low: 0.1, mid: 0.2, high: 0.7, opacity: 0.9, emissive: 0.3 };
                    break;
                  case 3: // Subtle, balanced
                    colorPersonality = { intensity: 1.0, low: 0.3, mid: 0.3, high: 0.3, opacity: 0.6, emissive: 0.2 };
                    break;
                  case 4: // Warm-neutral mix
                    colorPersonality = { intensity: 1.4, low: 0.5, mid: 0.5, high: 0.2, opacity: 1.0, emissive: 0.5 };
                    break;
                  case 5: // Cool-neutral mix
                    colorPersonality = { intensity: 1.2, low: 0.2, mid: 0.4, high: 0.6, opacity: 0.7, emissive: 0.3 };
                    break;
                }
                
                // More subtle color variations with shape personality
                const colorIntensity = 1 + audioLevel * colorPersonality.intensity; // Shape-specific intensity
                const lowInfluence = frequencies.low * colorPersonality.low;
                const midInfluence = frequencies.mid * colorPersonality.mid;
                const highInfluence = frequencies.high * colorPersonality.high;
                
                // Subtle color shifts
                let r = originalColor.r * colorIntensity;
                let g = originalColor.g * colorIntensity;
                let b = originalColor.b * colorIntensity;
                
                // Low frequencies add gentle warmth (red/orange)
                r += lowInfluence * 0.3;
                g += lowInfluence * 0.2;
                
                // Mid frequencies enhance all colors gently
                r += midInfluence * 0.2;
                g += midInfluence * 0.3;
                b += midInfluence * 0.2;
                
                // High frequencies add subtle cool tones (blue/cyan)
                g += highInfluence * 0.3;
                b += highInfluence * 0.4;
                
                // Clamp values and set color
                material.color.setRGB(
                  Math.min(1, Math.max(0, r)),
                  Math.min(1, Math.max(0, g)),
                  Math.min(1, Math.max(0, b))
                );
                
                // Shape-specific opacity changes
                material.opacity = 0.9 + audioLevel * 0.1 * colorPersonality.opacity; // Subtle opacity variation for non-transparent shapes
                
                // Shape-specific emissive glow
                const emissiveIntensity = audioLevel * 0.2 * colorPersonality.emissive;
                material.emissive.copy(material.color).multiplyScalar(emissiveIntensity);
                
                // Reduce color logging frequency
                if (index === 0 && Math.floor(time * 3) % 30 === 0) {
                  console.log('Audio colors for shape', index, ':', {
                    colorIntensity: colorIntensity.toFixed(2),
                    influences: `L:${lowInfluence.toFixed(2)} M:${midInfluence.toFixed(2)} H:${highInfluence.toFixed(2)}`,
                    finalColor: `rgb(${(r*255).toFixed(0)}, ${(g*255).toFixed(0)}, ${(b*255).toFixed(0)})`,
                    opacity: material.opacity.toFixed(2),
                    emissive: emissiveIntensity.toFixed(2)
                  });
                }
              } else {
                // Slower return to original color when no audio
                const targetColor = originalColor.clone();
                material.color.lerp(targetColor, 0.05); // Slower transition
                material.opacity = Math.max(0.9, material.opacity * 0.99); // Keep mostly opaque
                material.emissive.multiplyScalar(0.95); // Slower emissive fade
              }
            }
          }
        }
      });
      
      try {
        renderer.render(scene, camera);
        
        // Debug: Log render info occasionally
        if (Math.floor(time * 2) % 20 === 0) {
          console.log('Render info:', {
            cameraPosition: `${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}`,
            sceneChildren: scene.children.length,
            rendererSize: `${renderer.domElement.width}x${renderer.domElement.height}`,
            canvasInDOM: document.body.contains(renderer.domElement)
          });
        }
      } catch (error) {
        console.error('Render error:', error);
        isAnimating = false;
      }
    };
    
    // Start animation with delay to ensure everything is ready
    setTimeout(() => {
      if (isAnimating) {
        animate();
        console.log('Animation started');
      }
    }, 100);

    // Handle window resize
    const handleResize = () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
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
      
      // Clean up interaction event listeners
      if (rendererRef.current?.domElement) {
        const canvas = rendererRef.current.domElement;
        canvas.removeEventListener('mousedown', handlePointerDown);
        canvas.removeEventListener('mousemove', handlePointerMove);
        canvas.removeEventListener('mouseup', handlePointerUp);
        canvas.removeEventListener('mouseleave', handlePointerUp);
        canvas.removeEventListener('touchstart', handlePointerDown);
        canvas.removeEventListener('touchmove', handlePointerMove);
        canvas.removeEventListener('touchend', handlePointerUp);
        canvas.removeEventListener('touchcancel', handlePointerUp);
        canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
      }
      
      // Clean up audio resources
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (error) {
          console.error('Error closing audio context:', error);
        }
      }
      
      // Clean up Three.js objects
      blobs.forEach(blob => {
        if (blob.geometry) blob.geometry.dispose();
        if (blob.material) {
          if (Array.isArray(blob.material)) {
            blob.material.forEach(material => material.dispose());
          } else {
            blob.material.dispose();
          }
        }
      });
      
      if (mountRef.current && renderer.domElement && mountRef.current.contains(renderer.domElement)) {
        try {
          mountRef.current.removeChild(renderer.domElement);
        } catch (error) {
          console.error('Error removing canvas:', error);
        }
      }
      
      renderer.dispose();
    };
  }, []); // Remove dependencies to avoid re-initialization

  // Handle audio stream changes
  useEffect(() => {
    console.log('Audio stream changed:', !!audioStream, 'Recording:', isRecording, 'Stream details:', {
      active: audioStream?.active,
      tracks: audioStream?.getTracks().length,
      hasAnalyser: !!audioAnalyserRef.current
    });
    
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
      
      // Test audio analysis after a short delay
      setTimeout(() => {
        const testLevel = getAudioLevel();
        console.log('Audio analysis test - level:', testLevel, 'hasAnalyser:', !!audioAnalyserRef.current);
      }, 500);
    }
  }, [audioStream, isRecording]);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: 'linear-gradient(135deg, #a7f3d0 0%, #fcd5ce 100%)',
        pointerEvents: 'auto', // Enable pointer events for interaction
        cursor: cursorStyle, // Visual feedback
      }}
    />
  );
};

export default ThreeBackground; 