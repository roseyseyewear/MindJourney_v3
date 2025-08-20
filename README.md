# MindJourney v3

An immersive experimental chat interface for collecting user responses through multiple media types including text, voice, and file uploads.

## Features

### Core Functionality
- **Interactive Chat Interface** - Laboratory-themed chat experience
- **Multi-Modal Input** - Text, voice recording, and file uploads
- **File Upload & Preview** - Image and video upload with thumbnail previews
- **Voice Recording** - Real-time audio recording and playback
- **Video Background** - Looping background videos for immersion
- **Visitor System** - Unique visitor numbering and badge generation

### Recent Updates (v1.1.0)
- ✅ **Fixed File Upload** - Paperclip button now fully functional
- ✅ **File Previews** - See thumbnails of selected images/videos before sending
- ✅ **Enhanced UX** - Better visual feedback and error handling
- ✅ **Memory Management** - Proper cleanup prevents memory leaks

## Quick Start

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### File Upload Usage
1. Click the paperclip (📎) icon in the chat input
2. Select an image or video file
3. Preview appears below the input bar
4. Click send button or press Enter to upload
5. Use the × button to remove preview if needed

## Technical Architecture

### Frontend
- **React + TypeScript** - Type-safe component development
- **Vite** - Fast build tool and dev server
- **TanStack Query** - Server state management
- **Lucide React** - Icon system
- **Tailwind CSS** - Utility-first styling

### Backend Integration
- **File Upload Endpoint** - `/api/response` handles FormData uploads
- **Session Management** - Tracks user responses across sessions
- **Shopify Integration** - Customer data collection

## File Structure

```
mindjourney_v3/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── futuristic-chat-interface.tsx
│   │   │   ├── video-lightbox.tsx
│   │   │   └── ...
│   │   ├── pages/         # Route pages
│   │   ├── lib/           # Utilities
│   │   └── assets/        # Static assets
├── server/                # Backend API
├── docs/                  # Documentation
├── CHANGELOG.md          # Version history
└── README.md            # This file
```

## API Endpoints

### File Upload
```typescript
POST /api/response
Content-Type: multipart/form-data

Body:
- sessionId: string
- levelId: string  
- questionId: string
- responseType: 'text' | 'audio' | 'photo' | 'video'
- responseData: JSON string
- file?: File (optional)
```

### Session Management
```typescript
POST /api/session
GET /api/experiment
PATCH /api/session/:id
```

## Development Guide

### Adding New File Types
1. Update `accept` attribute in file input
2. Add validation in `onChange` handler
3. Extend preview rendering logic
4. Update backend file processing

### Customizing Chat Flow
1. Modify question sequence in experiment data
2. Update response handling in `handleTextResponse`
3. Customize visual feedback and transitions

### Styling Changes
1. Update CSS custom properties for colors
2. Modify Tailwind classes for layout
3. Adjust video background settings

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Deployment

### Replit
1. Connect to GitHub repository
2. Pull latest changes: `git pull origin main`
3. Restart server: `npm run dev`
4. Hard refresh browser

### Production
```bash
npm run build
npm start
```

## Troubleshooting

### File Upload Issues
- **File browser doesn't open**: Check browser permissions and dev console
- **Preview not showing**: Verify file type and size limits
- **Upload fails**: Check network tab and backend logs

### Performance Issues  
- **Memory leaks**: File previews are automatically cleaned up
- **Large files**: Consider implementing file compression
- **Slow uploads**: Check network conditions and file sizes

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is proprietary software owned by Roseys Eyewear.

## Support

For technical issues or questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check documentation in `/docs` folder

---

**Version:** 1.1.0  
**Last Updated:** 2025-01-21  
**Repository:** https://github.com/roseyseyewear/MindJourney_v3