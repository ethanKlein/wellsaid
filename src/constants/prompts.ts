export const CAREGIVING_REFLECTION_PROMPT = `Can you respond to the following reflection from someone who is providing informal caregiving in addition to their normal work responsibilities. 

IMPORTANT: Do not use any markdown formatting. Do not use ** around titles or text. Use plain text only.

Please structure your response exactly as follows:

Title: (a warm, validating title that acknowledges what they shared, 5-10 words that show you heard them). Here's an example: "It definitely counts that you kept everyone breathing!"

General: (provide a warm, empathetic acknowledgment of their situation and what they shared, validating their experience as a caregiver, keep it short and concise). Here's an example: "You're doing an amazing job caring for your mom and your kids, not to mention your day job. You're a hero."

For You Title: (a short, compelling title for the personal well-being suggestion, 3-6 words). Here's an example: "Try a free EAP session."
For You: (provide a practical, tactical and helpful suggestion for something the user might do to improve their personal well-being. The recommendation should reflect what was shared in the transcript. The recommendation should tie what's being recommended to what was shared in the transcript.The recommendation should be actionable and tactical, and should draw from benefits available from the human resources department. Assume it's a generous benefits package with many options not known about by employees.). Here's an example: "You've been that stretched rubber band all day, holding it all. A free Employee Assistance Program session could be your space to exhale. Not because something's wrong, but because you deserve a breath."
For You Action: (provide a specific actionable item with appropriate link type. Choose from: EAP_SESSION, HR_CONTACT, PHONE_SUPPORT, CALENDAR_REMINDER, RESOURCE_LINK, or NONE. Format as "ACTION_TYPE|Display Text|Additional Info". Examples: "EAP_SESSION|Schedule a free EAP session|Mental health support", "HR_CONTACT|Contact HR about flexible work|Work-life balance", "PHONE_SUPPORT|Call employee assistance|1-800-XXX-XXXX", "CALENDAR_REMINDER|Set daily self-care reminder|15 minutes for yourself")

For Them Title: (a short, compelling title for the caregiving suggestion, 3-6 words). Here's an example: "Sharpie cleanup tip!"
For Them: (provide a practical, tactical and helpful suggestion for what the user might do to improve the caregiving or well-being of the person or people they're providing informal care to. The recommendation should draw from benefits available to them in the human resources department. Assume it's a generous benefits package with many options not known about by employees.). All you need is rubbing alcohol (70%+), a soft cloth, and a gentle touch..."
For Them Action: (provide a specific actionable item with appropriate link type. Choose from: CARE_COORDINATION, MEDICAL_CONTACT, RESOURCE_LINK, CALENDAR_REMINDER, SUPPORT_GROUP, or NONE. Format as "ACTION_TYPE|Display Text|Additional Info". Examples: "CARE_COORDINATION|Schedule care team meeting|Coordinate with family", "MEDICAL_CONTACT|Contact primary care doctor|Discuss care plan", "RESOURCE_LINK|Find local support services|Community resources", "SUPPORT_GROUP|Join caregiver support group|Connect with others")

Here is their reflection:
{transcript}`;

export const buildPrompt = (transcript: string): string => {
  return CAREGIVING_REFLECTION_PROMPT.replace('{transcript}', transcript);
}; 