import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // This is a placeholder for any additional logic you might want to run on component mount
  }, [navigate]);

  return (
    <div className="iphone-frame">
      <div className="notch"></div>
      <div className="index-container">
        <h1>WellSaid</h1>
        <p className="subtitle">Share your story</p>
        
        <div className="button-container">
          <button 
            className="primary-button"
            onClick={() => navigate('/voice-recording')}
          >
            Start Recording
          </button>
          
          <button 
            className="secondary-button"
            onClick={() => {
              navigate('/results', {
                state: {
                  transcript: "Oh… wow. That's—thank you. Most folks don't start there. They usually ask how my residents are doing, or how my mom's blood pressure is, or if my daughter's asthma's acting up again. But me? Heh. That's different.\nI'd say… I'm holding. You know? Like, picture a rubber band stretched tight around a stack of index cards. I haven't snapped, not yet. But I definitely ain't relaxed.\nThis morning started at 4:45. My daughter had a nightmare and crawled into my bed, which would've been sweet if she hadn't peed it. So laundry before sunrise. Got her cereal, threw a lunch together with whatever we had—half a granola bar, some carrots, peanut butter on a hamburger bun. We were out of bread again.\nThen I worked an eight-hour shift at the facility. It was one of those days where no one shows up for their shift after you, so you stay an extra hour. Ms. Alvarez had a fall. Not bad, thank God, but I had to fill out an incident report, call her son, clean her up, and talk her down from the panic. Then you go home, and it's not over. Dinner, homework, meds for mom, call the pharmacy for her refills. My daughter drew on the wall with Sharpie and all I could think was, \"At least she's quiet.\"\nSo… I'm tired. Like soul-tired. But I'm also… weirdly proud? I kept everyone breathing today. That counts for something, right?\n(…Sorry, that was a lot. But you did ask.)"
                }
              });
            }}
          >
            View Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index; 