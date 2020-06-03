const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main(exmaplePath) {
  const dir = await fs.promises.opendir(exmaplePath);
  for await (const dirent of dir) {
    if (!dirent.isDirectory()) continue;
    const val = execSync(process.argv.slice(2).join(' '), {
      cwd: path.join(process.cwd(), 'examples', dirent.name)
    }).toString();
    console.log(val);
  }
}

main(path.join(process.cwd(), 'examples')).catch(console.error);
