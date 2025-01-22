"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import MarkdownPreview from "@uiw/react-markdown-preview";

interface ResultsDisplayProps {
  conversation: {
    messages: {
      content: string | string[];
      role: string;
    }[];
  };
}

export default function ResultsDisplay({ conversation }: ResultsDisplayProps) {
  const [copied] = useState(false);

  // const copyToClipboard = async () => {
  //   if (conversation?.llmFriendlyText) {
  //     await navigator.clipboard.writeText(conversation.llmFriendlyText);
  //     setCopied(true);
  //     setTimeout(() => setCopied(false), 2000);
  //   }
  // };

  return (
    <div className="mt-8 space-y-6">
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-200">
            Conversation Summary
          </h3>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
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
          </div>
        </div>
        <div className="relative">
          <pre className="bg-gray-950 rounded-lg p-4 overflow-x-auto text-sm text-gray-300 whitespace-pre-wrap">
            {/* <Markdown>{conversation.llmFriendlyText}</Markdown> */}
            {/* <MarkdownPreview source={conversation.llmFriendlyText} /> */}
            {conversation.messages.map((msg, i) => {
              return (
                <div key={i}>
                  <p>======================================</p>
                  <p>{msg.role}</p>
                  <p>======================================</p>
                  <MarkdownContent msg={msg} />
                </div>
              );
            })}
          </pre>
          {/* <p>{conversation.llmFriendlyText}</p> */}
        </div>
      </div>
    </div>
  );
}

const MarkdownContent = ({
  msg,
}: {
  msg: { content: string | string[]; role: string };
}) => {
  return typeof msg.content == "string" ? (
    <MarkdownPreview source={msg.content}></MarkdownPreview>
  ) : (
    msg.content.map((content, i) => (
      <MarkdownPreview key={i} source={content}></MarkdownPreview>
    ))
  );
};
