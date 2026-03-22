const axios = require("axios");
const Quiz = require("../models/Quiz");
const Progress = require("../models/Progress");

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const LLM_MODEL = process.env.LLM_MODEL || "llama3.2";
const PASS_PERCENT = 60;

// @desc  Generate 10 MCQ questions for a chapter using Llama
function repairAndParseJSON(raw) {
    const start = raw.indexOf('[');
    if (start === -1) throw new Error('No JSON array found in response');

    let text = raw.slice(start);

    // Remove JS-style comments
    text = text.replace(/\/\/[^\n]*/g, '');
    // Remove trailing commas before ] or }
    text = text.replace(/,\s*([}\]])/g, '$1');

    // Try parsing as-is
    try { return JSON.parse(text); } catch { /* need repair */ }

    // Close any unclosed objects / array (handles truncated output)
    const openBraces = (text.match(/\{/g) || []).length;
    const closeBraces = (text.match(/\}/g) || []).length;
    const openBrackets = (text.match(/\[/g) || []).length;
    const closeBrackets = (text.match(/\]/g) || []).length;

    // Strip anything after the last complete object
    const lastClose = text.lastIndexOf('}');
    if (lastClose !== -1) text = text.slice(0, lastClose + 1);

    // Reapply trailing-comma cleanup after trim
    text = text.replace(/,\s*([}\]])/g, '$1');

    for (let i = 0; i < openBraces - closeBraces; i++) text += '}';
    for (let i = 0; i < openBrackets - closeBrackets; i++) text += ']';

    return JSON.parse(text);
}

// ─────────────────────────────────────────────────────────────────────────────
const MAX_ATTEMPTS = 3;

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Generate questions for a chapter, ONLY if student hasn't reached attempt limit
// @route POST /api/quiz/generate
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
exports.generateQuiz = async (req, res) => {
    const { chapterName, subjectName, chapterId, subjectId } = req.body;
    const userId = req.user.id;

    if (!chapterName || !subjectName) {
        return res.status(400).json({ success: false, message: "chapterName and subjectName are required" });
    }

    // ── Check Attempt Limit before generating ─────────────────────────────
    try {
        const existingQuiz = await Quiz.findOne({ userId, subjectId, chapterId });
        if (existingQuiz && existingQuiz.attempts.length >= MAX_ATTEMPTS) {
            return res.status(403).json({
                success: false,
                message: `You have reached the maximum of ${MAX_ATTEMPTS} attempts for this quiz.`
            });
        }
    } catch (err) {
        console.error("Attempt check error:", err);
    }

    console.log(`🧠 Generating quiz: ${subjectName} — ${chapterName}`);

    const prompt = `Task: Generate exactly 5 MCQ questions for school students based on the chapter "${chapterName}" from the subject "${subjectName}".
Output format: ONLY a valid JSON array. Do not include any introductory or concluding text.
JSON Structure per object: {"id": number, "question": "string", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": "The exact string of the correct option"}.
The "answer" must be exactly one of the items in the "options" array.
Example:
[{"id":1,"question":"What is the capital of France?","options":["Paris","London","Berlin","Madrid"],"answer":"Paris"}]
Now output all 5 questions:`;

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
        attempts++;
        try {
            // Lower temperature (0.1) for much faster and more reliable JSON generation
            const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
            const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
            
            let rawText;
            if (RUNPOD_API_KEY && RUNPOD_ENDPOINT_ID) {
                // RunPod
                const response = await axios.post(
                    `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/runsync`,
                    {
                        input: {
                            model: LLM_MODEL,
                            prompt,
                            stream: false,
                            options: { temperature: 0.1, num_predict: 1200 },
                        },
                    },
                    {
                        headers: { Authorization: `Bearer ${RUNPOD_API_KEY}`, "Content-Type": "application/json" },
                        timeout: 180000,
                    }
                );
                rawText = response.data?.output?.response || response.data?.output || "";
            } else {
                // Local Ollama
                const response = await axios.post(
                    `${OLLAMA_BASE_URL}/api/generate`,
                    {
                        model: LLM_MODEL,
                        prompt,
                        stream: false,
                        options: { temperature: 0.1, num_predict: 1200 },
                    },
                    { timeout: 180000 } // Increased to 3 min
                );
                rawText = response.data?.response || "";
            }

            if (!rawText) throw new Error("Empty response from LLM");

            let parsedQuestions = repairAndParseJSON(rawText);

            // Sanitise: keep only well-formed questions
            const questions = parsedQuestions
                .filter(q => q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length >= 2)
                .slice(0, 5)
                .map((q, i) => {
                    const opts = q.options.slice(0, 4);
                    const ans = q.answer && opts.includes(q.answer) ? q.answer : opts[0];
                    return { id: i + 1, question: q.question, options: opts, answer: ans };
                });

            if (questions.length < 3) {
                throw new Error(`Only ${questions.length} valid questions returned.`);
            }

            console.log(`✅ delivered ${questions.length} questions for "${chapterName}" (Attempt ${attempts})`);
            return res.json({ success: true, questions });

        } catch (error) {
            console.error(`❌ Quiz attempt ${attempts} failed:`, error.message);
            if (attempts >= maxAttempts) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to generate quiz. The AI might be under heavy load.",
                    error: error.message,
                });
            }
            // Wait 1s before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
};



