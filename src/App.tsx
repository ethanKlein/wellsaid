import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import DailyCheckIn from './components/DailyCheckIn/DailyCheckIn';
import VoiceRecording from './components/VoiceRecording/VoiceRecording';
import Results from './components/Results/Results';
import ActionItems from './components/ActionItems/ActionItems';
import Profile from './components/Profile/Profile';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<DailyCheckIn />} />
          <Route path="/voice-recording" element={<VoiceRecording />} />
          <Route path="/results" element={<Results />} />
          <Route path="/action-items" element={<ActionItems />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
