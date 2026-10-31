/**
 * Official SkillForge Application Route & Page Registry
 * Derived directly from `skillforge-frontend/src/App.jsx`.
 */

const ROUTE_REGISTRY = {
    "home": {
        id: "home",
        path: "/",
        title: "Home",
        description: "Landing page with platform introduction, hero banner, and key engineering features.",
        parameters: [],
        requiresAuth: false,
        keywords: ["home", "landing", "main page", "start", "welcome"]
    },
    "courses": {
        id: "courses",
        path: "/courses",
        title: "Course Catalog & Showcase",
        description: "Browse all verified software engineering courses, curricula, tracks, and hands-on projects.",
        parameters: [],
        requiresAuth: false,
        keywords: ["courses", "explore courses", "catalog", "course showcase", "all courses", "browse courses", "classes", "curriculum"]
    },
    "tracks": {
        id: "tracks",
        path: "/tracks",
        title: "Engineering Tracks",
        description: "Specialized engineering learning paths (Systems, Frontend, Backend, DevOps, Distributed Systems).",
        parameters: [],
        requiresAuth: false,
        keywords: ["tracks", "learning tracks", "career paths", "specialization"]
    },
    "skills": {
        id: "skills",
        path: "/skills",
        title: "Skills Directory",
        description: "Browse and discover courses categorized by specific technical skills (Rust, Go, React, Docker).",
        parameters: [],
        requiresAuth: false,
        keywords: ["skills", "skill directory", "technologies", "languages", "tools"]
    },
    "projects": {
        id: "projects",
        path: "/projects",
        title: "Systems Project Gallery",
        description: "Real-world systems projects (Redis, Raft, Local RAG, Microservices) built in the interactive studio.",
        parameters: [],
        requiresAuth: false,
        keywords: ["projects", "project gallery", "build projects", "hands-on projects", "systems projects"]
    },
    "project_workspace": {
        id: "project_workspace",
        path: "/projects/:projectId/workspace",
        title: "Project Code Studio (Workspace)",
        description: "The full-screen interactive Monaco code editor, test runner terminal, milestone progress, and file tree.",
        parameters: ["projectId"],
        requiresAuth: true,
        keywords: ["workspace", "code studio", "ide", "editor", "build", "project workspace", "terminal", "code runner"]
    },
    "dashboard": {
        id: "dashboard",
        path: "/dashboard",
        title: "Learner Dashboard",
        description: "User dashboard displaying enrolled courses, project milestone progress, study stats, and certificates.",
        parameters: [],
        requiresAuth: true,
        keywords: ["dashboard", "my learning", "my courses", "progress", "overview", "stats", "activity"]
    },
    "profile": {
        id: "profile",
        path: "/profile",
        title: "User Profile Settings",
        description: "Account settings, bio, linked socials, security preferences, and user avatar.",
        parameters: [],
        requiresAuth: true,
        keywords: ["profile", "account", "my profile", "edit profile"]
    },
    "settings": {
        id: "settings",
        path: "/settings",
        title: "Developer Preferences & Workspace Settings",
        description: "Configure Monaco code studio editor preferences, Forge Copilot AI behavior, notifications, privacy, data export, and account deletion.",
        parameters: [],
        requiresAuth: true,
        keywords: ["settings", "preferences", "editor settings", "monaco settings", "copilot settings", "theme settings", "font size", "export data", "danger zone", "options"]
    },
    "public_profile": {
        id: "public_profile",
        path: "/profile/:identifier",
        title: "Public Developer Portfolio",
        description: "Public showcase of a developer's completed systems projects, milestone proofs, and skill badges.",
        parameters: ["identifier"],
        requiresAuth: false,
        keywords: ["public profile", "portfolio", "developer profile", "showcase"]
    },
    "course_details": {
        id: "course_details",
        path: "/course/:courseId",
        title: "Course Overview & Syllabus",
        description: "Detailed course landing page with syllabus, instructor details, student reviews, and enrollment button.",
        parameters: ["courseId"],
        requiresAuth: false,
        keywords: ["course details", "syllabus", "course info", "enroll"]
    },
    "course_view": {
        id: "course_view",
        path: "/course/:courseId/full",
        title: "Enrolled Course Viewer",
        description: "Full module breakdown, lesson playlist, and progress tracker for an enrolled student.",
        parameters: ["courseId"],
        requiresAuth: true,
        keywords: ["course view", "continue course", "enrolled course", "learning view"]
    },
    "lesson_view": {
        id: "lesson_view",
        path: "/lesson/:lessonId",
        title: "Lesson Viewer",
        description: "Interactive lesson reading environment with concept explanations, code sandboxes, and quizzes.",
        parameters: ["lessonId"],
        requiresAuth: true,
        keywords: ["lesson", "lesson viewer", "active lesson", "read lesson", "study"]
    },
    "module_view": {
        id: "module_view",
        path: "/module/:moduleId",
        title: "Module Lessons View",
        description: "List of lessons and topics inside a specific module.",
        parameters: ["moduleId"],
        requiresAuth: true,
        keywords: ["module", "module view", "lessons in module"]
    },
    "instructor_studio": {
        id: "instructor_studio",
        path: "/instructor",
        title: "Instructor Studio",
        description: "Authoring studio for course creators to publish courses, track enrollments, and manage revenue.",
        parameters: [],
        requiresAuth: true,
        keywords: ["instructor", "studio", "course creator", "instructor dashboard", "teach"]
    },
    "create_course": {
        id: "create_course",
        path: "/create-course",
        title: "Create New Course",
        description: "Form and wizard to author a new course with title, description, pricing, and curriculum tags.",
        parameters: [],
        requiresAuth: true,
        keywords: ["create course", "new course", "publish course", "author course"]
    },
    "course_editor": {
        id: "course_editor",
        path: "/course/:courseId/edit",
        title: "Course Editor",
        description: "Edit syllabus, update pricing, reorder modules, and publish course changes.",
        parameters: ["courseId"],
        requiresAuth: true,
        keywords: ["edit course", "course editor", "update course"]
    },
    "certificate": {
        id: "certificate",
        path: "/certificate/:courseId",
        title: "Certificate of Completion",
        description: "Official verified certificate of completion for passing all project milestones and course requirements.",
        parameters: ["courseId"],
        requiresAuth: true,
        keywords: ["certificate", "credential", "proof of completion", "diploma"]
    },
    "login": {
        id: "login",
        path: "/login",
        title: "Login",
        description: "Sign in to access your SkillForge account, enrolled courses, and saved projects.",
        parameters: [],
        requiresAuth: false,
        keywords: ["login", "sign in", "log in", "auth"]
    },
    "signup": {
        id: "signup",
        path: "/signup",
        title: "Sign Up",
        description: "Create a free SkillForge developer account.",
        parameters: [],
        requiresAuth: false,
        keywords: ["signup", "sign up", "register", "join"]
    },
    "challenges": {
        id: "challenges",
        path: "/challenges",
        title: "Coding Challenges",
        description: "Algorithmic and systems engineering mini-challenges.",
        parameters: [],
        requiresAuth: false,
        keywords: ["challenges", "coding challenges", "practice", "algorithms"]
    },
    "community": {
        id: "community",
        path: "/community",
        title: "Community Hub",
        description: "Community forum and discussions with fellow engineers.",
        parameters: [],
        requiresAuth: false,
        keywords: ["community", "forum", "discussions", "chat"]
    }
};

