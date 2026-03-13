import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useFocusMonitor } from '../hooks/useFocusMonitor';
import FocusWarning from './FocusWarning';

/**
 * SubjectLayout Component
 * 
 * Wraps all routes under /subjects/* and provides global violation monitoring
 * across all nested routes (chapters, pdf, video, quiz, etc.)
 * 
 * The monitoring remains active even when navigating to deeply nested routes
 * because this layout component stays mounted in the component hierarchy.
 */
const SubjectLayout = ({ children }) => {
  const location = useLocation();
  
  // Check if current route is under /subjects
  const isSubjectsRoute = location.pathname.startsWith('/subjects');
  
  // Read studying state from localStorage (set when student clicks a subject)
  const [isStudying, setIsStudying] = useState(() => {
    const stored = localStorage.getItem('isStudying');
    return stored === 'true' && isSubjectsRoute;
  });
  
  const [showFocusWarning, setShowFocusWarning] = useState(false);
  const [alarmActive, setAlarmActive] = useState(false);

  // Update isStudying when route or localStorage changes
  useEffect(() => {
    const stored = localStorage.getItem('isStudying');
    setIsStudying(stored === 'true' && isSubjectsRoute);
  }, [location.pathname, isSubjectsRoute]);

  // Focus monitoring callbacks
  const handleViolation = useCallback((v) => {
    console.log('Violation detected:', v.reason);
  }, []);

  const handleAlarmStart = useCallback(() => {
    setAlarmActive(true);
  }, []);

  const handleAlarmStop = useCallback(() => {
    setAlarmActive(false);
  }, []);

  const handleFocusLost = useCallback(() => {
    setShowFocusWarning(true);
  }, []);

  const handleFocusGained = useCallback(() => {
    // Warning is hidden by "I am back" button
  }, []);

  // Activate violation monitoring for all /subjects routes
  const { stopAlarm } = useFocusMonitor({
    onViolation: handleViolation,
    onAlarmStart: handleAlarmStart,
    onAlarmStop: handleAlarmStop,
    onFocusLost: handleFocusLost,
    onFocusGained: handleFocusGained,
    isStudying: isStudying,
  });

  const handleImBack = () => {
    setShowFocusWarning(false);
    stopAlarm();
  };

  // Only render focus warning if we're on a /subjects route
  if (!isSubjectsRoute) {
    return children;
  }

  return (
    <>
      {showFocusWarning && <FocusWarning onConfirm={handleImBack} />}
      {children}
    </>
  );
};

export default SubjectLayout;
