const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');

const router = express.Router();

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:5173' // Your frontend URL
);

// Route to verify Google access token
router.post('/google', async (req, res) => {
  const { token } = req.body;

  try {
    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({ access_token: token });

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });

    const userInfo = await oauth2.userinfo.get();

    if (userInfo.data) {
      // Here you can save the user info to your database if needed
      res.json({ success: true, user: userInfo.data });
    } else {
      res.status(400).json({ success: false, message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Route to create a calendar event
router.post('/calendar/create', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No authorization header' });
  }

  const accessToken = authHeader.split(' ')[1];
  const { summary, description, startDateTime, endDateTime } = req.body;

  try {
    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary,
      description,
      start: {
        dateTime: new Date(startDateTime).toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(endDateTime).toISOString(),
        timeZone: 'UTC',
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    res.json({
      success: true,
      event: response.data
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: error.message
    });
  }
});

// Route to fetch calendar events
router.get('/calendar/events', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No authorization header' });
  }

  const accessToken = authHeader.split(' ')[1];

  try {
    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get events from the user's primary calendar
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items.map(event => ({
      name: event.summary,
      date: event.start.dateTime.split('T')[0],
      time: event.start.dateTime.split('T')[1].substring(0, 5),
    }));

    res.json({ 
      success: true, 
      events 
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch events',
      error: error.message 
    });
  }
});

module.exports = router;