import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filePath = searchParams.get('path');

        if (!filePath) {
            return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
        }

        const content = readFileSync(filePath, 'utf-8');

        return new NextResponse(content, {
            headers: {
                'Content-Type': 'text/plain',
                'Content-Disposition': `attachment; filename="conversation.txt"`,
            },
        });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to download file' },
            { status: 500 }
        );
    }
}