const fs = require('fs').promises;
const path = require('path');
const MarkdownIt = require('markdown-it');
const anchor = require('markdown-it-anchor');
const fg = require('fast-glob');

const wikiRoot = path.resolve(__dirname, '../wiki');
const outRoot = path.resolve(__dirname, 'dist');
const siteTitle = 'EmberChamber Wiki';

const md = new MarkdownIt({ html: true, linkify: true })
  .use(anchor, {
    permalink: anchor.permalink.linkAfterHeader({ class: 'header-anchor', symbol: '#' }),
  });

function titleFromMarkdown(content, fileName) {
  const match = content.match(/^#{1,2}[^\n]+/m);
  if (match) {
    return match[0].replace(/^#+\s*/, '').trim();
  }
  return path.basename(fileName, '.md');
}

function htmlTemplate(title, navHtml, contentHtml) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} · ${siteTitle}</title>
    <style>
      body { margin: 0; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7fafc; color: #111827; }
      .page { max-width: 960px; margin: 0 auto; padding: 32px 24px 64px; }
      header { margin-bottom: 24px; }
      h1 { font-size: 2.4rem; margin-bottom: 0.5rem; }
      nav { margin-bottom: 32px; padding: 18px 24px; background: #111827; color: #f8fafc; }
      nav a { color: #f8fafc; text-decoration: none; margin-right: 18px; }
      nav a:hover { text-decoration: underline; }
      article h2, article h3, article h4 { margin-top: 2rem; }
      article p, article ul, article ol, article blockquote, article pre { line-height: 1.75; }
      article code { background: #e5e7eb; padding: 0.15em 0.3em; border-radius: 0.35rem; }
      pre { background: #0f172a; color: #e2e8f0; padding: 16px; overflow-x: auto; border-radius: 0.75rem; }
      a.inline { color: #2563eb; }
      .sidebar { margin-bottom: 32px; }
      .sidebar a { display: inline-block; margin-right: 16px; margin-bottom: 8px; }
      footer { margin-top: 64px; color: #6b7280; font-size: 0.95rem; }
    </style>
  </head>
  <body>
    <nav>${navHtml}</nav>
    <div class="page">
      <header>
        <a href="./" style="color: inherit; text-decoration: none;"><h1>${siteTitle}</h1></a>
      </header>
      <article>${contentHtml}</article>
      <footer>Generated from <strong>docs/wiki</strong>.</footer>
    </div>
  </body>
</html>`;
}

function normalizeLink(markdown) {
  return markdown.replace(/\]\(([^)]+?)\.md\)/g, (full, target) => {
    const normalized = target.replace(/\.md$/, '.html');
    return `](${normalized})`;
  });
}

async function build() {
  const mdFiles = await fg('**/*.md', { cwd: wikiRoot, dot: false });

  if (!mdFiles.length) {
    throw new Error('No markdown files found in docs/wiki');
  }

  await fs.rm(outRoot, { recursive: true, force: true });
  await fs.mkdir(outRoot, { recursive: true });

  const pages = [];

  for (const relativePath of mdFiles) {
    const raw = await fs.readFile(path.join(wikiRoot, relativePath), 'utf8');
    const markdown = normalizeLink(raw);
    const title = titleFromMarkdown(markdown, relativePath);
    const html = md.render(markdown);
    const outputPath = relativePath === 'Home.md'
      ? path.join(outRoot, 'index.html')
      : path.join(outRoot, relativePath.replace(/\.md$/, '.html'));

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    pages.push({ title, href: outputPath.endsWith('index.html') ? './' : `./${relativePath.replace(/\.md$/, '.html')}` });
    await fs.writeFile(outputPath, htmlTemplate(title, '', html), 'utf8');
  }

  const navHtml = pages
    .map((page) => `<a href="${page.href}">${page.title}</a>`)
    .join('');

  for (const { title, href } of pages) {
    const outputPath = path.join(outRoot, href === './' ? 'index.html' : href.replace(/^\.\//, ''));
    const pageHtml = await fs.readFile(outputPath, 'utf8');
    const contentStart = pageHtml.indexOf('<article>');
    const contentEnd = pageHtml.indexOf('</article>');
    const contentHtml = pageHtml.slice(contentStart + 9, contentEnd);
    await fs.writeFile(outputPath, htmlTemplate(title, navHtml, contentHtml), 'utf8');
  }

  const assetFiles = await fg(['**/*', '!**/*.md'], { cwd: wikiRoot, dot: true });
  for (const asset of assetFiles) {
    const src = path.join(wikiRoot, asset);
    const dest = path.join(outRoot, asset);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  }

  await fs.writeFile(path.join(outRoot, '.nojekyll'), '', 'utf8');
  console.log(`Built wiki to ${outRoot}`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
