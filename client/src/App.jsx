import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Calendar, Plus, X, LogOut } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const url = "https://calendar-assignment-4r2g.onrender.com"

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ name: '', date: '', time: '' });
  const [accessToken, setAccessToken] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async (token) => {
    try {
      const response = await fetch(url+ '/auth/calendar/events', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
      } else {
        console.error('Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const checkAndRefreshToken = async (token) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + token);
      if (!response.ok) {
        localStorage.removeItem('googleAuth');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking token:', error);
      return false;
    }
  };

  const fetchUserInfo = async (token) => {
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        return userInfo;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const savedAuth = localStorage.getItem('googleAuth');
      if (savedAuth) {
        const authData = JSON.parse(savedAuth);
        const isValid = await checkAndRefreshToken(authData.accessToken);
        
        if (isValid) {
          setAccessToken(authData.accessToken);
          setUser(authData.user);
          await fetchEvents(authData.accessToken);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const handleLogout = () => {
    setUser(null);
    setAccessToken(null);
    setEvents([]);
    localStorage.removeItem('googleAuth');
    toast.success('Logged out successfully');
  };

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const accessToken = tokenResponse.access_token;
      setAccessToken(accessToken);

      try {
        const userInfo = await fetchUserInfo(accessToken);
        if (userInfo) {
          setUser(userInfo);
          
          localStorage.setItem('googleAuth', JSON.stringify({
            accessToken,
            user: userInfo
          }));

          await fetchEvents(accessToken);
          
          const response = await fetch(url+ '/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: accessToken }),
          });

          if (response.ok) {
            toast.success('Successfully logged in!');
          }
        }
      } catch (error) {
        console.error('Error during authentication:', error);
        toast.error('An error occurred during authentication.');
      }
    },
    scope: 'https://www.googleapis.com/auth/calendar.events',
    onError: () => toast.error('Login failed. Please try again.'),
  });

  const handleCreateEvent = async () => {
    if (!accessToken) {
      toast.error('No access token available. Please log in again.');
      return;
    }

    if (!newEvent.name || !newEvent.date || !newEvent.time) {
      toast.error('Please fill in all event details.');
      return;
    }

    try {
      // Create start and end times for the event
      const startDateTime = new Date(`${newEvent.date}T${newEvent.time}`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Add 1 hour

      const response = await fetch(url+ '/auth/calendar/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          summary: newEvent.name,
          description: `Event created via Calendar App`,
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString()
        }),
      });

      if (response.ok) {
        await fetchEvents(accessToken); // Refresh the events list
        setNewEvent({ name: '', date: '', time: '' });
        setIsModalOpen(false);
        toast.success('Event created successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to create event. Please try again.');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('An error occurred while creating the event.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 items-center mt-10">
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Google Calendar Integration
            </h1>
            {!user ? (
              <button
                onClick={() => login()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                Sign in with Google
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-gray-600">Welcome, {user.name}!</span>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Event
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            )}
          </div>

          {user && (
            <div className="bg-white rounded-lg">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Your Events</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {events.map((event, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">{event.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">{event.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">{event.time}</td>
                      </tr>
                    ))}
                    {events.length === 0 && (
                      <tr>
                        <td className="px-6 py-4 text-center text-gray-500" colSpan={3}>
                          No events created yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Create New Event</h2>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Name
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="text"
                placeholder="Enter event name"
                value={newEvent.name}
                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-200"
              >
                Create Event
              </button>
            </div>
          </div>
        </Modal>
      </div>
      <ToastContainer />
    </div>
  );
}