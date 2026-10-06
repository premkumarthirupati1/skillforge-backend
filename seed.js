const mongoose = require('mongoose');
const Course = require('./models/course');
const User = require('./models/user');
const Module = require('./models/module');
const Lesson = require('./models/lesson');
const bcrypt = require('bcrypt');

const MONGODB_URI = `mongodb+srv://premkumar:e5PxeZu0OVUW0QYQ@cluster0.plkx2k6.mongodb.net/skillforge?retryWrites=true&w=majority`;

const seedDatabase = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB.');

        // Find or create a mock instructor
        let instructor = await User.findOne({ email: 'instructor@seed.com' });
        if (!instructor) {
            instructor = await User.create({
                name: 'Jane Doe',
                email: 'instructor@seed.com',
                password: await bcrypt.hash('password', 12),
                role: 'instructor'
            });
            console.log('Created mock instructor.');
        }

        const courses = [
            {
                title: 'Fullstack Next.js 14 Masterclass',
                description: 'Build enterprise-grade applications with App Router, Server Actions, React Server Components, and Tailwind CSS.',
                price: 99.99,
                difficulty: 'advanced',
                tags: ['Next.js', 'React', 'Fullstack', 'Web Development'],
                instructorId: instructor._id,
                isPublished: true,
                thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
                publishedAt: new Date()
            },
            {
                title: 'UI/UX Design for Developers',
                description: 'Learn how to design beautiful, user-centric interfaces. Master typography, color theory, and layout constraints.',
                price: 49.99,
                difficulty: 'intermediate',
                tags: ['Design', 'UI/UX', 'Figma'],
                instructorId: instructor._id,
                isPublished: true,
                thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=800',
                publishedAt: new Date()
            },
            {
                title: 'The Python Deep Learning Guide',
                description: 'Dive deep into Neural Networks, PyTorch, and TensorFlow. Build practical AI models from scratch.',
                price: 79.99,
                difficulty: 'advanced',
                tags: ['Python', 'AI', 'Machine Learning'],
                instructorId: instructor._id,
                isPublished: true,
                thumbnail: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&q=80&w=800',
                publishedAt: new Date()
            },
            {
                title: 'System Design for Interviews',
                description: 'A comprehensive guide to cracking the system design round at FAANG companies. Covers microservices, databases, and scaling.',
                price: 59.99,
                difficulty: 'advanced',
                tags: ['System Design', 'Interview Prep', 'Architecture'],
                instructorId: instructor._id,
                isPublished: true,
                thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
                publishedAt: new Date()
            },
            {
                title: 'Introduction to Rust Programming',
                description: 'Learn memory safety without garbage collection. Master the Rust borrow checker and build blazingly fast CLI tools.',
                price: 29.99,
                difficulty: 'beginner',
                tags: ['Rust', 'Systems Programming'],
                instructorId: instructor._id,
                isPublished: true,
                thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&q=80&w=800',
                publishedAt: new Date()
            },
            {
                title: 'Advanced CSS Animation & Interactions',
                description: 'Create mind-blowing web experiences using pure CSS, GSAP, and Framer Motion.',
                price: 39.99,
                difficulty: 'intermediate',
                tags: ['CSS', 'Animation', 'Frontend'],
                instructorId: instructor._id,
                isPublished: true,
                thumbnail: 'https://images.unsplash.com/photo-1550439062-609e1531270e?auto=format&fit=crop&q=80&w=800',
                publishedAt: new Date()
            }
        ];

        for (const courseData of courses) {
            const exists = await Course.findOne({ title: courseData.title });
            if (!exists) {
                const course = await Course.create(courseData);
                console.log(`Created course: ${course.title}`);

                // Generate a mock module and lesson for testing the video player!
                const module = await Module.create({
                    title: 'Getting Started',
                    description: 'Introduction to the course material.',
                    order: 1,
                    courseId: course._id
                });

                await Lesson.create({
                    title: 'Welcome to the Course',
                    description: 'A high-level overview of everything we will cover.',
                    contentType: 'video',
                    content: 'uploads/sample-video.mp4', 
                    duration: 5,
                    order: 1,
                    moduleId: module._id,
                    isPublished: true
                });
            } else {
                console.log(`Course already exists: ${courseData.title}`);
            }
        }

        console.log('Database seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();
