import React from 'react';
import './Button.css';

interface ButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ icon, label, onClick, variant = 'primary' }) => {
  // Special handling for specific buttons
  const isMicrophoneButton = label === 'Speak your thoughts';
  const isWriteButton = label === 'Write a response';
  
  return (
    <button 
      className={`circle-btn ${variant === 'primary' ? 'circle-btn-primary' : 'circle-btn-secondary'}`} 
      onClick={onClick}
    >
      <div className="circle-btn-icon">
        {isMicrophoneButton ? (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C10.3431 2 9 3.34315 9 5V11C9 12.6569 10.3431 14 12 14C13.6569 14 15 12.6569 15 11V5C15 3.34315 13.6569 2 12 2Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M19 10V11C19 15.4183 15.4183 19 11 19M5 10V11C5 15.4183 8.58172 19 13 19M13 19V22M13 22H9M13 22H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : isWriteButton ? (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.5 2.50023C18.8978 2.10243 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.10243 21.5 2.50023C21.8978 2.89804 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.10243 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          icon
        )}
      </div>
      <div className="circle-btn-label">{label}</div>
    </button>
  );
};

export default Button; 