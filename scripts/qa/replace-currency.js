const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'apps/web/src/app/cart/page.tsx',
  'apps/web/src/app/orders/page.tsx',
  'apps/web/src/app/orders/[id]/page.tsx',
  'apps/web/src/app/products/[slug]/page.tsx',
  'apps/web/src/app/seller/orders/page.tsx',
  'apps/web/src/app/seller/products/page.tsx',
  'apps/web/src/app/wishlist/page.tsx',
  'apps/web/src/components/catalog/ProductCard.tsx',
  'apps/web/src/components/checkout/CheckoutClient.tsx',
  'apps/web/src/components/search/SearchBar.tsx'
];

filesToUpdate.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    // Replace $ followed by { with ₹{
    content = content.replace(/\$\{/g, 'DOLLAR_CURLY_TMP'); // Preserve string interpolation ${
    content = content.replace(/\$/g, '₹');
    content = content.replace(/DOLLAR_CURLY_TMP/g, '${');
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
