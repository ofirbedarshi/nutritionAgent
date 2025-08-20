# WhatsApp Food Coach

A WhatsApp-based nutrition coaching system that helps users track meals, set dietary goals, and receive personalized nutrition guidance using AI-powered message routing.

## Features

### 🤖 AI-Powered Message Routing
- **OpenAI Function Calling**: Intelligent message interpretation and routing
- **Natural Language Processing**: Users can speak naturally - no rigid commands
- **Context Awareness**: System remembers user preferences and goals

### 🍽️ Meal Tracking
- **Natural Language Meal Logging**: "I had chicken and rice for lunch"
- **Automatic Tagging**: AI identifies protein, vegetables, carbs, and junk food
- **Time-Aware**: Supports meal timing like "had pizza yesterday at 8pm"
- **Instant Feedback**: Personalized hints based on user goals

### ⚙️ Preference Management
- **Goals**: Fat loss, muscle gain, maintenance, or general health
- **Communication Tone**: Friendly, clinical, or funny responses
- **Focus Areas**: Protein, vegetables, carbs, late eating, home cooking
- **Report Timing**: Customizable daily report schedule
- **Dietary Restrictions**: Track allergies and dietary preferences

### 📊 Daily Summaries
- **Automated Reports**: Scheduled daily nutrition summaries
- **Smart Analysis**: Meal count, late eating patterns, nutrition ratios
- **Personalized Suggestions**: Based on user goals and eating patterns
- **On-Demand**: Request daily or weekly reports anytime

### 💬 Coaching Support
- **General Q&A**: "What should I eat for breakfast?"
- **Nutrition Tips**: Context-aware advice based on user goals
- **Encouraging Responses**: Motivational and supportive communication

## Architecture

### AI Orchestrator System
```
User Message → OpenAI Function Calling → Tool Selection → Service Execution → Response
```

**Available Tools:**
- `set_preferences`: Update goals, tone, focus areas, dietary restrictions
- `log_meal`: Record meal descriptions with automatic tagging
- `request_summary`: Generate daily/weekly nutrition reports
- `ask_coach`: General nutrition advice and Q&A

### Tech Stack
- **Backend**: Node.js 20, TypeScript, Express
- **AI**: OpenAI GPT-4o-mini with function calling
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (prod)
- **Messaging**: Twilio WhatsApp API
- **Validation**: Zod schemas for type safety
- **Scheduling**: node-cron for automated reports
- **Testing**: Jest + Supertest
- **Logging**: Pino structured logging

## Quick Start

### Prerequisites
- Node.js 20+
- OpenAI API key
- Twilio account with WhatsApp sandbox

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository>
cd nutritionAgent
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your credentials:
# - OPENAI_API_KEY=your_openai_api_key
# - TWILIO_ACCOUNT_SID=your_account_sid
# - TWILIO_AUTH_TOKEN=your_auth_token
# - TWILIO_PHONE_NUMBER=whatsapp:+1415...
```

3. **Database Setup**
```bash
npx prisma migrate dev
npx prisma db seed
```

4. **Development Server**
```bash
npm run dev
```

### Twilio WhatsApp Setup

1. **Activate Sandbox**: Go to [Twilio Console > WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp)
2. **Join Sandbox**: Send `join <your-sandbox-keyword>` to your Twilio WhatsApp number
3. **Configure Webhook**: Set webhook URL to `https://your-ngrok-url.ngrok.io/webhooks/whatsapp`

### Testing with ngrok

```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Expose with ngrok
ngrok http 3000

# Use the ngrok URL in your Twilio webhook configuration
```

## Usage Examples

### Setting Preferences
```
"Set my goal to lose weight"
"I want reports at 9pm"  
"Focus on protein and vegetables"
"Make the tone funny"
"I'm allergic to nuts and dairy"
```

### Logging Meals
```
"I had grilled chicken with broccoli for dinner"
"Ate pizza yesterday at 8pm"
"Breakfast: oatmeal with berries and almonds"
"Quick snack - apple and peanut butter"
```

### Getting Reports
```
"Send me my daily report"
"Show me today's summary"
"How did I do this week?" (coming soon)
```

### Coaching Questions
```
"What should I eat for breakfast?"
"Is it okay to eat late at night?"
"How much protein do I need?"
"What are good snack options?"
```

## API Endpoints

