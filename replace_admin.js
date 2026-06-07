const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const dirToSearch = path.join(__dirname, 'src');

walkDir(dirToSearch, function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace double quote paths
    content = content.replace(/"\/admin"/g, '"/uc-admin-portal"');
    content = content.replace(/"\/admin\//g, '"/uc-admin-portal/');
    
    // Replace single quote paths
    content = content.replace(/'\/admin'/g, "'/uc-admin-portal'");
    content = content.replace(/'\/admin\//g, "'/uc-admin-portal/");
    
    // Replace backtick paths
    content = content.replace(/`\/admin`/g, '`/uc-admin-portal`');
    content = content.replace(/`\/admin\//g, '`/uc-admin-portal/');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated:', filePath);
    }
  }
});
