const axios = require("axios");
const Quiz = require("../models/Quiz");
const Progress = require("../models/Progress");

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const LLM_MODEL = process.env.LLM_MODEL || "llama3.2";
const PASS_PERCENT = 60;

// ── Helper: call the right AI backend (local Ollama OR RunPod) ─────────────────
async function callLLM(prompt) {
    const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
    const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;

    // ── PRODUCTION: RunPod ──────────────────────────────────────────────────────
    if (RUNPOD_API_KEY && RUNPOD_ENDPOINT_ID) {
        console.log("🚀 Quiz: using RunPod endpoint:", RUNPOD_ENDPOINT_ID);

        const response = await axios.post(
            `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/runsync`,
            {
                input: {
                    model: LLM_MODEL,
                    prompt,
                    stream: false,
                    options: { temperature: 0.7, num_predict: 2000 },
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${RUNPOD_API_KEY}`,
                    "Content-Type": "application/json",
                },
                timeout: 180000, // 3 min for cold starts
            }
        );

        const output = response.data?.output;
        if (!output) throw new Error("RunPod returned empty output");

        // RunPod workers may return string or object
        if (typeof output === "string") return output;
        if (output.response) return output.response;
        if (output.message?.content) return output.message.content;
        throw new Error("Unrecognised RunPod output format");
    }

    // ── LOCAL DEV: Ollama ───────────────────────────────────────────────────────
    console.log("🧠 Quiz: using local Ollama →", OLLAMA_BASE_URL);

    const response = await axios.post(
        `${OLLAMA_BASE_URL}/api/generate`,
        {
            model: LLM_MODEL,
            prompt,
            stream: false,
            options: { temperature: 0.7, num_predict: 2000 },
        },
        { timeout: 120000 }
    );

    const text = response.data?.response;
    if (!text) throw new Error("Ollama returned empty response");
    return text;
}

// ── Repair & parse JSON that LLMs sometimes truncate or malform ────────────────
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
// @desc  Generate 10 MCQ questions for a chapter using Llama
// @route POST /api/quiz/generate
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
exports.generateQuiz = async (req, res) => {
    try {
        const { chapterName, subjectName } = req.body;

        if (!chapterName || !subjectName) {
            return res.status(400).json({ success: false, message: "chapterName and subjectName are required" });
        }

        // Short, concrete prompt — llama3.2 omits "answer" with long prompts
        const prompt = `Generate 10 MCQ questions for the chapter "${chapterName}" from ${subjectName} for school students.
Output ONLY a valid JSON array. Each object must have these exact keys: id, question, options, answer.
"answer" must exactly match one of the 4 options.
Example:
[{"id":1,"question":"What is 1/2 + 1/4?","options":["A) 1/4","B) 3/4","C) 1","D) 1/2"],"answer":"B) 3/4"}]
Now output all 10:`;

        console.log(`🧠 Generating quiz: ${subjectName} — ${chapterName}`);

        const rawText = await callLLM(prompt);
        console.log(`📄 LLM output (first 200 chars): ${rawText.substring(0, 200)}`);

        let questions;
        try {
            questions = repairAndParseJSON(rawText);
        } catch (e) {
            console.error('❌ JSON repair failed:', e.message);
            throw new Error('Model returned unparseable JSON. Please try again.');
        }

        // Sanitise: keep only well-formed questions, fill missing answer with options[0]
        questions = questions
            .filter(q => q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length >= 2)
            .slice(0, 10)
            .map((q, i) => {
                const opts = q.options.slice(0, 4);
                const ans = q.answer && opts.includes(q.answer) ? q.answer : opts[0];
                return { id: i + 1, question: q.question, options: opts, answer: ans };
            });

        if (questions.length < 3) {
            throw new Error(`Only ${questions.length} valid questions returned. Please try again.`);
        }

        console.log(`✅ Delivered ${questions.length} questions for "${chapterName}"`);
        return res.json({ success: true, questions });

    } catch (error) {
        console.error("❌ Quiz generate error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to generate quiz. Please try again.",
            error: error.message,
        });
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

        // Upsert quiz record
        let quizRecord = await Quiz.findOne({ userId, subjectId, chapterId });

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

        return res.json({ success: true, score: correct, total, percentage, passed, passPercent: PASS_PERCENT, results });

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


