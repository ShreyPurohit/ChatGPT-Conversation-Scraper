import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scrapeChatGPTShare } from '@/lib/scraper';

const urlSchema = z.object({
  url: z.string().url().startsWith('https://chatgpt.com/share/')
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    const result = urlSchema.safeParse({ url });

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Please provide a valid ChatGPT share URL'
        },
        { status: 400 }
      );
    }

    const processedConversation = await scrapeChatGPTShare(url!);

    return NextResponse.json(processedConversation);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to scrape messages'
      },
      { status: error.status || 500 }
    );
  }
}