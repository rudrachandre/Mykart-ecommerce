const fs = require('fs');
const path = require('path');
const https = require('https');

const components = [
  'button', 'input', 'dialog', 'drawer', 'dropdown-menu',
  'tabs', 'badge', 'skeleton', 'tooltip', 'sonner'
];

const basePath = path.join(__dirname, 'apps', 'web', 'src', 'components', 'ui');

if (!fs.existsSync(basePath)) {
  fs.mkdirSync(basePath, { recursive: true });
}

function fetchComponent(name) {
  return new Promise((resolve, reject) => {
    https.get(`https://ui.shadcn.com/registry/styles/new-york/${name}.json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  for (const name of components) {
    try {
      console.log(`Fetching ${name}...`);
      const componentData = await fetchComponent(name);
      for (const file of componentData.files) {
        let content = file.content;
        // In shadcn, utility imports might be "@/lib/utils", which matches our tsconfig.
        // Tailwind v4 doesn't need much change for the raw components.
        const filePath = path.join(basePath, file.name);
        fs.writeFileSync(filePath, content);
        console.log(`Saved ${file.name}`);
      }
    } catch (e) {
      console.error(`Failed to fetch ${name}`, e);
    }
  }
}

main();
