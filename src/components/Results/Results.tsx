import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Results.css';
import { getAIResponse, AIResponse } from '../../services/aiService';
import BottomNav from '../BottomNav/BottomNav';

const Results: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const transcript = location.state?.transcript || '';
  
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);

  useEffect(() => {
    const fetchAIResponse = async () => {
      console.log('Results page loaded with transcript:', transcript);
      console.log('Transcript length:', transcript?.length || 0);
      
      if (!transcript) {
        setError('No transcript available - please record your voice first');
        setErrorDetails({ 
          issue: 'Missing transcript',
          location: location.state,
          hasState: !!location.state,
          transcriptValue: transcript 
        });
        setLoading(false);
        return;
      }

      if (transcript.trim().length < 5) {
        setError('Transcript too short - please record a longer message');
        setErrorDetails({ 
          issue: 'Short transcript',
          transcript: transcript,
          length: transcript.length 
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('Calling AI service with transcript:', transcript);
        const aiResponse = await getAIResponse(transcript);
        console.log('AI response received:', aiResponse);
        setResponse(aiResponse);
      } catch (err: any) {
        console.error('Error fetching AI response:', err);
        setError(`AI Service Error: ${err.message || 'Unknown error'}`);
        setErrorDetails({ 
          error: err,
          message: err.message,
          stack: err.stack,
          transcript: transcript,
          apiKey: process.env.REACT_APP_OPENAI_API_KEY ? 'Present' : 'Missing'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAIResponse();
  }, [transcript, location.state]);

  const handleShuffle = (section: 'forYou' | 'forThem') => {
    // TODO: Implement shuffle functionality to get alternative suggestions
    console.log(`Shuffle ${section}`);
  };

  const handleScheduleEAP = () => {
    // TODO: Implement EAP scheduling
    console.log('Schedule EAP session');
  };

  if (loading) {
    return (
      <div className="results-bg">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Processing your reflection...</p>
        </div>
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="results-bg">
        <div className="error-container">
          <h3 style={{ color: '#dc2626', marginBottom: '16px' }}>Error Details</h3>
          <p style={{ marginBottom: '12px' }}><strong>Error:</strong> {error}</p>
          
          {errorDetails && (
            <div style={{ 
              background: '#f3f4f6', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '16px',
              fontSize: '0.9rem',
              textAlign: 'left',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              <p><strong>Debug Info:</strong></p>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {JSON.stringify(errorDetails, null, 2)}
              </pre>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/')} className="retry-btn">
              Back to Home
            </button>
            <button onClick={() => window.location.reload()} className="retry-btn">
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-bg">
      <div className="results-container">
        <div className="results-header">
          <h1>{response.title}</h1>
          {response.general && (
            <p className="general-response">{response.general}</p>
          )}
        </div>

        <div className="suggestions-section">
          <div className="section-header">
            <h2>For You</h2>
            <button className="shuffle-btn" onClick={() => handleShuffle('forYou')}>
              <span className="shuffle-icon">⟲</span>
              Shuffle
            </button>
          </div>
          
          <div className="suggestion-card for-you">
            <div className="card-content">
              <div className="card-text">
                <h3>{response.forYouTitle}</h3>
                <p>{response.forYou}</p>
              </div>
              <div className="card-icon">
                <div className="icon-circle eap-icon">
                  <span>🧠</span>
                </div>
              </div>
            </div>
            <button className="action-button" onClick={handleScheduleEAP}>
              Schedule a free EAP session →
            </button>
          </div>
        </div>

        <div className="suggestions-section">
          <div className="section-header">
            <h2>For Them</h2>
            <button className="shuffle-btn" onClick={() => handleShuffle('forThem')}>
              <span className="shuffle-icon">⟲</span>
              Shuffle
            </button>
          </div>
          
          <div className="suggestion-card for-them">
            <div className="card-content">
              <div className="card-text">
                <h3>{response.forThemTitle}</h3>
                <p>{response.forThem}</p>
              </div>
              <div className="card-icon">
                <div className="icon-circle cleanup-icon">
                  <span>🧽</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Results; 