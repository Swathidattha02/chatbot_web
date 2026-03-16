import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
    FileText, BarChart3, Flame, Bot, 
    ChevronRight, ArrowRight, Play, CheckCircle2,
    GraduationCap, BookOpen, Trophy, Users,
    Target, Globe, Languages, Star, Megaphone
} from "lucide-react";
import "../styles/Home.css";

/* ── Animated counter hook ─────────────────────────────────────────── */
function useCounter(target, duration = 2000) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const started = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true;
                    const start = Date.now();
                    const step = () => {
                        const elapsed = Date.now() - start;
                        const progress = Math.min(elapsed / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setCount(Math.round(target * eased));
                        if (progress < 1) requestAnimationFrame(step);
                    };
                    requestAnimationFrame(step);
                }
            },
            { threshold: 0.3 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [target, duration]);

    return [count, ref];
}

/* ── Floating particle ─────────────────────────────────────────────── */
function Particle({ delay, size, x }) {
    return (
        <div
            className="hp-particle"
            style={{
                width: size, height: size,
                left: `${x}%`,
                animationDelay: `${delay}s`,
            }}
        />
    );
}

function Home() {
    const { isAuthenticated, user } = useAuth();
    const [activeTab, setActiveTab] = useState(0);

    const [usersCount, usersRef] = useCounter(10000);
    const [quizzesCount, quizzesRef] = useCounter(50000);
    const [langCount, langRef] = useCounter(5);
    const [schoolsCount, schoolsRef] = useCounter(120);

    /* Auto-cycle tabs every 2 seconds */
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTab(prev => (prev + 1) % 4); // 4 is showcaseTabs.length
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    /* Showcase tabs */
    const showcaseTabs = [
        {
            label: <><FileText size={18} /> AI Quizzes</>,
            title: "Smart Quizzes Powered by AI",
            desc: "Our AI generates unique multiple-choice quizzes for every chapter. Questions adapt to your level, test real understanding — not just rote memory. Get instant feedback and track your scores over time.",
            highlights: ["AI-generated MCQs for each chapter", "Instant grading & answer review", "Results visible to your teacher", "Unlimited retakes to master concepts"],
            visual: "quiz",
        },
        {
            label: <><BarChart3 size={18} /> Progress Tracker</>,
            title: "Track Every Step of Your Journey",
            desc: "See exactly where you stand with our real-time progress dashboards. Subject-wise and chapter-wise completion percentages, time spent learning, and quiz scores — all in one place.",
            highlights: ["Subject & chapter completion %", "Time-spent analytics", "Quiz pass/fail history", "Daily, weekly, monthly views"],
            visual: "progress",
        },
        {
            label: <><Flame size={18} /> Streak Counter</>,
            title: "Build Your Learning Streak",
            desc: "Stay motivated with your daily learning streak! Log in and learn every day to keep your streak alive. Earn milestones and never break the chain.",
            highlights: ["Daily streak tracking", "Milestone rewards at 7, 30, 100 days", "Streak recovery options", "Class-wide streak leaderboard"],
            visual: "streak",
        },
        {
            label: <><Bot size={18} /> AI Chatbot</>,
            title: "Your 24/7 AI Study Buddy",
            desc: "Ask anything, in any language. Our AI chatbot understands your curriculum, answers from your uploaded PDFs, and explains concepts step-by-step with a lifelike 3D avatar.",
            highlights: ["Multi-language support", "PDF-based Q&A (RAG)", "3D Avatar with voice responses", "Full conversation history"],
            visual: "chatbot",
        },
    ];

    const tab = showcaseTabs[activeTab];

    return (
        <div className="hp-root">
            {/* ── Floating particles background ──────────────────────── */}
            <div className="hp-particles">
                {[...Array(12)].map((_, i) => (
                    <Particle key={i} delay={i * 1.2} size={4 + Math.random() * 6} x={Math.random() * 100} />
                ))}
            </div>

            {/* ═══════════════════════════════════════════════════════════
                HERO SECTION
            ═══════════════════════════════════════════════════════════ */}
            <section className="hp-hero">
                <div className="hp-hero-content">
                    <div className="hp-badge">
                        <span className="hp-badge-dot" />
                        <span>AI-Powered Learning Platform</span>
                    </div>

                    <h1 className="hp-hero-title">
                        Learn Smarter with Your
                        <span className="hp-gradient-text"> Personal AI Tutor</span>
                    </h1>

                    <p className="hp-hero-sub">
                        Interactive 3D avatar, AI-generated quizzes, real-time progress tracking,
                        and a chatbot that speaks your language — all in one platform built for
                        school students.
                    </p>

                    <div className="hp-hero-btns">
                        {isAuthenticated ? (
                            <>
                                <Link to={user?.role === "teacher" ? "/teacher/dashboard" : user?.role === "admin" ? "/admin/dashboard" : "/dashboard"} className="hp-btn hp-btn-primary">
                                    Go to Dashboard <span>→</span>
                                </Link>
                                <Link to="/chat" className="hp-btn hp-btn-glass">
                                    Start Learning
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to="/signup" className="hp-btn hp-btn-primary">
                                    Get Started Free <span>→</span>
                                </Link>
                                <Link to="/login" className="hp-btn hp-btn-glass">
                                    Sign In
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Right: visual orb */}
                <div className="hp-hero-visual">
                    <div style={{ position: 'relative', width: '100%', maxWidth: '650px', display: 'flex', justifyContent: 'center' }}>
                        <img
                            src="/hero-bot.jpg"
                            alt="AI Learning Ecosystem"
                            style={{
                                width: '100%',
                                height: 'auto',
                                objectFit: 'contain',
                                borderRadius: '24px'
                            }}
                        />
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════════════════════════
                FEATURE SHOWCASE (TABS)
            ═══════════════════════════════════════════════════════════ */}
            <section className="hp-showcase">
                <div className="hp-showcase-header">
                    <h2 className="hp-section-title">Everything You Need to Excel</h2>
                    <p className="hp-section-sub">
                        Our platform combines AI quizzes, progress analytics, streaks, and a
                        smart chatbot to give you the most complete learning experience.
                    </p>
                </div>

                <div className="hp-showcase-tabs">
                    {showcaseTabs.map((t, i) => (
                        <button
                            key={i}
                            className={`hp-tab-btn ${activeTab === i ? "active" : ""}`}
                            onClick={() => setActiveTab(i)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="hp-showcase-body">
                    <div className="hp-showcase-info">
                        <h3 className="hp-showcase-title">{tab.title}</h3>
                        <p className="hp-showcase-desc">{tab.desc}</p>
                        <ul className="hp-showcase-list">
                            {tab.highlights.map((h, i) => (
                                <li key={i}>
                                    <CheckCircle2 size={16} className="hp-check-icon" /> {h}
                                </li>
                            ))}
                        </ul>
                        {isAuthenticated ? (
                            <Link to={user?.role === "teacher" ? "/teacher/dashboard" : user?.role === "admin" ? "/admin/dashboard" : "/dashboard"} className="hp-btn hp-btn-primary hp-btn-sm">
                                Try it Now →
                            </Link>
                        ) : (
                            <Link to="/signup" className="hp-btn hp-btn-primary hp-btn-sm">
                                Get Started →
                            </Link>
                        )}
                    </div>

                    <div className="hp-showcase-visual">
                        {tab.visual === "quiz" && (
                            <div className="hp-mock hp-mock-quiz">
                                <div className="hp-mock-bar">● Chapter Quiz — Fractions</div>
                                <div className="hp-mock-q">Q3: What is 1/2 + 1/4?</div>
                                <div className="hp-mock-opts">
                                    <div className="hp-mock-opt">A) 1/4</div>
                                    <div className="hp-mock-opt hp-opt-selected">B) 3/4 ✓</div>
                                    <div className="hp-mock-opt">C) 1</div>
                                    <div className="hp-mock-opt">D) 1/2</div>
                                </div>
                                <div className="hp-mock-score">Score: 8/10 — 80% ✅ Passed!</div>
                            </div>
                        )}
                        {tab.visual === "progress" && (
                            <div className="hp-mock hp-mock-progress">
                                    <div className="hp-mock-bar"><BarChart3 size={14} style={{marginRight: '6px'}} /> Progress Dashboard</div>
                                <div className="hp-prog-row"><span>Mathematics</span><div className="hp-prog-track"><div className="hp-prog-fill" style={{ width: "85%" }}>85%</div></div></div>
                                <div className="hp-prog-row"><span>Science</span><div className="hp-prog-track"><div className="hp-prog-fill hp-fill-green" style={{ width: "72%" }}>72%</div></div></div>
                                <div className="hp-prog-row"><span>English</span><div className="hp-prog-track"><div className="hp-prog-fill hp-fill-amber" style={{ width: "60%" }}>60%</div></div></div>
                                <div className="hp-prog-row"><span>Social Studies</span><div className="hp-prog-track"><div className="hp-prog-fill hp-fill-red" style={{ width: "45%" }}>45%</div></div></div>
                            </div>
                        )}
                        {tab.visual === "streak" && (
                            <div className="hp-mock hp-mock-streak">
                                <div className="hp-mock-bar"><Flame size={14} style={{marginRight: '6px'}} /> Learning Streak</div>
                                <div className="hp-streak-num">
                                    <span className="hp-streak-fire"><Flame size={48} color="#f97316" fill="#f97316" /></span>
                                    <span className="hp-streak-val">14</span>
                                    <span className="hp-streak-label">Day Streak!</span>
                                </div>
                                <div className="hp-streak-week">
                                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                                        <div key={i} className={`hp-streak-day ${i < 6 ? "active" : ""}`}>
                                            {i < 6 ? <Flame size={14} color="#f97316" fill="#f97316" /> : "○"}<br /><small>{d}</small>
                                        </div>
                                    ))}
                                </div>
                                <div className="hp-streak-milestone">🏆 Next milestone: 21 days</div>
                            </div>
                        )}
                        {tab.visual === "chatbot" && (
                            <div className="hp-mock hp-mock-chat">
                                <div className="hp-mock-bar">
                                    <img src="/logo.png" className="hp-mock-logo-img" alt="" style={{ marginRight: '8px' }} />
                                    AI Avatar Chat
                                </div>
                                <div className="hp-chat-msg hp-chat-user">Explain photosynthesis simply</div>
                                <div className="hp-chat-msg hp-chat-ai">
                                    <img src="/logo.png" className="hp-mock-logo-img" alt="" />
                                    <span>Photosynthesis is how plants make food using sunlight! They take in CO₂ and water, and using sunlight energy, produce glucose and oxygen. 🌱</span>
                                </div>
                                <div className="hp-chat-msg hp-chat-user">In Telugu please</div>
                                <div className="hp-chat-msg hp-chat-ai">
                                    <img src="/logo.png" className="hp-mock-logo-img" alt="" />
                                    <span>కిరణజన్య సంయోగ క్రియ అంటే మొక్కలు సూర్యరశ్మి ఉపయోగించి ఆహారం తయారు చేసుకోవడం! 🌿</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════
                HOW IT WORKS (3 STEPS)
            ═══════════════════════════════════════════════════════════ */}
            <section className="hp-steps">
                <h2 className="hp-section-title hp-dark">How It Works</h2>
                <p className="hp-section-sub hp-dark-sub">Get started in 4 simple steps</p>

                <div className="hp-steps-grid">
                    <div className="hp-step-card">
                        <div className="hp-step-num">1</div>
                        <div className="hp-step-icon"><GraduationCap size={32} /></div>
                        <h3>Sign Up & Get Approved</h3>
                        <p>Create a student account, choose your school, class & section. Your class teacher approves you instantly.</p>
                    </div>
                    <div className="hp-step-connector"><ArrowRight /></div>
                    <div className="hp-step-card">
                        <div className="hp-step-num">2</div>
                        <div className="hp-step-icon"><BookOpen size={32} /></div>
                        <h3>Learn & Take Quizzes</h3>
                        <p>Study chapters, take AI-generated quizzes, chat with the AI tutor, and track your progress in real time.</p>
                    </div>
                    <div className="hp-step-connector"><ArrowRight /></div>
                    <div className="hp-step-card">
                        <div className="hp-step-num">3</div>
                        <div className="hp-step-icon"><Trophy size={32} /></div>
                        <h3>Excel & Build Streaks</h3>
                        <p>Maintain your daily streak, score higher on quizzes, and watch your progress soar across every subject.</p>
                    </div>
                    <div className="hp-step-connector"><ArrowRight /></div>
                    <div className="hp-step-card">
                        <div className="hp-step-num">4</div>
                        <div className="hp-step-icon"><Users size={32} /></div>
                        <h3>Teacher Reporting</h3>
                        <p>Quiz results, scores, and analytics are automatically sent to your class teacher's dashboard for review.</p>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════
                FEATURES GRID (original 6 cards redesigned)
            ═══════════════════════════════════════════════════════════ */}
            <section className="hp-features">
                <h2 className="hp-section-title">Powerful Features</h2>
                <p className="hp-section-sub">Built for the way students actually learn</p>

                <div className="hp-feat-grid">
                    {[
                        { icon: <Target className="hp-feat-icon-svg" size={32} />, title: "Interactive 3D Avatar", desc: "Lifelike 3D avatar with natural gestures and voice responses" },
                        { icon: <Languages className="hp-feat-icon-svg" size={32} />, title: "Multi-Language", desc: "Learn in English, Hindi, Telugu and more — switch anytime" },
                        { icon: <FileText className="hp-feat-icon-svg" size={32} />, title: "AI Quizzes", desc: "Unique MCQs for every chapter, graded and tracked automatically" },
                        { icon: <BarChart3 className="hp-feat-icon-svg" size={32} />, title: "Progress Analytics", desc: "Subject & chapter dashboards with time-spent and completion %" },
                        { icon: <Flame className="hp-feat-icon-svg" size={32} />, title: "Daily Streaks", desc: "Build consistency with streak tracking and milestone rewards" },
                        { icon: <BookOpen className="hp-feat-icon-svg" size={32} />, title: "Document Q&A", desc: "Upload PDFs and ask questions — AI answers from your own notes" },
                        { icon: <Megaphone className="hp-feat-icon-svg" size={32} />, title: "Class Announcements", desc: "Get instant updates and study materials shared by your class teacher" },
                    ].map((f, i) => (
                        <div className="hp-feat-card" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                            <div className="hp-feat-icon">{f.icon}</div>
                            <h3 className="hp-feat-title">{f.title}</h3>
                            <p className="hp-feat-desc">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════
                TESTIMONIALS / SOCIAL PROOF
            ═══════════════════════════════════════════════════════════ */}
            <section className="hp-testimonials">
                <h2 className="hp-section-title hp-dark">What Students Say</h2>
                <div className="hp-test-grid">
                    {[
                        { name: "Aarav S.", class: "Class 10, Narayana School", text: "The AI quizzes helped me score 95% in maths. The instant feedback is amazing!", stars: 5 },
                        { name: "Priya M.", class: "Class 9, Delhi Public School", text: "I love the Telugu language chatbot. It explains science concepts so clearly!", stars: 5 },
                        { name: "Rohit K.", class: "Class 8, Chaitanya School", text: "My 45-day streak motivates me to study every day. Best study app ever!", stars: 5 },
                    ].map((t, i) => (
                        <div className="hp-test-card" key={i}>
                            <div className="hp-test-stars">
                                {[...Array(t.stars)].map((_, i) => (
                                    <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
                                ))}
                            </div>
                            <p className="hp-test-text">"{t.text}"</p>
                            <div className="hp-test-author">
                                <div className="hp-test-avatar">{t.name.charAt(0)}</div>
                                <div>
                                    <div className="hp-test-name">{t.name}</div>
                                    <div className="hp-test-class">{t.class}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════
                CTA SECTION
            ═══════════════════════════════════════════════════════════ */}
            <section className="hp-cta">
                <div className="hp-cta-inner">
                    <h2 className="hp-cta-title">Ready to Transform Your Learning?</h2>
                    <p className="hp-cta-sub">
                        Join thousands of students already learning smarter with AI-powered
                        quizzes, progress tracking, and a chatbot that speaks your language.
                    </p>
                    <div className="hp-cta-btns">
                        {isAuthenticated ? (
                            <>
                                <Link to={user?.role === "teacher" ? "/teacher/dashboard" : user?.role === "admin" ? "/admin/dashboard" : "/dashboard"} className="hp-btn hp-btn-white">
                                    Go to Dashboard <span>→</span>
                                </Link>
                                <Link to="/chat" className="hp-btn hp-btn-outline-white">
                                    Start Chatting
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to="/signup" className="hp-btn hp-btn-white">
                                    Sign Up Free <span>→</span>
                                </Link>
                                <Link to="/login" className="hp-btn hp-btn-outline-white">
                                    Already have an account?
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;
