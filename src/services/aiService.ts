import { buildPrompt } from '../constants/prompts';

export interface AIResponse {
  title: string;
  general: string;
  forYouTitle: string;
  forYou: string;
  forThemTitle: string;
  forThem: string;
}

export const getAIResponse = async (transcript: string): Promise<AIResponse> => {
  try {
    console.log('=== AI SERVICE DEBUG ===');
    console.log('Transcript received:', transcript);
    console.log('Transcript length:', transcript.length);
    console.log('API Key present:', !!process.env.REACT_APP_OPENAI_API_KEY);
    console.log('API Key first 20 chars:', process.env.REACT_APP_OPENAI_API_KEY?.substring(0, 20));
    
    const prompt = buildPrompt(transcript);
    console.log('Generated prompt:', prompt);
    
    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.7,
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error response:', errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('OpenAI response data:', data);
    
    const aiText = data.choices?.[0]?.message?.content;
    
    if (!aiText) {
      throw new Error('No content in OpenAI response');
    }
    
    console.log('AI generated text:', aiText);
    
    const titleMatch = aiText.match(/Title:\s*([\s\S]*?)(?=General:|$)/);
    const generalMatch = aiText.match(/General:\s*([\s\S]*?)(?=For You Title:|$)/);
    const forYouTitleMatch = aiText.match(/For You Title:\s*([\s\S]*?)(?=For You:|$)/);
    const forYouMatch = aiText.match(/For You:\s*([\s\S]*?)(?=For Them Title:|$)/);
    const forThemTitleMatch = aiText.match(/For Them Title:\s*([\s\S]*?)(?=For Them:|$)/);
    const forThemMatch = aiText.match(/For Them:\s*([\s\S]*?)$/);
    
    console.log('Title match:', titleMatch);
    console.log('General match:', generalMatch);
    console.log('For You Title match:', forYouTitleMatch);
    console.log('For You match:', forYouMatch);
    console.log('For Them Title match:', forThemTitleMatch);
    console.log('For Them match:', forThemMatch);
    
    const result = {
      title: titleMatch ? titleMatch[1].trim() : 'Thank you for sharing your caregiving journey',
      general: generalMatch ? generalMatch[1].trim() : 'Thank you for sharing your caregiving experience.',
      forYouTitle: forYouTitleMatch ? forYouTitleMatch[1].trim() : 'Personal Well-being',
      forYou: forYouMatch ? forYouMatch[1].trim() : 'No personal suggestion available.',
      forThemTitle: forThemTitleMatch ? forThemTitleMatch[1].trim() : 'Caregiving Support',
      forThem: forThemMatch ? forThemMatch[1].trim() : 'No caregiving suggestion available.',
    };
    
    console.log('Final result:', result);
    console.log('=== END AI SERVICE DEBUG ===');
    
    return result;
  } catch (error: any) {
    console.error('=== AI SERVICE ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=== END AI SERVICE ERROR ===');
    throw new Error(`AI processing failed: ${error.message || 'Unknown error'}`);
  }
};
