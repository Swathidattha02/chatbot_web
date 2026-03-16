/**
 * Centralized Dashboard Data Service
 * Handles all API calls for dashboard data with error handling and caching
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Cache for reducing unnecessary API calls
const cache = {
    studentDashboard: null,
    teacherDashboard: null,
    userProgress: null,
    analyticsDaily: null,
    analyticsMonthly: null,
    lastFetch: {},
};

const CACHE_DURATION = 30000; // 30 seconds

// ─── HELPER: GET AUTH TOKEN ──────────────────────────────────────────────────
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) {
        throw new Error("No authentication token found");
    }
    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
    };
};

// ─── HELPER: MAKE API CALL WITH RETRY ─────────────────────────────────────────
const apiCall = async (url, options = {}, retries = 3) => {
    let lastError;

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...getAuthHeaders(),
                    ...options.headers,
                },
            });

            // If unauthorized, clear token and throw
            if (response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                throw new Error("Authentication failed. Please login again.");
            }

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success && data.message) {
                throw new Error(data.message);
            }

            return data;
        } catch (error) {
            lastError = error;

            // Don't retry on auth errors
            if (error.message.includes("Authentication failed")) {
                throw error;
            }

            // Wait before retrying (exponential backoff)
            if (i < retries - 1) {
                await new Promise((resolve) =>
                    setTimeout(resolve, Math.pow(2, i) * 1000)
                );
            }
        }
    }

    throw lastError || new Error("API call failed after retries");
};

// ─── HELPER: CHECK CACHE ──────────────────────────────────────────────────────
const isCacheValid = (key) => {
    const lastFetchTime = cache.lastFetch[key];
    if (!lastFetchTime) return false;
    return Date.now() - lastFetchTime < CACHE_DURATION;
};

// ─── TEACHER DASHBOARD ────────────────────────────────────────────────────────
/**
 * Fetch teacher dashboard with students and progress
 * Returns: {success, teacher, stats, students}
 */
export const fetchTeacherDashboard = async (forceRefresh = false) => {
    try {
        // Check cache
        if (!forceRefresh && isCacheValid("teacherDashboard") && cache.teacherDashboard) {
            return cache.teacherDashboard;
        }

        const data = await apiCall(`${API_BASE_URL}/teacher/dashboard`);

        // Cache the result
        cache.teacherDashboard = data;
        cache.lastFetch.teacherDashboard = Date.now();

        return data;
    } catch (error) {
        console.error("Error fetching teacher dashboard:", error);
        throw {
            success: false,
            message: error.message || "Failed to load teacher dashboard",
            error,
        };
    }
};

// ─── PENDING STUDENTS ─────────────────────────────────────────────────────────
/**
 * Fetch pending student approvals for teacher
 * Returns: {success, students: []}
 */
export const fetchPendingStudents = async () => {
    try {
        const data = await apiCall(`${API_BASE_URL}/teacher/pending-students`);
        return data;
    } catch (error) {
        console.error("Error fetching pending students:", error);
        throw {
            success: false,
            message: error.message || "Failed to load pending students",
            error,
        };
    }
};

// ─── APPROVE/REJECT STUDENT ──────────────────────────────────────────────────
export const approveStudent = async (studentId) => {
    try {
        const data = await apiCall(
            `${API_BASE_URL}/teacher/approve-student/${studentId}`,
            { method: "POST" }
        );
        cache.teacherDashboard = null; // Invalidate cache
        return data;
    } catch (error) {
        console.error("Error approving student:", error);
        throw {
            success: false,
            message: error.message || "Failed to approve student",
            error,
        };
    }
};

export const rejectStudent = async (studentId, reason = "") => {
    try {
        const data = await apiCall(
            `${API_BASE_URL}/teacher/reject-student/${studentId}`,
            {
                method: "POST",
                body: JSON.stringify({ reason }),
            }
        );
        cache.teacherDashboard = null; // Invalidate cache
        return data;
    } catch (error) {
        console.error("Error rejecting student:", error);
        throw {
            success: false,
            message: error.message || "Failed to reject student",
            error,
        };
    }
};

// ─── STUDENT DASHBOARD ────────────────────────────────────────────────────────
/**
 * Fetch user's progress data
 * Returns: {success, progress: []}
 */
export const fetchUserProgress = async (forceRefresh = false) => {
    try {
        if (!forceRefresh && isCacheValid("userProgress") && cache.userProgress) {
            return cache.userProgress;
        }

        const data = await apiCall(`${API_BASE_URL}/progress/user`);

        cache.userProgress = data;
        cache.lastFetch.userProgress = Date.now();

        return data;
    } catch (error) {
        console.error("Error fetching user progress:", error);
        throw {
            success: false,
            message: error.message || "Failed to load progress data",
            error,
        };
    }
};