/**
 * Validates a target route against the official registry.
 */
function validateTarget(targetId, params = {}) {
    if (!targetId || typeof targetId !== "string") {
        return {
            valid: false,
            error: "No target route ID provided."
        };
    }

    const route = ROUTE_REGISTRY[targetId];
    if (!route) {
        return {
            valid: false,
            error: `Target route "${targetId}" does not exist in the application registry.`
        };
    }

    // Check required parameters
    let computedPath = route.path;
    const missingParams = [];

    for (const param of route.parameters) {
        const val = params[param];
        if (!val) {
            missingParams.push(param);
        } else {
            computedPath = computedPath.replace(`:${param}`, encodeURIComponent(val));
        }
    }

    if (missingParams.length > 0) {
        return {
            valid: false,
            route,
            missingParams,
            error: `Route "${targetId}" requires parameter(s): ${missingParams.join(', ')}.`
        };
    }

    return {
        valid: true,
        route,
        path: computedPath
    };
}

/**
 * Searches the registry for keywords
 */
function searchRoutes(query = "") {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return Object.values(ROUTE_REGISTRY).filter(r => {
        return r.title.toLowerCase().includes(q) ||
               r.description.toLowerCase().includes(q) ||
               r.keywords.some(k => q.includes(k) || k.includes(q));
    });
}

module.exports = {
    ROUTE_REGISTRY,
    validateTarget,
    searchRoutes
};
