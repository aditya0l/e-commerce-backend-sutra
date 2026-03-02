const prisma = require('../../config/prisma');
const redis = require('../../config/redis');
const { AppError } = require('../../utils/AppError');

const TTL_PRODUCT = 3600;    // 1 hour
const TTL_LISTING = 300;     // 5 mins
const TTL_CATEGORIES = 86400; // 24 hours

// ─── GET /api/products ────────────────────────────────────────────────────────
const listProducts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const { category, search, sort, isBestseller, isNew } = req.query;
        const skip = (page - 1) * limit;

        const cacheKey = `products:list:${category || 'all'}:${search || ''}:${sort || ''}:${isBestseller || ''}:${isNew || ''}:${page}:${limit}`;
        const cached = await redis.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));

        const where = {
            isActive: true,
            ...(category && { category: { slug: category } }),
            ...(isBestseller === 'true' && { isBestseller: true }),
            ...(isNew === 'true' && { isNew: true }),
        };

        let orderBy = { createdAt: 'desc' };
        if (sort === 'price_asc') orderBy = { price: 'asc' };
        if (sort === 'price_desc') orderBy = { price: 'desc' };
        if (sort === 'rating') orderBy = { rating: 'desc' };

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    shortDescription: true,
                    price: true,
                    compareAtPrice: true,
                    currency: true,
                    images: true,
                    rating: true,
                    reviewCount: true,
                    isNew: true,
                    isBestseller: true,
                    tags: true,
                    sku: true,
                    category: { select: { slug: true, name: true } },
                    inventory: { select: { stockQuantity: true } },
                },
            }),
            prisma.product.count({ where }),
        ]);

        // Shape response to match frontend Product interface
        const shaped = products.map(shapeListing);
        const result = { success: true, data: shaped, meta: { total, page, limit, pages: Math.ceil(total / limit) } };

        await redis.setex(cacheKey, TTL_LISTING, JSON.stringify(result));
        res.json(result);
    } catch (err) { next(err); }
};

// ─── GET /api/products/:slug ──────────────────────────────────────────────────
const getProduct = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const cacheKey = `product:slug:${slug}`;
        const cached = await redis.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));

        const product = await prisma.product.findUnique({
            where: { slug },
            include: {
                category: { select: { id: true, slug: true, name: true } },
                inventory: { select: { stockQuantity: true } },
                reviews: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    select: { id: true, userName: true, userAvatar: true, rating: true, comment: true, createdAt: true, verified: true },
                },
            },
        });

        if (!product || !product.isActive) throw new AppError('Product not found.', 404);

        const result = { success: true, data: shapeDetail(product) };
        await redis.setex(cacheKey, TTL_PRODUCT, JSON.stringify(result));
        res.json(result);
    } catch (err) { next(err); }
};

// ─── GET /api/products/categories ────────────────────────────────────────────
const listCategories = async (req, res, next) => {
    try {
        const cacheKey = 'categories:list';
        const cached = await redis.get(cacheKey);
        if (cached) return res.json(JSON.parse(cached));

        const categories = await prisma.category.findMany({
            include: { _count: { select: { products: { where: { isActive: true } } } } },
        });

        const shaped = categories.map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            description: c.description,
            image: c.image,
            productCount: c._count.products,
        }));

        const result = { success: true, data: shaped };
        await redis.setex(cacheKey, TTL_CATEGORIES, JSON.stringify(result));
        res.json(result);
    } catch (err) { next(err); }
};

// ─── GET /api/products/:slug/reviews ─────────────────────────────────────────
const getProductReviews = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
        if (!product) throw new AppError('Product not found.', 404);

        const reviews = await prisma.review.findMany({
            where: { productId: product.id },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: reviews });
    } catch (err) { next(err); }
};

// ─── Shape helpers ────────────────────────────────────────────────────────────
// Maps DB record to frontend Product interface exactly

function shapeListing(p) {
    return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        shortDescription: p.shortDescription,
        price: Number(p.price),
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
        currency: p.currency,
        images: p.images,
        category: p.category?.name,
        categorySlug: p.category?.slug,
        stock: p.inventory?.stockQuantity ?? 0,
        sku: p.sku,
        rating: Number(p.rating),
        reviewCount: p.reviewCount,
        isNew: p.isNew,
        isBestseller: p.isBestseller,
        tags: p.tags,
    };
}

function shapeDetail(p) {
    return {
        ...shapeListing(p),
        description: p.description,
        usage: p.usage,
        benefits: p.benefits,
        ingredients: p.ingredients,
        certifications: p.certifications,
        faq: p.faq,
        reviews: p.reviews?.map((r) => ({
            id: r.id,
            userName: r.userName,
            userAvatar: r.userAvatar,
            rating: r.rating,
            comment: r.comment,
            date: r.createdAt.toISOString().split('T')[0],
            productId: p.id,
            verified: r.verified,
        })),
    };
}

module.exports = { listProducts, getProduct, listCategories, getProductReviews };
