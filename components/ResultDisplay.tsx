'use client';

import { ProcessedConversation } from '@/lib/types';
import { Copy, Check, Download } from 'lucide-react';
import { useState } from 'react';

interface ResultsDisplayProps {
    conversation: ProcessedConversation;
}

export default function ResultsDisplay({ conversation }: ResultsDisplayProps) {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async () => {
        if (conversation?.llmFriendlyText) {
            await navigator.clipboard.writeText(conversation.llmFriendlyText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="mt-8 space-y-6">
            <div className="bg-gray-900 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-200">Conversation Summary</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={copyToClipboard}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 text-green-400" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copy
                                </>
                            )}
                        </button>
                        {conversation.file && (
                            <a
                                href={`/api/download?path=${encodeURIComponent(conversation.file.path)}`}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Download
                            </a>
                        )}
                    </div>
                </div>
                <div className="text-sm text-gray-400 mb-4">
                    {conversation.summary.summary}
                </div>
                <div className="relative">
                    <pre className="bg-gray-950 rounded-lg p-4 overflow-x-auto text-sm text-gray-300 whitespace-pre-wrap">
                        {conversation.llmFriendlyText}
                    </pre>
                </div>
            </div>
        </div>
    );
}