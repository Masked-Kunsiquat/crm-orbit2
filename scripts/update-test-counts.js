#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Run tests and capture output
function getTestCounts() {
  const cwd = path.join(__dirname, '..');
  const outputFile = path.join(cwd, 'test-results.json');
  
  try {
    // Remove any existing output file
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
    
    // Run tests with deterministic output file
    execSync('npm test -- --json --outputFile=test-results.json --testPathPattern="src/database/__tests__"', 
      { encoding: 'utf8', stdio: 'pipe', cwd });
    
    // Check if output file was created
    if (!fs.existsSync(outputFile)) {
      console.error('Test output file was not created');
      return null;
    }
    
    // Read and parse the JSON file
    const fileContent = fs.readFileSync(outputFile, 'utf8');
    const testResult = JSON.parse(fileContent);
    
    // Clean up the temp file
    fs.unlinkSync(outputFile);
    
    return {
      total: testResult.numTotalTests,
      passed: testResult.numPassedTests,
      suites: testResult.numTotalTestSuites
    };
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
    
    if (error.message.includes('JSON.parse')) {
      console.error('Failed to parse test results JSON:', error.message);
    } else {
      console.error('Failed to run tests:', error.message);
    }
    return null;
  }
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