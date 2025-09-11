#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Run tests and capture output
function getTestCounts() {
  try {
    // Since this script is now in crm-orbit/scripts/, we need to go up one level
    const cwd = path.join(__dirname, '..');
    const result = execSync('npm test -- --json --testPathPattern="src/database/__tests__"', 
      { encoding: 'utf8', stdio: 'pipe', cwd });
    
    const lines = result.split('\n');
    const jsonLine = lines.find(line => line.startsWith('{') && line.includes('numTotalTests'));
    
    if (jsonLine) {
      const testResult = JSON.parse(jsonLine);
      return {
        total: testResult.numTotalTests,
        passed: testResult.numPassedTests,
        suites: testResult.numTotalTestSuites
      };
    }
  } catch (error) {
    console.error('Failed to run tests:', error.message);
  }
  
  return null;
}

// Update file with new test counts
function updateFile(filePath, updates) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  updates.forEach(({ pattern, replacement }) => {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
    return true;
  }
  
  return false;
}

function main() {
  const counts = getTestCounts();
  if (!counts) {
    console.error('Could not determine test counts');
    process.exit(1);
  }
  
  console.log(`Found ${counts.passed}/${counts.total} tests passing across ${counts.suites} suites`);
  
  const files = [
    {
      // Now we're in crm-orbit/scripts, so README.md is one level up
      path: path.join(__dirname, '../README.md'),
      updates: [
        {
          pattern: /### Database Testing\n- \*\*\d+ tests\*\* across \d+ test suites/g,
          replacement: `### Database Testing\n- **${counts.total} tests** across ${counts.suites} test suites`
        },
        {
          pattern: /- Comprehensive test coverage \(\d+ passing tests\)/g,
          replacement: `- Comprehensive test coverage (${counts.passed} passing tests)`
        }
      ]
    },
    {
      path: path.join(__dirname, '../src/database/__tests__/AGENTS.md'),
      updates: [
        {
          pattern: /\*\*\d+ tests passing\*\* across \d+ test suites/g,
          replacement: `**${counts.passed} tests passing** across ${counts.suites} test suites`
        }
      ]
    }
  ];
  
  let totalUpdated = 0;
  files.forEach(file => {
    if (updateFile(file.path, file.updates)) {
      totalUpdated++;
    }
  });
  
  console.log(`Updated ${totalUpdated} files`);
}

if (require.main === module) {
  main();
}