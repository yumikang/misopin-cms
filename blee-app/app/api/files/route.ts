import { NextResponse } from 'next/server';
import type { File as DatabaseFile } from '@/lib/types/database';

// Mock data for testing
const mockFiles: DatabaseFile[] = [
  {
    id: '1',
    filename: 'banner-main.webp',
    original_name: 'banner-main.jpg',
    mime_type: 'image/webp',
    size: 245678,
    url: 'https://via.placeholder.com/1920x600',
    folder: 'banners',
    uploaded_by: null,
    created_at: '2025-01-10T09:00:00'
  },
  {
    id: '2',
    filename: 'doctor-profile.webp',
    original_name: 'doctor-profile.png',
    mime_type: 'image/webp',
    size: 156234,
    url: 'https://via.placeholder.com/400x400',
    folder: 'profiles',
    uploaded_by: null,
    created_at: '2025-01-11T10:30:00'
  },
  {
    id: '3',
    filename: 'treatment-before.webp',
    original_name: 'before.jpg',
    mime_type: 'image/webp',
    size: 189456,
    url: 'https://via.placeholder.com/600x400',
    folder: 'treatments',
    uploaded_by: null,
    created_at: '2025-01-12T14:20:00'
  },
  {
    id: '4',
    filename: 'treatment-after.webp',
    original_name: 'after.jpg',
    mime_type: 'image/webp',
    size: 195678,
    url: 'https://via.placeholder.com/600x400',
    folder: 'treatments',
    uploaded_by: null,
    created_at: '2025-01-12T14:25:00'
  },
  {
    id: '5',
    filename: 'clinic-interior.webp',
    original_name: 'clinic-interior.jpg',
    mime_type: 'image/webp',
    size: 312456,
    url: 'https://via.placeholder.com/800x600',
    folder: 'gallery',
    uploaded_by: null,
    created_at: '2025-01-13T16:00:00'
  },
  {
    id: '6',
    filename: 'terms-of-service.pdf',
    original_name: '이용약관.pdf',
    mime_type: 'application/pdf',
    size: 524288,
    url: '/documents/terms.pdf',
    folder: 'documents',
    uploaded_by: null,
    created_at: '2025-01-14T09:00:00'
  },
  {
    id: '7',
    filename: 'privacy-policy.pdf',
    original_name: '개인정보처리방침.pdf',
    mime_type: 'application/pdf',
    size: 456789,
    url: '/documents/privacy.pdf',
    folder: 'documents',
    uploaded_by: null,
    created_at: '2025-01-14T09:30:00'
  }
];

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get('folder');
  const mimeType = searchParams.get('mime_type');

  let filtered = [...mockFiles];

  if (folder) {
    filtered = filtered.filter(file => file.folder === folder);
  }

  if (mimeType) {
    filtered = filtered.filter(file => file.mime_type?.includes(mimeType));
  }

  // Add formatted size to response
  const filesWithFormattedSize = filtered.map(file => ({
    ...file,
    formattedSize: file.size ? formatFileSize(file.size) : 'Unknown'
  }));

  return NextResponse.json(filesWithFormattedSize);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Mock file upload - in real implementation, upload to S3/Cloudinary
    const newFile: DatabaseFile = {
      id: Date.now().toString(),
      filename: `${Date.now()}-${file.name.replace(/\.[^/.]+$/, '')}.webp`,
      original_name: file.name,
      mime_type: file.type,
      size: file.size,
      url: `https://via.placeholder.com/800x600?text=${encodeURIComponent(file.name)}`,
      folder: folder,
      uploaded_by: null,
      created_at: new Date().toISOString()
    };

    mockFiles.push(newFile);

    return NextResponse.json({
      ...newFile,
      formattedSize: formatFileSize(newFile.size || 0)
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'File ID is required' },
      { status: 400 }
    );
  }

  const index = mockFiles.findIndex(f => f.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  }

  mockFiles.splice(index, 1);
  return NextResponse.json({ success: true });
}

// Batch delete endpoint
export async function PUT(request: Request) {
  const { ids } = await request.json();

  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json(
      { error: 'File IDs array is required' },
      { status: 400 }
    );
  }

  let deletedCount = 0;
  for (const id of ids) {
    const index = mockFiles.findIndex(f => f.id === id);
    if (index !== -1) {
      mockFiles.splice(index, 1);
      deletedCount++;
    }
  }

  return NextResponse.json({
    success: true,
    deletedCount,
    message: `${deletedCount}개 파일이 삭제되었습니다.`
  });
}