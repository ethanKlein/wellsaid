import React, { useState, useEffect, useRef } from 'react';
import './VoiceRecording.css';
import { useNavigate } from 'react-router-dom';
import ThreeBackground from './ThreeBackground';

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
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        console.log('Final transcript added:', finalTranscript);
      }
      setInterimTranscript(interimText);
      
      // Reset silence timer whenever we get speech results
      if (finalTranscript || interimText) {
        resetSilenceTimer();
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      // If recording is still active and not paused, restart recognition
      if (isRecording && !isPaused && !isProcessing) {
        console.log('Restarting speech recognition...');
        setTimeout(() => {
          if (recognitionRef.current && isRecording && !isPaused) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.log('Recognition restart failed:', error);
            }
          }
        }, 100);
      }
    };

    recognition.onstart = () => {
      console.log('Speech recognition started');
      resetSilenceTimer();
    };

    return recognition;
  };

  const autoStop = () => {
    const finalTranscript = transcript + interimTranscript;
    
    // Only auto-stop if we have some meaningful transcript
    if (finalTranscript.trim().length > 10) {
      console.log('Auto-stopping due to silence with transcript:', finalTranscript);
      handleStop();
    } else {
      console.log('Not enough transcript to auto-stop, continuing recording');
    }
  };

  const resetSilenceTimer = () => {
    // Clear existing timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    // Set new timer for 3 seconds of silence
    silenceTimerRef.current = setTimeout(() => {
      console.log('Silence detected, auto-stopping...');
      autoStop();
    }, 3000);
  };

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

  const handlePause = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      // Pause recording
      mediaRecorderRef.current.pause();
      
      // Pause speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // Clear auto-stop timers when paused
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      
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
      
      // Restart speech recognition
      const recognition = initializeSpeechRecognition();
      if (recognition) {
        recognitionRef.current = recognition;
        recognition.start();
        console.log('Speech recognition resumed');
      }
      
      setIsPaused(false);
      console.log('Recording resumed');
      
      resetSilenceTimer();
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
      <ThreeBackground 
        isRecording={isRecording} 
        audioStream={streamRef.current || undefined} 
      />
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
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18L15 12L9 6V18Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceRecording; 