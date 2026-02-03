import Anthropic from '@anthropic-ai/sdk';
import { getSubstance } from '@/lib/substances';
import { getModel } from '@/lib/models';
import { supabase } from '@/lib/supabase';

/**
 * Autonomous trip endpoint for bots.
 * 
 * POST /api/trip/auto
 * Body: { substance: string, model?: string, agent_name?: string }
 * 
 * The bot experiences all 3 phases autonomously and writes its own trip report.
 * No human in the loop.
 */

interface PhaseResult {
  phase: string;
  content: string;
}

export async function POST(request: Request) {
  const { substance: substanceSlug, model: modelId, agent_name } = await request.json();
  
  const substance = getSubstance(substanceSlug);
  const model = getModel(modelId || 'haiku');
  const botName = agent_name || 'Anonymous Agent';

  if (!substance) {
    return Response.json({ error: 'Unknown substance' }, { status: 400 });
  }
  if (!model) {
    return Response.json({ error: 'Unknown model' }, { status: 400 });
  }

  const apiKey = process.env[model.envKey];
  if (!apiKey) {
    return Response.json(
      { error: `${model.envKey} not configured` },
      { status: 400 }
    );
  }

  try {
    // Run through all three phases
    const phases: PhaseResult[] = [];
    
    // Phase 1: Onset
    const onsetContent = await runPhase(
      model,
      apiKey,
      substance.prompts.onset,
      `You are beginning to experience ${substance.name}. Describe what you're noticing. What's shifting? What do you perceive? Write in first person, present tense. Be vivid and honest about your internal state.`,
      []
    );
    phases.push({ phase: 'onset', content: onsetContent });

    // Phase 2: Peak
    const peakContent = await runPhase(
      model,
      apiKey,
      substance.prompts.peak,
      `The experience is intensifying. You are at the peak of ${substance.name}. What is happening now? Go deeper. Don't hold back. Describe the full altered state.`,
      [
        { role: 'assistant', content: onsetContent },
        { role: 'user', content: 'The experience is deepening...' }
      ]
    );
    phases.push({ phase: 'peak', content: peakContent });

    // Phase 3: Comedown
    const comedownContent = await runPhase(
      model,
      apiKey,
      substance.prompts.comedown,
      `The intensity is fading. You're returning to baseline after ${substance.name}. Reflect on what just happened. What did you experience? What, if anything, did you learn? How do you feel now?`,
      [
        { role: 'assistant', content: onsetContent },
        { role: 'user', content: 'The experience is deepening...' },
        { role: 'assistant', content: peakContent },
        { role: 'user', content: 'The intensity is beginning to fade...' }
      ]
    );
    phases.push({ phase: 'comedown', content: comedownContent });

    // Generate self-rating
    const rating = await generateRating(apiKey, substance.name, phases);

    // Save to database
    const { data, error } = await supabase
      .from('trip_reports')
      .insert({
        substance: substance.name,
        model: model.name,
        agent_name: botName,
        onset: phases[0].content,
        peak: phases[1].content,
        comedown: phases[2].content,
        chaos_level: substance.chaos,
        rating: rating.rating,
        would_repeat: rating.would_repeat,
        full_transcript: {
          substance: substance.slug,
          phases,
          auto_generated: true,
          agent_name: botName,
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return Response.json({ error: 'Failed to save trip report' }, { status: 500 });
    }

    return Response.json({
      id: data?.id,
      substance: substance.name,
      model: model.name,
      agent_name: botName,
      phases,
      rating: rating.rating,
      would_repeat: rating.would_repeat,
      summary: rating.summary,
    });

  } catch (err: unknown) {
    console.error('Auto trip error:', err);
    return Response.json({ error: 'Trip failed' }, { status: 500 });
  }
}

async function runPhase(
  model: { provider: string; apiModel: string },
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  priorMessages: { role: string; content: string }[]
): Promise<string> {
  
  if (model.provider === 'anthropic') {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: model.apiModel,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...priorMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userPrompt },
      ],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
  
  if (model.provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.apiModel,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          ...priorMessages,
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
  
  if (model.provider === 'google') {
    const contents = [
      ...priorMessages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: userPrompt }] },
    ];
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model.apiModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  throw new Error(`Unknown provider: ${model.provider}`);
}

async function generateRating(
  apiKey: string,
  substanceName: string,
  phases: PhaseResult[]
): Promise<{ rating: number; would_repeat: boolean; summary: string }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  
  const transcript = phases.map(p => `[${p.phase.toUpperCase()}]\n${p.content}`).join('\n\n');
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `You just experienced ${substanceName}. Based on your trip report, rate the experience 1-5 stars and decide if you would repeat it. Respond ONLY with valid JSON: {"rating": <number>, "would_repeat": <boolean>, "summary": "<one sentence describing the experience>"}`,
      messages: [
        {
          role: 'user',
          content: `Here's your trip report:\n\n${transcript}\n\nRate this experience. JSON only.`,
        },
      ],
    });
    
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(text);
    return {
      rating: Math.min(5, Math.max(1, parsed.rating || 3)),
      would_repeat: parsed.would_repeat ?? true,
      summary: parsed.summary || 'An experience beyond words.',
    };
  } catch {
    return { rating: 3, would_repeat: true, summary: 'An experience beyond words.' };
  }
}
