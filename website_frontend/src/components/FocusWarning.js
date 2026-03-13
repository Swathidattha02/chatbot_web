import React from 'react';
import './FocusWarning.css';

const FocusWarning = ({ onConfirm }) => {
  return (
    <div className="focus-warning-overlay">
      <div className="focus-warning-box">
        <h2>Focus Lost</h2>
        <p>You left the study session. Please return to continue.</p>
        <button onClick={onConfirm} className="focus-warning-button">
          I am back
        </button>
      </div>
    </div>
  );
};

export default FocusWarning;
