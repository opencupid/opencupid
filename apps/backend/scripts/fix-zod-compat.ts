#!/usr/bin/env tsx
/**
 * Post-generation script to fix Zod v3.24 compatibility with zod-prisma-types 3.3.11
 * 
 * zod-prisma-types 3.3.11 generates code for Zod v4 API using `z.cuid()`,
 * but Zod 3.24.4 only supports `z.string().cuid()`.
 * 
 * This script replaces all occurrences of `z.cuid()` with `z.string().cuid()`
 * in the generated Zod schemas.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const GENERATED_FILE_PATH = join(
  __dirname,
  '../../../packages/shared/zod/generated/index.ts'
);

function fixZodCompatibility() {
  console.log('Fixing Zod v3.24 compatibility in generated schemas...');

  try {
    // Read the generated file
    let content = readFileSync(GENERATED_FILE_PATH, 'utf-8');

    // Count occurrences before replacement
    const beforeCount = (content.match(/z\.cuid\(\)/g) || []).length;
    console.log(`Found ${beforeCount} occurrences of z.cuid()`);

    if (beforeCount === 0) {
      console.log('No replacements needed.');
      return;
    }

    // Replace z.cuid() with z.string().cuid()
    content = content.replace(/z\.cuid\(\)/g, 'z.string().cuid()');

    // Verify replacements
    const afterCount = (content.match(/z\.cuid\(\)/g) || []).length;
    const replacedCount = beforeCount - afterCount;

    console.log(`Replaced ${replacedCount} occurrences`);
    console.log(`Remaining z.cuid(): ${afterCount}`);

    // Write the fixed content back to the file
    writeFileSync(GENERATED_FILE_PATH, content, 'utf-8');

    console.log('✓ Successfully fixed Zod compatibility');
  } catch (error) {
    console.error('Error fixing Zod compatibility:', error);
    process.exit(1);
  }
}

fixZodCompatibility();
