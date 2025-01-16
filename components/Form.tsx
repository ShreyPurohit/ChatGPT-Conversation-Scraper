'use client';

import { FileText } from 'lucide-react';
import { useActionState } from 'react';
import { extractConversation } from '@/lib/actions';
import ResultsDisplay from '@/components/ResultDisplay';

export default function Form() {
    const [state, formAction] = useActionState(extractConversation, null);

    return (
        <>
            <form action={formAction} className="space-y-6">
                <div>
                    <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-2">
                        ChatGPT Share URL
                    </label>
                    <input
                        type="url"
                        id="url"
                        name="url"
                        placeholder="https://chatgpt.com/share/..."
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                        required
                        pattern="https://chatgpt\.com/share/.*"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition duration-150 ease-in-out flex items-center justify-center gap-2"
                >
                    <FileText className="w-5 h-5" />
                    Extract Conversation
                </button>
            </form>

            {state?.error && (
                <div className="mt-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                    {state.error}
                </div>
            )}

            {state?.conversation && <ResultsDisplay conversation={state.conversation} />}
        </>
    );
}