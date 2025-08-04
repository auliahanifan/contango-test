import { type NextRequest } from 'next/server'
import { db } from '~/server/db';
import { submissions } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { ee } from '~/server/api/routers/cv';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { submissionId, status, mismatches } = body;

  await db.update(submissions).set({
    status,
    mismatches,
  }).where(eq(submissions.id, submissionId));

  ee.emit('statusChange', { submissionId, status, mismatches });

  return new Response('OK', { status: 200 });
}