// ─── DAILY ANALYTICS ──────────────────────────────────────────────────────────
/**
 * Fetch daily analytics
 * @param {string} date - Optional date in YYYY-MM-DD format
 */
export const fetchDailyAnalytics = async (date = null) => {
    try {
        const queryParam = date ? `?date=${date}` : "";
        const cacheKey = `analyticsDaily_${date || "today"}`;

        if (isCacheValid(cacheKey) && cache[cacheKey]) {
            return cache[cacheKey];
        }

        const data = await apiCall(`${API_BASE_URL}/progress/analytics/daily${queryParam}`);

        cache[cacheKey] = data;
        cache.lastFetch[cacheKey] = Date.now();

        return data;
    } catch (error) {
        console.error("Error fetching daily analytics:", error);
        throw {
            success: false,
            message: error.message || "Failed to load daily analytics",
            error,
        };
    }
};

// ─── WEEKLY ANALYTICS ─────────────────────────────────────────────────────────
export const fetchWeeklyAnalytics = async () => {
    try {
        if (isCacheValid("analyticsWeekly") && cache.analyticsWeekly) {
            return cache.analyticsWeekly;
        }

        const data = await apiCall(`${API_BASE_URL}/progress/analytics/weekly`);

        cache.analyticsWeekly = data;
        cache.lastFetch.analyticsWeekly = Date.now();

        return data;
    } catch (error) {
        console.error("Error fetching weekly analytics:", error);
        throw {
            success: false,
            message: error.message || "Failed to load weekly analytics",
            error,
        };
    }
};

// ─── MONTHLY ANALYTICS ────────────────────────────────────────────────────────
/**
 * Fetch monthly analytics
 * Returns: {success, analytics: {totalTime, aiTutorQueries, streak, ...}}
 */
export const fetchMonthlyAnalytics = async (forceRefresh = false) => {
    try {
        if (!forceRefresh && isCacheValid("analyticsMonthly") && cache.analyticsMonthly) {
            return cache.analyticsMonthly;
        }

        const data = await apiCall(`${API_BASE_URL}/progress/analytics/monthly`);

        cache.analyticsMonthly = data;
        cache.lastFetch.analyticsMonthly = Date.now();

        return data;
    } catch (error) {
        console.error("Error fetching monthly analytics:", error);
        throw {
            success: false,
            message: error.message || "Failed to load monthly analytics",
            error,
        };
    }
};

// ─── SUBJECT PROGRESS ─────────────────────────────────────────────────────────
/**
 * Fetch progress for a specific subject
 */
export const fetchSubjectProgress = async (subjectId) => {
    try {
        const data = await apiCall(`${API_BASE_URL}/progress/subject/${subjectId}`);
        return data;
    } catch (error) {
        console.error("Error fetching subject progress:", error);
        throw {
            success: false,
            message: error.message || "Failed to load subject progress",
            error,
        };
    }
};

// ─── QUIZ RESULTS ─────────────────────────────────────────────────────────────
/**
 * Fetch class quiz results for teacher
 */
export const fetchQuizResults = async () => {
    try {
        const data = await apiCall(`${API_BASE_URL}/quiz/class-results`);
        return data;
    } catch (error) {
        console.error("Error fetching quiz results:", error);
        throw {
            success: false,
            message: error.message || "Failed to load quiz results",
            error,
        };
    }
};

// ─── VIOLATIONS ───────────────────────────────────────────────────────────────
/**
 * Fetch violation data for teacher
 */
export const fetchViolations = async () => {
    try {
        const data = await apiCall(`${API_BASE_URL}/teacher/violations`);
        return data;
    } catch (error) {
        console.error("Error fetching violations:", error);
        throw {
            success: false,
            message: error.message || "Failed to load violations",
            error,
        };
    }
};

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────
/**
 * Fetch user's uploaded documents
 */
export const fetchDocuments = async () => {
    try {
        const data = await apiCall(`${API_BASE_URL}/documents/list`);
        return data;
    } catch (error) {
        console.error("Error fetching documents:", error);
        throw {
            success: false,
            message: error.message || "Failed to load documents",
            error,
        };
    }
};

// ─── ACHIEVEMENTS ────────────────────────────────────────────────────────────
/**
 * Fetch user achievements
 */
