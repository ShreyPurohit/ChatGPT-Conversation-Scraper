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

function cleanAndFormatText(text: string): string {
    return text
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
}

function convertToLLMFormat(messages: Message[]): string {
    return messages
        .map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            const separator = '='.repeat(48);
            let formattedContent = '';

            // Split content into parts based on code blocks
            const parts = msg.content.split(/(<pre><code[^>]*>|<\/code><\/pre>)/);

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];

                if (part.startsWith('<pre><code')) {
                    // Extract language if specified
                    const langMatch = part.match(/class="language-([^"]+)"/);
                    const lang = langMatch ? langMatch[1] : '';

                    // Get the code content and decode HTML entities
                    const code = decodeHtmlEntities(parts[++i]);

                    // Special handling for code that contains backticks
                    const codeContent = code.trim();
                    const backtickCount = (codeContent.match(/`/g) || []).length;
                    const fenceLength = Math.max(3, backtickCount + 1);
                    const fence = '`'.repeat(fenceLength);

                    // Format the code block with proper indentation
                    formattedContent += `${fence}${lang}\n${codeContent}\n${fence}\n\n`;

                } else if (!part.startsWith('</code></pre>')) {
                    // Handle regular text
                    const cleanText = cleanAndFormatText(decodeHtmlEntities(part));
                    if (cleanText) {
                        formattedContent += cleanText + '\n\n';
                    }
                }
            }

            // Clean up extra whitespace while preserving intentional line breaks
            formattedContent = formattedContent
                .replace(/\n{3,}/g, '\n\n')
                .trim();

            return `${separator}\n${role}\n${separator}\n${formattedContent}\n`;
        })
        .join('\n');
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

export async function scrapeChatGPTShare(shareURL: string) {
    const browser = await puppeteer.launch({
        headless: "shell",
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
                    const content = Array.from(clone.children).map(block => {
                        if (block.tagName.toLowerCase() != "pre") {
                            return block.textContent ?? "";
                        }
                        const code = block.querySelector("code");
                        const lang = Array.from(code?.classList ?? []).filter((classname) => classname.includes("language-"))[0] ?? "";
                        const language = lang.replace('language-', '');
                        const map: Record<string, string> = {
                            typescript: "ts",
                            javascript: "js",
                        }
                        return `\`\`\`${map[language]} ${code?.textContent?.trim()}\`\`\``;
                    });
                    return { role, content, };
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
                content: typeof msg.content == "string" ? await processMarkdown(msg.content) : await Promise.all(msg.content.map(async (m) => await processMarkdown(m)))
            }))
        )

        const conversation = {
            messages: processedMessages,
            // llmFriendlyText: convertToLLMFormat(processedMessages),
            // summary: generateSummary(processedMessages)
        };

        console.log('Saving conversation to file...');
        // const fileInfo = saveConversation(conversation, shareURL);
        return {
            ...conversation,
            // file: fileInfo
        };
    } catch (error) {
        console.error('Scraping error details:', error);
        throw error;
    } finally {
        await browser.close();
    }
}