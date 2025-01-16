export interface Message {
    role: string;
    content: string;
}

export interface ConversationSummary {
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    summary: string;
}

export interface FileInfo {
    filename: string;
    path: string;
}

export interface ProcessedConversation {
    messages: Message[];
    llmFriendlyText: string;
    summary: ConversationSummary;
    file?: FileInfo;
}