import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import DailyCheckIn from './components/DailyCheckIn/DailyCheckIn';
import VoiceRecording from './components/VoiceRecording/VoiceRecording';
import Results from './components/Results/Results';
import ActionItems from './components/ActionItems/ActionItems';
import Profile from './components/Profile/Profile';
import MobileFrame from './components/MobileFrame';
import BottomNav from './components/BottomNav/BottomNav';

function App() {
  return (
    <Router>
      <MobileFrame>
        <div className="App">
          <Routes>
            <Route path="/" element={<DailyCheckIn />} />
            <Route path="/voice-recording" element={<VoiceRecording />} />
            <Route path="/results" element={<Results />} />
            <Route path="/action-items" element={<ActionItems />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
          <BottomNav />
        </div>
      </MobileFrame>
    </Router>
  );
}

export default App;
