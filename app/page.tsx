import { FileText } from 'lucide-react';
import Form from '@/components/Form';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <FileText className="w-16 h-16 text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold mb-4">ChatGPT Conversation Scraper</h1>
          <p className="text-lg text-gray-300">
            Extract and format text from your ChatGPT shared conversations
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
          <Form />

          <div className="mt-8 text-sm text-gray-400">
            <h2 className="font-medium text-gray-300 mb-2">How it works:</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>Share your ChatGPT conversation and copy the share URL</li>
              <li>Paste the URL in the input field above</li>
              <li>Click &quot;Extract Conversation&quot; to get your formatted text</li>
              <li>Download the conversation in a clean, readable format</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}