// ─────────────────────────────────────────────────────────────────────────────
// @desc  Submit quiz answers, update quiz record, and update chapter progress
// @route POST /api/quiz/submit
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
exports.submitQuiz = async (req, res) => {
    try {
        const { subjectId, subjectName, chapterId, chapterName, answers, questions } = req.body;
        const userId = req.user.id;

        if (!answers || !questions) {
            return res.status(400).json({ success: false, message: "answers and questions are required" });
        }

        // ── Fetch student details so we can link to teacher dashboard ────────────
        const User = require("../models/User");
        let student = await User.findById(userId).select("name school class section classTeacher").lean();

        // ── Robustness: If student has no teacher link, try to find one by class/section ──
        if (student && !student.classTeacher) {
            const Teacher = require("../models/Teacher");
            const classTeacher = await Teacher.findOne({
                school: student.school,
                assignedClass: (student.class || "").replace("Class ", ""),
                assignedSection: student.section
            });
            if (classTeacher) {
                await User.findByIdAndUpdate(userId, { classTeacher: classTeacher._id });
                student.classTeacher = classTeacher._id;
            }
        }

        // Grade the answers
        let correct = 0;
        const results = questions.map((q) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.answer;
            if (isCorrect) correct++;
            return { id: q.id, question: q.question, userAnswer, correctAnswer: q.answer, isCorrect };
        });

        const total = questions.length;
        const percentage = Math.round((correct / total) * 100);
        const passed = percentage >= PASS_PERCENT;

        console.log(`📝 Quiz: ${student?.name || userId} | ${correct}/${total} (${percentage}%) | ${passed ? "✅ PASSED" : "❌ FAILED"}`);

        const attempt = { score: correct, percentage, passed, takenAt: new Date() };

        // ── Check Attempt Limit ──
        let quizRecord = await Quiz.findOne({ userId, subjectId, chapterId });
        if (quizRecord && quizRecord.attempts.length >= MAX_ATTEMPTS) {
            return res.status(403).json({
                success: false,
                message: `You have already completed ${MAX_ATTEMPTS} attempts for this quiz.`
            });
        }

        if (quizRecord) {
            quizRecord.attempts.push(attempt);
            quizRecord.lastAttempt = new Date();
            // Always update student meta in case it changed
            quizRecord.studentName = student?.name || "";
            quizRecord.school = student?.school || null;
            quizRecord.studentClass = student?.class || "";
            quizRecord.section = student?.section || "";
            quizRecord.classTeacher = student?.classTeacher || null;
            // Keep best score
            if (percentage > quizRecord.percentage) {
                quizRecord.score = correct;
                quizRecord.percentage = percentage;
                quizRecord.passed = passed;
            }
            if (passed) quizRecord.passed = true;
        } else {
            quizRecord = await Quiz.create({
                userId,
                studentName: student?.name || "",
                school: student?.school || null,
                studentClass: student?.class || "",
                section: student?.section || "",
                classTeacher: student?.classTeacher || null,
                subjectId, subjectName, chapterId, chapterName,
                score: correct, totalQ: total, percentage, passed,
                attempts: [attempt],
            });
        }
        await quizRecord.save();

        const attemptsUsed = quizRecord.attempts.length;
        const attemptsLeft = Math.max(0, MAX_ATTEMPTS - attemptsUsed);

        // If quiz passed → update Progress
        if (passed) {
            let progress = await Progress.findOne({ userId, subjectId, chapterId });
            if (progress) {
                progress.quizPassed = true;
                if (progress.timeSpent >= 2) progress.completed = true;
                await progress.save();
            } else {
                await Progress.create({
                    userId, subjectId, subjectName, chapterId, chapterName,
                    timeSpent: 0, completed: false, quizPassed: true, sessions: [],
                });
            }
        }

        return res.json({ 
            success: true, 
            score: correct, 
            total, 
            percentage, 
            passed, 
            passPercent: PASS_PERCENT, 
            results,
            attemptsUsed,
            attemptsLeft,
            maxAttempts: MAX_ATTEMPTS,
            message: attemptsLeft > 0 
                ? `You have ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.` 
                : "You have used all 3 attempts for this chapter."
        });

    } catch (error) {
        console.error("❌ Quiz submit error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to submit quiz", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Get quiz status for a chapter (did user pass?)
// @route GET /api/quiz/status/:subjectId/:chapterId
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getQuizStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { subjectId, chapterId } = req.params;
        const quiz = await Quiz.findOne({ userId, subjectId: parseInt(subjectId), chapterId: parseInt(chapterId) });
        return res.json({
            success: true,
            passed: quiz?.passed || false,
            bestScore: quiz?.score || 0,
            bestPercentage: quiz?.percentage || 0,
            attempts: quiz?.attempts?.length || 0,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to get quiz status" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Get quiz status for ALL chapters of a subject
// @route GET /api/quiz/subject/:subjectId
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getSubjectQuizStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { subjectId } = req.params;
        const quizzes = await Quiz.find({ userId, subjectId: parseInt(subjectId) });
        return res.json({ success: true, quizzes });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to get quiz status" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Teacher: get all quiz results for their class & section
// @route GET /api/quiz/class-results
// @access Private (teacher)
// ─────────────────────────────────────────────────────────────────────────────
exports.getClassQuizResults = async (req, res) => {
    try {
        const Teacher = require("../models/Teacher");
        // req.user.id is the teacher's _id
        const teacher = await Teacher.findById(req.user.id).lean();
        if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

        // Query by teacher's specific assignments as a fallback to the classTeacher ID link
        // This ensures results show up even if the student-to-teacher ID link was missed
        const quizzes = await Quiz.find({
            $or: [
                { classTeacher: teacher._id },
                { 
                    school: teacher.school, 
                    studentClass: `Class ${teacher.assignedClass}`, 
                    section: teacher.assignedSection 
                }
            ]
        })
            .sort({ lastAttempt: -1 })
            .lean();

        console.log(`📊 Teacher ${teacher.name}: fetched ${quizzes.length} quiz results (including class/section matches)`);
        return res.json({ success: true, quizzes });
    } catch (error) {
        console.error("❌ getClassQuizResults error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to get class quiz results" });
    }
};


