import React from 'react';
import { useNavigate } from 'react-router-dom';
import './DailyCheckIn.css';
import Button from '../Button/Button';

const DailyCheckIn: React.FC = () => {
  const navigate = useNavigate();

  const handleSpeakThoughts = () => {
    navigate('/voice-recording');
  };

  const handleWriteResponse = () => {
    // Navigate to write response screen (to be implemented)
    console.log('Navigate to write response');
  };

  return (
    <div className="daily-checkin-bg">
      <div className="daily-checkin-header">Daily Check-in</div>
      <div className="daily-checkin-card">
        <div className="daily-checkin-text">
          <p>Caregiving asks a lot.</p>
          <p>It can be hard.<br />Emotionally, mentally, and even physically.</p>
          <p className="bold">How are you doing right now?</p>
        </div>
      </div>
      <div className="daily-checkin-actions">
        <Button icon="🎤" label="Speak your thoughts" onClick={handleSpeakThoughts} />
        <Button icon="✏️" label="Write a response" onClick={handleWriteResponse} />
      </div>
    </div>
  );
};

export default DailyCheckIn; 