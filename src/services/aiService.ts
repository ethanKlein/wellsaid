import { buildPrompt } from '../constants/prompts';

export interface ActionItem {
  type: 'EAP_SESSION' | 'HR_CONTACT' | 'PHONE_SUPPORT' | 'CALENDAR_REMINDER' | 'RESOURCE_LINK' | 'CARE_COORDINATION' | 'MEDICAL_CONTACT' | 'SUPPORT_GROUP' | 'NONE';
  displayText: string;
  additionalInfo: string;
}

export interface AIResponse {
  title: string;
  general: string;
  forYouTitle: string;
  forYou: string;
  forYouAction: ActionItem | null;
  forThemTitle: string;
  forThem: string;
  forThemAction: ActionItem | null;
}

export interface AIImages {
  forYouImage: string;
  forThemImage: string;
}

// Streaming response handler for progressive loading
export const getAIResponseStreaming = async (
  transcript: string,
  onPartialUpdate: (partial: Partial<AIResponse>) => void
): Promise<AIResponse> => {
  try {
    console.log('=== AI SERVICE STREAMING DEBUG ===');
    console.log('Transcript received:', transcript);
    console.log('Transcript length:', transcript.length);
    
    const prompt = buildPrompt(transcript);
    console.log('Generated prompt:', prompt);
    
    const requestBody = {
      model: 'gpt-4o-mini', // Faster model
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.7,
      stream: true, // Enable streaming
    };
    
    console.log('Request body (streaming):', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error response:', errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || JSON.stringify(errorData)}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    const result: Partial<AIResponse> = {};

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              break;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                accumulatedText += content;
                
                // Parse sections as they come in
                const parsed = parseStreamingResponse(accumulatedText);
                
                // Only update if we have new complete sections
                let hasUpdates = false;
                Object.keys(parsed).forEach(key => {
                  const typedKey = key as keyof AIResponse;
                  if (parsed[typedKey] && parsed[typedKey] !== result[typedKey]) {
                    (result as any)[typedKey] = parsed[typedKey];
                    hasUpdates = true;
                  }
                });
                
                if (hasUpdates) {
                  onPartialUpdate({ ...result });
                }
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    // Final parse to ensure we have everything
    const finalResult = parseStreamingResponse(accumulatedText);
    
    console.log('Final streaming result:', finalResult);
    console.log('=== END AI SERVICE STREAMING DEBUG ===');
    
    return finalResult;
  } catch (error: any) {
    console.error('=== AI SERVICE STREAMING ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('=== END AI SERVICE STREAMING ERROR ===');
    throw new Error(`AI processing failed: ${error.message || 'Unknown error'}`);
  }
};

// Helper function to parse streaming response
const parseStreamingResponse = (text: string): AIResponse => {
  const titleMatch = text.match(/Title:\s*([\s\S]*?)(?=General:|$)/);
  const generalMatch = text.match(/General:\s*([\s\S]*?)(?=For You Title:|$)/);
  const forYouTitleMatch = text.match(/For You Title:\s*([\s\S]*?)(?=For You:|$)/);
  const forYouMatch = text.match(/For You:\s*([\s\S]*?)(?=For You Action:|$)/);
  const forYouActionMatch = text.match(/For You Action:\s*([\s\S]*?)(?=For Them Title:|$)/);
  const forThemTitleMatch = text.match(/For Them Title:\s*([\s\S]*?)(?=For Them:|$)/);
  const forThemMatch = text.match(/For Them:\s*([\s\S]*?)(?=For Them Action:|$)/);
  const forThemActionMatch = text.match(/For Them Action:\s*([\s\S]*?)$/);
  
  return {
    title: cleanMarkdown(titleMatch ? titleMatch[1].trim() : ''),
    general: cleanMarkdown(generalMatch ? generalMatch[1].trim() : ''),
    forYouTitle: cleanMarkdown(forYouTitleMatch ? forYouTitleMatch[1].trim() : ''),
    forYou: cleanMarkdown(forYouMatch ? forYouMatch[1].trim() : ''),
    forYouAction: parseActionItem(forYouActionMatch ? forYouActionMatch[1].trim() : ''),
    forThemTitle: cleanMarkdown(forThemTitleMatch ? forThemTitleMatch[1].trim() : ''),
    forThem: cleanMarkdown(forThemMatch ? forThemMatch[1].trim() : ''),
    forThemAction: parseActionItem(forThemActionMatch ? forThemActionMatch[1].trim() : ''),
  };
};

// Helper function to parse action items
const parseActionItem = (actionText: string): ActionItem | null => {
  if (!actionText || actionText.trim() === '' || actionText.includes('NONE')) {
    return null;
  }
  
  const parts = actionText.split('|');
  if (parts.length >= 2) {
    return {
      type: parts[0].trim() as ActionItem['type'],
      displayText: parts[1].trim(),
      additionalInfo: parts[2]?.trim() || ''
    };
  }
  
  return null;
};

// Helper function to clean markdown formatting
const cleanMarkdown = (text: string): string => {
  if (!text) return text;
  
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold** formatting
    .replace(/\*(.*?)\*/g, '$1')     // Remove *italic* formatting
    .replace(/__(.*?)__/g, '$1')     // Remove __bold__ formatting
    .replace(/_(.*?)_/g, '$1')       // Remove _italic_ formatting
    .trim();
};

// Optimized non-streaming version with faster model
export const getAIResponseFast = async (transcript: string): Promise<AIResponse> => {
  try {
    console.log('=== AI SERVICE FAST DEBUG ===');
    console.log('Transcript received:', transcript);
    
    const prompt = buildPrompt(transcript);
    
    const requestBody = {
      model: 'gpt-4o-mini', // Fastest model
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500, // Reduced for faster response
      temperature: 0.5, // Lower temperature for faster, more focused responses
    };
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content;
    
    if (!aiText) {
      throw new Error('No content in OpenAI response');
    }
    
    const titleMatch = aiText.match(/Title:\s*([\s\S]*?)(?=General:|$)/);
    const generalMatch = aiText.match(/General:\s*([\s\S]*?)(?=For You Title:|$)/);
    const forYouTitleMatch = aiText.match(/For You Title:\s*([\s\S]*?)(?=For You:|$)/);
    const forYouMatch = aiText.match(/For You:\s*([\s\S]*?)(?=For You Action:|$)/);
    const forYouActionMatch = aiText.match(/For You Action:\s*([\s\S]*?)(?=For Them Title:|$)/);
    const forThemTitleMatch = aiText.match(/For Them Title:\s*([\s\S]*?)(?=For Them:|$)/);
    const forThemMatch = aiText.match(/For Them:\s*([\s\S]*?)(?=For Them Action:|$)/);
    const forThemActionMatch = aiText.match(/For Them Action:\s*([\s\S]*?)$/);
    
    const result = {
      title: cleanMarkdown(titleMatch ? titleMatch[1].trim() : 'Thank you for sharing your caregiving journey'),
      general: cleanMarkdown(generalMatch ? generalMatch[1].trim() : 'Thank you for sharing your caregiving experience.'),
      forYouTitle: cleanMarkdown(forYouTitleMatch ? forYouTitleMatch[1].trim() : 'Personal Well-being'),
      forYou: cleanMarkdown(forYouMatch ? forYouMatch[1].trim() : 'No personal suggestion available.'),
      forYouAction: parseActionItem(forYouActionMatch ? forYouActionMatch[1].trim() : ''),
      forThemTitle: cleanMarkdown(forThemTitleMatch ? forThemTitleMatch[1].trim() : 'Caregiving Support'),
      forThem: cleanMarkdown(forThemMatch ? forThemMatch[1].trim() : 'No caregiving suggestion available.'),
      forThemAction: parseActionItem(forThemActionMatch ? forThemActionMatch[1].trim() : ''),
    };
    
    console.log('Fast result:', result);
    console.log('=== END AI SERVICE FAST DEBUG ===');
    
    return result;
  } catch (error: any) {
    console.error('=== AI SERVICE FAST ERROR ===');
    console.error('Error details:', error);
    throw new Error(`AI processing failed: ${error.message || 'Unknown error'}`);
  }
};

// Generate images separately to avoid blocking the main response
export const generateAIImages = async (forYouTitle: string, forYou: string, forThemTitle: string, forThem: string): Promise<AIImages> => {
  try {
    console.log('=== GENERATING AI IMAGES ===');
    
    // Create more specific, contextual prompts based on the actual suggestions
    const baseStyle = "Soft watercolor illustration style, gentle pastel colors, minimalist, peaceful, warm and comforting aesthetic, no text or words";
    
    // Extract key concepts from the suggestions to make images more relevant
    const forYouImagePrompt = `${baseStyle}. Create an illustration representing "${forYouTitle}" and the concept: ${forYou.substring(0, 150)}. Focus on self-care, personal well-being, and the specific activity or mindset suggested. Single central illustration, calming and supportive.`;
    
    const forThemImagePrompt = `${baseStyle}. Create an illustration representing "${forThemTitle}" and the concept: ${forThem.substring(0, 150)}. Focus on caregiving, helping others, and the specific support or care activity suggested. Single central illustration, caring and nurturing.`;
    
    console.log('For You image prompt:', forYouImagePrompt);
    console.log('For Them image prompt:', forThemImagePrompt);
    
    // Generate both images in parallel
    const [forYouResponse, forThemResponse] = await Promise.all([
      fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: forYouImagePrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          style: 'natural'
        }),
      }),
      fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: forThemImagePrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          style: 'natural'
        }),
      })
    ]);
    
    if (!forYouResponse.ok) {
      const errorData = await forYouResponse.json();
      console.error('For You image generation error:', errorData);
      throw new Error(`For You image generation failed: ${errorData.error?.message || 'Unknown error'}`);
    }
    
    if (!forThemResponse.ok) {
      const errorData = await forThemResponse.json();
      console.error('For Them image generation error:', errorData);
      throw new Error(`For Them image generation failed: ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const forYouData = await forYouResponse.json();
    const forThemData = await forThemResponse.json();
    
    console.log('For You image response:', forYouData);
    console.log('For Them image response:', forThemData);
    
    const result = {
      forYouImage: forYouData.data?.[0]?.url || '',
      forThemImage: forThemData.data?.[0]?.url || ''
    };
    
    console.log('Generated images:', result);
    console.log('=== END GENERATING AI IMAGES ===');
    
    return result;
  } catch (error: any) {
    console.error('=== AI IMAGE GENERATION ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('=== END AI IMAGE GENERATION ERROR ===');
    throw new Error(`Image generation failed: ${error.message || 'Unknown error'}`);
  }
};

// Original function for backward compatibility
export const getAIResponse = async (transcript: string): Promise<AIResponse> => {
  return getAIResponseFast(transcript);
};

// Shuffle specific section with streaming - generates only For You or For Them content progressively
export const shuffleSectionStreaming = async (
  transcript: string, 
  section: 'forYou' | 'forThem',
  onPartialUpdate: (partial: { forYouTitle?: string; forYou?: string; forYouAction?: ActionItem | null; forThemTitle?: string; forThem?: string; forThemAction?: ActionItem | null }) => void
): Promise<{ forYouTitle?: string; forYou?: string; forYouAction?: ActionItem | null; forThemTitle?: string; forThem?: string; forThemAction?: ActionItem | null }> => {
  try {
    console.log(`=== STREAMING SHUFFLE ${section.toUpperCase()} SECTION ===`);
    console.log('Transcript received:', transcript);
    
    const sectionPrompt = section === 'forYou' 
      ? `Can you respond to the following reflection from someone who is providing informal caregiving in addition to their normal work responsibilities.

IMPORTANT: Do not use any markdown formatting. Do not use ** around titles or text. Use plain text only.

Please provide ONLY a "For You" suggestion (for the caregiver's personal well-being). Structure your response exactly as follows:

For You Title: (a short, compelling title for the personal well-being suggestion, 3-6 words)
For You: (provide a practical, tactical and helpful suggestion for something the user might do to improve their personal well-being. The recommendation should reflect what was shared in the transcript.)
For You Action: (provide a specific actionable item with appropriate link type. Choose from: EAP_SESSION, HR_CONTACT, PHONE_SUPPORT, CALENDAR_REMINDER, RESOURCE_LINK, or NONE. Format as "ACTION_TYPE|Display Text|Additional Info". Examples: "EAP_SESSION|Schedule a free EAP session|Mental health support", "HR_CONTACT|Contact HR about flexible work|Work-life balance", "PHONE_SUPPORT|Call employee assistance|1-800-XXX-XXXX", "CALENDAR_REMINDER|Set daily self-care reminder|15 minutes for yourself")

Here is their reflection:
${transcript}`
      : `Can you respond to the following reflection from someone who is providing informal caregiving in addition to their normal work responsibilities.

IMPORTANT: Do not use any markdown formatting. Do not use ** around titles or text. Use plain text only.

Please provide ONLY a "For Them" suggestion (for the person they're caring for). Structure your response exactly as follows:

For Them Title: (a short, compelling title for the caregiving suggestion, 3-6 words)
For Them: (provide a practical, tactical and helpful suggestion for what the user might do to improve the caregiving or well-being of the person or people they're providing informal care to.)
For Them Action: (provide a specific actionable item with appropriate link type. Choose from: CARE_COORDINATION, MEDICAL_CONTACT, RESOURCE_LINK, CALENDAR_REMINDER, SUPPORT_GROUP, or NONE. Format as "ACTION_TYPE|Display Text|Additional Info". Examples: "CARE_COORDINATION|Schedule care team meeting|Coordinate with family", "MEDICAL_CONTACT|Contact primary care doctor|Discuss care plan", "RESOURCE_LINK|Find local support services|Community resources", "SUPPORT_GROUP|Join caregiver support group|Connect with others")

Here is their reflection:
${transcript}`;
    
    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: sectionPrompt
        }
      ],
      max_tokens: 300,
      temperature: 0.8, // Higher temperature for variety
      stream: true, // Enable streaming
    };
    
    console.log(`Streaming request body for ${section} shuffle:`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || JSON.stringify(errorData)}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    const result: { forYouTitle?: string; forYou?: string; forYouAction?: ActionItem | null; forThemTitle?: string; forThem?: string; forThemAction?: ActionItem | null } = {};

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              break;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                accumulatedText += content;
                
                // Parse sections as they come in
                const parsed = parseShuffleStreamingResponse(accumulatedText, section);
                
                // Only update if we have new complete sections
                let hasUpdates = false;
                Object.keys(parsed).forEach(key => {
                  const typedKey = key as keyof typeof result;
                  if (parsed[typedKey] && parsed[typedKey] !== result[typedKey]) {
                    (result as any)[typedKey] = parsed[typedKey];
                    hasUpdates = true;
                  }
                });
                
                if (hasUpdates) {
                  onPartialUpdate({ ...result });
                }
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    // Final parse to ensure we have everything
    const finalResult = parseShuffleStreamingResponse(accumulatedText, section);
    
    console.log(`Final streaming shuffle result for ${section}:`, finalResult);
    console.log(`=== END STREAMING SHUFFLE ${section.toUpperCase()} ===`);
    
    return finalResult;
  } catch (error: any) {
    console.error(`=== STREAMING SHUFFLE ${section.toUpperCase()} ERROR ===`);
    console.error('Error details:', error);
    throw new Error(`Streaming shuffle failed: ${error.message || 'Unknown error'}`);
  }
};

// Helper function to parse streaming shuffle response
const parseShuffleStreamingResponse = (
  text: string, 
  section: 'forYou' | 'forThem'
): { forYouTitle?: string; forYou?: string; forYouAction?: ActionItem | null; forThemTitle?: string; forThem?: string; forThemAction?: ActionItem | null } => {
  if (section === 'forYou') {
    const forYouTitleMatch = text.match(/For You Title:\s*([\s\S]*?)(?=For You:|$)/);
    const forYouMatch = text.match(/For You:\s*([\s\S]*?)(?=For You Action:|$)/);
    const forYouActionMatch = text.match(/For You Action:\s*([\s\S]*?)$/);
    
    return {
      forYouTitle: cleanMarkdown(forYouTitleMatch ? forYouTitleMatch[1].trim() : ''),
      forYou: cleanMarkdown(forYouMatch ? forYouMatch[1].trim() : ''),
      forYouAction: parseActionItem(forYouActionMatch ? forYouActionMatch[1].trim() : ''),
    };
  } else {
    const forThemTitleMatch = text.match(/For Them Title:\s*([\s\S]*?)(?=For Them:|$)/);
    const forThemMatch = text.match(/For Them:\s*([\s\S]*?)(?=For Them Action:|$)/);
    const forThemActionMatch = text.match(/For Them Action:\s*([\s\S]*?)$/);
    
    return {
      forThemTitle: cleanMarkdown(forThemTitleMatch ? forThemTitleMatch[1].trim() : ''),
      forThem: cleanMarkdown(forThemMatch ? forThemMatch[1].trim() : ''),
      forThemAction: parseActionItem(forThemActionMatch ? forThemActionMatch[1].trim() : ''),
    };
  }
};

// Non-streaming shuffle function for backward compatibility
export const shuffleSection = async (
  transcript: string, 
  section: 'forYou' | 'forThem'
): Promise<{ forYouTitle?: string; forYou?: string; forYouAction?: ActionItem | null; forThemTitle?: string; forThem?: string; forThemAction?: ActionItem | null }> => {
  try {
    console.log(`=== SHUFFLING ${section.toUpperCase()} SECTION ===`);
    console.log('Transcript received:', transcript);
    
    const sectionPrompt = section === 'forYou' 
      ? `Can you respond to the following reflection from someone who is providing informal caregiving in addition to their normal work responsibilities.

IMPORTANT: Do not use any markdown formatting. Do not use ** around titles or text. Use plain text only.

Please provide ONLY a "For You" suggestion (for the caregiver's personal well-being). Structure your response exactly as follows:

For You Title: (a short, compelling title for the personal well-being suggestion, 3-6 words)
For You: (provide a practical, tactical and helpful suggestion for something the user might do to improve their personal well-being. The recommendation should reflect what was shared in the transcript.)
For You Action: (provide a specific actionable item with appropriate link type. Choose from: EAP_SESSION, HR_CONTACT, PHONE_SUPPORT, CALENDAR_REMINDER, RESOURCE_LINK, or NONE. Format as "ACTION_TYPE|Display Text|Additional Info". Examples: "EAP_SESSION|Schedule a free EAP session|Mental health support", "HR_CONTACT|Contact HR about flexible work|Work-life balance", "PHONE_SUPPORT|Call employee assistance|1-800-XXX-XXXX", "CALENDAR_REMINDER|Set daily self-care reminder|15 minutes for yourself")

Here is their reflection:
${transcript}`
      : `Can you respond to the following reflection from someone who is providing informal caregiving in addition to their normal work responsibilities.

IMPORTANT: Do not use any markdown formatting. Do not use ** around titles or text. Use plain text only.

Please provide ONLY a "For Them" suggestion (for the person they're caring for). Structure your response exactly as follows:

For Them Title: (a short, compelling title for the caregiving suggestion, 3-6 words)
For Them: (provide a practical, tactical and helpful suggestion for what the user might do to improve the caregiving or well-being of the person or people they're providing informal care to.)
For Them Action: (provide a specific actionable item with appropriate link type. Choose from: CARE_COORDINATION, MEDICAL_CONTACT, RESOURCE_LINK, CALENDAR_REMINDER, SUPPORT_GROUP, or NONE. Format as "ACTION_TYPE|Display Text|Additional Info". Examples: "CARE_COORDINATION|Schedule care team meeting|Coordinate with family", "MEDICAL_CONTACT|Contact primary care doctor|Discuss care plan", "RESOURCE_LINK|Find local support services|Community resources", "SUPPORT_GROUP|Join caregiver support group|Connect with others")

Here is their reflection:
${transcript}`;
    
    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: sectionPrompt
        }
      ],
      max_tokens: 300,
      temperature: 0.8,
    };
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content;
    
    if (!aiText) {
      throw new Error('No content in OpenAI response');
    }
    
    return parseShuffleStreamingResponse(aiText, section);
  } catch (error: any) {
    console.error(`=== SHUFFLE ${section.toUpperCase()} ERROR ===`);
    console.error('Error details:', error);
    throw new Error(`Shuffle failed: ${error.message || 'Unknown error'}`);
  }
};
