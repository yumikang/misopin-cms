# Supabase 파일 관리 시스템 설정 가이드

## 📋 설정 순서

이 문서는 Supabase에서 파일 관리 시스템을 설정하는 방법을 설명합니다.

---

## 1️⃣ Files 테이블 생성

### 방법: Supabase SQL Editor 사용

1. **Supabase Dashboard 접속**
   - URL: https://supabase.com/dashboard/project/wizlegjvfapykufzrojl/sql/new

2. **아래 SQL 복사 후 실행**

```sql
-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size BIGINT,
  url TEXT NOT NULL,
  folder TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_files_folder ON files(folder);
CREATE INDEX idx_files_mime_type ON files(mime_type);
CREATE INDEX idx_files_created_at ON files(created_at DESC);

-- Enable Row Level Security
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Create public access policies
CREATE POLICY "Public read access" ON files
  FOR SELECT USING (true);

CREATE POLICY "Public insert access" ON files
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access" ON files
  FOR UPDATE USING (true);

CREATE POLICY "Public delete access" ON files
  FOR DELETE USING (true);
```

3. **"Run" 버튼 클릭**

4. **테이블 생성 확인**
   - Table Editor 메뉴에서 `files` 테이블이 생성되었는지 확인

---

## 2️⃣ Storage 버킷 정책 설정

### 방법: Storage Policies 설정

1. **Storage Policies 페이지 접속**
   - URL: https://supabase.com/dashboard/project/wizlegjvfapykufzrojl/storage/policies

2. **"uploads" 버킷 선택**
   - 버킷 목록에서 "uploads" 클릭

3. **새 정책 추가 (New Policy)**

   각각의 정책을 순서대로 추가:

   ### Policy 1: Public Read (공개 읽기)
   - **Policy name**: `Public read access`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `anon`, `authenticated` (둘 다 체크)
   - **WITH CHECK expression**: (비워둠)
   - **USING expression**: `true`
   - **Save** 클릭

   ### Policy 2: Public Insert (업로드)
   - **Policy name**: `Public insert access`
   - **Allowed operation**: `INSERT`
   - **Target roles**: `anon`, `authenticated` (둘 다 체크)
   - **WITH CHECK expression**: `true`
   - **USING expression**: (비워둠)
   - **Save** 클릭

   ### Policy 3: Public Update (수정)
   - **Policy name**: `Public update access`
   - **Allowed operation**: `UPDATE`
   - **Target roles**: `authenticated`
   - **WITH CHECK expression**: `true`
   - **USING expression**: `true`
   - **Save** 클릭

   ### Policy 4: Public Delete (삭제)
   - **Policy name**: `Public delete access`
   - **Allowed operation**: `DELETE`
   - **Target roles**: `authenticated`
   - **WITH CHECK expression**: (비워둠)
   - **USING expression**: `true`
   - **Save** 클릭

---

## 3️⃣ 설정 확인

### 테스트 방법

1. **CMS 파일 관리 페이지 접속**
   - URL: https://misopin-cms.vercel.app/admin/files

2. **파일 업로드 테스트**
   - "파일 업로드" 버튼 클릭
   - 이미지 파일 선택
   - 업로드 확인

3. **업로드된 파일 확인**
   - 파일 목록에 표시되는지 확인
   - "보기" 버튼 클릭하여 이미지 표시 확인

---

## ⚠️ 문제 해결

### 파일이 업로드되지 않는 경우
- Storage 정책이 모두 설정되었는지 확인
- 버킷이 public으로 설정되어 있는지 확인

### 이미지가 표시되지 않는 경우
- Public read access 정책이 설정되었는지 확인
- 파일 URL이 정상적으로 생성되는지 확인

### 테이블 생성 오류
- 이미 테이블이 존재하는 경우 무시 가능
- Table Editor에서 files 테이블 구조 확인

---

## 📌 빠른 링크

- **SQL Editor**: https://supabase.com/dashboard/project/wizlegjvfapykufzrojl/sql/new
- **Storage Policies**: https://supabase.com/dashboard/project/wizlegjvfapykufzrojl/storage/policies
- **Table Editor**: https://supabase.com/dashboard/project/wizlegjvfapykufzrojl/editor
- **Storage Browser**: https://supabase.com/dashboard/project/wizlegjvfapykufzrojl/storage/buckets

---

## ✅ 체크리스트

- [ ] Files 테이블 생성 완료
- [ ] 인덱스 생성 완료
- [ ] RLS 활성화 완료
- [ ] 테이블 정책 4개 생성 완료
- [ ] Storage 버킷 정책 4개 생성 완료
- [ ] 파일 업로드 테스트 완료
- [ ] 파일 표시 테스트 완료

모든 항목이 완료되면 파일 관리 시스템이 정상 작동합니다!