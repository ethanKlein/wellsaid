import React from 'react';
import { useNavigate } from 'react-router-dom';
import './BottomNav.css';

const testTranscript = `Oh… wow. That's—thank you. Most folks don't start there. They usually ask how my residents are doing, or how my mom's blood pressure is, or if my daughter's asthma's acting up again. But me? Heh. That's different.
I'd say… I'm holding. You know? Like, picture a rubber band stretched tight around a stack of index cards. I haven't snapped, not yet. But I definitely ain't relaxed.
This morning started at 4:45. My daughter had a nightmare and crawled into my bed, which would've been sweet if she hadn't peed it. So laundry before sunrise. Got her cereal, threw a lunch together with whatever we had—half a granola bar, some carrots, peanut butter on a hamburger bun. We were out of bread again.
Then I worked an eight-hour shift at the facility. It was one of those days where no one shows up for their shift after you, so you stay an extra hour. Ms. Alvarez had a fall. Not bad, thank God, but I had to fill out an incident report, call her son, clean her up, and talk her down from the panic. Then you go home, and it's not over. Dinner, homework, meds for mom, call the pharmacy for her refills. My daughter drew on the wall with Sharpie and all I could think was, "At least she's quiet."
So… I'm tired. Like soul-tired. But I'm also… weirdly proud? I kept everyone breathing today. That counts for something, right?
(…Sorry, that was a lot. But you did ask.)`;

const BottomNav: React.FC = () => {
  const navigate = useNavigate();

  const handleActionItem = () => {
    navigate('/action-items');
  };

  const handleNewRecording = () => {
    navigate('/voice-recording');
  };

  const handleProfile = () => {
    navigate('/results', { state: { transcript: testTranscript } });
  };

  return (
    <div className="bottom-nav">
      <button className="nav-item" onClick={handleActionItem}>
        <div className="nav-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 4C15 4.55228 14.5523 5 14 5H10C9.44772 5 9 4.55228 9 4C9 3.89543 9.89543 3 11 3V3ZM9 5V4C9 4.55228 9.44772 5 10 5H14C14.5523 5 15 4.55228 15 4V5M9 12H15M9 16H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span>Action Item</span>
      </button>
      
      <button className="fab" onClick={handleNewRecording}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      <button className="nav-item" onClick={handleProfile}>
        <div className="nav-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span>Profile</span>
      </button>
    </div>
  );
};

export default BottomNav; 