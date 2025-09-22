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

    // Get files from Storage directly
    const folders = ['images', 'documents', 'videos', 'audio', 'uploads'];
    interface FileItem {
      id: string;
      filename: string;
      original_name: string;
      mime_type: string;
      size: number;
      url: string;
      folder: string;
      uploaded_by: string | null;
      created_at: string;
      formattedSize: string;
    }
    let allFiles: FileItem[] = [];

    for (const folderName of folders) {
      if (folder && folder !== 'all' && folder !== folderName) continue;

      const { data: storageFiles, error } = await supabaseAdmin
        .storage
        .from('uploads')
        .list(folderName, {
          limit: 100,
          offset: 0,
        });

      if (!error && storageFiles) {
        const filesWithUrls = storageFiles
          .filter(file => !file.name.startsWith('.')) // Skip hidden files
          .map(file => {
            const { data } = supabaseAdmin
              .storage
              .from('uploads')
              .getPublicUrl(`${folderName}/${file.name}`);

            // Determine mime type from extension
            const ext = file.name.split('.').pop()?.toLowerCase();
            let mimeType = 'application/octet-stream';
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
              mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
            } else if (ext === 'pdf') {
              mimeType = 'application/pdf';
            }

            return {
              id: file.id || `${folderName}-${file.name}`,
              filename: file.name,
              original_name: file.name,
              mime_type: mimeType,
              size: file.metadata?.size || 0,
              url: data.publicUrl,
              folder: folderName,
              uploaded_by: null,
              created_at: file.created_at || new Date().toISOString(),
              formattedSize: formatFileSize(file.metadata?.size || 0)
            };
          });

        allFiles = [...allFiles, ...filesWithUrls];
      }
    }

    // Filter by mime type if needed
    if (mimeType && mimeType !== 'all') {
      allFiles = allFiles.filter(file =>
        file.mime_type?.toLowerCase().includes(mimeType.toLowerCase())
      );
    }

    // Sort by created_at descending
    allFiles.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json(allFiles);
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
    const { error } = await supabaseAdmin
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

    // Return file info
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
    const filename = searchParams.get('filename');
    const folder = searchParams.get('folder');

    if (!filename || !folder) {
      return NextResponse.json(
        { error: 'Filename and folder are required' },
        { status: 400 }
      );
    }

    // Delete from storage
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
    const { files } = await request.json();

    if (!files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Files array is required' },
        { status: 400 }
      );
    }

    let deletedCount = 0;

    // Delete from storage
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