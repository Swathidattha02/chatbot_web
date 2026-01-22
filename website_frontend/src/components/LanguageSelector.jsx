import React from 'react';
import './LanguageSelector.css';

const LanguageSelector = ({ currentLanguage, onLanguageChange, supportedLanguages }) => {
    return (
        <div className="language-selector">
            <label htmlFor="language-select" className="language-label">
                <span className="language-icon">🌐</span>
                Language:
            </label>
            <select
                id="language-select"
                className="language-select"
                value={currentLanguage}
                onChange={(e) => onLanguageChange(e.target.value)}
            >
                {Object.entries(supportedLanguages).map(([code, name]) => (
                    <option key={code} value={code}>
                        {name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default LanguageSelector;
