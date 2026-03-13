import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useFocusMonitor } from '../hooks/useFocusMonitor';

const StudentLayout = ({ children }) => {
  const { user } = useAuth();

  // Only apply focus monitoring for students
  const isStudent = user?.role === 'student';

  useFocusMonitor({
    onViolation: (violation) => {
      console.log('Violation recorded:', violation.reason);
    },
    onAlarmStart: () => console.log('Alarm started'),
    onAlarmStop: () => console.log('Alarm stopped'),
    onCountdown: (remaining) => console.log(`Countdown: ${remaining}s`),
    // The hook is now enabled based on the isStudent flag
    enabled: isStudent 
  });

  return <>{children}</>;
};

export default StudentLayout;
