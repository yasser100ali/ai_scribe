# Healthcare AI Chat

An AI-powered healthcare documentation system, featuring a dual-interface design that serves both medical professionals and patients.

## 🚀 Features

### Dual Interface System

#### Medical Professional Interface
- **Patient Record Queries**: Healthcare providers can ask the AI questions about patient records, medical histories, and treatment plans
- **Conversation History Access**: Review previous patient-AI interactions and symptom discussions
- **Clinical Decision Support**: Get AI-powered insights and recommendations based on patient data
- **Secure Access**: HIPAA-compliant access to patient information and interaction logs

#### Patient Interface
- **Symptom Assessment**: Patients can describe their symptoms in natural conversation
- **AI-Guided Consultation**: The AI asks relevant follow-up questions similar to what a doctor or nurse would ask
- **24/7 Availability**: Patients can get preliminary health assessments anytime
- **Secure Data Sharing**: Patient interactions are securely stored and accessible to healthcare providers
- Idea here is to build upon the data so the AI systems and medical professional can know more about their patients. If the patient seems to have a potentially serious condition based on their conversation, there could also be an auto-appointment or urge for them to call 911 while their healthcare provider is notified. 

### Shared Capabilities
- **Unified Data Access**: Medical professionals can access patient-AI conversation histories for comprehensive care
- **Intelligent Triage**: AI helps identify urgent cases and appropriate care levels
- **Documentation Automation**: Automatic generation of clinical notes from patient interactions

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework for the web application
- **TypeScript** - Type-safe JavaScript for robust development
- **Tailwind CSS** - Utility-first CSS framework for styling


### Backend
- **Python FastAPI** - High-performance API framework
- **OpenAI API** - Advanced language model for intelligent responses
- **Pydantic** - Data validation and serialization

### AI & Machine Learning
- **OpenAI GPT Models** - For natural language understanding and generation
- **Prompt Engineering** - Custom prompts designed for medical contexts
- **Conversation Memory** - Maintains context across patient interactions
- **Medical Knowledge Base** - Integrated medical terminology and protocols



## 📋 Prerequisites

- Node.js 18+
- OpenAI API key

Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yasser100ali/deepscribe-project
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file with your OpenAI API key
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start the development server**
   ```bash
   pnpm dev
   ```


## 📁 Project Structure

```
healthcare-ai-chat/
├── app/                    # Next.js app directory
│   ├── (chat)/            # Patient chat interface
│   ├── professional/      # Medical professional interface
│   └── layout.tsx         # Root layout
├── components/            # Reusable UI components
│   ├── chat.tsx          # Chat interface components
│   ├── overview.tsx      # Landing page
│   └── ui/               # Base UI components
├── api/                   # FastAPI backend
│   ├── index.py          # Main API router
│   └── utils/            # Helper utilities and prompts
├── lib/                   # Shared utilities
├── hooks/                # React hooks
└── .env                  # Environment variables (add your OPENAI_API_KEY here)
```



