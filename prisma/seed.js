/**
 * Sutra Vedic — Database Seed Script
 * Run: node prisma/seed.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://adityajaif@localhost:5432/ecommerce_db?schema=public' } },
});

async function main() {
    console.log('🌱 Seeding Sutra Vedic database...\n');

    // ─── Admin User ────────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash('Admin@2026', 12);
    await prisma.user.upsert({
        where: { email: 'admin@sutravedic.com' },
        update: {},
        create: { name: 'Sutra Admin', email: 'admin@sutravedic.com', passwordHash, role: 'ADMIN' },
    });
    console.log('✅ Admin user: admin@sutravedic.com / Admin@2026');

    // ─── Bank Info (default placeholder) ──────────────────────────────────────
    await prisma.bankInfo.upsert({
        where: { id: 'singleton' },
        update: {},
        create: {
            id: 'singleton',
            accountHolder: 'Sutra Vedic SAS',
            bankName: 'BNP Paribas',
            iban: 'FR76 0000 0000 0000 0000 0000 000',
            bic: 'BNPAFRPP',
            instructions: 'Veuillez inclure votre numéro de commande en référence du virement.',
        },
    });
    console.log('✅ Bank info seeded');


    // ─── Categories ────────────────────────────────────────────────────────────
    const [catOils, catCures, catSoins] = await Promise.all([
        prisma.category.upsert({
            where: { slug: 'huiles-ayurvediques' },
            update: {},
            create: {
                slug: 'huiles-ayurvediques',
                name: { fr: 'Huiles Ayurvédiques', en: 'Ayurvedic Oils' },
                description: {
                    fr: "Huiles thérapeutiques traditionnelles pour le corps et l'esprit",
                    en: 'Traditional therapeutic oils for body and mind',
                },
                image: '/images/categories/oils.jpg',
            },
        }),
        prisma.category.upsert({
            where: { slug: 'cures-bien-etre' },
            update: {},
            create: {
                slug: 'cures-bien-etre',
                name: { fr: 'Cures & Coffrets Bien-être', en: 'Wellness Combos & Sets' },
                description: {
                    fr: 'Sélection de coffrets complets pour une approche holistique',
                    en: 'Selection of complete sets for a holistic approach',
                },
                image: '/images/categories/supplements.jpg',
            },
        }),
        prisma.category.upsert({
            where: { slug: 'soins-specialises' },
            update: {},
            create: {
                slug: 'soins-specialises',
                name: { fr: 'Soins Spécialisés', en: 'Specialized Care' },
                description: {
                    fr: 'Formulations ciblées pour des besoins spécifiques',
                    en: 'Targeted formulations for specific needs',
                },
                image: '/images/categories/immunity.jpg',
            },
        }),
    ]);
    console.log('✅ 3 categories created');

    // ─── Products ──────────────────────────────────────────────────────────────
    const productData = [
        {
            slug: 'shesha-ayurveda-pain-combo',
            categoryId: catCures.id,
            sku: 'SHESHA-PC-189',
            price: 189,
            currency: 'EUR',
            images: ['/images/products/shesha.jpg'],
            isBestseller: true,
            name: { fr: 'Combo de Guérison & Soulagement de la Douleur Ayurvédique', en: 'Ayurvedic Pain Relief & Healing Combo' },
            description: {
                fr: "Un kit de thérapie complet comprenant 4 articles qui associe les huiles ayurvédiques traditionnelles du Kerala à un pochon de chauffage aux herbes (Kizhi) pour une guérison des tissus profonds.",
                en: 'A comprehensive 4-item therapy kit that combines traditional Kerala Ayurvedic oils with a herbal heating potli (Kizhi) for deep tissue healing and pain relief.',
            },
            shortDescription: { fr: 'Thérapie complète à 4 articles pour le soulagement des douleurs musculaires et articulaires.', en: 'Complete 4-item therapy for muscle and joint pain relief.' },
            usage: {
                fr: "Appliquer l'huile spécifique sur la zone affectée. Chauffer le pochon Kizhi sur une poêle tiède et appliquer en tapotant doucement.",
                en: 'Apply specific oil to the affected area. Heat the Kizhi potli on a warm pan and apply with gentle dabbing motions.',
            },
            benefits: [
                { icon: '💆', title: { fr: 'Soulagement Multi-Action', en: 'Multi-Action Relief' }, description: { fr: "Réduit l'inflammation et la douleur", en: 'Reduces inflammation and pain' } },
                { icon: '🔥', title: { fr: 'Thermothérapie', en: 'Heat Therapy' }, description: { fr: 'Pochon Kizhi pour une chaleur bienfaisante', en: 'Kizhi potli for healing heat' } },
            ],
            ingredients: [
                { name: { fr: 'Murivenna & Karpooradi', en: 'Murivenna & Karpooradi' }, description: { fr: 'Huiles médicinales puissantes', en: 'Powerful medicated oils' } },
                { name: { fr: 'Kolakulathadi Kizhi', en: 'Kolakulathadi Kizhi' }, description: { fr: 'Pochon aux herbes chauffant', en: 'Herbal heating potli' } },
            ],
            faq: [],
            certifications: ['Kerala Ayurveda Authentic', 'Traditional Healing'],
            tags: ['pain relief', 'combo', 'healing', 'kizhi'],
            rating: 4.9,
            reviewCount: 42,
            stockQuantity: 15,
        },
        {
            slug: 'kairbossom-massage-oil',
            categoryId: catOils.id,
            sku: 'KAIR-O-214',
            price: 214,
            currency: 'EUR',
            images: ['/images/products/kairali.jpg'],
            isNew: true,
            name: { fr: 'Huile de Massage Ayurvédique Kairbossom', en: 'Kairbossom Ayurvedic Breast Massage Oil' },
            description: {
                fr: "Une huile ayurvédique naturelle formulée pour tonifier, raffermir et nourrir les tissus. Elle se concentre sur le renforcement des muscles sous-jacents et l'amélioration de l'élasticité de la peau.",
                en: 'A natural Ayurvedic oil formulated to tone, firm, and nourish the tissues. It focuses on strengthening the underlying muscles and improving skin elasticity.',
            },
            shortDescription: { fr: 'Huile raffermissante et tonifiante pour la vitalité des tissus.', en: 'Firming and toning oil for tissue vitality.' },
            usage: {
                fr: "Appliquer une petite quantité et masser doucement en mouvements circulaires jusqu'à absorption complète (une à deux fois par jour).",
                en: 'Apply a small amount and massage gently in circular motions until fully absorbed (once or twice daily).',
            },
            benefits: [
                { icon: '✨', title: { fr: 'Raffermissant', en: 'Firming' }, description: { fr: "Améliore l'élasticité de la peau", en: 'Improves skin elasticity' } },
                { icon: '🌿', title: { fr: 'Rajeunissant', en: 'Rejuvenating' }, description: { fr: 'Herbes botaniques pures', en: 'Pure botanical herbs' } },
            ],
            ingredients: [
                { name: { fr: 'Sida Cordifolia', en: 'Sida Cordifolia' }, description: { fr: 'Herbe Kharayashti pour le tonus', en: 'Kharayashti herb for tone' } },
                { name: { fr: 'Huiles Médicinales', en: 'Medicated Oils' }, description: { fr: 'Base de Kairali traditionnelle', en: 'Traditional Kairali base' } },
            ],
            faq: [],
            certifications: ['GMP Certified', 'Ayurvedic'],
            tags: ['massage oil', 'firming', 'wellness', 'kairali'],
            rating: 4.7,
            reviewCount: 28,
            stockQuantity: 50,
        },
        {
            slug: 'cannabis-leaf-extract-oil',
            categoryId: catSoins.id,
            sku: 'MED-C-249',
            price: 249,
            currency: 'EUR',
            images: ['/images/products/sushain.jpg'],
            name: { fr: "Huile d'Extrait de Feuille de Cannabis (Menthe)", en: 'Cannabis Leaf Extract Oil (Peppermint)' },
            description: {
                fr: 'Une formulation ayurvédique thérapeutique puissante issue d\'extraits de cannabis purs. Conçue pour gérer les douleurs chroniques (sciatique, arthrite) et favoriser le bien-être mental (sommeil, stress).',
                en: 'A powerful therapeutic Ayurvedic formulation derived from pure cannabis extracts. Designed to manage chronic pain (sciatica, arthritis) and promote mental wellness (sleep, stress).',
            },
            shortDescription: { fr: "Extrait concentré pour le soulagement des douleurs chroniques et de l'insomnie.", en: 'Concentrated extract for chronic pain and insomnia relief.' },
            usage: {
                fr: '2 gouttes une fois par jour par voie sublinguale (sous la langue), ou selon l\'avis d\'un professionnel.',
                en: '2 drops once a day sublingually (under the tongue), or as directed by a professional.',
            },
            benefits: [
                { icon: '🌿', title: { fr: 'Gestion de la Douleur', en: 'Pain Management' }, description: { fr: 'Efficace pour les douleurs articulaires et nerveuses', en: 'Effective for joint and nerve pain' } },
                { icon: '🧠', title: { fr: 'Soutien Mental', en: 'Mental Wellness' }, description: { fr: "Calme le stress et l'anxiété", en: 'Calms stress and anxiety' } },
            ],
            ingredients: [
                { name: { fr: 'Extrait de Cannabis', en: 'Cannabis Extract' }, description: { fr: 'Pur et de qualité médicinale', en: 'Pure medicinal grade' } },
                { name: { fr: 'Huile de Menthe', en: 'Peppermint Oil' }, description: { fr: "Saveur agréable pour l'usage sublingual", en: 'Pleasant flavor for sublingual use' } },
            ],
            faq: [],
            certifications: ['Medicann Quality', 'Ayurvedic Formula'],
            tags: ['cannabis', 'extract', 'peppermint', 'wellness'],
            rating: 4.8,
            reviewCount: 35,
            stockQuantity: 20,
        },
    ];

    for (const p of productData) {
        const { stockQuantity, ...data } = p;
        await prisma.product.upsert({
            where: { slug: p.slug },
            update: {},
            create: {
                ...data,
                rating: data.rating,
                reviewCount: data.reviewCount,
                inventory: { create: { stockQuantity } },
            },
        });
        console.log(`  ✅ Product: ${p.sku}`);
    }

    // ─── Sample reviews ────────────────────────────────────────────────────────
    const allProducts = await prisma.product.findMany({ select: { id: true, slug: true } });
    const productMap = Object.fromEntries(allProducts.map((p) => [p.slug, p.id]));

    const reviewData = [
        { productId: productMap['shesha-ayurveda-pain-combo'], userName: 'Aarav Sharma', rating: 5, comment: { fr: "Le combo de Shesha est magique pour mes douleurs de dos après le sport.", en: "Shesha's combo is magic for my back pain after sports. Very effective!" }, verified: true },
        { productId: productMap['kairbossom-massage-oil'], userName: 'Priya Patel', rating: 5, comment: { fr: "L'huile Kairbossom est très agréable, on sent la qualité des ingrédients Kairali.", en: 'Kairbossom oil is very pleasant, you can feel the quality of Kairali ingredients.' }, verified: true },
        { productId: productMap['cannabis-leaf-extract-oil'], userName: 'Rohan Gupta', rating: 5, comment: { fr: "L'huile de cannabis Medicann m'aide énormément au quotidien.", en: 'Medicann cannabis oil helps me a lot daily. The mint taste is a real plus.' }, verified: true },
    ];

    for (const r of reviewData) {
        if (r.productId) {
            await prisma.review.create({ data: r });
        }
    }
    console.log('\n✅ 3 reviews seeded');

    console.log('\n🎉 Sutra Vedic database seeded successfully!');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
