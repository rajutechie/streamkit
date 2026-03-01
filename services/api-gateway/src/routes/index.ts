import { Router, Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config';

export function createRoutes(): Router {
  const router = Router();

  const proxyOptions = (target: string) => ({
    target,
    changeOrigin: true,
    timeout: 30000,
    onError: (err: Error, _req: Request, res: Response) => {
      res.status(502).json({ error: 'Service unavailable', details: err.message });
    },
  });

  router.use('/auth', createProxyMiddleware(proxyOptions(config.authServiceUrl)));
  router.use('/users', createProxyMiddleware(proxyOptions(config.userServiceUrl)));
  router.use('/channels', createProxyMiddleware(proxyOptions(config.chatServiceUrl)));
  router.use('/calls', createProxyMiddleware(proxyOptions(config.callServiceUrl)));
  router.use('/meetings', createProxyMiddleware(proxyOptions(config.meetingServiceUrl)));
  router.use('/streams', createProxyMiddleware(proxyOptions(config.streamServiceUrl)));
  router.use('/media', createProxyMiddleware(proxyOptions(config.mediaServiceUrl)));
  router.use('/webhooks', createProxyMiddleware(proxyOptions(config.notificationServiceUrl)));
  router.use('/analytics', createProxyMiddleware(proxyOptions(config.analyticsServiceUrl)));
  router.use('/billing', createProxyMiddleware(proxyOptions(config.analyticsServiceUrl)));
  router.use('/moderation', createProxyMiddleware(proxyOptions(config.moderationServiceUrl)));
  router.use('/presence', createProxyMiddleware(proxyOptions(config.presenceServiceUrl)));
  router.use('/notifications', createProxyMiddleware(proxyOptions(config.notificationServiceUrl)));

  return router;
}
