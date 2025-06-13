import React from 'react';
import './Profile.css';

const Profile: React.FC = () => {
  return (
    <div className="profile-bg">
      <div className="profile-container">
        <div className="profile-header">
          <h1>Profile</h1>
          <p>Your personal settings and preferences</p>
        </div>
        
        <div className="coming-soon">
          <div className="coming-soon-icon">👤</div>
          <h2>Coming Soon</h2>
          <p>Your profile settings and preferences will appear here.</p>
        </div>
      </div>
    </div>
  );
};

export default Profile; 