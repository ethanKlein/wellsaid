import React, { useState, useEffect, useRef } from 'react';
import './VoiceRecording.css';
import { useNavigate } from 'react-router-dom';

const VoiceRecording: React.FC = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      // Cleanup when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          setRecordedChunks([...chunks]);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        console.log('Recording stopped, audio blob created:', blob);
      };
      
      mediaRecorder.start(100); // Request data every 100ms for real-time updates
      setIsRecording(true);
      console.log('Recording started');
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please allow microphone permissions and try again.');
    }
  };

  const handlePause = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      // Pause recording
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      console.log('Recording paused');
    }
  };

  const handlePlay = () => {
    if (isPaused && recordedChunks.length > 0) {
      // Create audio blob from current chunks for playback
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(blob);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onplay = () => {
        setIsPlaying(true);
        console.log('Playback started');
      };
      
      audio.onpause = () => {
        setIsPlaying(false);
        console.log('Playback paused');
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        console.log('Playback ended');
      };
      
      if (isPlaying) {
        // If currently playing, pause playback
        audio.pause();
      } else {
        // If not playing, start playback
        audio.play().catch(error => {
          console.error('Error playing audio:', error);
        });
      }
    }
  };

  const handleResume = () => {
    if (mediaRecorderRef.current && isPaused) {
      // Stop any current playback
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      
      // Resume recording
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      console.log('Recording resumed');
    }
  };

  const handleStop = () => {
    // Stop any playback
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      console.log('Recording stopped');
    }
    
    // Navigate back to the main screen
    navigate('/');
  };

  const getRecordingStatus = () => {
    if (isPlaying) return { text: '▶️ Playing back...', class: 'playing-indicator' };
    if (isRecording && !isPaused) return { text: '🔴 Recording...', class: 'recording-indicator' };
    if (isPaused) return { text: '⏸️ Paused', class: 'paused-indicator' };
    return { text: '', class: '' };
  };

  const status = getRecordingStatus();

  return (
    <div className="voice-recording-bg">
      <div className="voice-recording-card">
        <div className="voice-recording-text">
          <p>Caregiving asks a lot.</p>
          <p>It can be hard.<br />Emotionally, mentally, and even physically.</p>
          <p className="bold">How are you doing right now?</p>
        </div>
      </div>
      
      <div className="recording-status">
        {status.text && <span className={status.class}>{status.text}</span>}
      </div>
      
      <div className="waveform-container">
        <div className={`waveform ${isRecording && !isPaused && !isPlaying ? 'recording' : ''} ${isPlaying ? 'playing' : ''}`}>
          <div className="wave-bar" style={{height: '20%'}}></div>
          <div className="wave-bar" style={{height: '40%'}}></div>
          <div className="wave-bar" style={{height: '60%'}}></div>
          <div className="wave-bar" style={{height: '80%'}}></div>
          <div className="wave-bar" style={{height: '45%'}}></div>
          <div className="wave-bar" style={{height: '70%'}}></div>
          <div className="wave-bar" style={{height: '90%'}}></div>
          <div className="wave-bar" style={{height: '65%'}}></div>
          <div className="wave-bar" style={{height: '30%'}}></div>
          <div className="wave-bar" style={{height: '55%'}}></div>
          <div className="wave-bar" style={{height: '75%'}}></div>
          <div className="wave-bar" style={{height: '40%'}}></div>
          <div className="wave-bar" style={{height: '85%'}}></div>
          <div className="wave-bar" style={{height: '50%'}}></div>
          <div className="wave-bar" style={{height: '25%'}}></div>
          <div className="wave-bar" style={{height: '60%'}}></div>
          <div className="wave-bar" style={{height: '80%'}}></div>
          <div className="wave-bar" style={{height: '35%'}}></div>
          <div className="wave-bar" style={{height: '70%'}}></div>
          <div className="wave-bar" style={{height: '15%'}}></div>
        </div>
      </div>

      <div className="recording-controls">
        {!isPaused ? (
          <button className="pause-btn" onClick={handlePause}>
            <div className="pause-icon">
              <div className="pause-bar"></div>
              <div className="pause-bar"></div>
            </div>
          </button>
        ) : (
          <div className="playback-controls">
            <button className="play-btn" onClick={handlePlay}>
              <div className="play-icon">
                {isPlaying ? '⏸️' : '▶️'}
              </div>
            </button>
            <button className="resume-btn" onClick={handleResume}>
              <div className="resume-icon">🔴</div>
            </button>
          </div>
        )}
        
        <button className="stop-btn" onClick={handleStop}>
          <div className="stop-icon">⏹️</div>
        </button>
      </div>
    </div>
  );
};

export default VoiceRecording; 