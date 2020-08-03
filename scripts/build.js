const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  execSync('rm -f tsconfig.tsbuildinfo').toString();
  execSync('rm -rf lib').toString();
  const tsc = execSync('tsc', {
    cwd: process.cwd()
  }).toString();
  console.log(tsc);
}

main().catch(console.error);

