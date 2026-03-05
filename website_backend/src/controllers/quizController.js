const axios = require("axios");
const Quiz = require("../models/Quiz");
const Progress = require("../models/Progress");

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const LLM_MODEL = process.env.LLM_MODEL || "llama3.2";
const PASS_PERCENT = 60; // 60% needed to pass

// ─────────────────────────────────────────────────────────────────────────────
// @desc  Generate 10 MCQ questions for a chapter using Llama
// @route POST /api/quiz/generate
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
exports.generateQuiz = async (req, res) => {
    try {
        const { chapterName, subjectName, chapterId, subjectId } = req.body;

        if (!chapterName || !subjectName) {
            return res.status(400).json({ success: false, message: "chapterName and subjectName are required" });
        }

        const prompt = `You are an expert ${subjectName} teacher for school students.
Generate exactly 10 multiple-choice quiz questions about the chapter "${chapterName}" from ${subjectName}.

IMPORTANT - Respond ONLY with valid JSON. No explanation, no markdown, no code block.
Format:
[
  {
    "id": 1,
    "question": "Question text here?",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "answer": "A) option1"
  }
]

Rules:
- Each question must have exactly 4 options labeled A), B), C), D)
- The "answer" must match one of the options exactly
- Questions should test understanding, not just memory
- Make questions appropriate for school students
- Return ONLY the JSON array, nothing else`;

        console.log(`🧠 Generating quiz for: ${subjectName} - ${chapterName}`);

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

        let rawText = response.data?.response || "";

        // Extract JSON array from response
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error("Could not extract JSON from model response");
        }

        let questions;
        try {
            questions = JSON.parse(jsonMatch[0]);
        } catch {
            throw new Error("Failed to parse quiz JSON from model");
        }

        // Validate and cap at 10
        questions = questions.slice(0, 10).map((q, i) => ({
            id: i + 1,
            question: q.question,
            options: q.options,
            answer: q.answer,
        }));

        if (questions.length < 3) {
            throw new Error("Model returned too few questions");
        }

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

        console.log(`📝 Quiz submitted: ${correct}/${total} (${percentage}%) - ${passed ? "PASSED" : "FAILED"}`);

        // Upsert quiz record
        let quizRecord = await Quiz.findOne({ userId, subjectId, chapterId });
        const attempt = { score: correct, percentage, passed, takenAt: new Date() };

        if (quizRecord) {
            quizRecord.attempts.push(attempt);
            quizRecord.lastAttempt = new Date();
            // Only update best result if this attempt is better
            if (percentage > quizRecord.percentage) {
                quizRecord.score = correct;
                quizRecord.percentage = percentage;
                quizRecord.passed = passed;
            }
            // Once passed, always passed
            if (passed) quizRecord.passed = true;
        } else {
            quizRecord = await Quiz.create({
                userId, subjectId, subjectName, chapterId, chapterName,
                score: correct, totalQ: total, percentage, passed,
                attempts: [attempt],
            });
        }
        await quizRecord.save();

        // If quiz passed → ensure Progress is marked completed
        if (passed) {
            let progress = await Progress.findOne({ userId, subjectId, chapterId });
            if (progress) {
                progress.quizPassed = true;
                // Chapter is 100% only when time >= 2min AND quiz passed
                if (progress.timeSpent >= 2) {
                    progress.completed = true;
                }
                await progress.save();
            }
            // If no progress record yet, create with quiz passed flag
            else {
                await Progress.create({
                    userId, subjectId, subjectName, chapterId, chapterName,
                    timeSpent: 0, completed: false, quizPassed: true,
                    sessions: [],
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
