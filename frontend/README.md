# 🐱 Kitty & Star — Web StudyPartner (Next.js)

> A modern, deployable Next.js web application for **Kitty & Star (StudyPartner)**, engineered for seamless desktop & web access whenever your mobile phone is unavailable, charging, or in distraction lock.

---

## 🚀 One-Click Deploy to Vercel

You can push the `frontend` folder to a new GitHub repository and deploy directly to Vercel.

### Step 1: Create a New GitHub Repository
```bash
cd frontend
git init
git add .
git commit -m "feat: initial commit of Kitty & Star web frontend"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<NEW_REPO_NAME>.git
git push -u origin main
```

### Step 2: Import into Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Select your newly created repository.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://rqkgavwtdtunsctjclpm.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `sb_publishable_o4DJ-nSwhjMZAd-pNJJiGw_hMHuLsJn`
4. Click **Deploy**. Vercel will build and assign you a live production URL!

---

## 💻 Running Locally

```bash
# 1. Enter the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev

# 4. Open http://localhost:3000 in your browser
```

To build for production locally:
```bash
npm run build
npm start
```

---

## 🌟 Core Features & Modules Preserved

### 1. 🍅 Pomodoro Focus & Distraction Engine (`/pomodoro`)
- **Focus & Break Modes**: Configurable 25m Focus, 50m Deep Work, 5m Short Break, 15m Long Break, or custom durations.
- **Task Linking**: Directly link active study tasks from today's plan to track specific time spent.
- **Web Audio Chimes**: Synthesized dual-tone and arpeggio crystal bells via Web Audio API (zero external assets to 404).
- **Web Push Notifications**: Browser alert notifications triggered when timers expire.
- **Screen Wake Lock API**: Keeps laptop/desktop display awake during deep focus blocks.
- **Auto-Log to Database**: Completed sessions call the backend `complete_pomodoro` RPC.
- **Fullscreen Immersion**: Distraction-free focus mode with circular timer and pulse animations.

### 2. 📋 Dual-User Peer Accountability (`/accountability`)
- **Today's Tasks Checklist**: Mark tasks complete, start Pomodoro directly on a task, add new tasks with estimated minute blocks.
- **Tomorrow's Prior Planning**: Plan tomorrow's study agenda the night before.
- **Partner's Live Progress**: Real-time read-only sync of your study partner's tasks and Pomodoros.
- **Photo Evidence Submission (`/accountability/submit`)**: Upload photo proof of handwritten notes, workbooks, or screens with reflection notes.
- **Mutual Review Workflow (`/accountability/review`)**: Inspect partner's uploaded photographic evidence with high-res zoom modal, leave feedback comments, and approve or reject (enforcing the 11:00 AM deadline).
- **Historical Reports (`/accountability/reports`)**: Complete archive of daily approved reports and accuracy percentages.

### 3. 🐱 Interactive Companion Mascot (`/home`)
- **Dynamic Scenario Carousel**: High-resolution study cat photos matching time-of-day and study actions.
- **Typewriter Text**: Animated thoughts, advice, and motivational affirmations.
- **Emotion Engine**: Real-time mood badges (`focused`, `happy`, `strict`, `proud`, `sleepy`).

### 4. 🧭 Duolingo-Style XP Journey (`/journey`)
- **Milestone Roadmap**: Continuous lifetime XP checkpoints (100, 300, 600, 1000, 1500, 2500 XP).
- **Surprise Partner Challenges**: Attach real-life rewards (e.g., "Treat for Coffee", "Movie Night") to XP milestones.
- **Reward Reveal Modal**: Interactive claim celebration with confetti.

### 5. ⚡ Spaced Repetition (SM-2) Flashcards (`/flashcards`)
- **SuperMemo SM-2 Algorithmic Engine**: Flip-card interactive study mode calculating optimal intervals from user ratings (Again, Hard, Good, Easy).
- **Custom Card Creator**: Easily create and organize new flashcards.

### 6. 📝 English Learning & AI Writing Evaluator (`/english`)
- **Daily Vocabulary**: 3 curated daily words with definitions, phonetic parts of speech, synonyms, and contextual usage examples.
- **Interactive Grammar Quizzes**: Immediate scoring with detailed explanations.
- **Gemini AI Writing Evaluator**: Submit paragraphs incorporating target words to receive rubrics, grammar corrections, and rewrite suggestions.

### 7. 📖 PYQ Mock Exam Platform (`/pyq`)
- **Timed Exam Simulator**: Previous Year Question simulation with 15-minute countdown blocks.
- **Question Navigator**: Real-time question tracking, scoring, and explanations.

### 8. 💧 Hydration Tracker (`/water`)
- **Daily 2500ml Fluid Target**: Circular progress ring with quick-log buttons (+250ml, +500ml, +750ml).
- **Intake Log History**: Tracks daily timestamps and amounts.

### 9. 🎲 Urge Control & Dopamine Detox (`/urge-control`)
- **Procrastination Interruption**: 3D-styled animated dice roll.
- **Randomized Micro-Actions**: 2-to-15 minute reset exercises (breathing, stretching, posture correction).
- **Embedded Countdown Timer**: Chimes when the impulse redirection block completes.
- **Cognitive Reframing**: Curated psychology quotes.

### 10. 📊 Analytics, Badges & Profile
- **Statistics (`/statistics`)**: Total focus hours, Pomodoro blocks, streak records, with partner toggle and time filters.
- **Achievements (`/achievements`)**: Badge gallery (Early Bird, Focus Master, Streak Warrior, Century Club) with unlock filters.
- **Notifications Center (`/notifications`)**: Real-time notification updates with category filters.
- **Profile & Pairing (`/profile`)**: Manage your account, share your partner invite token, or reset data in development.

---

## 🎨 Theme & Styling Architecture
- **Base Background**: Cherry Bloom (`#F63E5F`)
- **Pattern**: Translucent pale pink notebook grid (`#FFE4EB`)
- **Card Surfaces**: Glassmorphic frosted cards (`bg-white/95 backdrop-blur-md border-[#FAD7E0]`)
- **Typography**: Fraunces, General Sans, Shantell Sans, Martian Mono
