import React from 'react';
import { useNavigate } from 'react-router-dom';
import './DailyCheckIn.css';
import Button from '../Button/Button';

const testTranscript = `Oh… wow. That's—thank you. Most folks don't start there. They usually ask how my residents are doing, or how my mom's blood pressure is, or if my daughter's asthma's acting up again. But me? Heh. That's different.
I'd say… I'm holding. You know? Like, picture a rubber band stretched tight around a stack of index cards. I haven't snapped, not yet. But I definitely ain't relaxed.
This morning started at 4:45. My daughter had a nightmare and crawled into my bed, which would've been sweet if she hadn't peed it. So laundry before sunrise. Got her cereal, threw a lunch together with whatever we had—half a granola bar, some carrots, peanut butter on a hamburger bun. We were out of bread again.
Then I worked an eight-hour shift at the facility. It was one of those days where no one shows up for their shift after you, so you stay an extra hour. Ms. Alvarez had a fall. Not bad, thank God, but I had to fill out an incident report, call her son, clean her up, and talk her down from the panic. Then you go home, and it's not over. Dinner, homework, meds for mom, call the pharmacy for her refills. My daughter drew on the wall with Sharpie and all I could think was, "At least she's quiet."
So… I'm tired. Like soul-tired. But I'm also… weirdly proud? I kept everyone breathing today. That counts for something, right?
(…Sorry, that was a lot. But you did ask.)`;

const DailyCheckIn: React.FC = () => {
  const navigate = useNavigate();

  const handleSpeakThoughts = () => {
    navigate('/voice-recording');
  };

  const handleWriteResponse = () => {
    // Navigate to write response screen (to be implemented)
    console.log('Navigate to write response');
  };

  return (
    <div className="daily-checkin-bg">
      <div className="daily-checkin-header">Daily Check-in</div>
      <div className="daily-checkin-card">
        <div className="daily-checkin-text">
          <p>Caregiving asks a lot.</p>
          <p>It can be hard.<br />Emotionally, mentally, and even physically.</p>
          <p className="bold">How are you doing right now?</p>
        </div>
      </div>
      <div className="daily-checkin-actions">
        <Button icon="🎤" label="Speak your thoughts" onClick={handleSpeakThoughts} />
        <Button icon="✏️" label="Write a response" onClick={handleWriteResponse} />
      </div>
    </div>
  );
};

export default DailyCheckIn; 