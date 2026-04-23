import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ensureAppUser } from '@/lib/db/user';
import { featuresFor } from '@/lib/features';
import { jsPDF } from 'jspdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const storyId = url.searchParams.get('story_id');
  if (!storyId) return NextResponse.json({ error: 'story_id required' }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const user = await ensureAppUser(admin, auth.user.id, auth.user.email ?? '');
  const features = featuresFor(user.plan);
  if (!features.pdfExport) {
    return NextResponse.json({ error: 'feature_locked', feature: 'pdfExport' }, { status: 402 });
  }

  const { data: story } = await admin
    .from('stories')
    .select('title, text, created_at')
    .eq('id', storyId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!story) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 60;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  const titleLines = doc.splitTextToSize(story.title, maxWidth);
  doc.text(titleLines, pageWidth / 2, margin + 10, { align: 'center' });

  // Body
  doc.setFont('times', 'normal');
  doc.setFontSize(13);
  const body = doc.splitTextToSize(story.text, maxWidth);
  let y = margin + 40 + titleLines.length * 26;
  for (const line of body) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 20;
  }

  const blob = doc.output('arraybuffer') as ArrayBuffer;
  return new NextResponse(Buffer.from(blob), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${story.title.replace(/[^a-z0-9\-_ ]/gi, '').slice(0, 40) || 'story'}.pdf"`,
    },
  });
}
