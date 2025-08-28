const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Gmail API configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Set up Gmail API
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MailPurge Backend API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get authorization URL
app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://mail.google.com/']
  });
  res.json({ authUrl });
});

// Handle OAuth callback (GET - from Google redirect)
app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Authorization code not found');
    }
    
    // Don't exchange the code yet - just display it for the user to copy
    // The actual token exchange will happen in the POST route
    res.send(`
      <html>
        <head>
          <title>MailPurge - Authorization Success</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: #0a0a0b;
              color: white;
              margin: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
            }
            h1 {
              color: #22c55e;
              margin-bottom: 20px;
            }
            .code-container {
              margin: 30px 0;
              padding: 20px;
              background: #1f1f23;
              border-radius: 8px;
              border: 1px solid #333;
            }
            .code-text {
              background: #2a2a2e;
              padding: 15px;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
              word-break: break-all;
              margin-bottom: 15px;
              font-size: 14px;
            }
            .copy-btn {
              background: #3b82f6;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              transition: background-color 0.2s;
            }
            .copy-btn:hover {
              background: #2563eb;
            }
            .copy-btn:active {
              background: #1d4ed8;
            }
            .success-message {
              color: #22c55e;
              margin-top: 10px;
              opacity: 0;
              transition: opacity 0.3s;
            }
            .success-message.show {
              opacity: 1;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Authorization Successful</h1>
            <p>You can now close this window and return to the MailSweeper application.</p>
            
            <div class="code-container">
              <label style="display: block; margin-bottom: 10px; font-weight: bold;">Authorization code:</label>
              <div class="code-text" id="authCode">${code}</div>
              <button class="copy-btn" onclick="copyCode()">
                Copy Code
              </button>
              <div class="success-message" id="successMessage">Code copied to clipboard!</div>
            </div>
          </div>
          
          <script>
            function copyCode() {
              const codeElement = document.getElementById('authCode');
              const successMessage = document.getElementById('successMessage');
              
              // Create a temporary textarea to copy the text
              const textarea = document.createElement('textarea');
              textarea.value = codeElement.textContent;
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
              
              // Show success message
              successMessage.classList.add('show');
              
              // Hide success message after 2 seconds
              setTimeout(() => {
                successMessage.classList.remove('show');
              }, 2000);
            }
            
            // Auto-close window after 30 seconds (increased time for user to copy)
            setTimeout(() => window.close(), 30000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error during authentication:', error);
    res.status(500).send(`
      <html>
        <head><title>MailPurge - Authorization Error</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #0a0a0b; color: white;">
          <h1 style="color: #ef4444;">❌ Authorization Failed</h1>
          <p>There was an error during authentication. Please try again.</p>
          <p>Error: ${error.message}</p>
        </body>
      </html>
    `);
  }
});

// Handle OAuth callback (POST - from frontend)
app.post('/auth/callback', async (req, res) => {
  try {
    const { code } = req.body;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    res.json({ success: true, message: 'Authentication successful' });
  } catch (error) {
    console.error('Error during authentication:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Check authentication status
app.get('/auth/status', (req, res) => {
  try {
    const credentials = oauth2Client.credentials;
    if (credentials && credentials.access_token) {
      res.json({ 
        authenticated: true, 
        message: 'User is authenticated',
        hasScope: true // We'll assume the scope is correct if authenticated
      });
    } else {
      res.json({ 
        authenticated: false, 
        message: 'User is not authenticated' 
      });
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.json({ 
      authenticated: false, 
      message: 'Authentication status unknown' 
    });
  }
});

// Get emails grouped by sender
app.get('/emails/senders', async (req, res) => {
  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 500
    });

    const messages = response.data.messages || [];
    const senderMap = new Map();

    for (const message of messages) {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date']
      });

      const headers = fullMessage.data.payload.headers;
      const fromHeader = headers.find(h => h.name === 'From');
      const subjectHeader = headers.find(h => h.name === 'Subject');
      const dateHeader = headers.find(h => h.name === 'Date');

      if (fromHeader) {
        const sender = fromHeader.value;
        const email = extractEmail(sender);
        
        if (!senderMap.has(email)) {
          senderMap.set(email, {
            sender: sender,
            email: email,
            count: 0,
            messageIds: []
          });
        }
        
        const senderData = senderMap.get(email);
        senderData.count++;
        senderData.messageIds.push({
          id: message.id,
          subject: subjectHeader ? subjectHeader.value : 'No Subject',
          date: dateHeader ? dateHeader.value : 'Unknown Date'
        });
      }
    }

    const senders = Array.from(senderMap.values())
      .sort((a, b) => b.count - a.count);

    res.json(senders);
  } catch (error) {
    console.error('Error fetching emails:', error);
    
    if (error.status === 401 || error.code === 401) {
      res.status(401).json({ 
        error: 'Authentication expired. Please re-authorize the application.',
        needsReauth: true 
      });
    } else if (error.status === 403 || error.code === 403) {
      res.status(403).json({ 
        error: 'Insufficient permissions. Please re-authorize with full Gmail access.',
        needsReauth: true 
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch emails. Please try again.' });
    }
  }
});

// Delete emails from specific sender
app.post('/emails/delete', async (req, res) => {
  try {
    const { messageIds } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ error: 'Invalid message IDs' });
    }

    const deletePromises = messageIds.map(id => 
      gmail.users.messages.delete({
        userId: 'me',
        id: id
      })
    );

    await Promise.all(deletePromises);
    
    res.json({ 
      success: true, 
      message: `Successfully deleted ${messageIds.length} emails` 
    });
  } catch (error) {
    console.error('Error deleting emails:', error);
    
    if (error.status === 403 || error.code === 403) {
      res.status(403).json({ 
        error: 'Insufficient permissions to delete emails. Please re-authorize the application with full Gmail access.',
        needsReauth: true 
      });
    } else if (error.status === 401 || error.code === 401) {
      res.status(401).json({ 
        error: 'Authentication expired. Please re-authorize the application.',
        needsReauth: true 
      });
    } else {
      res.status(500).json({ error: 'Failed to delete emails. Please try again.' });
    }
  }
});

// Utility function to extract email from "Name <email@domain.com>" format
function extractEmail(sender) {
  const emailMatch = sender.match(/<(.+?)>/);
  return emailMatch ? emailMatch[1] : sender;
}

app.listen(PORT, () => {
  console.log(`Email Deleter server running on http://localhost:${PORT}`);
});
