export const CAREGIVING_REFLECTION_PROMPT = `Can you respond to the following reflection from someone who is providing informal caregiving in addition to their normal work responsibilities. 

Please structure your response exactly as follows:

Title: (a warm, validating title that acknowledges what they shared, 5-10 words that show you heard them)

General: (provide a warm, empathetic acknowledgment of their situation and what they shared, validating their experience as a caregiver)

For You Title: (a short, compelling title for the personal well-being suggestion, 3-6 words)
For You: (provide a practical, tactical and helpful suggestion for something the user might do to improve their personal well-being. The recommendation should reflect what was shared in the transcript.)

For Them Title: (a short, compelling title for the caregiving suggestion, 3-6 words)
For Them: (provide a practical, tactical and helpful suggestion for what the user might do to improve the caregiving or well-being of the person or people they're providing informal care to.)

Here is their reflection:
{transcript}`;

export const buildPrompt = (transcript: string): string => {
  return CAREGIVING_REFLECTION_PROMPT.replace('{transcript}', transcript);
}; 