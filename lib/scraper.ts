import puppeteer from 'puppeteer-core';
import { marked } from 'marked';
import { Message, ProcessedConversation } from './types';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

async function processMarkdown(content: string): Promise<string> {
    return await marked.parse(content, {
        gfm: true,
        breaks: true
    });
}

function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function convertToLLMFormat(messages: Message[]): string {
    return messages
        .map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            const separator = '='.repeat(48);

            const parts = msg.content.split(/(<pre><code[^>]*>|<\/code><\/pre>)/);
            let formattedContent = '';

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (part.startsWith('<pre><code')) {
                    const langMatch = part.match(/class="language-([^"]+)"/);
                    const lang = langMatch ? langMatch[1] : '';

                    const code = decodeHtmlEntities(parts[++i]);

                    formattedContent += `\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`;
                } else if (!part.startsWith('</code></pre>')) {
                    formattedContent += decodeHtmlEntities(part.replace(/<[^>]+>/g, '')).trim() + '\n';
                }
            }

            return `${separator}\n${role}\n${separator}\n${formattedContent.trim()}\n\n`;
        })
        .join('');
}

function generateSummary(messages: Message[]) {
    const messageCount = messages.length;
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;

    return {
        totalMessages: messageCount,
        userMessages,
        assistantMessages,
        summary: `This conversation contains ${messageCount} messages (${userMessages} from user, ${assistantMessages} from assistant).`
    };
}

function saveConversation(conversation: ProcessedConversation, shareURL: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const urlId = new URL(shareURL).pathname.split('/').pop();
    const filename = `conversation-${urlId}-${timestamp}.txt`;

    const outputDir = path.join(process.cwd(), 'conversations');
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, filename);
    writeFileSync(outputPath, conversation.llmFriendlyText);

    return { filename, path: outputPath };
}

export async function scrapeChatGPTShare(shareURL: string): Promise<ProcessedConversation> {
    const browser = await puppeteer.launch({
        headless: 'shell',
        executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    });

    try {
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(30000);
        await page.setViewport({ width: 1920, height: 1080 });

        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const resourceType = request.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                request.abort();
            } else {
                request.continue();
            }
        });

        console.log('Navigating to URL:', shareURL);
        const response = await page.goto(shareURL, {
            waitUntil: ['domcontentloaded', 'networkidle2'],
            timeout: 60000
        });

        if (!response?.ok()) {
            throw {
                status: response?.status() || 500,
                message: `Failed to load ChatGPT share URL: ${response?.statusText() || 'Unknown error'}`
            };
        }

        console.log('Waiting for messages to load...');
        await page.waitForSelector('[data-message-author-role]', {
            timeout: 30000,
            visible: true
        });

        console.log('Extracting messages...');
        const rawMessages = await page.evaluate(() => {
            const messageElements = document.querySelectorAll('[data-message-author-role]');

            return Array.from(messageElements).map(element => {
                const role = element.getAttribute('data-message-author-role') ?? '';
                const markdownContent = element.querySelector('.markdown');

                if (markdownContent) {
                    const clone = markdownContent.cloneNode(true) as Element;
                    clone.querySelectorAll('pre code').forEach(block => {
                        const language = block.className.replace('language-', '');
                        block.textContent = `\`\`\`${language}\n${block.textContent?.trim()}\n\`\`\``;
                    });
                    return { role, content: clone.textContent?.trim() ?? '' };
                }

                return { role, content: element.textContent?.trim() ?? '' };
            });
        });

        if (!rawMessages.length) {
            throw new Error('No messages found in the conversation');
        }

        console.log(`Found ${rawMessages.length} messages`);
        const processedMessages = await Promise.all(
            rawMessages.map(async msg => ({
                ...msg,
                content: await processMarkdown(msg.content)
            }))
        );

        const conversation = {
            messages: processedMessages,
            llmFriendlyText: convertToLLMFormat(processedMessages),
            summary: generateSummary(processedMessages)
        };

        console.log('Saving conversation to file...');
        const fileInfo = saveConversation(conversation, shareURL);

        return {
            ...conversation,
            file: fileInfo
        };
    } catch (error) {
        console.error('Scraping error details:', error);
        throw error;
    } finally {
        await browser.close();
    }
}