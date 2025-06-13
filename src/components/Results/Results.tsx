import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Results.css';
import { getAIResponseStreaming, AIResponse, generateAIImages, AIImages, ActionItem, shuffleSectionStreaming } from '../../services/aiService';

const Results: React.FC = () => {
  const location = useLocation();
  const [transcript, setTranscript] = useState<string>(location.state?.transcript || '');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<Partial<AIResponse>>({});
  const [images, setImages] = useState<AIImages | null>(null);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [shuffling, setShuffling] = useState<{ forYou: boolean; forThem: boolean }>({ forYou: false, forThem: false });
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!transcript) {
      setError('No transcript available - please record your voice first');
      return;
    }
    fetchAIResponse();
  }, [transcript]);

  const fetchAIResponse = async () => {
    console.log('Results page loaded with transcript:', transcript);
    console.log('Transcript length:', transcript?.length || 0);
    
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
      console.log('Calling AI service with streaming...');
      
      // Use streaming for progressive loading
      const finalResponse = await getAIResponseStreaming(transcript, (partialResponse) => {
        console.log('Partial response received:', partialResponse);
        setResponse(partialResponse);
        
        // Show content as soon as we have the title
        if (partialResponse.title && loading) {
          setLoading(false);
        }
      });
      
      console.log('Final response received:', finalResponse);
      setResponse(finalResponse);
      setLoading(false);
      
      // Start generating images after we have the complete text response
      if (finalResponse.forYouTitle && finalResponse.forThemTitle) {
        setImagesLoading(true);
        try {
          const aiImages = await generateAIImages(
            finalResponse.forYouTitle,
            finalResponse.forYou,
            finalResponse.forThemTitle,
            finalResponse.forThem
          );
          setImages(aiImages);
        } catch (imgError: any) {
          // Fail silently: log the error, but do not set global error state
          console.error('Image generation failed:', imgError);
          setImages({ forYouImage: '', forThemImage: '' }); // Optionally set empty images
        } finally {
          setImagesLoading(false);
        }
      }
      
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
      setLoading(false);
    }
  };

  const handleShuffle = async (section: 'forYou' | 'forThem') => {
    if (!transcript) {
      console.error('No transcript available for shuffle');
      return;
    }

    try {
      console.log(`Streaming shuffle for ${section} section`);
      setShuffling(prev => ({ ...prev, [section]: true }));
      
      // Use streaming shuffle for progressive loading
      const finalShuffledContent = await shuffleSectionStreaming(transcript, section, (partialContent) => {
        console.log('Partial shuffle content received:', partialContent);
        
        // Update the response with partial content as it streams in
        setResponse(prev => ({
          ...prev,
          ...partialContent
        }));
      });
      
      console.log('Final shuffled content received:', finalShuffledContent);
      
      // Ensure final content is set
      setResponse(prev => ({
        ...prev,
        ...finalShuffledContent
      }));
      
      // If we have the new content and it's complete, regenerate the image for this section
      if (section === 'forYou' && finalShuffledContent.forYouTitle && finalShuffledContent.forYou) {
        try {
          setImagesLoading(true);
          const newImages = await generateAIImages(
            finalShuffledContent.forYouTitle,
            finalShuffledContent.forYou,
            response.forThemTitle || '',
            response.forThem || ''
          );
          setImages(prev => ({
            forYouImage: newImages.forYouImage,
            forThemImage: prev?.forThemImage || ''
          }));
        } catch (imgError) {
          // Fail silently
          console.error('Failed to regenerate For You image:', imgError);
          setImages(prev => ({
            forYouImage: '',
            forThemImage: prev?.forThemImage || ''
          }));
        } finally {
          setImagesLoading(false);
        }
      } else if (section === 'forThem' && finalShuffledContent.forThemTitle && finalShuffledContent.forThem) {
        try {
          setImagesLoading(true);
          const newImages = await generateAIImages(
            response.forYouTitle || '',
            response.forYou || '',
            finalShuffledContent.forThemTitle,
            finalShuffledContent.forThem
          );
          setImages(prev => ({
            forYouImage: prev?.forYouImage || '',
            forThemImage: newImages.forThemImage
          }));
        } catch (imgError) {
          // Fail silently
          console.error('Failed to regenerate For Them image:', imgError);
          setImages(prev => ({
            forYouImage: prev?.forYouImage || '',
            forThemImage: ''
          }));
        } finally {
          setImagesLoading(false);
        }
      }
      
    } catch (error: any) {
      console.error(`Error shuffling ${section}:`, error);
      setError(`Failed to shuffle ${section}: ${error.message}`);
    } finally {
      setShuffling(prev => ({ ...prev, [section]: false }));
    }
  };

  const handleActionClick = (action: ActionItem) => {
    console.log('Action clicked:', action);
    
    switch (action.type) {
      case 'EAP_SESSION':
        // TODO: Integrate with actual EAP scheduling system
        alert(`Scheduling EAP session: ${action.displayText}\n${action.additionalInfo}`);
        break;
      case 'HR_CONTACT':
        // TODO: Open HR contact form or email
        alert(`Contacting HR: ${action.displayText}\n${action.additionalInfo}`);
        break;
      case 'PHONE_SUPPORT':
        // Extract phone number if available, otherwise show info
        const phoneMatch = action.additionalInfo.match(/\d{1}-\d{3}-\d{3}-\d{4}/);
        if (phoneMatch) {
          window.open(`tel:${phoneMatch[0].replace(/-/g, '')}`);
        } else {
          alert(`Phone Support: ${action.displayText}\n${action.additionalInfo}`);
        }
        break;
      case 'CALENDAR_REMINDER':
        // TODO: Integrate with calendar API
        alert(`Setting calendar reminder: ${action.displayText}\n${action.additionalInfo}`);
        break;
      case 'RESOURCE_LINK':
        // TODO: Open resource link or show resource directory
        alert(`Resource: ${action.displayText}\n${action.additionalInfo}`);
        break;
      case 'CARE_COORDINATION':
        // TODO: Open care coordination tools
        alert(`Care coordination: ${action.displayText}\n${action.additionalInfo}`);
        break;
      case 'MEDICAL_CONTACT':
        // TODO: Integrate with medical contact system
        alert(`Medical contact: ${action.displayText}\n${action.additionalInfo}`);
        break;
      case 'SUPPORT_GROUP':
        // TODO: Link to support group directory
        alert(`Support group: ${action.displayText}\n${action.additionalInfo}`);
        break;
      default:
        console.log('Unknown action type:', action.type);
    }
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

  if (error) {
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
          {response.title ? (
            <h1>{response.title}</h1>
          ) : (
            <div className="streaming-placeholder">
              <div className="loading-spinner-small"></div>
              <span>Generating response...</span>
            </div>
          )}
          
          {response.general && (
            <p className="general-response">{response.general}</p>
          )}
        </div>

        {/* For You Section */}
        {(response.forYouTitle || response.forYou) && (
          <div className="suggestions-section">
            <div className="section-header">
              <h2>For You</h2>
              <button className="shuffle-btn" onClick={() => handleShuffle('forYou')} disabled={shuffling.forYou}>
                <span className="shuffle-icon">⟲</span>
                {shuffling.forYou ? 'Shuffling...' : 'Shuffle'}
              </button>
            </div>
            
            <div className="suggestion-card for-you">
              <div className="card-content">
                <div className="card-text">
                  {shuffling.forYou ? (
                    <div className="streaming-text">
                      <div className="loading-spinner-small"></div>
                      <span>Getting new suggestion...</span>
                    </div>
                  ) : response.forYouTitle ? (
                    <h3>{response.forYouTitle}</h3>
                  ) : (
                    <div className="skeleton skeleton-title"></div>
                  )}
                  
                  {!shuffling.forYou && response.forYou ? (
                    <p>{response.forYou}</p>
                  ) : !shuffling.forYou && response.forYouTitle ? (
                    <div className="skeleton skeleton-text"></div>
                  ) : null}
                </div>
                <div className="card-icon">
                  <div className="icon-circle eap-icon">
                    {imagesLoading ? (
                      <div className="image-loading">
                        <div className="loading-spinner-small"></div>
                      </div>
                    ) : images?.forYouImage ? (
                      <img 
                        src={images.forYouImage} 
                        alt={response.forYouTitle || 'For You suggestion'}
                        className="ai-generated-image"
                        onError={(e) => {
                          console.error('Failed to load For You image');
                          const img = e.currentTarget;
                          const fallback = img.nextElementSibling as HTMLElement;
                          img.style.display = 'none';
                          if (fallback) fallback.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <span className="fallback-icon" style={{ display: images?.forYouImage ? 'none' : 'block' }}>
                      🧠
                    </span>
                  </div>
                </div>
              </div>
              {!shuffling.forYou && response.forYouAction && (
                <button className="action-button" onClick={() => handleActionClick(response.forYouAction!)}>
                  {response.forYouAction.displayText} →
                </button>
              )}
            </div>
          </div>
        )}

        {/* For Them Section */}
        {(response.forThemTitle || response.forThem) && (
          <div className="suggestions-section">
            <div className="section-header">
              <h2>For Them</h2>
              <button className="shuffle-btn" onClick={() => handleShuffle('forThem')} disabled={shuffling.forThem}>
                <span className="shuffle-icon">⟲</span>
                {shuffling.forThem ? 'Shuffling...' : 'Shuffle'}
              </button>
            </div>
            
            <div className="suggestion-card for-them">
              <div className="card-content">
                <div className="card-text">
                  {shuffling.forThem ? (
                    <div className="streaming-text">
                      <div className="loading-spinner-small"></div>
                      <span>Getting new suggestion...</span>
                    </div>
                  ) : response.forThemTitle ? (
                    <h3>{response.forThemTitle}</h3>
                  ) : (
                    <div className="skeleton skeleton-title"></div>
                  )}
                  
                  {!shuffling.forThem && response.forThem ? (
                    <p>{response.forThem}</p>
                  ) : !shuffling.forThem && response.forThemTitle ? (
                    <div className="skeleton skeleton-text"></div>
                  ) : null}
                </div>
                <div className="card-icon">
                  <div className="icon-circle cleanup-icon">
                    {imagesLoading ? (
                      <div className="image-loading">
                        <div className="loading-spinner-small"></div>
                      </div>
                    ) : images?.forThemImage ? (
                      <img 
                        src={images.forThemImage} 
                        alt={response.forThemTitle || 'For Them suggestion'}
                        className="ai-generated-image"
                        onError={(e) => {
                          console.error('Failed to load For Them image');
                          const img = e.currentTarget;
                          const fallback = img.nextElementSibling as HTMLElement;
                          img.style.display = 'none';
                          if (fallback) fallback.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <span className="fallback-icon" style={{ display: images?.forThemImage ? 'none' : 'block' }}>
                      🧽
                    </span>
                  </div>
                </div>
              </div>
              {!shuffling.forThem && response.forThemAction && (
                <button className="action-button" onClick={() => handleActionClick(response.forThemAction!)}>
                  {response.forThemAction.displayText} →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results; 