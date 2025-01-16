'use server';

import { scrapeChatGPTShare } from '@/lib/scraper';
import { revalidatePath } from 'next/cache';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function extractConversation(prevState: any, formData: FormData) {
    try {
        const url = formData.get('url') as string;

        if (!url?.startsWith('https://chatgpt.com/share/')) {
            return { error: 'Please provide a valid ChatGPT share URL' };
        }

        const conversation = await scrapeChatGPTShare(url);
        revalidatePath('/');

        return { conversation };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        return {
            error: error.message || 'Failed to extract conversation'
        };
    }
}