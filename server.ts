import 'dotenv/config';
import app from './api/index';
import path from 'path';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  // Only an explicit development environment enables the Vite middleware.
  const isDevelopment = process.env.NODE_ENV === 'development';
  // Vite Middleware & SPA static serving
  if (isDevelopment) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Rumbio Server] Running securely on port ${PORT}`);
    console.log(`[Rumbio Server] Resend status: ${process.env.RESEND_API_KEY ? 'CONFIGURED (Real Emails)' : 'NOT CONFIGURED'}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start Rumbio server:', err);
  process.exitCode = 1;
});