export const fetchAchievements = async () => {
    try {
        const data = await apiCall(`${API_BASE_URL}/progress/achievements`);
        return data;
    } catch (error) {
        console.error("Error fetching achievements:", error);
        throw {
            success: false,
            message: error.message || "Failed to load achievements",
            error,
        };
    }
};

// ─── RECOMMENDATIONS ─────────────────────────────────────────────────────────
/**
 * Fetch personalized recommendations
 */
export const fetchRecommendations = async () => {
    try {
        const data = await apiCall(`${API_BASE_URL}/progress/recommendations`);
        return data;
    } catch (error) {
        console.error("Error fetching recommendations:", error);
        throw {
            success: false,
            message: error.message || "Failed to load recommendations",
            error,
        };
    }
};


/**
 * Fetch all required data for student dashboard in parallel
 * More efficient than individual calls
 * @param {string} date - Optional date in YYYY-MM-DD format for daily analytics
 */
export const fetchStudentDashboardBatch = async (date = null) => {
    try {
        const [progress, monthlyAnalytics, dailyAnalytics, documents] =
            await Promise.allSettled([
                fetchUserProgress(),
                fetchMonthlyAnalytics(),
                fetchDailyAnalytics(date),
                fetchDocuments(),
            ]);

        return {
            success: true,
            data: {
                progress: progress.status === "fulfilled" ? progress.value : null,
                monthlyAnalytics:
                    monthlyAnalytics.status === "fulfilled"
                        ? monthlyAnalytics.value
                        : null,
                dailyAnalytics:
                    dailyAnalytics.status === "fulfilled" ? dailyAnalytics.value : null,
                documents: documents.status === "fulfilled" ? documents.value : null,
            },
            errors: {
                progress: progress.status === "rejected" ? progress.reason : null,
                monthlyAnalytics:
                    monthlyAnalytics.status === "rejected" ? monthlyAnalytics.reason : null,
                dailyAnalytics:
                    dailyAnalytics.status === "rejected" ? dailyAnalytics.reason : null,
                documents: documents.status === "rejected" ? documents.reason : null,
            },
        };
    } catch (error) {
        console.error("Error in batch fetch:", error);
        throw {
            success: false,
            message: "Failed to load dashboard data",
            error,
        };
    }
};

// ─── BATCH FETCH: TEACHER DASHBOARD ───────────────────────────────────────────
/**
 * Fetch all required data for teacher dashboard in parallel
 */
export const fetchTeacherDashboardBatch = async () => {
    try {
        const [
            dashboard,
            pendingStudents,
            quizResults,
            violations,
        ] = await Promise.allSettled([
            fetchTeacherDashboard(),
            fetchPendingStudents(),
            fetchQuizResults(),
            fetchViolations(),
        ]);

        return {
            success: true,
            data: {
                dashboard: dashboard.status === "fulfilled" ? dashboard.value : null,
                pendingStudents:
                    pendingStudents.status === "fulfilled" ? pendingStudents.value : null,
                quizResults: quizResults.status === "fulfilled" ? quizResults.value : null,
                violations: violations.status === "fulfilled" ? violations.value : null,
            },
            errors: {
                dashboard: dashboard.status === "rejected" ? dashboard.reason : null,
                pendingStudents:
                    pendingStudents.status === "rejected" ? pendingStudents.reason : null,
                quizResults: quizResults.status === "rejected" ? quizResults.reason : null,
                violations: violations.status === "rejected" ? violations.reason : null,
            },
        };
    } catch (error) {
        console.error("Error in teacher batch fetch:", error);
        throw {
            success: false,
            message: "Failed to load dashboard data",
            error,
        };
    }
};

// ─── CACHE INVALIDATION ───────────────────────────────────────────────────────
/**
 * Clear specific cache or all cache
 */
export const invalidateCache = (key = null) => {
    if (key) {
        cache[key] = null;
        cache.lastFetch[key] = 0;
    } else {
        Object.keys(cache).forEach((k) => {
            if (k !== "lastFetch") cache[k] = null;
        });
        cache.lastFetch = {};
    }
};

const dashboardService = {
    fetchTeacherDashboard,
    fetchPendingStudents,
    approveStudent,
    rejectStudent,
    fetchUserProgress,
    fetchDailyAnalytics,
    fetchWeeklyAnalytics,
    fetchMonthlyAnalytics,
    fetchSubjectProgress,
    fetchQuizResults,
    fetchViolations,
    fetchDocuments,
    fetchAchievements,
    fetchRecommendations,
    fetchStudentDashboardBatch,
    fetchTeacherDashboardBatch,
    invalidateCache,
};

export default dashboardService;
