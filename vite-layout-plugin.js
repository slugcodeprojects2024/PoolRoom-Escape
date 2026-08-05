// vite-layout-plugin.js — dev-only endpoint so the in-browser editor can
// write layout changes back to disk. Not included in production builds.
import fs from 'node:fs';
import path from 'node:path';

export function layoutSaver() {
    return {
        name: 'layout-saver',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use('/__save-layout', (req, res) => {
                if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
                let body = '';
                req.on('data', c => body += c);
                req.on('end', () => {
                    try {
                        const { level, authored } = JSON.parse(body);
                        const root = server.config.root;
                        if (level) {
                            fs.writeFileSync(
                                path.join(root, 'level-overrides.json'),
                                JSON.stringify(level, null, 4)
                            );
                        }
                        if (authored) {
                            fs.writeFileSync(
                                path.join(root, 'blockout-authored.json'),
                                JSON.stringify(authored, null, 4)
                            );
                        }
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ ok: true }));
                        server.config.logger.info('  layout saved');
                    } catch (e) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ ok: false, error: String(e) }));
                    }
                });
            });
        }
    };
}
