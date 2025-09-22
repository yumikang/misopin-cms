import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Helper function to determine folder based on mime type
function getFolderByMimeType(mimeType: string): string {
  if (mimeType.includes('image')) return 'images';
  if (mimeType.includes('pdf')) return 'documents';
  if (mimeType.includes('video')) return 'videos';
  if (mimeType.includes('audio')) return 'audio';
  return 'uploads';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');
    const mimeType = searchParams.get('mime_type');

    // Build query
    let query = supabaseAdmin
      .from('files')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (folder && folder !== 'all') {
      query = query.eq('folder', folder);
    }

    if (mimeType && mimeType !== 'all') {
      // Filter by mime type prefix
      query = query.ilike('mime_type', `${mimeType}%`);
    }

    const { data: files, error } = await query;

    if (error) {
      console.error('Error fetching files from database:', error);
      // Fallback to empty array
      return NextResponse.json([]);
    }

    // Filter out mock/placeholder files and add formatted size
    const filesWithFormattedSize = (files || [])
      .filter(file => !file.url?.includes('placeholder.com'))
      .map(file => ({
        ...file,
        formattedSize: formatFileSize(file.size || 0)
      }));

    return NextResponse.json(filesWithFormattedSize);
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    let folder = formData.get('folder') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Determine folder based on file type if not provided
    if (!folder) {
      folder = getFolderByMimeType(file.type);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}-${file.name.replace(/\.[^/.]+$/, '')}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin
      .storage
      .from('uploads')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from('uploads')
      .getPublicUrl(filePath);

    // Save file metadata to database
    const { data: fileRecord, error: dbError } = await supabaseAdmin
      .from('files')
      .insert({
        filename: fileName,
        original_name: file.name,
        mime_type: file.type,
        size: file.size,
        url: urlData.publicUrl,
        folder: folder,
        uploaded_by: null
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // File uploaded but metadata not saved - return URL anyway
      return NextResponse.json({
        id: timestamp.toString(),
        filename: fileName,
        original_name: file.name,
        mime_type: file.type,
        size: file.size,
        url: urlData.publicUrl,
        folder: folder,
        uploaded_by: null,
        created_at: new Date().toISOString(),
        formattedSize: formatFileSize(file.size)
      }, { status: 201 });
    }

    return NextResponse.json({
      ...fileRecord,
      formattedSize: formatFileSize(fileRecord.size || 0)
    }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const filename = searchParams.get('filename');
    const folder = searchParams.get('folder');

    if (!id && !filename) {
      return NextResponse.json(
        { error: 'File ID or filename is required' },
        { status: 400 }
      );
    }

    // Try to delete from database first
    if (id) {
      const { error: dbError } = await supabaseAdmin
        .from('files')
        .delete()
        .eq('id', id);

      if (dbError) {
        console.error('Database delete error:', dbError);
      }
    }

    // Delete from storage if filename is provided
    if (filename && folder) {
      const filePath = `${folder}/${filename}`;
      const { error: storageError } = await supabaseAdmin
        .storage
        .from('uploads')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        return NextResponse.json(
          { error: 'Failed to delete file from storage' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

// Batch delete endpoint
export async function PUT(request: Request) {
  try {
    const { ids, files } = await request.json();

    if (!ids && !files) {
      return NextResponse.json(
        { error: 'File IDs or files array is required' },
        { status: 400 }
      );
    }

    let deletedCount = 0;

    // Delete from database if IDs provided
    if (ids && Array.isArray(ids)) {
      for (const id of ids) {
        const { error } = await supabaseAdmin
          .from('files')
          .delete()
          .eq('id', id);

        if (!error) {
          deletedCount++;
        }
      }
    }

    // Delete from storage if files provided
    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (file.filename && file.folder) {
          const filePath = `${file.folder}/${file.filename}`;
          const { error } = await supabaseAdmin
            .storage
            .from('uploads')
            .remove([filePath]);

          if (!error) {
            deletedCount++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount}개 파일이 삭제되었습니다.`
    });
  } catch (error) {
    console.error('Batch delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete files' },
      { status: 500 }
    );
  }
}