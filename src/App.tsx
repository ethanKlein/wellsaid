import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import DailyCheckIn from './components/DailyCheckIn/DailyCheckIn';
import VoiceRecording from './components/VoiceRecording/VoiceRecording';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<DailyCheckIn />} />
          <Route path="/voice-recording" element={<VoiceRecording />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
