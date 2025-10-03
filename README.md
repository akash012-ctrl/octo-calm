# Octo-Calm 🐙

**AI-Powered Mental Health Support Platform**

A compassionate, privacy-first mental health companion that provides 24/7 emotional support, evidence-based coping strategies, and mood tracking.

---

## 🎯 Features

- ✅ **Email/Password Authentication** - Secure account creation and login
- 🧠 **AI Chat Support** - Empathetic conversations powered by GPT-4
- 📊 **Mood Tracking** - Log and visualize your emotional patterns
- 🌬️ **Coping Interventions** - Breathing exercises, meditation, journaling, and more
- 🔐 **Privacy-First** - User-controlled data, encrypted storage
- 🆘 **Crisis Detection** - Automatic resource provision for users in distress
- 👥 **Peer Support** - Moderated community for sharing experiences (optional anonymity)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Appwrite Cloud account (free)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/akash012-ctrl/octo-calm.git
   cd octo-calm
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Appwrite** (takes ~10 minutes)

   Follow the detailed guide in **[SETUP.md](./SETUP.md)**

   Quick summary:

   - Create Appwrite Cloud project
   - Create API key
   - Add credentials to `.env.local`
   - Run setup script: `node scripts/setup-appwrite.mjs`

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup instructions
- **[.github/AGENT.md](./.github/AGENT.md)** - Architecture & AI context
- **[docs/DEVELOPMENT_PROGRESS.md](./docs/DEVELOPMENT_PROGRESS.md)** - Development roadmap (200+ tasks)
- **[docs/APPWRITE_SETUP_SUMMARY.md](./docs/APPWRITE_SETUP_SUMMARY.md)** - What's been built

---

## 🏗️ Tech Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with Server Components
- **TypeScript** - Type-safe code
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - Accessible component library

### Backend & Database

- **Appwrite Cloud** - Backend-as-a-Service
  - Authentication (Email/Password)
  - Database (9 collections)
  - Storage
  - Realtime subscriptions

### AI & ML

- **OpenAI GPT-4** - Conversational AI
- **Custom Prompts** - Mental health-specific
- **Crisis Detection** - Multi-layer safety system

### State & Validation

- **Zustand** - State management
- **Zod** - Runtime validation
- **React Hook Form** - Form management

---

## 🗄️ Database Schema

9 Collections created automatically:

1. **users** - User profiles
2. **user_preferences** - Settings & preferences
3. **mood_checkins** - Mood tracking entries
4. **intervention_sessions** - Coping strategy sessions
5. **journal_entries** - User journaling
6. **learned_patterns** - AI-discovered patterns
7. **safety_logs** - Crisis detection logs
8. **peer_posts** - Community posts
9. **peer_responses** - Community responses

---

## 🔐 Security & Privacy

- ✅ **Email/Password Authentication Only** - No OAuth complexity
- ✅ **Strong Password Requirements** - 8+ chars, uppercase, lowercase, number
- ✅ **User-Level Permissions** - Users can only access their own data
- ✅ **Server/Client Separation** - API keys never exposed to browser
- ✅ **Encrypted Data** - All data encrypted at rest and in transit
- ✅ **No Data Selling** - Ever. Your data is yours.
- ✅ **User-Controlled Retention** - Configure how long data is kept

---

## 🧪 Testing

After setup, test authentication:

1. Go to `/signup`
2. Create an account (must use strong password)
3. Verify redirect to `/dashboard`
4. Test logout → login flow

---

## 📖 Project Structure

```
octo-calm/
├── .github/
│   └── AGENT.md              # AI context & architecture
├── docs/                     # Documentation
├── scripts/
│   └── setup-appwrite.mjs    # Automated DB setup
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/          # Auth pages
│   │   ├── api/             # API routes
│   │   └── dashboard/       # Main app
│   ├── components/
│   │   ├── ui/              # shadcn components
│   │   └── features/        # Feature components
│   ├── lib/
│   │   ├── appwrite/        # Appwrite SDKs
│   │   ├── context/         # React contexts
│   │   └── validation/      # Zod schemas
│   └── types/               # TypeScript types
├── .env.local               # Environment variables (not committed)
├── SETUP.md                 # Setup instructions
└── README.md                # This file
```

---

## 🎯 Development Status

**Phase 1: Foundation** - ✅ 95% Complete

- ✅ Project setup
- ✅ Authentication system
- ✅ UI component library
- ✅ Type system
- ⏳ Appwrite setup (needs user credentials)

**Phase 2: Core Features** - 📋 Planned

- Mood tracking UI
- AI chat interface
- Intervention exercises
- Crisis detection
- Peer support forum

See [DEVELOPMENT_PROGRESS.md](./docs/DEVELOPMENT_PROGRESS.md) for complete roadmap.

---

## 🤝 Contributing

This is a mental health application - contributions welcome with care!

1. Follow the architecture in `.github/AGENT.md`
2. Maintain security best practices
3. Test thoroughly
4. Update documentation

---

## ⚠️ Disclaimer

**Octo-Calm is NOT a replacement for professional mental health care.**

- This is a support tool, not medical advice
- Always seek help from qualified professionals for serious concerns
- In crisis? Call 988 (National Suicide Prevention Lifeline)

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details

---

## 🆘 Support & Resources

### Crisis Resources

- **National Suicide Prevention Lifeline**: 988
- **Crisis Text Line**: Text HOME to 741741
- **International**: [findahelpline.com](https://findahelpline.com)

### Development Help

- See [SETUP.md](./SETUP.md) for troubleshooting
- Check [Appwrite Docs](https://appwrite.io/docs)
- Review [Next.js Docs](https://nextjs.org/docs)

---

**Built with ❤️ for mental wellness**
