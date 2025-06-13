import React from 'react';
import './ActionItems.css';

const ActionItems: React.FC = () => {
  return (
    <div className="action-items-bg">
      <div className="action-items-container">
        <div className="action-items-header">
          <h1>Action Items</h1>
          <p>Your personalized action items and recommendations</p>
        </div>
        
        <div className="coming-soon">
          <div className="coming-soon-icon">📋</div>
          <h2>Coming Soon</h2>
          <p>Your action items and recommendations will appear here.</p>
        </div>
      </div>
    </div>
  );
};

export default ActionItems; 