import React from 'react';
import './Button.css';

interface ButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({ icon, label, onClick }) => {
  return (
    <button className="circle-btn" onClick={onClick}>
      <div className="circle-btn-icon">{icon}</div>
      <div className="circle-btn-label">{label}</div>
    </button>
  );
};

export default Button; 