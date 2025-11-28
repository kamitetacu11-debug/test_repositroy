/**
 * TaskMaster - Images Routes
 * Store and serve images from database
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { db, statements } = require('../models/database');
const { authenticate } = require('../middleware/auth');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extMatch = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimeMatch = allowedTypes.test(file.mimetype.split('/')[1]);

    if (mimeMatch && extMatch) {
        return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * Upload image to database
 * POST /api/images/upload
 */
router.post('/upload', authenticate, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file uploaded'
            });
        }

        const { imageType = 'other' } = req.body;
        const validTypes = ['avatar', 'banner', 'chat', 'task', 'other'];

        if (!validTypes.includes(imageType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid image type'
            });
        }

        // Process image with sharp
        const metadata = await sharp(req.file.buffer).metadata();

        // Resize based on image type
        let processedImage;
        let thumbnailBuffer = null;
        let width = metadata.width;
        let height = metadata.height;

        if (imageType === 'avatar') {
            // Avatar: 300x300, square crop
            processedImage = await sharp(req.file.buffer)
                .resize(300, 300, { fit: 'cover', position: 'center' })
                .jpeg({ quality: 85 })
                .toBuffer();
            width = 300;
            height = 300;
        } else if (imageType === 'banner') {
            // Banner: max 1200px wide
            if (metadata.width > 1200) {
                processedImage = await sharp(req.file.buffer)
                    .resize(1200, null, { fit: 'inside' })
                    .jpeg({ quality: 85 })
                    .toBuffer();
                const newMeta = await sharp(processedImage).metadata();
                width = newMeta.width;
                height = newMeta.height;
            } else {
                processedImage = await sharp(req.file.buffer)
                    .jpeg({ quality: 85 })
                    .toBuffer();
            }
        } else {
            // Other images: max 1920px, create thumbnail
            if (metadata.width > 1920) {
                processedImage = await sharp(req.file.buffer)
                    .resize(1920, null, { fit: 'inside' })
                    .jpeg({ quality: 85 })
                    .toBuffer();
                const newMeta = await sharp(processedImage).metadata();
                width = newMeta.width;
                height = newMeta.height;
            } else {
                processedImage = await sharp(req.file.buffer)
                    .jpeg({ quality: 85 })
                    .toBuffer();
            }

            // Create thumbnail
            thumbnailBuffer = await sharp(req.file.buffer)
                .resize(200, 200, { fit: 'cover', position: 'center' })
                .jpeg({ quality: 70 })
                .toBuffer();
        }

        // Generate unique filename
        const imageId = uuidv4();
        const filename = `${imageId}.jpg`;

        // Save to database
        statements.saveImage.run(
            imageId,
            req.user.id,
            imageType,
            filename,
            req.file.originalname,
            'image/jpeg',
            processedImage.length,
            processedImage,
            thumbnailBuffer,
            width,
            height
        );

        // Generate URL
        const imageUrl = `/api/images/${filename}`;

        // If avatar or banner, update user profile
        if (imageType === 'avatar') {
            statements.updateUserAvatarUrl.run(imageUrl, req.user.id);
        } else if (imageType === 'banner') {
            statements.updateUserBannerUrl.run(imageUrl, req.user.id);
        }

        res.json({
            success: true,
            data: {
                id: imageId,
                filename,
                url: imageUrl,
                thumbnailUrl: thumbnailBuffer ? `/api/images/${filename}?thumb=1` : null,
                width,
                height,
                size: processedImage.length,
                imageType,
                message: 'Image uploaded successfully'
            }
        });

    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image'
        });
    }
});

/**
 * Get image from database
 * GET /api/images/:filename
 */
router.get('/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const { thumb } = req.query;

        const image = statements.getImageByFilename.get(filename);

        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        // Set cache headers
        res.set({
            'Content-Type': image.mime_type,
            'Cache-Control': 'public, max-age=31536000', // 1 year
            'ETag': `"${image.id}"`,
            'Last-Modified': new Date(image.created_at).toUTCString()
        });

        // Check if client has cached version
        const ifNoneMatch = req.get('If-None-Match');
        if (ifNoneMatch === `"${image.id}"`) {
            return res.status(304).end();
        }

        // Return thumbnail or full image
        if (thumb === '1' && image.thumbnail) {
            res.send(image.thumbnail);
        } else {
            res.send(image.data);
        }

    } catch (error) {
        console.error('Get image error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get image'
        });
    }
});

