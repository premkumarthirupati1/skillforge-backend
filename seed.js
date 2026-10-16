const mongoose = require('mongoose');
const Course = require('./models/course');
const User = require('./models/user');
const Module = require('./models/module');
const Lesson = require('./models/lesson');
const Review = require('./models/review');
const Enrollment = require('./models/Enrollment');
const bcrypt = require('bcrypt');
const { invalidateCache } = require('./utils/cacheHelper');

const MONGODB_URI = `mongodb+srv://premkumar:e5PxeZu0OVUW0QYQ@cluster0.plkx2k6.mongodb.net/skillforge?retryWrites=true&w=majority`;

const seedDatabase = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log(' Connected to MongoDB for Course Production Seeding.');

        // 1. Create or retrieve lead instructor account
        let instructor = await User.findOne({ email: 'instructor@skillforge.io' });
        if (!instructor) {
            instructor = await User.create({
                name: 'Alex Vance',
                username: 'alexvance',
                email: 'instructor@skillforge.io',
                password: await bcrypt.hash('Password@123', 12),
                role: 'instructor',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
                bio: 'Principal Distributed Systems Architect & Full-Stack Tech Lead. Passionate about empowering the next generation of engineers.'
            });
            console.log('✓ Created Lead Instructor: Alex Vance (@alexvance)');
        }

        // 2. Create student accounts for authentic reviews
        const reviewers = [
            { name: 'Marcus Chen', username: 'marcusc', email: 'marcus@review.dev', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' },
            { name: 'Elena Rostova', username: 'elenar', email: 'elena@review.dev', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200' },
            { name: 'Devon Wright', username: 'devonw', email: 'devon@review.dev', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' }
        ];

        const seededUsers = [];
        for (const rev of reviewers) {
            let u = await User.findOne({ email: rev.email });
            if (!u) {
                u = await User.create({
                    ...rev,
                    password: await bcrypt.hash('Password@123', 12),
                    role: 'student'
                });
            }
            seededUsers.push(u);
        }

        // 3. Clear existing courses, modules, lessons, and reviews to guarantee fresh, pristine curriculum
        console.log(' Cleaning legacy course records...');
        await Course.deleteMany({});
        await Module.deleteMany({});
        await Lesson.deleteMany({});
        await Review.deleteMany({});

        // 4. Production Flagship Courses Data
        const productionCourses = [
            {
                title: 'Fullstack Next.js 14 & React Server Components',
                description: 'Master the modern React paradigm from grounds up. Build enterprise-grade fullstack web applications with Next.js 14 App Router, Server Actions, streaming SSR with Suspense, Tailwind CSS, and edge caching.',
                price: 0, // FREE
                difficulty: 'intermediate',
                tags: ['Next.js', 'React', 'Fullstack', 'TypeScript', 'Web Development'],
                instructorId: instructor._id,
                isPublished: true,
                thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
                publishedAt: new Date(),
                modules: [
                    {
                        title: 'Architecture & App Router Setup',
                        description: 'Foundations of Next.js 14, client vs server component boundaries, and streaming layouts.',
                        order: 1,
                        lessons: [
                            {
                                title: 'Next.js 14 Paradigm Shift: Client vs Server Components',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                                duration: 10,
                                order: 1
                            },
                            {
                                title: 'Deep-Dive: Nested Layouts, Parallel Routes & Intercepting Routes',
                                contentType: 'text',
                                content: `# Next.js 14 Layouts & Parallel Routing

In Next.js 14 App Router, layouts are preserved across route transitions and do not re-render.

### 1. Key Principles:
- **Server Components by Default**: All components inside the \`app\` directory are React Server Components unless prefixed with \`'use client'\`.
- **Parallel Routes**: Defined with named slots \`@modal\`, \`@analytics\`. They allow you to conditionally render one or more pages in the same layout simultaneously.
- **Intercepting Routes**: Defined with \`(..)\` or \`(...)\`. Intercept a route from within the current layout while displaying a preview or modal.

\`\`\`tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <main className="col-span-2">{children}</main>
      <aside className="col-span-1">{analytics}</aside>
    </div>
  );
}
\`\`\`

Always keep data-fetching on the server to minimize bundle payloads.`,
                                duration: 8,
                                order: 2
                            },
                            {
                                title: 'Streaming SSR with Suspense & Loading Skeletons',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                                duration: 14,
                                order: 3
                            }
                        ]
                    },
                    {
                        title: 'Server Actions & Mutations',
                        description: 'Perform server mutations without writing dedicated API boilerplate.',
                        order: 2,
                        lessons: [
                            {
                                title: 'Zero-API Mutations with Next.js Server Actions & Zod Validation',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                                duration: 12,
                                order: 1
                            },
                            {
                                title: 'Optimistic UI Updates with useOptimistic Hook',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                                duration: 9,
                                order: 2
                            }
                        ]
                    },
                    {
                        title: 'Authentication & Production Deployment',
                        description: 'Secure sessions, HTTP-only cookies, and zero-downtime deployment.',
                        order: 3,
                        lessons: [
                            {
                                title: 'Session Management & Dual-Token Architecture',
                                contentType: 'text',
                                content: `# Secure Authentication Architecture

In a modern web app, dual-token JWT storage ensures seamless UX while preventing Cross-Site Scripting (XSS) leaks:

1. **Short-Lived Access Token (15m)**: Stored in memory or Secure, SameSite=Strict HTTP-only cookie.
2. **Long-Lived Refresh Token (7d)**: Stored exclusively in an HTTP-only, encrypted cookie with path restricted to \`/auth/refresh\`.
3. **Silent Token Refresh**: Axios interceptors intercept 401 responses, call refresh endpoint, and replay original requests seamlessly.`,
                                duration: 15,
                                order: 1
                            },
                            {
                                title: 'Production Optimization & Vercel Edge Deployment',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                                duration: 11,
                                order: 2
                            }
                        ]
                    }
                ],
                reviews: [
                    { reviewerName: 'Marcus Chen', rating: 5, comment: 'The best Next.js App Router explanation on the internet. Cleared up all my confusion around Server Components.' },
                    { reviewerName: 'Elena Rostova', rating: 5, comment: 'Hands-on, clean, and production-ready. Loved the deep dive into Server Actions and optimistic updates!' }
                ]
            },
            {
                title: 'Distributed Systems & System Design at Hyperscale',
                description: 'Crack high-stakes system design interviews and architect resilient backends handling millions of requests per second. Master microservices, consensus protocols, message brokers, multi-tier caching, and CAP theorem trade-offs.',
                price: 799, // PAID
                difficulty: 'advanced',
                tags: ['System Design', 'Distributed Systems', 'Architecture', 'Microservices', 'Redis', 'Kafka'],
                instructorId: instructor._id,
                isPublished: true,
                thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
                publishedAt: new Date(),
                modules: [
                    {
                        title: 'Foundations of Distributed Computing',
                        description: 'Core tenets of scalability, partitioning, and the CAP theorem.',
                        order: 1,
                        lessons: [
                            {
                                title: 'Scalability Patterns: Horizontal vs Vertical & The CAP Theorem',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
                                duration: 15,
                                order: 1
                            },
                            {
                                title: 'Consistent Hashing & Dynamic Partitioning Ring',
                                contentType: 'text',
                                content: `# Consistent Hashing Architecture

Consistent hashing solves the problem of rehashing all keys when adding or removing database nodes.

### The Problem with Modulo Hashing
Using \`hash(key) % N\` causes nearly **100% of keys** to be remapped whenever a node is added or removed, causing massive cache stampedes.

### The Solution: Consistent Hashing Ring
- The hash space is mapped to a circular ring from $0$ to $2^{32} - 1$.
- Nodes are hashed onto positions on this ring.
- Keys are assigned to the **first node clockwise** from their hash position.
- Adding or removing a node only moves keys from its immediate neighbor ($k/N$ keys moved on average).

### Virtual Nodes (V-Nodes)
To prevent hot spots and uneven load distribution, each physical node is replicated as multiple virtual nodes (e.g. 100-256 tokens) across the ring.`,
                                duration: 12,
                                order: 2
                            }
                        ]
                    },
                    {
                        title: 'High-Throughput Messaging & Event Streams',
                        description: 'Event-driven architectures using Kafka, RabbitMQ, and transactional outbox.',
                        order: 2,
                        lessons: [
                            {
                                title: 'Kafka vs RabbitMQ: Event Streaming vs Message Queues',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
                                duration: 18,
                                order: 1
                            },
                            {
                                title: 'Idempotent Processing & Outbox Pattern for Distributed Transactions',
                                contentType: 'text',
                                content: `# Transactional Outbox Pattern

When updating a database and publishing an event, network failures can cause partial success (dual-write problem).

### The Solution:
1. Insert the domain entity AND the outbound event into an **Outbox table** within the **same local database transaction**.
2. A separate background worker or Debezium Change Data Capture (CDC) process polls the Outbox table and publishes events to Apache Kafka.
3. Once acknowledged by Kafka, the outbox record is marked published.
4. Consumers use idempotency keys to ensure at-least-once delivery does not cause duplicate processing.`,
                                duration: 10,
                                order: 2
                            }
                        ]
                    },
                    {
                        title: 'Caching Strategies & Fault Tolerance',
                        description: 'Cache invalidation, circuit breakers, and bulkhead resilience.',
                        order: 3,
                        lessons: [
                            {
                                title: 'Multi-Tier Caching with Redis & Invalidation Strategies',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
                                duration: 14,
                                order: 1
                            },
                            {
                                title: 'Circuit Breakers, Bulkheads & Graceful Degradation',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                                duration: 12,
                                order: 2
                            }
                        ]
                    }
                ],
                reviews: [
                    { reviewerName: 'Devon Wright', rating: 5, comment: 'Helped me pass my Staff Software Engineer System Design interview at a FAANG company. Worth 100x the price.' }
                ]
            },
            {
                title: 'Mastering Node.js, Microservices & Event-Driven Architecture',
                description: 'Unlock the full power of Node.js. Dive deep into libuv internals, event loop phases, worker threads, clustering, BullMQ background queues, rate limiting, and containerization.',
                price: 499, // PAID
                difficulty: 'intermediate',
                tags: ['Node.js', 'Backend', 'Express', 'Microservices', 'Docker', 'Redis'],
                instructorId: instructor._id,
                isPublished: true,
                thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&q=80&w=800',
                publishedAt: new Date(),
                modules: [
                    {
                        title: 'V8 Runtime & Libuv Deep Dive',
                        description: 'Understand exactly how asynchronous non-blocking I/O executes under the hood.',
                        order: 1,
                        lessons: [
                            {
                                title: 'The 6 Event Loop Phases Explained with Real Traces',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                                duration: 16,
                                order: 1
                            },
                            {
                                title: 'Streams, Buffers & Memory Management in Node.js',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                                duration: 14,
                                order: 2
                            }
                        ]
                    },
                    {
                        title: 'Background Jobs & Distributed Workers',
                        description: 'Offload heavy compute tasks with Redis and BullMQ.',
                        order: 2,
                        lessons: [
                            {
                                title: 'Architecting Distributed Background Workers with BullMQ & Redis',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                                duration: 15,
                                order: 1
                            },
                            {
                                title: 'Graceful Shutdowns & Process Signal Handling in Production',
                                contentType: 'text',
                                content: `# Production Graceful Shutdown Pattern

When deploying containers in Kubernetes, a \`SIGTERM\` is sent before \`SIGKILL\`.

\`\`\`javascript
const server = app.listen(PORT);

const gracefulShutdown = async (signal) => {
    console.log(\`Received \${signal}. Closing HTTP server gracefully...\`);
    server.close(async () => {
        console.log('HTTP connections closed. Draining database pools...');
        await mongoose.connection.close();
        await redisClient.quit();
        process.exit(0);
    });

    // Force terminate after 10s timeout
    setTimeout(() => {
        console.error('Forced shutdown due to timeout.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
\`\`\``,
                                duration: 8,
                                order: 2
                            }
                        ]
                    },
                    {
                        title: 'Production Security & Rate Limiting',
                        description: 'Harden Express servers against brute force, DDoS, and slowloris attacks.',
                        order: 3,
                        lessons: [
                            {
                                title: 'Sliding-Window Rate Limiting & DoS Protection',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                                duration: 11,
                                order: 1
                            }
                        ]
                    }
                ],
                reviews: [
                    { reviewerName: 'Marcus Chen', rating: 5, comment: 'Detailed coverage of libuv and streams that you won’t find in any casual tutorial.' }
                ]
            },
            {
                title: 'Applied Generative AI & Deep Learning with PyTorch',
                description: 'Build, train, and deploy modern artificial intelligence architectures. Master neural networks, transformer attention mechanisms, fine-tuning LLMs with LoRA, and production RAG vector pipelines.',
                price: 999, // PAID
                difficulty: 'advanced',
                tags: ['AI', 'Machine Learning', 'Python', 'PyTorch', 'Deep Learning', 'LLMs'],
                instructorId: instructor._id,
                isPublished: true,
                thumbnail: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&q=80&w=800',
                publishedAt: new Date(),
                modules: [
                    {
                        title: 'PyTorch Foundations & Neural Networks',
                        description: 'Tensors, computational graphs, and training backpropagation loops.',
                        order: 1,
                        lessons: [
                            {
                                title: 'Tensors, Computation Graphs & Automatic Differentiation',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
                                duration: 18,
                                order: 1
                            },
                            {
                                title: 'Building and Training Your First Deep Neural Net from Scratch',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
                                duration: 22,
                                order: 2
                            }
                        ]
                    },
                    {
                        title: 'Transformers & LLM Fine-Tuning',
                        description: 'Self-attention, positional embeddings, and Low-Rank Adaptation (LoRA).',
                        order: 2,
                        lessons: [
                            {
                                title: 'Dissecting Scaled Dot-Product Attention & Multi-Head Self-Attention',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
                                duration: 25,
                                order: 1
                            },
                            {
                                title: 'Parameter Efficient Fine-Tuning (PEFT) & LoRA Weights',
                                contentType: 'text',
                                content: `# LoRA: Low-Rank Adaptation of Large Language Models

Full fine-tuning of 7B+ parameter models requires massive VRAM. LoRA freezes pre-trained model weights and injects trainable rank decomposition matrices:

$$W_{new} = W_0 + \Delta W = W_0 + B \cdot A$$

Where $W_0 \in \mathbb{R}^{d \times k}$, $B \in \mathbb{R}^{d \times r}$, and $A \in \mathbb{R}^{r \times k}$ with rank $r \ll \min(d, k)$.

### Benefits:
- Reduces trainable parameters by **over 99%**.
- Reduces optimizer state memory drastically.
- Zero inference latency overhead when weights are merged back!`,
                                duration: 15,
                                order: 2
                            }
                        ]
                    },
                    {
                        title: 'Production RAG Systems',
                        description: 'Vector databases, embeddings, and context retrieval.',
                        order: 3,
                        lessons: [
                            {
                                title: 'Building an Enterprise RAG Pipeline with Vector Databases',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                                duration: 20,
                                order: 1
                            }
                        ]
                    }
                ],
                reviews: [
                    { reviewerName: 'Elena Rostova', rating: 5, comment: 'The mathematical clarity behind attention and LoRA is outstanding.' }
                ]
            },
            {
                title: 'Modern Cybersecurity & Ethical Hacking Masterclass',
                description: 'Become an ethical hacker and defensive security engineer. Master threat modeling, network reconnaissance, web penetration testing (OWASP Top 10), cryptographic protocols, and secure coding practices.',
                price: 0, // FREE
                difficulty: 'beginner',
                tags: ['Cybersecurity', 'Ethical Hacking', 'Security', 'OWASP', 'Web Security'],
                instructorId: instructor._id,
                isPublished: true,
                thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
                publishedAt: new Date(),
                modules: [
                    {
                        title: 'Reconnaissance & Network Security',
                        description: 'Scanning, port mapping, and traffic packet inspection.',
                        order: 1,
                        lessons: [
                            {
                                title: 'Passive & Active Network Reconnaissance with Nmap and Wireshark',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                                duration: 17,
                                order: 1
                            },
                            {
                                title: 'OSI Layer Vulnerabilities & Port Scanning Defenses',
                                contentType: 'text',
                                content: `# Network Defense Principles

Defending against automated port scanners and unauthorized intrusion:

1. **Firewall Ingress Rules**: Close all unused ports. Use Bastion hosts or VPNs (WireGuard) for private infrastructure access.
2. **Fail2ban & Rate Limiting**: Block IPs exceeding failed TCP SYN attempts.
3. **Encrypted Transport**: Mandate TLS 1.3 with forward secrecy for all external endpoints.`,
                                duration: 10,
                                order: 2
                            }
                        ]
                    },
                    {
                        title: 'Web Application Pentesting (OWASP Top 10)',
                        description: 'Exploiting and securing the most common web vulnerabilities.',
                        order: 2,
                        lessons: [
                            {
                                title: 'SQL Injection & Remote Code Execution Exploitation and Mitigation',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                                duration: 20,
                                order: 1
                            },
                            {
                                title: 'Cross-Site Scripting (XSS), CSRF & CSP Policy Enforcement',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                                duration: 16,
                                order: 2
                            }
                        ]
                    },
                    {
                        title: 'Authentication & Cryptographic Defense',
                        description: 'Hardening modern web tokens and identity federation.',
                        order: 3,
                        lessons: [
                            {
                                title: 'Cracking and Hardening Token-Based Auth (JWT Security)',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                                duration: 14,
                                order: 1
                            }
                        ]
                    }
                ],
                reviews: [
                    { reviewerName: 'Devon Wright', rating: 5, comment: 'Essential knowledge for every backend and full-stack engineer.' }
                ]
            },
            {
                title: 'Cloud Native Kubernetes & CI/CD DevOps',
                description: 'Automate your infrastructure like the top engineering teams. Learn Docker containerization, Kubernetes cluster orchestration, Helm charts, Terraform Infrastructure as Code, and production GitOps pipelines.',
                price: 599, // PAID
                difficulty: 'intermediate',
                tags: ['Kubernetes', 'Docker', 'DevOps', 'CI/CD', 'Cloud', 'Terraform'],
                instructorId: instructor._id,
                isPublished: true,
                thumbnail: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&q=80&w=800',
                publishedAt: new Date(),
                modules: [
                    {
                        title: 'Container Orchestration Foundations',
                        description: 'Building lean Docker containers and understanding Kubernetes control planes.',
                        order: 1,
                        lessons: [
                            {
                                title: 'Production Multi-Stage Docker Builds & Image Optimization',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
                                duration: 14,
                                order: 1
                            },
                            {
                                title: 'Kubernetes Architecture: Control Plane, Nodes, Pods & Kubelet',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
                                duration: 19,
                                order: 2
                            }
                        ]
                    },
                    {
                        title: 'Workloads, Services & Ingress Networking',
                        description: 'Rolling updates, health probes, and reverse proxy ingress.',
                        order: 2,
                        lessons: [
                            {
                                title: 'Deployments, ReplicaSets, Rolling Updates & Health Probes',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
                                duration: 16,
                                order: 1
                            },
                            {
                                title: 'Ingress Controllers, TLS Termination & Service Mesh',
                                contentType: 'text',
                                content: `# Kubernetes Ingress & TLS

An Ingress exposes HTTP and HTTPS routes from outside the cluster to services within the cluster:

\`\`\`yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: skillforge-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.skillforge.io
    secretName: skillforge-tls
  rules:
  - host: api.skillforge.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: skillforge-backend
            port:
              number: 3000
\`\`\``,
                                duration: 11,
                                order: 2
                            }
                        ]
                    },
                    {
                        title: 'GitOps & Automated CI/CD',
                        description: 'Automate zero-downtime releases with GitHub Actions and ArgoCD.',
                        order: 3,
                        lessons: [
                            {
                                title: 'Building GitHub Actions CI/CD Pipelines to Deploy to Kubernetes',
                                contentType: 'video',
                                content: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                                duration: 18,
                                order: 1
                            }
                        ]
                    }
                ],
                reviews: [
                    { reviewerName: 'Marcus Chen', rating: 5, comment: 'Hands down the most practical Kubernetes walkthrough I’ve taken.' }
                ]
            }
        ];

        // 5. Insert courses, modules, lessons, and reviews
        for (const cData of productionCourses) {
            const { modules, reviews: courseReviews, ...courseFields } = cData;
            const course = await Course.create(courseFields);
            console.log(` Created Course: "${course.title}" (Price: ₹${course.price})`);

            // Add course to instructor's courses list
            instructor.courses.push({ courseId: course._id });

            let totalRating = 0;
            if (courseReviews && courseReviews.length > 0) {
                for (let i = 0; i < courseReviews.length; i++) {
                    const r = courseReviews[i];
                    const user = seededUsers[i % seededUsers.length];
                    await Review.create({
                        course: course._id,
                        user: user._id,
                        reviewerName: r.reviewerName,
                        rating: r.rating,
                        comment: r.comment
                    });
                    totalRating += r.rating;
                }
                course.averageRating = totalRating / courseReviews.length;
                course.reviewCount = courseReviews.length;
                await course.save();
            }

            // Create modules & lessons
            for (const mData of modules) {
                const { lessons: mLessons, ...moduleFields } = mData;
                const module = await Module.create({
                    ...moduleFields,
                    courseId: course._id
                });

                for (const lData of mLessons) {
                    await Lesson.create({
                        ...lData,
                        moduleId: module._id,
                        isDeleted: false
                    });
                }
            }
        }

        await instructor.save();

        // 6. Invalidate all Redis caches
        try {
            await invalidateCache('all_courses_list');
            console.log('✓ Cleared Redis course cache.');
        } catch (e) {
            console.warn('Redis cache clear skipped (offline or not configured).');
        }

        console.log('\n Successfully seeded 6 flagship production courses with full modules, playable videos, lecture notes, and verified reviews!');
        process.exit(0);
    } catch (err) {
        console.error(' Error seeding database:', err);
        process.exit(1);
    }
};

seedDatabase();
