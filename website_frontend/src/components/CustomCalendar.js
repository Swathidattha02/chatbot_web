import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import './CustomCalendar.css';

const CustomCalendar = ({ selectedDate, onDateSelect, onClose, type = 'date' }) => {
    const [viewDate, setViewDate] = useState(new Date(selectedDate));

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const prevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
        if (next <= new Date()) {
            setViewDate(next);
        }
    };

    const handleDateClick = (day) => {
        const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        if (selected <= new Date()) {
            onDateSelect(selected);
            onClose();
        }
    };

    const handleMonthClick = (monthIndex) => {
        const selected = new Date(viewDate.getFullYear(), monthIndex, 1);
        if (selected <= new Date()) {
            onDateSelect(selected);
            onClose();
        }
    };

    const renderHeader = () => (
        <div className="calendar-header-custom">
            <button className="nav-btn" onClick={prevMonth}><ChevronLeft size={18} /></button>
            <div className="current-month">
                {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button
                className="nav-btn"
                onClick={nextMonth}
                disabled={new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1) > new Date()}
            >
                <ChevronRight size={18} />
            </button>
        </div>
    );

    const renderDateView = () => {
        const days = [];
        const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
        const startDay = firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Blank spaces for previous month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`blank-${i}`} className="calendar-day empty"></div>);
        }

        // Current month days
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === today.toDateString();
            const isFuture = date > new Date();

            days.push(
                <div
                    key={day}
                    className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isFuture ? 'disabled' : ''}`}
                    onClick={() => !isFuture && handleDateClick(day)}
                >
                    {day}
                </div>
            );
        }

        return (
            <div className="calendar-body-custom">
                <div className="calendar-weekdays">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="weekday">{d}</div>)}
                </div>
                <div className="calendar-days-grid">
                    {days}
                </div>
            </div>
        );
    };

    const renderMonthView = () => {
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();

        return (
            <div className="calendar-months-grid">
                {months.map((month, index) => {
                    const isFuture = viewDate.getFullYear() === currentYear && index > currentMonth;
                    const isSelected = selectedDate.getMonth() === index && selectedDate.getFullYear() === viewDate.getFullYear();

                    return (
                        <div
                            key={month}
                            className={`calendar-month-item ${isSelected ? 'selected' : ''} ${isFuture ? 'disabled' : ''}`}
                            onClick={() => !isFuture && handleMonthClick(index)}
                        >
                            {month}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="custom-calendar-popup">
            <div className="calendar-bubble">
                <div className="calendar-top-bar">
                    <span className="picker-title">{type === 'date' ? 'Select Date' : 'Select Month'}</span>
                    <button className="close-picker-btn" onClick={onClose}><X size={16} /></button>
                </div>
                {renderHeader()}
                {type === 'date' ? renderDateView() : renderMonthView()}
                <div className="calendar-footer-custom">
                    <button className="today-btn" onClick={() => { onDateSelect(new Date()); onClose(); }}>Go to Today</button>
                    <button className="clear-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default CustomCalendar;