/**
 * Get user's uploaded images
 * GET /api/images/user/list
 */
router.get('/user/list', authenticate, (req, res) => {
    try {
        const images = statements.getUserImages.all(req.user.id);

        const formattedImages = images.map(img => ({
            id: img.id,
            filename: img.filename,
            url: `/api/images/${img.filename}`,
            thumbnailUrl: `/api/images/${img.filename}?thumb=1`,
            imageType: img.image_type,
            mimeType: img.mime_type,
            size: img.size,
            width: img.width,
            height: img.height,
            createdAt: img.created_at
        }));

        res.json({
            success: true,
            data: formattedImages
        });

    } catch (error) {
        console.error('Get user images error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get images'
        });
    }
});

/**
 * Delete image
 * DELETE /api/images/:id
 */
router.delete('/:id', authenticate, (req, res) => {
    try {
        const { id } = req.params;

        const image = statements.getImageById.get(id);

        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        // Only allow owner to delete
        if (image.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this image'
            });
        }

        statements.deleteImage.run(id, req.user.id);

        res.json({
            success: true,
            message: 'Image deleted successfully'
        });

    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete image'
        });
    }
});

/**
 * Upload avatar directly
 * POST /api/images/avatar
 */
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res) => {
    req.body.imageType = 'avatar';

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No avatar file uploaded'
            });
        }

        // Process avatar image
        const processedImage = await sharp(req.file.buffer)
            .resize(300, 300, { fit: 'cover', position: 'center' })
            .jpeg({ quality: 85 })
            .toBuffer();

        const imageId = uuidv4();
        const filename = `avatar_${imageId}.jpg`;

        // Save to database
        statements.saveImage.run(
            imageId,
            req.user.id,
            'avatar',
            filename,
            req.file.originalname,
            'image/jpeg',
            processedImage.length,
            processedImage,
            null,
            300,
            300
        );

        const imageUrl = `/api/images/${filename}`;

        // Update user profile
        statements.updateUserAvatarUrl.run(imageUrl, req.user.id);

        res.json({
            success: true,
            data: {
                id: imageId,
                avatarUrl: imageUrl,
                message: 'Avatar uploaded successfully'
            }
        });

    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload avatar'
        });
    }
});

/**
 * Upload banner directly
 * POST /api/images/banner
 */
router.post('/banner', authenticate, upload.single('banner'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No banner file uploaded'
            });
        }

        // Process banner image
        const metadata = await sharp(req.file.buffer).metadata();
        let processedImage;
        let width = metadata.width;
        let height = metadata.height;

        if (metadata.width > 1200) {
            processedImage = await sharp(req.file.buffer)
                .resize(1200, null, { fit: 'inside' })
                .jpeg({ quality: 85 })
                .toBuffer();
            const newMeta = await sharp(processedImage).metadata();
            width = newMeta.width;
            height = newMeta.height;
        } else {
            processedImage = await sharp(req.file.buffer)
                .jpeg({ quality: 85 })
                .toBuffer();
        }

        const imageId = uuidv4();
        const filename = `banner_${imageId}.jpg`;

        // Save to database
        statements.saveImage.run(
            imageId,
            req.user.id,
            'banner',
            filename,
            req.file.originalname,
            'image/jpeg',
            processedImage.length,
            processedImage,
            null,
            width,
            height
        );

        const imageUrl = `/api/images/${filename}`;

        // Update user profile
        statements.updateUserBannerUrl.run(imageUrl, req.user.id);

        res.json({
            success: true,
            data: {
                id: imageId,
                bannerUrl: imageUrl,
                message: 'Banner uploaded successfully'
            }
        });

    } catch (error) {
        console.error('Banner upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload banner'
        });
    }
});

module.exports = router;
