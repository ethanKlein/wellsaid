import React, { useState, useEffect, useRef, useCallback } from 'react';
import './VoiceRecording.css';
import { useNavigate } from 'react-router-dom';
import ThreeBackground from './ThreeBackground';

// Add type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const VoiceRecording: React.FC = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const autoStop = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, [isRecording]);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      if (isRecording) {
        autoStop();
      }
    }, 3000);
  }, [isRecording, autoStop]);

  const initializeSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map(result => (result as SpeechRecognitionResult)[0].transcript)
        .join('');
      setTranscript(transcript);
      resetSilenceTimer();
    };
    
    return recognition;
  }, [isPaused, isProcessing, isRecording, resetSilenceTimer]);

  useEffect(() => {
    if (isPaused) return;
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
          console.log('Recording stopped, audio blob created:', blob);
        };
        mediaRecorder.start(100);
        setIsRecording(true);
        // Start speech recognition
        const recognition = initializeSpeechRecognition();
        if (recognition) {
          recognitionRef.current = recognition;
          recognition.start();
          console.log('Speech recognition started');
        }
        console.log('Recording started');
        // Start the silence timer
        resetSilenceTimer();
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Unable to access microphone. Please allow microphone permissions and try again.');
      }
    };
    startRecording();
    return () => {
      // Cleanup when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [initializeSpeechRecognition, resetSilenceTimer, isPaused]);

  useEffect(() => {
    initializeSpeechRecognition();
    resetSilenceTimer();
  }, [initializeSpeechRecognition, resetSilenceTimer]);

  const handlePause = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      // Stop recording
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(true);
      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      // Clear auto-stop timers when paused
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      console.log('Recording stopped and paused');
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

  const handleStop = () => {
    // Clear all timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    // Stop any playback
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
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
    
    // Show processing state and navigate to results page with transcript
    const finalTranscript = transcript + interimTranscript;
    if (finalTranscript.trim()) {
      setIsProcessing(true);
      
      // Small delay to show processing state, then navigate
      setTimeout(() => {
        navigate('/results', { 
          state: { transcript: finalTranscript.trim() } 
        });
      }, 500);
    } else {
      // If no transcript, go back to main screen
      navigate('/');
    }
  };

  const getRecordingStatus = () => {
    if (isProcessing) return { text: '🤖 Processing your reflection...', class: 'processing-indicator' };
    if (isPlaying) return { text: '▶️ Playing back...', class: 'playing-indicator' };
    if (isRecording && !isPaused) {
      const hasTranscript = (transcript + interimTranscript).trim().length > 0;
      if (hasTranscript) {
        return { text: '🎤 Listening... ', class: 'recording-indicator' };
      } else {
        return { text: '🎤 Recording...', class: 'recording-indicator' };
      }
    }
    if (isPaused) return { text: '⏸️ Paused', class: 'paused-indicator' };
    return { text: '', class: '' };
  };

  const status = getRecordingStatus();
  const displayTranscript = transcript + interimTranscript;

  return (
    <div className="voice-recording-bg">
      <div className="voice-recording-content">
        <div className="voice-recording-header">Daily Check-in</div>
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
        
        {isPaused && displayTranscript && (
          <div className="transcript-display">
            <div className="transcript-text">
              {transcript}
              {interimTranscript && <span className="interim-text">{interimTranscript}</span>}
            </div>
          </div>
        )}

        <div className="recording-controls">
          {!isPaused ? (
            <button className="pause-btn" onClick={handlePause} disabled={isProcessing}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 4H10V20H6V4ZM14 4H18V20H14V4Z" fill="currentColor"/>
              </svg>
            </button>
          ) : (
            <div className="playback-controls">
              <button className="play-btn-large" onClick={handlePlay} disabled={isProcessing}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {isPlaying ? (
                    <path d="M6 4H10V20H6V4ZM14 4H18V20H14V4Z" fill="currentColor"/>
                  ) : (
                    <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
                  )}
                </svg>
              </button>
              <button className="next-btn" onClick={handleStop} disabled={isProcessing}>
                Next
              </button>
            </div>
          )}
        </div>
        {/* Visualizer directly after the pause button, in flow */}
        {!(isPaused && displayTranscript) && (
          <div className="voice-visualizer-abs">
            <ThreeBackground 
              isRecording={isRecording} 
              audioStream={streamRef.current || null} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecording; 