const fs = require('fs');
const path = require('path');

const source = 'C:\\tmp';
const target = 'C:\\tmp\\target';

// Crear carpeta target si no existe
if (!fs.existsSync(target)) {
  fs.mkdirSync(target, { recursive: true });
  console.log('Carpeta target creada:', target);
}

// Leer todos los archivos del directorio source
const items = fs.readdirSync(source);
let copied = 0;

for (const item of items) {
  const srcPath = path.join(source, item);
  const destPath = path.join(target, item);

  const stat = fs.statSync(srcPath);
  if (stat.isFile()) {
    fs.copyFileSync(srcPath, destPath);
    console.log('Copiado:', item, '(' + (stat.size / 1024).toFixed(1) + ' KB)');
    copied++;
  }
}

console.log('\n--- Resumen ---');
console.log('Total archivos copiados:', copied);
console.log('Destino:', target);