### Main Webhook
- `POST /webhooks/whatsapp` - Main WhatsApp message handler

### Debug Endpoints (Development)
- `GET /healthz` - Health check
- `POST /debug/run-daily-report` - Trigger daily report
- `GET /debug/user/:phone` - Get user information
- `GET /debug/stats/:userId` - Get user meal statistics

## Database Schema

### Core Models
- **User**: Phone number, language, media storage preferences
- **Preferences**: Goals, tone, report timing, focus areas, dietary restrictions
- **Meal**: Meal descriptions, AI-generated tags, timestamps
- **MessageLog**: Complete conversation history with AI decisions

### AI Decision Logging
Every message interaction is logged with:
- Tool selected by AI
- Arguments passed to tools
- User context provided
- Response generated

## Development

### Running Tests
```bash
npm test                    # All tests
npm test -- --watch        # Watch mode
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
```

### Code Quality
```bash
npm run lint               # ESLint
npm run format             # Prettier
npm run build              # TypeScript compilation
```

### Database Operations
```bash
npx prisma studio          # Database GUI
npx prisma migrate dev     # Create migration
npx prisma db seed         # Seed test data
npx prisma generate        # Update Prisma client
```

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development
DATABASE_URL=file:./dev.db

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=whatsapp:+1415...

# Logging
LOG_LEVEL=info

# Webhook (for production)
WEBHOOK_BASE_URL=https://your-domain.com
```

## Production Deployment

### Database Migration
```bash
# Switch to PostgreSQL
DATABASE_URL=postgresql://user:password@host:port/database
npx prisma migrate deploy
```

### Environment Setup
- Use production OpenAI API key
- Configure production Twilio credentials
- Set up proper webhook URLs
- Enable structured logging
- Configure database connection pooling

## AI System Details

### Function Calling Flow
1. **Message Reception**: WhatsApp message received via webhook
2. **Context Building**: Load user preferences and build context summary
3. **AI Routing**: OpenAI analyzes message and selects appropriate tool
4. **Validation**: Zod schemas validate tool arguments
5. **Service Execution**: Corresponding service handles the request
6. **Response Generation**: Formatted response sent back to user
7. **Logging**: Complete interaction logged for analysis

### Tool Validation
- **Server-side Validation**: All AI tool arguments validated with Zod
- **Error Handling**: Invalid arguments trigger helpful error messages
- **Fallback Logic**: System gracefully handles AI errors
- **Type Safety**: Full TypeScript coverage for all AI interactions

### Context Management
- **Lightweight Context**: Only current preferences sent to AI
- **No Long History**: Focused on current state, not conversation history
- **Privacy Focused**: Minimal data retention, secure processing

## Contributing

### Code Style
- **Functions**: Small, single-responsibility, prefer pure functions
- **Naming**: Explicit, descriptive, no abbreviations
- **Files**: One main concept per file
- **Error Handling**: Never expose raw errors to users
- **TypeScript**: Strict mode, no `any` unless justified

### Testing Requirements
- **Unit Tests**: All AI routing logic and business rules
- **Integration Tests**: Complete webhook flows with mocked AI
- **Coverage**: Maintain >80% test coverage
- **CI Ready**: All tests must pass in `npm test`

## Future Enhancements

### Planned Features
- **Media Support**: Photo analysis of meals
- **Voice Messages**: Speech-to-text meal logging  
- **Weekly Reports**: Extended analytics and trends
- **Recipe Suggestions**: AI-powered meal recommendations
- **Integration**: Fitness trackers and health apps
- **Multi-language**: Support for additional languages

### Architecture Improvements
- **Event-Driven**: Move to event bus architecture
- **Microservices**: Split into focused services
- **Real-time**: WebSocket connections for instant responses
- **Analytics**: Advanced user behavior tracking
- **ML Pipeline**: Custom nutrition analysis models

## Support

### Troubleshooting
- **WhatsApp Issues**: Check Twilio sandbox activation and phone number joining
- **AI Errors**: Verify OpenAI API key and rate limits
- **Database Issues**: Ensure migrations are up to date
- **Webhook Problems**: Verify ngrok tunnel and Twilio configuration

### Getting Help
- Check the logs for detailed error information
- Use debug endpoints to inspect user state
- Review test files for usage examples
- Consult Twilio and OpenAI documentation

## License

MIT License - see LICENSE file for details. 