import React from 'react';
import './MobileFrame.css';
import { useLocation } from 'react-router-dom';

const MobileFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="mobile-frame-bg">
      <div className="iphone-frame">
        <div className="iphone-notch"></div>
        {children}
        {/* The visualizer will be rendered here by VoiceRecording if needed */}
      </div>
    </div>
  );
};

export default MobileFrame; 