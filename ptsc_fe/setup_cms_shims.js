import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, 'src', 'pages', 'AdministrationSystem', 'FunctionManagement', 'components', 'CmsModule');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. replace next/navigation
    if (content.match(/['"]next\/navigation['"]/)) {
        content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]next\/navigation['"];?/g, (match, importsStr) => {
            const hasRouter = importsStr.includes('useRouter');
            const hasPathname = importsStr.includes('usePathname');
            const hasSearchParams = importsStr.includes('useSearchParams');
            
            let shims = [`import { useNavigate, useLocation, useSearchParams as useRRDSearchParams } from "react-router-dom";`];
            
            if (hasRouter) {
                shims.push(`const useRouter = () => { const n = useNavigate(); return { push: (p)=>n(p), replace: (p)=>n(p, {replace: true}), back: ()=>n(-1), prefetch: ()=>{} }; };`);
            }
            if (hasPathname) {
                shims.push(`const usePathname = () => useLocation().pathname;`);
            }
            if (hasSearchParams) {
                shims.push(`const useSearchParams = () => { const [s] = useRRDSearchParams(); return s; };`);
            }
            return shims.join('\n');
        });
    }

    // 2. replace next/link
    if (content.match(/['"]next\/link['"]/)) {
        content = content.replace(/import\s+Link\s+from\s+['"]next\/link['"];?/g, `import { Link } from 'react-router-dom';`);
        
        // Next link uses href, react uses to. So we need to map <Link href="..."> to <Link to="...">
        // Handle all occurrences
        content = content.replace(/<Link\s+([^>]*?)href=/g, '<Link $1to=');
        content = content.replace(/<Link\s+href=/g, '<Link to=');
    }

    // 3. replace next/image
    if (content.match(/['"]next\/image['"]/)) {
        content = content.replace(/import\s+Image\s+from\s+['"]next\/image['"];?/g, '');
        // Replace <Image with <img ... and remove closing </Image> if any
        content = content.replace(/<Image\b/g, '<img');
        content = content.replace(/<\/Image>/g, ''); 
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        logger.log(`Updated: ${filePath}`);
    }
}

function traverse(d) {
    fs.readdirSync(d).forEach(f => {
        let p = path.join(d, f);
        if (fs.lstatSync(p).isDirectory()) traverse(p);
        else if (p.endsWith('.js') || p.endsWith('.jsx')) processFile(p);
    });
}
traverse(dir);
logger.log("Hooks shimmed!");
