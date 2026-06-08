const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('c:/Users/SubodhRana/Downloads/public/src');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  content = content.replace(/container mx-auto/g, 'w-full px-4 md:px-8 2xl:px-12 mx-auto');
  content = content.replace(/max-w-7xl mx-auto/g, 'w-full px-4 md:px-8 2xl:px-12 mx-auto');
  
  // Some places might already have px-4 right after, causing duplication.
  content = content.replace(/w-full px-4 md:px-8 2xl:px-12 mx-auto px-[\w-]+/g, 'w-full px-4 md:px-8 2xl:px-12 mx-auto');

  // Also replace `max-w-7xl px-4` without mx-auto just in case
  content = content.replace(/max-w-7xl px-/g, 'w-full px-');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
    console.log('Updated: ' + file);
  }
});
console.log('Total files changed: ' + changedCount);
