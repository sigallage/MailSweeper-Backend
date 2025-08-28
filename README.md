# MailPurge Backend

Node.js Express backend API for the MailPurge email management application.

## 🚀 Features

- **Gmail API Integration**: Secure OAuth 2.0 authentication with Google
- **Email Management**: Fetch, group, and delete emails by sender
- **RESTful API**: Clean endpoints for frontend integration
- **Security**: CORS protection and minimal permission requests
- **Environment Configuration**: Easy setup with environment variables

## 📋 Prerequisites

- Node.js 16+ installed
- Google Cloud Console project with Gmail API enabled
- OAuth 2.0 credentials from Google Cloud Console

## 🛠️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the environment template:

```bash
cp .env.example .env
```

Edit `.env` with your Google OAuth credentials:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
PORT=3000
```

### 3. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable Gmail API in "APIs & Services" > "Library"
4. Create OAuth 2.0 credentials in "APIs & Services" > "Credentials"
5. Add authorized origins: `http://localhost:3000`
6. Add redirect URIs: `http://localhost:3000/auth/callback`

### 4. Run the Server

```bash
# Development mode (auto-restart with nodemon)
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000`

## 🔗 API Endpoints

### Authentication

#### GET `/auth`
Get Google OAuth authorization URL
- **Response**: `{ "authUrl": "https://accounts.google.com/..." }`

#### POST `/auth/callback`
Handle OAuth callback with authorization code
- **Body**: `{ "code": "authorization_code" }`
- **Response**: `{ "success": true, "message": "Authentication successful" }`

### Email Management

#### GET `/emails/senders`
Get emails grouped by sender (requires authentication)
- **Response**: Array of sender objects:
```json
[
  {
    "sender": "John Doe <john@example.com>",
    "email": "john@example.com",
    "count": 15,
    "messageIds": [
      {
        "id": "message_id_1",
        "subject": "Email Subject",
        "date": "2025-08-26T10:00:00.000Z"
      }
    ]
  }
]
```

#### POST `/emails/delete`
Delete specified emails (requires authentication)
- **Body**: `{ "messageIds": ["id1", "id2", "id3"] }`
- **Response**: `{ "success": true, "message": "Successfully deleted X emails" }`

## 🔒 Security Features

- **OAuth 2.0**: Secure authentication with Google
- **CORS**: Configured for frontend origins only
- **Minimal Permissions**: Only requests Gmail read/modify access
- **No Credential Storage**: Tokens are not permanently stored
- **Environment Variables**: Sensitive data kept in env files

## 🚀 Development

### Available Scripts

```bash
npm start        # Start production server
npm run dev      # Start development server with auto-reload
npm test         # Run tests (placeholder)
```

### Project Structure

```
backend/
├── server.js           # Main Express server
├── package.json        # Dependencies and scripts
├── .env.example        # Environment template
├── .env               # Your environment variables (not in git)
├── public/            # Static files
│   └── index.html     # API documentation page
└── README.md          # This file
```

### Adding New Features

1. **New Routes**: Add routes in `server.js`
2. **Middleware**: Add custom middleware before routes
3. **Gmail Operations**: Use the `gmail` API client
4. **Error Handling**: Follow existing error response patterns

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check Google OAuth credentials in `.env`
   - Verify redirect URI matches Google Cloud Console
   - Ensure Gmail API is enabled

2. **CORS Errors**
   - Verify frontend origin is in CORS configuration
   - Check that requests include proper headers

3. **Rate Limiting**
   - Gmail API has rate limits
   - Consider implementing request queuing for large operations

### Debug Mode

Set `DEBUG=true` in your `.env` file for verbose logging.

## 📝 License

MIT License - see root LICENSE file for details.

## ⚠️ Warning

This API can permanently delete emails from Gmail accounts. Always verify operations before execution.
