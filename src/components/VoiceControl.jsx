import React, { useState, useRef, useEffect } from 'react';
import './VoiceControl.css';

const VoiceControl = ({ onVoiceInput, isAvatarSpeaking }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef(null);

    useEffect(() => {
        // Check if browser supports speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            setIsSupported(true);
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }

                setTranscript(finalTranscript || interimTranscript);

                if (finalTranscript) {
                    onVoiceInput(finalTranscript.trim());
                    setTranscript('');
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onVoiceInput]);

    const toggleListening = () => {
        if (!isSupported) {
            alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setTranscript('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    return (
        <div className="voice-control">
            <button
                className={`voice-button ${isListening ? 'listening' : ''} ${isAvatarSpeaking ? 'speaking' : ''}`}
                onClick={toggleListening}
                disabled={isAvatarSpeaking || !isSupported}
                title={!isSupported ? 'Speech recognition not supported' : isListening ? 'Stop listening' : 'Start voice input'}
            >
                {isAvatarSpeaking ? (
                    <span className="icon">🔊</span>
                ) : isListening ? (
                    <span className="icon pulse">🎤</span>
                ) : (
                    <span className="icon">🎙️</span>
                )}
            </button>

            {transcript && (
                <div className="transcript-preview">
                    <span className="transcript-text">{transcript}</span>
                </div>
            )}

            {!isSupported && (
                <div className="not-supported-message">
                    Voice input not supported in this browser
                </div>
            )}
        </div>
    );
};

export default VoiceControl;
