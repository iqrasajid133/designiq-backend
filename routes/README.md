# DesignIQ AI — Backend API Reference

Base URL: `http://localhost:4000`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET  | /health | Server health check |
| POST | /api/ai/analyze | AI image analysis via OpenRouter |
| POST | /api/ai/chat | Generic OpenRouter chat |
| POST | /api/vectorize | Raster → SVG vectorization |
| POST | /api/remove-bg | Background removal |
| POST | /api/upscale | 2×/3×/4× AI upscaling |
| POST | /api/enhance-logo | Logo sharpening/cleanup |
| POST | /api/optimize-svg | SVG minification |
| POST | /api/compress-image | Image compression |
| POST | /api/color-palette | Color palette extraction |
| POST | /api/convert-image | Format conversion |
| POST | /api/qr | QR code generation |

## Auth
All endpoints are rate-limited (100 req/15min by default).
No auth required in development. Add JWT middleware for production.

## File Upload
All image endpoints accept `multipart/form-data` with field name `image` (or `svg` for SVG endpoints).
Max file size: 50 MB (configurable via MAX_FILE_SIZE_MB in .env).

## Quick Start
```bash
cp .env.example .env
# Fill in OPENROUTER_API_KEY
npm install
npm run dev
```
