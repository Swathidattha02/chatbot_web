import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import './LanguageSelector.css';

const LanguageSelector = ({ currentLanguage, onLanguageChange, supportedLanguages }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
    const wrapperRef = useRef(null);
    const buttonRef = useRef(null);
    
    const currentLanguageName = supportedLanguages[currentLanguage] || 'English';
    
    const handleSelect = (code) => {
        onLanguageChange(code);
        setIsOpen(false);
    };

    // Update dropdown position when opened
    const updateDropdownPosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right
            });
        }
    };

    const handleOpenDropdown = () => {
        setIsOpen(true);
        setTimeout(updateDropdownPosition, 0);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update position on scroll
    useEffect(() => {
        if (isOpen) {
            window.addEventListener('scroll', updateDropdownPosition);
            window.addEventListener('resize', updateDropdownPosition);
            return () => {
                window.removeEventListener('scroll', updateDropdownPosition);
                window.removeEventListener('resize', updateDropdownPosition);
            };
        }
    }, [isOpen]);

    return (
        <div className="language-selector-wrapper" ref={wrapperRef}>
            <button 
                ref={buttonRef}
                className="language-selector-button"
                onClick={handleOpenDropdown}
                title="Select Language"
            >
                <Globe size={18} />
                <span className="language-name">{currentLanguageName}</span>
                <ChevronDown size={16} className={`chevron-icon ${isOpen ? 'open' : ''}`} />
            </button>
            
            {isOpen && (
                <div 
                    className="language-dropdown"
                    style={{
                        top: `${dropdownPosition.top}px`,
                        right: `${dropdownPosition.right}px`
                    }}
                >
                    <div className="language-dropdown-header">
                        <Globe size={16} />
                        <span>Select Language</span>
                    </div>
                    <div className="language-options">
                        {Object.entries(supportedLanguages).map(([code, name]) => (
                            <button
                                key={code}
                                className={`language-option ${currentLanguage === code ? 'active' : ''}`}
                                onClick={() => handleSelect(code)}
                            >
                                <span className="option-name">{name}</span>
                                {currentLanguage === code && <span className="checkmark">✓</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;
