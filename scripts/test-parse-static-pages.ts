import * as fs from 'fs';
import * as path from 'path';
import { parseEditableAttributes } from '../lib/static-pages/attribute-parser';

const distPath = '/Users/blee/Desktop/cms/Misopin-renew/dist';

async function testParsing() {
  const htmlFiles = fs.readdirSync(distPath).filter(f => f.endsWith('.html'));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Found ${htmlFiles.length} HTML files in ${distPath}`);
  console.log(`${'='.repeat(60)}\n`);

  const results: any[] = [];

  for (const file of htmlFiles) {
    const filePath = path.join(distPath, file);
    const html = fs.readFileSync(filePath, 'utf-8');

    const result = parseEditableAttributes(html, {
      includeBackgrounds: true,
      includeImages: true,
      validateAttributes: true,
      strictMode: false,
    });

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📄 FILE: ${file}`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`✅ Success: ${result.success}`);
    console.log(`📊 Elements: ${result.elements.length}`);

    if (result.warnings && result.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${result.warnings.length}`);
      result.warnings.forEach(w => console.log(`   - ${w}`));
    }

    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    }

    // 섹션별 그룹화
    const sections = new Set(result.elements.map(e => e.sectionName).filter(Boolean));
    console.log(`🗂️  Sections: ${sections.size > 0 ? Array.from(sections).join(', ') : 'None'}`);

    // 요소 타입별 집계
    const typeCount: Record<string, number> = {};
    result.elements.forEach(el => {
      typeCount[el.type] = (typeCount[el.type] || 0) + 1;
    });
    console.log(`📋 Type breakdown:`);
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });

    // ID 중복 검사
    const ids = result.elements.map(e => e.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      console.log(`🚨 Duplicate IDs found: ${[...new Set(duplicates)].join(', ')}`);
    } else {
      console.log(`✓ No duplicate IDs`);
    }

    results.push({
      file,
      success: result.success,
      elementCount: result.elements.length,
      warnings: result.warnings?.length || 0,
      error: result.error,
      sections: Array.from(sections),
      types: typeCount,
      hasDuplicates: duplicates.length > 0,
    });
  }

  // 전체 요약
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total files: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`With warnings: ${results.filter(r => r.warnings > 0).length}`);
  console.log(`With errors: ${results.filter(r => r.error).length}`);
  console.log(`With duplicates: ${results.filter(r => r.hasDuplicates).length}`);
  console.log(`Total elements: ${results.reduce((sum, r) => sum + r.elementCount, 0)}`);
  console.log(`${'='.repeat(60)}\n`);

  return results;
}

testParsing().catch(console.error);
